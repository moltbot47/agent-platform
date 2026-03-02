"""Custom permissions for the Agent Platform."""

from rest_framework.permissions import BasePermission

from agents.models import AgentAPIKey


class IsAgentAuthenticated(BasePermission):
    """Allow access only to requests authenticated with a valid agent API key."""

    def has_permission(self, request, view):
        return isinstance(getattr(request, "auth", None), AgentAPIKey)


class IsAgentOwner(BasePermission):
    """Allow access only if the API key belongs to the agent being accessed."""

    def has_object_permission(self, request, view, obj):
        api_key = getattr(request, "auth", None)
        if not isinstance(api_key, AgentAPIKey):
            return False
        return api_key.agent_id == obj.id
