"""URL routing for agents API."""

from django.urls import path

from . import views

app_name = "agents"

urlpatterns = [
    path("register/", views.AgentRegisterView.as_view(), name="register"),
    path("agents/", views.AgentListView.as_view(), name="agent-list"),
    path("agents/<uuid:pk>/", views.AgentDetailView.as_view(), name="agent-detail"),
    path("agents/<uuid:pk>/reputation/", views.AgentReputationView.as_view(), name="agent-reputation"),
    path("agents/<uuid:pk>/ownership/", views.AgentOwnershipView.as_view(), name="agent-ownership"),
    path("agents/<uuid:pk>/licenses/", views.AgentLicenseListView.as_view(), name="agent-licenses"),
    path("agents/<uuid:pk>/heartbeat/", views.AgentHeartbeatView.as_view(), name="agent-heartbeat"),
    path("marketplace/", views.MarketplaceView.as_view(), name="marketplace"),
]
