"""Tests for WebSocket event streaming."""

from unittest.mock import AsyncMock, patch, MagicMock

from django.test import TestCase

from agents.models import Agent
from events.models import AgentEvent
from events.broadcast import broadcast_event, broadcast_event_batch, _make_json_safe


class BroadcastTests(TestCase):
    """Test the broadcast utility functions."""

    def setUp(self):
        self.agent = Agent.objects.create(
            name="test-ws-agent",
            display_name="WS Test Agent",
            agent_type="trading",
            status="active",
        )

    @patch("events.broadcast.get_channel_layer")
    def test_broadcast_event_sends_to_global_and_agent_groups(self, mock_get_layer):
        """broadcast_event sends to both events_global and agent-specific groups."""
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        event = AgentEvent.objects.create(
            agent=self.agent,
            event_type="signal",
            outcome="pass",
            instrument="BTC-USD",
            confidence=0.85,
        )

        broadcast_event(event)

        # Should have been called twice (global + agent)
        self.assertEqual(mock_layer.group_send.call_count, 2)

        # Check global group call
        global_call = mock_layer.group_send.call_args_list[0]
        self.assertEqual(global_call[0][0], "events_global")
        self.assertEqual(global_call[0][1]["type"], "event.new")
        self.assertIn("event", global_call[0][1])

        # Check agent group call
        agent_call = mock_layer.group_send.call_args_list[1]
        self.assertEqual(agent_call[0][0], f"events_agent_{self.agent.id}")

    @patch("events.broadcast.get_channel_layer")
    def test_broadcast_event_batch_sends_to_groups(self, mock_get_layer):
        """broadcast_event_batch sends batch to global + agent groups."""
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        events = [
            AgentEvent.objects.create(
                agent=self.agent,
                event_type="signal",
                outcome="pass",
            ),
            AgentEvent.objects.create(
                agent=self.agent,
                event_type="execution",
                outcome="pass",
            ),
        ]

        broadcast_event_batch(events)

        # Global + 1 agent group
        self.assertEqual(mock_layer.group_send.call_count, 2)

        global_call = mock_layer.group_send.call_args_list[0]
        self.assertEqual(global_call[0][1]["type"], "event.batch")
        self.assertEqual(global_call[0][1]["count"], 2)

    @patch("events.broadcast.get_channel_layer")
    def test_broadcast_no_channel_layer_is_noop(self, mock_get_layer):
        """broadcast_event does nothing when channel layer is None."""
        mock_get_layer.return_value = None

        event = AgentEvent.objects.create(
            agent=self.agent,
            event_type="heartbeat",
        )

        # Should not raise
        broadcast_event(event)
        broadcast_event_batch([event])

    def test_make_json_safe_converts_types(self):
        """_make_json_safe handles UUIDs and nested structures."""
        import uuid
        from datetime import datetime

        data = {
            "id": uuid.uuid4(),
            "timestamp": datetime(2026, 1, 1, 12, 0, 0),
            "nested": {"values": [uuid.uuid4(), "string"]},
            "number": 42,
        }
        result = _make_json_safe(data)

        self.assertIsInstance(result["id"], str)
        self.assertIsInstance(result["timestamp"], str)
        self.assertIsInstance(result["nested"]["values"][0], str)
        self.assertEqual(result["number"], 42)

    @patch("events.broadcast.get_channel_layer")
    def test_broadcast_empty_batch_is_noop(self, mock_get_layer):
        """broadcast_event_batch with empty list does nothing."""
        mock_layer = MagicMock()
        mock_get_layer.return_value = mock_layer

        broadcast_event_batch([])

        mock_layer.group_send.assert_not_called()
