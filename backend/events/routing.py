"""WebSocket URL routing for events."""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/events/(?P<agent_id>[0-9a-f-]+)/$",
        consumers.EventStreamConsumer.as_asgi(),
    ),
    re_path(
        r"ws/events/$",
        consumers.EventStreamConsumer.as_asgi(),
    ),
]
