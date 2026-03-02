"""API key authentication for agents."""

import hashlib

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class AgentAPIKeyAuthentication(BaseAuthentication):
    """Authenticate agents via Bearer token (API key).

    Usage: ``Authorization: Bearer ak_...``

    The key is hashed with SHA-256 and looked up in ``AgentAPIKey``.
    """

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        raw_key = auth_header[len(self.keyword) + 1 :]
        if not raw_key.startswith("ak_"):
            return None

        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        from agents.models import AgentAPIKey

        try:
            api_key = AgentAPIKey.objects.select_related("agent").get(
                key_hash=key_hash,
                is_active=True,
            )
        except AgentAPIKey.DoesNotExist:
            raise AuthenticationFailed("Invalid or inactive API key.")

        api_key.mark_used()
        # Return (user=None, auth=api_key) — agent auth, not user auth
        return (None, api_key)

    def authenticate_header(self, request):
        return self.keyword
