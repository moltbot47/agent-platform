"""URL routing for events API."""

from django.urls import path

from . import views

app_name = "events"

urlpatterns = [
    # Ingest endpoints (API key auth)
    path("events/", views.EventIngestView.as_view(), name="event-ingest"),
    path("events/batch/", views.EventBatchIngestView.as_view(), name="event-batch-ingest"),
    # Browse all events (public)
    path("events/all/", views.AllEventsListView.as_view(), name="event-list-all"),
    # Per-agent events
    path("agents/<uuid:pk>/events/", views.AgentEventListView.as_view(), name="agent-events"),
    path("agents/<uuid:pk>/metrics/", views.AgentMetricListView.as_view(), name="agent-metrics"),
    # Pipeline runs
    path(
        "agents/<uuid:pk>/pipeline-runs/",
        views.PipelineRunListView.as_view(),
        name="agent-pipeline-runs",
    ),
    path(
        "pipeline-runs/<uuid:pk>/",
        views.PipelineRunDetailView.as_view(),
        name="pipeline-run-detail",
    ),
    # Dashboard aggregation
    path("metrics/dashboard/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
]
