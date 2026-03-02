"""Agent Platform SDK client.

Usage:
    from agent_platform import AgentClient

    client = AgentClient(api_key="ak_your_key_here")
    client.emit("prediction", instrument="BTC-USD", payload={
        "direction": "long",
        "confidence": 0.72,
    })
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "http://localhost:8000"


class AgentClient:
    """Client for the Agent Platform API.

    Args:
        api_key: Your agent API key (starts with ak_).
        base_url: Platform URL (default: http://localhost:8000).
        timeout: Request timeout in seconds.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 10,
    ):
        if not api_key.startswith("ak_"):
            raise ValueError("API key must start with 'ak_'")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })

    def emit(
        self,
        event_type: str,
        instrument: str = "",
        outcome: str = "pending",
        confidence: float | None = None,
        payload: dict[str, Any] | None = None,
        cycle_id: str = "",
        duration_ms: int | None = None,
        timestamp: datetime | None = None,
    ) -> dict:
        """Send a single event to the platform.

        Args:
            event_type: Event type (use EventType constants).
            instrument: Trading instrument (e.g. "BTC-USD", "MNQ").
            outcome: Event outcome (pass/block/win/loss/pending).
            confidence: Confidence score (0.0 - 1.0).
            payload: Additional event data.
            cycle_id: Group events from the same decision cycle.
            duration_ms: How long this step took (ms).
            timestamp: Event timestamp (default: now).

        Returns:
            Created event data from the API.
        """
        data: dict[str, Any] = {
            "event_type": event_type,
            "outcome": outcome,
            "instrument": instrument,
        }
        if confidence is not None:
            data["confidence"] = confidence
        if payload:
            data["payload"] = payload
        if cycle_id:
            data["cycle_id"] = cycle_id
        if duration_ms is not None:
            data["duration_ms"] = duration_ms
        if timestamp:
            data["timestamp"] = timestamp.isoformat()

        try:
            response = self._session.post(
                f"{self.base_url}/api/v1/events/",
                json=data,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            logger.error("Failed to emit event %s: %s", event_type, exc)
            raise

    def emit_batch(self, events: list[dict[str, Any]]) -> dict:
        """Send up to 100 events in a single request.

        Args:
            events: List of event dicts (same fields as emit()).

        Returns:
            Response with created count.
        """
        if len(events) > 100:
            raise ValueError("Maximum 100 events per batch")

        try:
            response = self._session.post(
                f"{self.base_url}/api/v1/events/batch/",
                json={"events": events},
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            logger.error("Failed to emit batch (%d events): %s", len(events), exc)
            raise

    def heartbeat(self) -> dict:
        """Send a heartbeat to mark the agent as online.

        Returns:
            Response data.
        """
        return self.emit("heartbeat")

    def pipeline(
        self,
        cycle_id: str,
        instrument: str = "",
    ) -> PipelineContext:
        """Create a pipeline context for tracking a decision cycle.

        Usage:
            with client.pipeline("cycle_001", "BTC-USD") as p:
                p.stage("price_fetch", outcome="pass", payload={...})
                p.stage("momentum", outcome="pass", confidence=0.7)
                p.stage("edge_gate", outcome="block")

        Returns:
            PipelineContext context manager.
        """
        return PipelineContext(self, cycle_id, instrument)


class PipelineContext:
    """Context manager for tracking a decision pipeline."""

    def __init__(self, client: AgentClient, cycle_id: str, instrument: str = ""):
        self.client = client
        self.cycle_id = cycle_id
        self.instrument = instrument
        self.stages: list[dict] = []

    def __enter__(self) -> PipelineContext:
        return self

    def __exit__(self, exc_type: type | None, exc_val: Exception | None, exc_tb: Any) -> None:
        if exc_type:
            try:
                self.stage("error", outcome="error", payload={"error": str(exc_val)})
            except Exception:
                logger.warning("Failed to emit error stage during pipeline cleanup")

    def stage(
        self,
        event_type: str,
        outcome: str = "pass",
        confidence: float | None = None,
        payload: dict[str, Any] | None = None,
        duration_ms: int | None = None,
    ) -> dict:
        """Record a pipeline stage."""
        result = self.client.emit(
            event_type=event_type,
            instrument=self.instrument,
            outcome=outcome,
            confidence=confidence,
            payload=payload,
            cycle_id=self.cycle_id,
            duration_ms=duration_ms,
        )
        self.stages.append(result)
        return result
