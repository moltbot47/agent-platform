"""Django admin for events."""

from django.contrib import admin

from .models import AgentEvent, AgentMetric, DecisionPipelineRun


@admin.register(AgentEvent)
class AgentEventAdmin(admin.ModelAdmin):
    list_display = ["agent", "event_type", "outcome", "instrument", "confidence", "timestamp"]
    list_filter = ["event_type", "outcome", "agent"]
    search_fields = ["agent__name", "instrument", "cycle_id"]
    readonly_fields = ["id", "created_at"]
    date_hierarchy = "timestamp"


@admin.register(AgentMetric)
class AgentMetricAdmin(admin.ModelAdmin):
    list_display = ["agent", "name", "value", "instrument", "timestamp"]
    list_filter = ["name", "agent"]
    search_fields = ["agent__name", "name"]
    date_hierarchy = "timestamp"


@admin.register(DecisionPipelineRun)
class DecisionPipelineRunAdmin(admin.ModelAdmin):
    list_display = [
        "agent", "instrument", "final_outcome",
        "total_stages", "passed_stages", "duration_ms", "started_at",
    ]
    list_filter = ["final_outcome", "agent"]
    search_fields = ["agent__name", "cycle_id", "instrument"]
    date_hierarchy = "started_at"
