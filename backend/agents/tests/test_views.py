"""Tests for Agent API views."""

from django.test import TestCase
from rest_framework.test import APIClient

from agents.models import Agent, AgentOwnership, AgentReputation


class AgentRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_agent(self):
        response = self.client.post(
            "/api/v1/register/",
            {
                "name": "my_agent",
                "display_name": "My Agent",
                "agent_type": "trading",
                "description": "A new trading agent",
                "creator_name": "Test Creator",
                "creator_email": "test@example.com",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("api_key", data)
        self.assertTrue(data["api_key"].startswith("ak_"))
        self.assertEqual(data["agent"]["name"], "my_agent")
        self.assertEqual(data["agent"]["status"], "active")
        self.assertIn("message", data)

    def test_register_duplicate_name(self):
        Agent.objects.create(name="taken", display_name="Taken")
        response = self.client.post(
            "/api/v1/register/",
            {"name": "taken", "display_name": "Also Taken", "creator_name": "Test"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_register_creates_ownership_and_reputation(self):
        response = self.client.post(
            "/api/v1/register/",
            {
                "name": "full_agent",
                "display_name": "Full Agent",
                "creator_name": "Creator Name",
                "creator_url": "https://github.com/test",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        agent = Agent.objects.get(name="full_agent")
        self.assertTrue(hasattr(agent, "ownership"))
        self.assertEqual(agent.ownership.creator_name, "Creator Name")
        self.assertTrue(hasattr(agent, "reputation"))
        self.assertEqual(agent.reputation.overall_score, 50)


class AgentListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(
            name="list_agent",
            display_name="List Agent",
            agent_type="trading",
            status="active",
        )
        AgentReputation.objects.create(agent=self.agent, overall_score=82)
        AgentOwnership.objects.create(agent=self.agent, creator_name="Owner")

    def test_list_agents(self):
        response = self.client.get("/api/v1/agents/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "list_agent")
        self.assertEqual(data[0]["reputation_score"], 82)
        self.assertEqual(data[0]["owner"], "Owner")

    def test_filter_by_type(self):
        Agent.objects.create(name="other", display_name="Other", agent_type="monitor")
        response = self.client.get("/api/v1/agents/?type=trading")
        self.assertEqual(len(response.json()), 1)

    def test_agent_detail(self):
        response = self.client.get(f"/api/v1/agents/{self.agent.id}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "list_agent")
        self.assertIn("ownership", data)
        self.assertIn("reputation", data)


class MarketplaceTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        a1 = Agent.objects.create(name="a1", display_name="A1", status="active")
        a2 = Agent.objects.create(name="a2", display_name="A2", status="active")
        a3 = Agent.objects.create(name="a3", display_name="A3", status="draft")
        AgentReputation.objects.create(agent=a1, overall_score=90)
        AgentReputation.objects.create(agent=a2, overall_score=70)
        AgentReputation.objects.create(agent=a3, overall_score=95)

    def test_marketplace_returns_active_sorted_by_reputation(self):
        response = self.client.get("/api/v1/marketplace/")
        data = response.json()
        self.assertEqual(len(data), 2)  # Only active agents
        self.assertEqual(data[0]["name"], "a1")  # 90 > 70
        self.assertEqual(data[1]["name"], "a2")
