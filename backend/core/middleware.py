"""
Request logging middleware with structured JSON output.

Logs every HTTP request/response cycle with:
- HTTP method, path, status code, duration (ms)
- Correlation ID (X-Request-ID header or auto-generated UUID)
- Authenticated user / API key identity (redacted)
- Content-Length of the response

12-Factor compliant: all log output goes to stdout via Python's
logging module. Configure the LOGGING dict in settings.py to
control format and verbosity.
"""

import json
import logging
import time
import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("agent_platform.requests")


class RequestLoggingMiddleware:
    """
    Django middleware that emits a structured JSON log line for every
    request/response cycle.

    Attach a correlation ID to every request (from the incoming
    ``X-Request-ID`` header, or a freshly generated UUID4). The same
    ID is returned in the response header so callers can correlate
    their client-side logs with server-side entries.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # --- Correlation ID ---
        request_id = request.META.get(
            "HTTP_X_REQUEST_ID", str(uuid.uuid4())
        )
        request.request_id = request_id  # type: ignore[attr-defined]

        # --- Start timer ---
        start = time.monotonic()

        # --- Process request ---
        response = self.get_response(request)

        # --- Calculate duration ---
        duration_ms = round((time.monotonic() - start) * 1000, 2)

        # --- Resolve identity ---
        identity = self._resolve_identity(request)

        # --- Build structured log payload ---
        log_data = {
            "event": "http_request",
            "request_id": request_id,
            "method": request.method,
            "path": request.get_full_path(),
            "status": response.status_code,
            "duration_ms": duration_ms,
            "content_length": response.get("Content-Length", 0),
            "identity": identity,
            "remote_addr": self._get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
        }

        # --- Choose log level by status code ---
        if response.status_code >= 500:
            logger.error(json.dumps(log_data))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_data))
        else:
            logger.info(json.dumps(log_data))

        # --- Echo correlation ID back to the caller ---
        response["X-Request-ID"] = request_id

        return response

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_identity(request: HttpRequest) -> str:
        """
        Return a redacted representation of who made the request.

        Priority:
        1. Authenticated Django user  -> "user:<username>"
        2. API key (from auth header) -> "apikey:<first8>..."
        3. Anonymous                  -> "anonymous"
        """
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            return f"user:{user.username}"

        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header:
            # Redact: show only the first 8 characters of the credential
            parts = auth_header.split(" ", 1)
            if len(parts) == 2:
                scheme, credential = parts
                redacted = credential[:8] + "..." if len(credential) > 8 else credential[:4] + "..."
                return f"apikey:{redacted}"

        return "anonymous"

    @staticmethod
    def _get_client_ip(request: HttpRequest) -> str:
        """
        Extract the originating client IP, respecting ``X-Forwarded-For``
        when behind a reverse proxy.
        """
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded_for:
            # Take the first (leftmost) IP in the chain
            return forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")
