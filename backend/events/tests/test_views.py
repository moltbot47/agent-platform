"""Tests for event API views."""

import hashlib

from django.test import TestCase
from rest_framework.test import APIClient

from agents.models import Agent, AgentAPIKey, AgentOwnership, AgentReputation
from events.models import AgentEvent, DecisionPipelineRun


class EventIngestTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(
            name="test_bot", display_name="Test Bot",
            agent_type="trading", status="active",
        )
        self.api_key_obj, self.raw_key = AgentAPIKey.generate(self.agent)

    def test_ingest_event_with_api_key(self):
        response = self.client.post(
            "/api/v1/events/",
            {
                "event_type": "prediction",
                "outcome": "pass",
                "instrument": "MNQ",
                "confidence": 0.72,
                "payload": {"direction": "long"},
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["event_type"], "prediction")
        self.assertEqual(str(response.data["agent"]), str(self.agent.id))

    def test_ingest_event_without_api_key(self):
        response = self.client.post(
            "/api/v1/events/",
            {"event_type": "prediction"},
            format="json",
        )
        # 401 or 403 — depends on auth backend ordering
        self.assertIn(response.status_code, [401, 403])

    def test_ingest_event_invalid_key(self):
        response = self.client.post(
            "/api/v1/events/",
            {"event_type": "prediction"},
            format="json",
            HTTP_AUTHORIZATION="Bearer ak_invalid_key",
        )
        self.assertEqual(response.status_code, 401)

    def test_batch_ingest(self):
        response = self.client.post(
            "/api/v1/events/batch/",
            {
                "events": [
                    {"event_type": "price_fetch", "outcome": "pass", "instrument": "BTC-USD"},
                    {"event_type": "momentum", "outcome": "pass", "instrument": "BTC-USD"},
                    {"event_type": "edge_gate", "outcome": "block", "instrument": "BTC-USD"},
                ]
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["created"], 3)
        self.assertEqual(AgentEvent.objects.filter(agent=self.agent).count(), 3)

    def test_batch_limit_100(self):
        events = [{"event_type": "prediction"} for _ in range(101)]
        response = self.client.post(
            "/api/v1/events/batch/",
            {"events": events},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.raw_key}",
        )
        self.assertEqual(response.status_code, 400)


class EventListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(
            name="list_bot", display_name="List Bot",
            agent_type="trading", status="active",
        )
        for i in range(5):
            AgentEvent.objects.create(
                agent=self.agent, event_type="prediction",
                outcome="pass" if i % 2 == 0 else "block",
                instrument="MNQ",
            )

    def test_list_agent_events(self):
        response = self.client.get(f"/api/v1/agents/{self.agent.id}/events/")
        self.assertEqual(response.status_code, 200)

    def test_filter_by_outcome(self):
        response = self.client.get(f"/api/v1/agents/{self.agent.id}/events/?outcome=pass")
        self.assertEqual(response.status_code, 200)

    def test_all_events_list(self):
        response = self.client.get("/api/v1/events/all/")
        self.assertEqual(response.status_code, 200)


class DashboardSummaryTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(
            name="dash_bot", display_name="Dash Bot",
        )

    def test_dashboard_empty(self):
        response = self.client.get("/api/v1/metrics/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_events"], 0)

    def test_dashboard_with_events(self):
        AgentEvent.objects.create(
            agent=self.agent, event_type="prediction", outcome="pass"
        )
        AgentEvent.objects.create(
            agent=self.agent, event_type="execution", outcome="pass"
        )
        response = self.client.get("/api/v1/metrics/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_events"], 2)
