"""API views for Agent registry and management."""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAgentOwner

from .models import Agent, AgentLicense
from .serializers import (
    AgentDetailSerializer,
    AgentLicenseSerializer,
    AgentListSerializer,
    AgentOwnershipSerializer,
    AgentRegistrationResponseSerializer,
    AgentRegistrationSerializer,
    AgentReputationSerializer,
)


class AgentListView(generics.ListAPIView):
    """List all registered agents (public)."""

    serializer_class = AgentListSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Agent.objects.select_related("ownership", "reputation").all()
        agent_type = self.request.query_params.get("type")
        if agent_type:
            qs = qs.filter(agent_type=agent_type)
        agent_status = self.request.query_params.get("status")
        if agent_status:
            qs = qs.filter(status=agent_status)
        return qs


class AgentDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update an agent."""

    queryset = Agent.objects.select_related("ownership", "reputation").prefetch_related("licenses")
    serializer_class = AgentDetailSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAgentOwner()]
        return [AllowAny()]


class AgentRegisterView(APIView):
    """Public agent registration. Returns agent + API key."""

    permission_classes = [AllowAny]

    @extend_schema(
        request=AgentRegistrationSerializer,
        responses={201: AgentRegistrationResponseSerializer},
    )
    def post(self, request):
        serializer = AgentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        agent_data = AgentDetailSerializer(result["agent"]).data
        return Response(
            {
                "agent": agent_data,
                "api_key": result["api_key"],
                "api_key_prefix": result["api_key_prefix"],
                "message": (
                    "Agent registered successfully. Save your API key — "
                    "it will not be shown again."
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class AgentReputationView(generics.RetrieveAPIView):
    """Get reputation breakdown for an agent."""

    serializer_class = AgentReputationSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        agent = generics.get_object_or_404(Agent, pk=self.kwargs["pk"])
        return getattr(agent, "reputation", None)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response({"detail": "No reputation data yet."}, status=404)
        return super().retrieve(request, *args, **kwargs)


class AgentOwnershipView(generics.RetrieveAPIView):
    """Get ownership info for an agent."""

    serializer_class = AgentOwnershipSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        agent = generics.get_object_or_404(Agent, pk=self.kwargs["pk"])
        return getattr(agent, "ownership", None)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response({"detail": "No ownership data."}, status=404)
        return super().retrieve(request, *args, **kwargs)


class AgentLicenseListView(generics.ListCreateAPIView):
    """List or create licenses for an agent."""

    serializer_class = AgentLicenseSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return AgentLicense.objects.filter(agent_id=self.kwargs["pk"])

    def perform_create(self, serializer):
        agent = generics.get_object_or_404(Agent, pk=self.kwargs["pk"])
        serializer.save(agent=agent)


class MarketplaceView(generics.ListAPIView):
    """Browse agents sorted by reputation (public marketplace)."""

    serializer_class = AgentListSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            Agent.objects.filter(status=Agent.Status.ACTIVE)
            .select_related("ownership", "reputation")
            .order_by("-reputation__overall_score")
        )
