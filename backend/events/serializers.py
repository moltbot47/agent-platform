"""DRF serializers for event models."""

from rest_framework import serializers

from .models import AgentEvent, AgentMetric, DecisionPipelineRun


class AgentEventSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source="agent.name", read_only=True)

    class Meta:
        model = AgentEvent
        fields = [
            "id", "agent", "agent_name", "pipeline_run",
            "event_type", "outcome", "instrument", "confidence",
            "payload", "cycle_id", "duration_ms", "timestamp", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AgentEventIngestSerializer(serializers.Serializer):
    """Accepts events from agents via API key auth.

    The agent is inferred from the API key — not submitted in the payload.
    """

    event_type = serializers.ChoiceField(choices=AgentEvent.EventType.choices)
    outcome = serializers.ChoiceField(
        choices=AgentEvent.Outcome.choices, required=False, default="pending"
    )
    instrument = serializers.CharField(required=False, default="", allow_blank=True)
    confidence = serializers.FloatField(required=False, allow_null=True, default=None)
    payload = serializers.JSONField(required=False, default=dict)
    cycle_id = serializers.CharField(required=False, default="", allow_blank=True)
    duration_ms = serializers.IntegerField(required=False, allow_null=True, default=None)
    timestamp = serializers.DateTimeField(required=False)


class AgentEventBatchSerializer(serializers.Serializer):
    """Batch ingest — up to 100 events at once."""

    events = AgentEventIngestSerializer(many=True)

    def validate_events(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("Maximum 100 events per batch.")
        return value


class AgentMetricSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source="agent.name", read_only=True)

    class Meta:
        model = AgentMetric
        fields = [
            "id", "agent", "agent_name", "name", "value",
            "instrument", "tier", "tags", "timestamp",
        ]
        read_only_fields = ["id"]


class DecisionPipelineRunSerializer(serializers.ModelSerializer):
    events = AgentEventSerializer(many=True, read_only=True)
    agent_name = serializers.CharField(source="agent.name", read_only=True)

    class Meta:
        model = DecisionPipelineRun
        fields = [
            "id", "agent", "agent_name", "cycle_id", "instrument",
            "final_outcome", "total_stages", "passed_stages",
            "blocked_at_stage", "duration_ms", "started_at", "completed_at",
            "events",
        ]
        read_only_fields = ["id"]


class DecisionPipelineRunListSerializer(serializers.ModelSerializer):
    """Lightweight pipeline run without nested events."""

    agent_name = serializers.CharField(source="agent.name", read_only=True)

    class Meta:
        model = DecisionPipelineRun
        fields = [
            "id", "agent", "agent_name", "cycle_id", "instrument",
            "final_outcome", "total_stages", "passed_stages",
            "blocked_at_stage", "duration_ms", "started_at", "completed_at",
        ]


class DashboardSummarySerializer(serializers.Serializer):
    """Dashboard aggregation response."""

    total_events = serializers.IntegerField()
    events_today = serializers.IntegerField()
    total_pipeline_runs = serializers.IntegerField()
    pass_rate = serializers.FloatField()
    avg_duration_ms = serializers.FloatField(allow_null=True)
    event_type_counts = serializers.DictField(child=serializers.IntegerField())
    outcome_counts = serializers.DictField(child=serializers.IntegerField())
