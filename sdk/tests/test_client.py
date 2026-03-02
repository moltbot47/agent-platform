"""Unit tests for agent_platform.client — AgentClient & PipelineContext."""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import requests

from agent_platform.client import AgentClient, PipelineContext


# ---------------------------------------------------------------------------
# 1. AgentClient initialization
# ---------------------------------------------------------------------------
class TestAgentClientInit(unittest.TestCase):
    """Verify constructor validation, defaults, and header setup."""

    def test_valid_api_key_creates_client(self):
        client = AgentClient(api_key="ak_test123")
        self.assertEqual(client.api_key, "ak_test123")

    def test_invalid_api_key_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            AgentClient(api_key="bad_key")
        self.assertIn("ak_", str(ctx.exception))

    def test_empty_api_key_raises_value_error(self):
        with self.assertRaises(ValueError):
            AgentClient(api_key="")

    def test_custom_base_url_stored(self):
        client = AgentClient(api_key="ak_x", base_url="https://prod.example.com/")
        # trailing slash should be stripped
        self.assertEqual(client.base_url, "https://prod.example.com")

    def test_custom_timeout_stored(self):
        client = AgentClient(api_key="ak_x", timeout=30)
        self.assertEqual(client.timeout, 30)

    def test_default_base_url_and_timeout(self):
        client = AgentClient(api_key="ak_x")
        self.assertEqual(client.base_url, "http://localhost:8000")
        self.assertEqual(client.timeout, 10)

    def test_authorization_header_set(self):
        client = AgentClient(api_key="ak_secret")
        auth = client._session.headers["Authorization"]
        self.assertEqual(auth, "Bearer ak_secret")

    def test_content_type_header_set(self):
        client = AgentClient(api_key="ak_x")
        self.assertEqual(client._session.headers["Content-Type"], "application/json")


# ---------------------------------------------------------------------------
# 2. emit()
# ---------------------------------------------------------------------------
class TestEmit(unittest.TestCase):
    """Verify emit() sends correct payloads and handles errors."""

    def setUp(self):
        self.client = AgentClient(api_key="ak_test")

    @patch.object(requests.Session, "post")
    def test_emit_sends_correct_json(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"id": 1}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        result = self.client.emit("prediction", instrument="BTC-USD", outcome="pass")

        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args
        self.assertEqual(call_kwargs.kwargs["json"], {
            "event_type": "prediction",
            "outcome": "pass",
            "instrument": "BTC-USD",
        })
        self.assertIn("/api/v1/events/", call_kwargs.args[0])
        self.assertEqual(result, {"id": 1})

    @patch.object(requests.Session, "post")
    def test_emit_includes_optional_fields_when_provided(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"id": 2}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        ts = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
        self.client.emit(
            "signal",
            instrument="MNQ",
            confidence=0.85,
            payload={"direction": "long"},
            cycle_id="cycle_42",
            duration_ms=150,
            timestamp=ts,
        )

        sent = mock_post.call_args.kwargs["json"]
        self.assertAlmostEqual(sent["confidence"], 0.85)
        self.assertEqual(sent["payload"], {"direction": "long"})
        self.assertEqual(sent["cycle_id"], "cycle_42")
        self.assertEqual(sent["duration_ms"], 150)
        self.assertEqual(sent["timestamp"], ts.isoformat())

    @patch.object(requests.Session, "post")
    def test_emit_omits_optional_fields_when_not_provided(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"id": 3}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        self.client.emit("prediction")

        sent = mock_post.call_args.kwargs["json"]
        self.assertNotIn("confidence", sent)
        self.assertNotIn("payload", sent)
        self.assertNotIn("cycle_id", sent)
        self.assertNotIn("duration_ms", sent)
        self.assertNotIn("timestamp", sent)

    @patch.object(requests.Session, "post")
    def test_emit_raises_on_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.HTTPError("500 Server Error")
        mock_post.return_value = mock_resp

        with self.assertRaises(requests.HTTPError):
            self.client.emit("prediction")

    @patch.object(requests.Session, "post")
    def test_emit_raises_on_connection_error(self, mock_post):
        mock_post.side_effect = requests.ConnectionError("refused")

        with self.assertRaises(requests.ConnectionError):
            self.client.emit("prediction")

    @patch.object(requests.Session, "post")
    def test_emit_uses_configured_timeout(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        client = AgentClient(api_key="ak_x", timeout=25)
        client.emit("prediction")

        self.assertEqual(mock_post.call_args.kwargs["timeout"], 25)


# ---------------------------------------------------------------------------
# 3. emit_batch()
# ---------------------------------------------------------------------------
class TestEmitBatch(unittest.TestCase):
    """Verify batch endpoint, limit enforcement, and error handling."""

    def setUp(self):
        self.client = AgentClient(api_key="ak_test")

    @patch.object(requests.Session, "post")
    def test_emit_batch_sends_to_batch_endpoint(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"created": 2}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        events = [
            {"event_type": "prediction", "instrument": "BTC-USD", "outcome": "pass"},
            {"event_type": "signal", "instrument": "MNQ", "outcome": "pending"},
        ]
        result = self.client.emit_batch(events)

        call_url = mock_post.call_args.args[0]
        self.assertIn("/api/v1/events/batch/", call_url)
        self.assertEqual(mock_post.call_args.kwargs["json"], {"events": events})
        self.assertEqual(result, {"created": 2})

    def test_emit_batch_raises_for_over_100_events(self):
        events = [{"event_type": "x"}] * 101
        with self.assertRaises(ValueError) as ctx:
            self.client.emit_batch(events)
        self.assertIn("100", str(ctx.exception))

    @patch.object(requests.Session, "post")
    def test_emit_batch_allows_exactly_100_events(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"created": 100}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        events = [{"event_type": "x"}] * 100
        result = self.client.emit_batch(events)
        self.assertEqual(result, {"created": 100})

    @patch.object(requests.Session, "post")
    def test_emit_batch_raises_on_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.HTTPError("400 Bad Request")
        mock_post.return_value = mock_resp

        with self.assertRaises(requests.HTTPError):
            self.client.emit_batch([{"event_type": "x"}])

    @patch.object(requests.Session, "post")
    def test_emit_batch_empty_list(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"created": 0}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        result = self.client.emit_batch([])
        self.assertEqual(result, {"created": 0})


# ---------------------------------------------------------------------------
# 4. heartbeat()
# ---------------------------------------------------------------------------
class TestHeartbeat(unittest.TestCase):
    """Verify heartbeat posts to the correct endpoint."""

    def setUp(self):
        self.client = AgentClient(api_key="ak_test")

    @patch.object(requests.Session, "post")
    def test_heartbeat_posts_to_heartbeat_endpoint(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "ok"}
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        result = self.client.heartbeat()

        call_url = mock_post.call_args.args[0]
        self.assertIn("/api/v1/heartbeat/", call_url)
        # Must NOT hit the events endpoint
        self.assertNotIn("/events/", call_url)
        self.assertEqual(mock_post.call_args.kwargs["json"], {})
        self.assertEqual(result, {"status": "ok"})

    @patch.object(requests.Session, "post")
    def test_heartbeat_raises_on_http_error(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.HTTPError("503")
        mock_post.return_value = mock_resp

        with self.assertRaises(requests.HTTPError):
            self.client.heartbeat()

    @patch.object(requests.Session, "post")
    def test_heartbeat_raises_on_connection_error(self, mock_post):
        mock_post.side_effect = requests.ConnectionError("unreachable")

        with self.assertRaises(requests.ConnectionError):
            self.client.heartbeat()


# ---------------------------------------------------------------------------
# 5. PipelineContext
# ---------------------------------------------------------------------------
class TestPipelineContext(unittest.TestCase):
    """Verify the context manager tracks stages and propagates errors."""

    def setUp(self):
        self.client = AgentClient(api_key="ak_test")

    @patch.object(AgentClient, "emit")
    def test_context_manager_records_stages(self, mock_emit):
        mock_emit.return_value = {"id": 10, "event_type": "prediction"}

        with self.client.pipeline("cycle_1", "MNQ") as p:
            p.stage("price_fetch", outcome="pass")
            p.stage("momentum", outcome="pass", confidence=0.7)

        self.assertEqual(mock_emit.call_count, 2)
        self.assertEqual(len(p.stages), 2)
        self.assertEqual(p.stages[0], {"id": 10, "event_type": "prediction"})

    @patch.object(AgentClient, "emit")
    def test_stage_calls_emit_with_correct_cycle_id_and_instrument(self, mock_emit):
        mock_emit.return_value = {"id": 11}

        with self.client.pipeline("cycle_99", "BTC-USD") as p:
            p.stage("edge_gate", outcome="block", confidence=0.3, duration_ms=42)

        mock_emit.assert_called_once_with(
            event_type="edge_gate",
            instrument="BTC-USD",
            outcome="block",
            confidence=0.3,
            payload=None,
            cycle_id="cycle_99",
            duration_ms=42,
        )

    @patch.object(AgentClient, "emit")
    def test_error_in_context_emits_error_stage(self, mock_emit):
        mock_emit.return_value = {"id": 12}

        with self.assertRaises(RuntimeError):
            with self.client.pipeline("cycle_err", "MES") as p:
                p.stage("price_fetch", outcome="pass")
                raise RuntimeError("data timeout")

        # Should have emitted: price_fetch + error
        self.assertEqual(mock_emit.call_count, 2)
        error_call = mock_emit.call_args_list[1]
        self.assertEqual(error_call.kwargs["event_type"], "error")
        self.assertEqual(error_call.kwargs["outcome"], "error")
        self.assertIn("data timeout", error_call.kwargs["payload"]["error"])

    @patch.object(AgentClient, "emit")
    def test_error_stage_includes_cycle_id_and_instrument(self, mock_emit):
        mock_emit.return_value = {"id": 13}

        with self.assertRaises(ValueError):
            with self.client.pipeline("cycle_X", "MYM") as p:
                raise ValueError("bad value")

        error_call = mock_emit.call_args_list[0]
        self.assertEqual(error_call.kwargs["cycle_id"], "cycle_X")
        self.assertEqual(error_call.kwargs["instrument"], "MYM")

    @patch.object(AgentClient, "emit")
    def test_pipeline_without_instrument(self, mock_emit):
        mock_emit.return_value = {"id": 14}

        with self.client.pipeline("cycle_no_inst") as p:
            p.stage("signal", outcome="pass")

        self.assertEqual(mock_emit.call_args.kwargs["instrument"], "")
        self.assertEqual(mock_emit.call_args.kwargs["cycle_id"], "cycle_no_inst")

    @patch.object(AgentClient, "emit")
    def test_pipeline_context_does_not_swallow_exception(self, mock_emit):
        """The context manager should NOT suppress the original exception."""
        mock_emit.return_value = {"id": 15}

        with self.assertRaises(ZeroDivisionError):
            with self.client.pipeline("cycle_div") as p:
                _ = 1 / 0

    @patch.object(AgentClient, "emit")
    def test_error_emit_failure_does_not_mask_original_exception(self, mock_emit):
        """If emitting the error stage itself fails, the original exception still propagates."""
        mock_emit.side_effect = requests.ConnectionError("network down")

        with self.assertRaises(TypeError):
            with self.client.pipeline("cycle_double_err") as p:
                raise TypeError("original error")


if __name__ == "__main__":
    unittest.main()
