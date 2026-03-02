"""Tests for Agent models."""

from django.test import TestCase
from django.utils import timezone

from agents.models import Agent, AgentAPIKey, AgentOwnership, AgentReputation


class AgentModelTest(TestCase):
    def setUp(self):
        self.agent = Agent.objects.create(
            name="test_agent",
            display_name="Test Agent",
            agent_type=Agent.AgentType.TRADING,
            status=Agent.Status.ACTIVE,
            description="A test trading agent",
        )

    def test_create_agent(self):
        self.assertEqual(self.agent.name, "test_agent")
        self.assertEqual(self.agent.agent_type, "trading")
        self.assertEqual(self.agent.status, "active")
        self.assertIsNotNone(self.agent.id)

    def test_agent_str(self):
        self.assertEqual(str(self.agent), "Test Agent (test_agent)")

    def test_is_online_no_heartbeat(self):
        self.assertFalse(self.agent.is_online)

    def test_is_online_recent_heartbeat(self):
        self.agent.record_heartbeat()
        self.assertTrue(self.agent.is_online)

    def test_is_online_stale_heartbeat(self):
        self.agent.last_heartbeat = timezone.now() - timezone.timedelta(seconds=600)
        self.agent.save()
        self.assertFalse(self.agent.is_online)

    def test_unique_name_constraint(self):
        with self.assertRaises(Exception):
            Agent.objects.create(name="test_agent", display_name="Duplicate")


class AgentAPIKeyTest(TestCase):
    def setUp(self):
        self.agent = Agent.objects.create(
            name="key_test_agent",
            display_name="Key Test Agent",
        )

    def test_generate_api_key(self):
        api_key, raw_key = AgentAPIKey.generate(self.agent)
        self.assertTrue(raw_key.startswith("ak_"))
        self.assertEqual(len(raw_key), 51)  # "ak_" + 48 hex chars
        self.assertEqual(api_key.prefix, raw_key[:12])
        self.assertTrue(api_key.is_active)

    def test_key_hash_is_stored(self):
        import hashlib

        api_key, raw_key = AgentAPIKey.generate(self.agent)
        expected_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        self.assertEqual(api_key.key_hash, expected_hash)

    def test_mark_used(self):
        api_key, _ = AgentAPIKey.generate(self.agent)
        self.assertIsNone(api_key.last_used_at)
        api_key.mark_used()
        api_key.refresh_from_db()
        self.assertIsNotNone(api_key.last_used_at)


class AgentOwnershipTest(TestCase):
    def test_create_ownership(self):
        agent = Agent.objects.create(name="owned_agent", display_name="Owned Agent")
        ownership = AgentOwnership.objects.create(
            agent=agent,
            creator_name="Durayveon Butler",
            creator_email="dbutler@eulaproperties.com",
            creator_url="https://github.com/moltbot47",
            revenue_share_pct=70.00,
        )
        self.assertEqual(str(ownership), "Durayveon Butler owns owned_agent")
        self.assertEqual(ownership.revenue_share_pct, 70.00)


class AgentReputationTest(TestCase):
    def test_default_reputation(self):
        agent = Agent.objects.create(name="rep_agent", display_name="Rep Agent")
        rep = AgentReputation.objects.create(agent=agent)
        self.assertEqual(rep.overall_score, 50)
        self.assertEqual(rep.win_rate, 0.0)
        self.assertEqual(str(rep), "rep_agent: 50/100")
