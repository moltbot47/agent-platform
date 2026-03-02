"""API views for event capture, querying, and dashboard aggregation."""

from django.db.models import Avg, Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from agents.models import AgentAPIKey
from core.permissions import IsAgentAuthenticated
from core.posthog_client import capture as posthog_capture

from .broadcast import broadcast_event, broadcast_event_batch
from .models import AgentEvent, AgentMetric, DecisionPipelineRun
from .calibration import get_calibration_data, get_outcome_by_type, get_pnl_curve
from .serializers import (
    AgentEventBatchSerializer,
    AgentEventIngestSerializer,
    AgentEventSerializer,
    AgentMetricSerializer,
    DashboardSummarySerializer,
    DecisionPipelineRunListSerializer,
    DecisionPipelineRunSerializer,
)


class EventIngestView(APIView):
    """Ingest a single event from an authenticated agent."""

    permission_classes = [IsAgentAuthenticated]

    @extend_schema(request=AgentEventIngestSerializer, responses={201: AgentEventSerializer})
    def post(self, request):
        serializer = AgentEventIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        api_key: AgentAPIKey = request.auth
        agent = api_key.agent

        event = AgentEvent.objects.create(agent=agent, **serializer.validated_data)

        # Forward to PostHog
        posthog_capture(
            str(agent.id),
            f"agent_event:{event.event_type}",
            {
                "event_type": event.event_type,
                "outcome": event.outcome,
                "instrument": event.instrument,
                "confidence": event.confidence,
                "cycle_id": event.cycle_id,
            },
        )

        # Broadcast via WebSocket
        broadcast_event(event)

        return Response(AgentEventSerializer(event).data, status=status.HTTP_201_CREATED)


class EventBatchIngestView(APIView):
    """Batch ingest up to 100 events."""

    permission_classes = [IsAgentAuthenticated]

    @extend_schema(request=AgentEventBatchSerializer, responses={201: None})
    def post(self, request):
        serializer = AgentEventBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        api_key: AgentAPIKey = request.auth
        agent = api_key.agent

        events = []
        for event_data in serializer.validated_data["events"]:
            events.append(AgentEvent(agent=agent, **event_data))

        created = AgentEvent.objects.bulk_create(events)

        # Forward each to PostHog
        for event in created:
            posthog_capture(
                str(agent.id),
                f"agent_event:{event.event_type}",
                {
                    "event_type": event.event_type,
                    "outcome": event.outcome,
                    "instrument": event.instrument,
                },
            )

        # Broadcast batch via WebSocket
        broadcast_event_batch(created)

        return Response(
            {"created": len(created), "message": f"Ingested {len(created)} events."},
            status=status.HTTP_201_CREATED,
        )


class AgentEventListView(generics.ListAPIView):
    """List events for a specific agent (filterable)."""

    serializer_class = AgentEventSerializer
    permission_classes = [AllowAny]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = AgentEvent.objects.filter(agent_id=self.kwargs["pk"]).select_related("agent")

        # Filter by event_type
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        # Filter by outcome
        outcome = self.request.query_params.get("outcome")
        if outcome:
            qs = qs.filter(outcome=outcome)

        # Filter by instrument
        instrument = self.request.query_params.get("instrument")
        if instrument:
            qs = qs.filter(instrument=instrument)

        # Filter by cycle_id
        cycle_id = self.request.query_params.get("cycle_id")
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)

        # Date range
        since = self.request.query_params.get("since")
        if since:
            qs = qs.filter(timestamp__gte=since)

        until = self.request.query_params.get("until")
        if until:
            qs = qs.filter(timestamp__lte=until)

        return qs


class AllEventsListView(generics.ListAPIView):
    """List all events across all agents (for EventExplorer page)."""

    serializer_class = AgentEventSerializer
    permission_classes = [AllowAny]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = AgentEvent.objects.select_related("agent").all()

        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        outcome = self.request.query_params.get("outcome")
        if outcome:
            qs = qs.filter(outcome=outcome)

        instrument = self.request.query_params.get("instrument")
        if instrument:
            qs = qs.filter(instrument=instrument)

        agent_id = self.request.query_params.get("agent")
        if agent_id:
            qs = qs.filter(agent_id=agent_id)

        return qs


class AgentMetricListView(generics.ListAPIView):
    """List metrics for a specific agent."""

    serializer_class = AgentMetricSerializer
    permission_classes = [AllowAny]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = AgentMetric.objects.filter(agent_id=self.kwargs["pk"]).select_related("agent")

        name = self.request.query_params.get("name")
        if name:
            qs = qs.filter(name=name)

        instrument = self.request.query_params.get("instrument")
        if instrument:
            qs = qs.filter(instrument=instrument)

        return qs


class PipelineRunListView(generics.ListAPIView):
    """List pipeline runs for a specific agent."""

    serializer_class = DecisionPipelineRunListSerializer
    permission_classes = [AllowAny]
    ordering = ["-started_at"]

    def get_queryset(self):
        qs = DecisionPipelineRun.objects.filter(
            agent_id=self.kwargs["pk"]
        ).select_related("agent")

        outcome = self.request.query_params.get("outcome")
        if outcome:
            qs = qs.filter(final_outcome=outcome)

        instrument = self.request.query_params.get("instrument")
        if instrument:
            qs = qs.filter(instrument=instrument)

        return qs


class PipelineRunDetailView(generics.RetrieveAPIView):
    """Get a specific pipeline run with all nested events."""

    serializer_class = DecisionPipelineRunSerializer
    permission_classes = [AllowAny]
    queryset = DecisionPipelineRun.objects.select_related("agent").prefetch_related("events")


class DashboardSummaryView(APIView):
    """Aggregated metrics for the dashboard."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: DashboardSummarySerializer})
    def get(self, request):
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        total_events = AgentEvent.objects.count()
        events_today = AgentEvent.objects.filter(timestamp__gte=today).count()
        total_runs = DecisionPipelineRun.objects.count()

        # Pass rate
        if total_runs > 0:
            passed = DecisionPipelineRun.objects.filter(
                final_outcome__in=["pass", "win"]
            ).count()
            pass_rate = round(passed / total_runs * 100, 1)
        else:
            pass_rate = 0.0

        # Avg pipeline duration
        avg_duration = DecisionPipelineRun.objects.aggregate(
            avg=Avg("duration_ms")
        )["avg"]

        # Event type counts
        type_counts = dict(
            AgentEvent.objects.values_list("event_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Outcome counts
        outcome_counts = dict(
            AgentEvent.objects.values_list("outcome")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        data = {
            "total_events": total_events,
            "events_today": events_today,
            "total_pipeline_runs": total_runs,
            "pass_rate": pass_rate,
            "avg_duration_ms": round(avg_duration, 1) if avg_duration else None,
            "event_type_counts": type_counts,
            "outcome_counts": outcome_counts,
        }
        return Response(DashboardSummarySerializer(data).data)


class CalibrationView(APIView):
    """Confidence calibration data for an agent."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        buckets = int(request.query_params.get("buckets", 10))
        data = get_calibration_data(str(pk), buckets=buckets)
        return Response(data)


class PnLCurveView(APIView):
    """Cumulative PnL curve for an agent."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        limit = int(request.query_params.get("limit", 500))
        data = get_pnl_curve(str(pk), limit=limit)
        return Response(data)


class OutcomeByTypeView(APIView):
    """Win/loss breakdown by event type."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        data = get_outcome_by_type(str(pk))
        return Response(data)
