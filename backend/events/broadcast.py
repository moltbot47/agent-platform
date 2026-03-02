"""Broadcast events to WebSocket consumers via channel layer."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .serializers import AgentEventSerializer

logger = logging.getLogger(__name__)


def broadcast_event(event):
    """Broadcast a single event to global + agent-specific groups."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    data = AgentEventSerializer(event).data
    # Convert non-serializable types
    payload = {
        "type": "event.new",
        "event": _make_json_safe(data),
    }

    send = async_to_sync(channel_layer.group_send)

    # Global feed
    try:
        send("events_global", payload)
    except Exception:
        logger.exception("Failed to broadcast to events_global")

    # Agent-specific feed
    try:
        send(f"events_agent_{event.agent_id}", payload)
    except Exception:
        logger.exception("Failed to broadcast to agent group")


def broadcast_event_batch(events):
    """Broadcast a batch of events."""
    if not events:
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    data = [_make_json_safe(AgentEventSerializer(e).data) for e in events]
    payload = {
        "type": "event.batch",
        "events": data,
        "count": len(data),
    }

    send = async_to_sync(channel_layer.group_send)

    try:
        send("events_global", payload)
    except Exception:
        logger.exception("Failed to broadcast batch to events_global")

    # Also send to each unique agent group
    agent_ids = set(str(e.agent_id) for e in events)
    for agent_id in agent_ids:
        agent_events = [d for d, e in zip(data, events) if str(e.agent_id) == agent_id]
        try:
            send(
                f"events_agent_{agent_id}",
                {
                    "type": "event.batch",
                    "events": agent_events,
                    "count": len(agent_events),
                },
            )
        except Exception:
            logger.exception("Failed to broadcast batch to agent %s", agent_id)


def _make_json_safe(data):
    """Ensure all values are JSON serializable (convert UUIDs, datetimes)."""
    if isinstance(data, dict):
        return {k: _make_json_safe(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_make_json_safe(v) for v in data]
    if hasattr(data, "isoformat"):
        return data.isoformat()
    if hasattr(data, "hex") and not isinstance(data, (str, bytes)):
        return str(data)
    return data
