"""WebSocket consumers for live event streaming."""

import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class EventStreamConsumer(AsyncJsonWebsocketConsumer):
    """Live event stream — global or per-agent.

    Connect to:
        ws/events/          → all events across all agents
        ws/events/{agent_id}/ → events for a specific agent
    """

    async def connect(self):
        self.agent_id = self.scope["url_route"]["kwargs"].get("agent_id")

        # Always join the global feed
        self.global_group = "events_global"
        await self.channel_layer.group_add(self.global_group, self.channel_name)

        # If agent-specific, also join that group
        self.agent_group = None
        if self.agent_id:
            self.agent_group = f"events_agent_{self.agent_id}"
            await self.channel_layer.group_add(self.agent_group, self.channel_name)

        await self.accept()

        # Send welcome message
        await self.send_json(
            {
                "type": "connection_established",
                "agent_id": self.agent_id,
                "message": "Connected to live event stream.",
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.global_group, self.channel_name)
        if self.agent_group:
            await self.channel_layer.group_discard(self.agent_group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """Handle client messages (ping/pong, filters)."""
        msg_type = content.get("type")

        if msg_type == "ping":
            await self.send_json({"type": "pong"})

    # --- Group message handlers ---

    async def event_new(self, message):
        """Broadcast a new event to connected clients."""
        await self.send_json(
            {
                "type": "event_new",
                "event": message["event"],
            }
        )

    async def event_batch(self, message):
        """Broadcast a batch of new events."""
        await self.send_json(
            {
                "type": "event_batch",
                "events": message["events"],
                "count": message["count"],
            }
        )
