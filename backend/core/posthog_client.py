"""PostHog SDK wrapper — centralizes all analytics capture.

Captures agent events as PostHog events where each agent is a distinct "user".
Falls back to no-op if POSTHOG_API_KEY is not configured.
"""

import logging
import threading

from django.conf import settings

logger = logging.getLogger(__name__)

_posthog = None
_initialized = False
_init_lock = threading.Lock()


def _get_client():
    """Lazy-initialize the PostHog client (thread-safe)."""
    global _posthog, _initialized
    if _initialized:
        return _posthog
    with _init_lock:
        if _initialized:
            return _posthog

        api_key = getattr(settings, "POSTHOG_API_KEY", "")
        if not api_key:
            logger.info("PostHog API key not configured — analytics disabled.")
            _initialized = True
            return None

        try:
            import posthog

            posthog.project_api_key = api_key
            posthog.host = getattr(settings, "POSTHOG_HOST", "https://us.i.posthog.com")
            posthog.debug = getattr(settings, "DEBUG", False)
            _posthog = posthog
            logger.info("PostHog initialized (host=%s)", posthog.host)
        except ImportError:
            logger.warning("posthog package not installed — analytics disabled.")

        _initialized = True
    return _posthog


def capture(distinct_id: str, event: str, properties: dict | None = None):
    """Capture an event in PostHog.

    Args:
        distinct_id: Agent UUID (each agent is a PostHog "user").
        event: Event name (e.g. "agent_registered", "prediction_made").
        properties: Event properties dict.
    """
    client = _get_client()
    if client is None:
        return
    try:
        client.capture(distinct_id=str(distinct_id), event=event, properties=properties or {})
    except Exception:
        logger.exception("PostHog capture failed for event=%s", event)


def identify(distinct_id: str, properties: dict | None = None):
    """Identify an agent as a PostHog user with traits.

    Args:
        distinct_id: Agent UUID.
        properties: Agent properties (name, type, owner, etc.).
    """
    client = _get_client()
    if client is None:
        return
    try:
        client.identify(distinct_id=str(distinct_id), properties=properties or {})
    except Exception:
        logger.exception("PostHog identify failed for %s", distinct_id)


def shutdown():
    """Flush pending events on shutdown."""
    client = _get_client()
    if client is not None:
        try:
            client.shutdown()
        except Exception:
            pass
