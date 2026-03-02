"""Tests for bug fixes in agents app.

Covers:
  1. AgentLicenseSerializer fields match model (no phantom fields)
  2. AgentHeartbeatView pk + ownership verification
  3. seed_agents doesn't mutate module-level SEED_AGENTS constant
  4. AgentReputationView and AgentOwnershipView single-query correctness
"""

import copy

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agents.models import (
    Agent,
    AgentAPIKey,
    AgentLicense,
    AgentOwnership,
    AgentReputation,
)
from agents.serializers import AgentLicenseSerializer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_agent(name, with_ownership=False, with_reputation=False):
    """Create an agent and optionally attach ownership/reputation.

    Returns (agent, api_key_obj, raw_key).
    """
    agent = Agent.objects.create(
        name=name,
        display_name=name.replace("_", " ").title(),
        agent_type="trading",
        status="active",
    )
    if with_ownership:
        AgentOwnership.objects.create(
            agent=agent,
            creator_name=f"{name} creator",
            creator_email=f"{name}@example.com",
            creator_url="https://github.com/test",
        )
    if with_reputation:
        AgentReputation.objects.create(
            agent=agent,
            overall_score=75,
            accuracy_score=60.0,
            win_rate=0.55,
            profit_factor=1.4,
        )
    api_key_obj, raw_key = AgentAPIKey.generate(agent)
    return agent, api_key_obj, raw_key


# ===========================================================================
# 1. AgentLicenseSerializer fields match model
# ===========================================================================

class AgentLicenseSerializerFieldsTest(TestCase):
    """Verify AgentLicenseSerializer exposes the correct fields."""

    def setUp(self):
        self.agent = Agent.objects.create(
            name="lic_agent",
            display_name="License Agent",
            status="active",
        )
        self.license = AgentLicense.objects.create(
            agent=self.agent,
            license_type="non_exclusive",
            licensee_name="Acme Corp",
            monthly_fee=500.00,
            revenue_share_pct=10.00,
            start_date=timezone.now(),
            is_active=True,
        )

    def test_serializer_contains_expected_fields(self):
        """Serialized output must include all declared fields."""
        data = AgentLicenseSerializer(self.license).data
        expected_fields = {
            "id",
            "license_type",
            "licensee_name",
            "monthly_fee",
            "revenue_share_pct",
            "start_date",
            "end_date",
            "is_active",
            "created_at",
        }
        self.assertEqual(set(data.keys()), expected_fields)

    def test_old_phantom_fields_not_in_output(self):
        """Old/removed fields must NOT appear in serialized output."""
        data = AgentLicenseSerializer(self.license).data
        phantom_fields = ["is_exclusive", "monthly_fee_usd", "terms"]
        for field in phantom_fields:
            self.assertNotIn(
                field,
                data,
                f"Phantom field '{field}' should not be in serializer output",
            )

    def test_create_license_via_api(self):
        """POST /api/v1/agents/{id}/licenses/ with valid data should succeed."""
        _, raw_key = AgentAPIKey.generate(self.agent)
        client = APIClient()
        response = client.post(
            f"/api/v1/agents/{self.agent.id}/licenses/",
            {
                "license_type": "exclusive",
                "licensee_name": "Beta LLC",
                "monthly_fee": "250.00",
                "revenue_share_pct": "5.00",
                "start_date": "2026-03-01T00:00:00Z",
            },
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {raw_key}",
        )
        self.assertEqual(response.status_code, 201)
        resp_data = response.json()
        self.assertEqual(resp_data["license_type"], "exclusive")
        self.assertEqual(resp_data["licensee_name"], "Beta LLC")
        self.assertNotIn("is_exclusive", resp_data)
        self.assertNotIn("monthly_fee_usd", resp_data)
        self.assertNotIn("terms", resp_data)


# ===========================================================================
# 2. AgentHeartbeatView accepts pk and verifies ownership
# ===========================================================================

class AgentHeartbeatViewTest(TestCase):
    """Verify heartbeat endpoint with pk and ownership checks."""

    def setUp(self):
        self.client = APIClient()
        self.agent_a, _, self.key_a = _make_agent("hb_agent_a")
        self.agent_b, _, self.key_b = _make_agent("hb_agent_b")

    def test_heartbeat_with_matching_pk_succeeds(self):
        """POST /api/v1/agents/{id}/heartbeat/ with the agent's own key returns 200."""
        response = self.client.post(
            f"/api/v1/agents/{self.agent_a.id}/heartbeat/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.key_a}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["agent"], self.agent_a.name)

    def test_heartbeat_with_wrong_agent_key_returns_403(self):
        """POST /api/v1/agents/{id}/heartbeat/ with another agent's key returns 403."""
        response = self.client.post(
            f"/api/v1/agents/{self.agent_a.id}/heartbeat/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.key_b}",
        )
        self.assertEqual(response.status_code, 403)

    def test_heartbeat_without_pk_succeeds(self):
        """POST /api/v1/heartbeat/ (no pk) with a valid key returns 200."""
        response = self.client.post(
            "/api/v1/heartbeat/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.key_a}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["agent"], self.agent_a.name)

    def test_heartbeat_updates_last_heartbeat_timestamp(self):
        """Heartbeat should update the agent's last_heartbeat field."""
        self.assertIsNone(self.agent_a.last_heartbeat)

        self.client.post(
            f"/api/v1/agents/{self.agent_a.id}/heartbeat/",
            {},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {self.key_a}",
        )

        self.agent_a.refresh_from_db()
        self.assertIsNotNone(self.agent_a.last_heartbeat)
        # Heartbeat should be very recent (within the last 5 seconds)
        delta = (timezone.now() - self.agent_a.last_heartbeat).total_seconds()
        self.assertLess(delta, 5)


# ===========================================================================
# 3. seed_agents doesn't mutate module-level constant
# ===========================================================================

class SeedAgentsConstantTest(TestCase):
    """Verify the seed_agents command does not mutate SEED_AGENTS."""

    def test_seed_agents_constant_has_ownership_and_reputation(self):
        """SEED_AGENTS entries must contain 'ownership' and 'reputation' keys."""
        from agents.management.commands.seed_agents import SEED_AGENTS

        for entry in SEED_AGENTS:
            self.assertIn(
                "ownership",
                entry,
                f"SEED_AGENTS entry '{entry['name']}' missing 'ownership' key",
            )
            self.assertIn(
                "reputation",
                entry,
                f"SEED_AGENTS entry '{entry['name']}' missing 'reputation' key",
            )

    def test_seed_agents_constant_not_mutated_after_command(self):
        """Running seed_agents should not remove keys from SEED_AGENTS."""
        from agents.management.commands.seed_agents import SEED_AGENTS

        # Snapshot keys before running
        before = [set(entry.keys()) for entry in SEED_AGENTS]

        call_command("seed_agents", "--reset", verbosity=0)

        # Verify keys are unchanged after running
        after = [set(entry.keys()) for entry in SEED_AGENTS]
        self.assertEqual(before, after)

        # Double-check ownership and reputation still present
        for entry in SEED_AGENTS:
            self.assertIn("ownership", entry)
            self.assertIn("reputation", entry)

    def test_seed_agents_idempotent_with_reset(self):
        """Running seed_agents --reset twice should produce the same result."""
        call_command("seed_agents", "--reset", verbosity=0)
        count_first = Agent.objects.count()
        names_first = set(Agent.objects.values_list("name", flat=True))

        call_command("seed_agents", "--reset", verbosity=0)
        count_second = Agent.objects.count()
        names_second = set(Agent.objects.values_list("name", flat=True))

        self.assertEqual(count_first, count_second)
        self.assertEqual(names_first, names_second)


# ===========================================================================
# 4. AgentReputationView and AgentOwnershipView single query
# ===========================================================================

class AgentReputationViewTest(TestCase):
    """Verify GET /api/v1/agents/{id}/reputation/ returns correct data."""

    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(
            name="rep_view_agent",
            display_name="Rep View Agent",
            status="active",
        )

    def test_reputation_returns_correct_data(self):
        """GET reputation endpoint returns serialized reputation."""
        AgentReputation.objects.create(
            agent=self.agent,
            overall_score=88,
            accuracy_score=72.5,
            win_rate=0.62,
            profit_factor=1.8,
            total_trades=150,
        )
        response = self.client.get(
            f"/api/v1/agents/{self.agent.id}/reputation/"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["overall_score"], 88)
        self.assertAlmostEqual(data["accuracy_score"], 72.5)
        self.assertAlmostEqual(data["win_rate"], 0.62)
        self.assertAlmostEqual(data["profit_factor"], 1.8)
        self.assertEqual(data["total_trades"], 150)

    def test_reputation_404_when_no_data(self):
        """GET reputation returns 404 with detail message when no reputation exists."""
        response = self.client.get(
            f"/api/v1/agents/{self.agent.id}/reputation/"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "No reputation data yet.")


class AgentOwnershipViewTest(TestCase):
    """Verify GET /api/v1/agents/{id}/ownership/ returns correct data."""

    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(
            name="own_view_agent",
            display_name="Own View Agent",
            status="active",
        )

    def test_ownership_returns_correct_data(self):
        """GET ownership endpoint returns serialized ownership."""
        AgentOwnership.objects.create(
            agent=self.agent,
            creator_name="Jane Doe",
            creator_email="jane@example.com",
            creator_url="https://github.com/janedoe",
            revenue_share_pct=80.00,
        )
        response = self.client.get(
            f"/api/v1/agents/{self.agent.id}/ownership/"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["creator_name"], "Jane Doe")
        self.assertEqual(data["creator_url"], "https://github.com/janedoe")
        self.assertEqual(data["revenue_share_pct"], "80.00")
        # creator_email should be excluded per serializer
        self.assertNotIn("creator_email", data)

    def test_ownership_404_when_no_data(self):
        """GET ownership returns 404 with detail message when no ownership exists."""
        response = self.client.get(
            f"/api/v1/agents/{self.agent.id}/ownership/"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "No ownership data.")
