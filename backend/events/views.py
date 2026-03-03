"""API views for event capture, querying, and dashboard aggregation."""

import logging

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from agents.models import Agent, AgentAPIKey
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

logger = logging.getLogger(__name__)


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

        # Auto-build pipeline runs on resolution/execution events
        if event.event_type in ("resolution", "execution", "claim") and event.cycle_id:
            try:
                from bridge.pipeline_builder import build_pipeline_runs
                from agents.reputation import recalculate_reputation
                build_pipeline_runs(agent, limit=500)
                if event.event_type == "resolution":
                    recalculate_reputation(agent, window_days=30)
            except Exception:
                logger.warning("Auto-pipeline build failed for %s", agent.name, exc_info=True)

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
            # Support comma-separated event types (e.g. "execution,resolution")
            types = [t.strip() for t in event_type.split(",") if t.strip()]
            if len(types) == 1:
                qs = qs.filter(event_type=types[0])
            else:
                qs = qs.filter(event_type__in=types)

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
        try:
            buckets = max(1, min(int(request.query_params.get("buckets", 10)), 100))
        except (ValueError, TypeError):
            return Response(
                {"detail": "buckets must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = get_calibration_data(str(pk), buckets=buckets)
        return Response(data)


class PnLCurveView(APIView):
    """Cumulative PnL curve for an agent."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 500)), 10000))
        except (ValueError, TypeError):
            return Response(
                {"detail": "limit must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = get_pnl_curve(str(pk), limit=limit)
        return Response(data)


class OutcomeByTypeView(APIView):
    """Win/loss breakdown by event type."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        data = get_outcome_by_type(str(pk))
        return Response(data)


class TradingStatsView(APIView):
    """Per-agent trading stats: W/L, PnL, recent trades, instrument breakdown."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404

        agent = get_object_or_404(Agent, pk=pk)
        agent_id = str(agent.pk)

        # Resolved trades (win/loss)
        resolved = AgentEvent.objects.filter(
            agent_id=agent_id,
            event_type="resolution",
            outcome__in=["win", "loss"],
        )
        agg = resolved.aggregate(
            total=Count("id"),
            wins=Count("id", filter=Q(outcome="win")),
            losses=Count("id", filter=Q(outcome="loss")),
        )

        # PnL from payloads — single pass, also accumulate per-instrument
        total_pnl = 0.0
        instrument_pnl: dict[str, float] = {}
        for ev in resolved.values("payload", "instrument"):
            if isinstance(ev["payload"], dict):
                pnl_val = float(ev["payload"].get("pnl", 0))
                total_pnl += pnl_val
                instrument_pnl[ev["instrument"]] = instrument_pnl.get(ev["instrument"], 0) + pnl_val

        # Session PnL (from latest resolution event payload)
        latest_resolution = resolved.order_by("-timestamp").first()
        session_pnl = 0.0
        if latest_resolution and isinstance(latest_resolution.payload, dict):
            session_pnl = float(latest_resolution.payload.get("session_pnl", 0))

        # Recent trades (last 20 execution + resolution events)
        recent = (
            AgentEvent.objects.filter(
                agent_id=agent_id,
                event_type__in=["execution", "resolution"],
            )
            .order_by("-timestamp")[:20]
        )
        recent_trades = []
        for ev in recent:
            payload = ev.payload if isinstance(ev.payload, dict) else {}
            recent_trades.append({
                "id": str(ev.id),
                "event_type": ev.event_type,
                "outcome": ev.outcome,
                "instrument": ev.instrument,
                "confidence": ev.confidence,
                "timestamp": ev.timestamp.isoformat(),
                "direction": payload.get("direction", ""),
                "entry_price": payload.get("entry_price"),
                "shares": payload.get("shares"),
                "size_usdc": payload.get("size_usdc"),
                "pnl": payload.get("pnl"),
                "result": payload.get("result", ""),
                "signal_reason": payload.get("signal_reason", ""),
            })

        # Instrument breakdown (uses pre-computed instrument_pnl)
        instrument_stats = (
            resolved.values("instrument")
            .annotate(
                total=Count("id"),
                wins=Count("id", filter=Q(outcome="win")),
                losses=Count("id", filter=Q(outcome="loss")),
            )
            .order_by("-total")
        )
        instruments = []
        for row in instrument_stats:
            wr = row["wins"] / row["total"] if row["total"] > 0 else 0
            instruments.append({
                "instrument": row["instrument"],
                "total": row["total"],
                "wins": row["wins"],
                "losses": row["losses"],
                "win_rate": round(wr, 4),
                "pnl": round(instrument_pnl.get(row["instrument"], 0), 4),
            })

        # Open positions — SQL subquery instead of loading all cycle IDs
        open_position_qs = (
            AgentEvent.objects.filter(
                agent_id=agent_id, event_type="execution",
            )
            .exclude(cycle_id="")
            .exclude(
                cycle_id__in=AgentEvent.objects.filter(
                    agent_id=agent_id, event_type="resolution",
                ).values("cycle_id")
            )
            .order_by("-timestamp")[:20]
        )
        open_positions = []
        for ev in open_position_qs:
            payload = ev.payload if isinstance(ev.payload, dict) else {}
            open_positions.append({
                "cycle_id": ev.cycle_id,
                "instrument": ev.instrument,
                "direction": payload.get("direction", ""),
                "entry_price": payload.get("entry_price"),
                "shares": payload.get("shares"),
                "size_usdc": payload.get("size_usdc"),
                "opened_at": ev.timestamp.isoformat(),
            })

        return Response({
            "wins": agg["wins"],
            "losses": agg["losses"],
            "total_trades": agg["total"],
            "win_rate": round(agg["wins"] / agg["total"], 4) if agg["total"] > 0 else 0,
            "total_pnl": round(total_pnl, 4),
            "session_pnl": round(session_pnl, 4),
            "open_positions": open_positions,
            "open_position_count": len(open_positions),
            "recent_trades": recent_trades,
            "instruments": instruments,
        })


class BuildPipelinesView(APIView):
    """Manually trigger pipeline building for an agent (requires API key)."""

    permission_classes = [IsAgentAuthenticated]

    def post(self, request, pk):
        api_key: AgentAPIKey = request.auth
        agent = api_key.agent
        if str(agent.pk) != str(pk):
            return Response({"detail": "Agent mismatch."}, status=status.HTTP_403_FORBIDDEN)
        from bridge.pipeline_builder import build_pipeline_runs
        from agents.reputation import recalculate_reputation
        stats = build_pipeline_runs(agent, limit=50000)
        recalculate_reputation(agent, window_days=30)
        return Response(stats)
