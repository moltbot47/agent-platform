"""Tests for event models."""

from django.test import TestCase
from django.utils import timezone

from agents.models import Agent
from events.models import AgentEvent, AgentMetric, DecisionPipelineRun


class AgentEventModelTest(TestCase):
    def setUp(self):
        self.agent = Agent.objects.create(
            name="test_agent", display_name="Test Agent", agent_type="trading"
        )

    def test_create_event(self):
        event = AgentEvent.objects.create(
            agent=self.agent,
            event_type="prediction",
            outcome="pass",
            instrument="MNQ",
            confidence=0.72,
            payload={"direction": "long"},
        )
        self.assertEqual(event.event_type, "prediction")
        self.assertEqual(event.outcome, "pass")
        self.assertEqual(event.instrument, "MNQ")
        self.assertAlmostEqual(event.confidence, 0.72)

    def test_event_ordering(self):
        e1 = AgentEvent.objects.create(
            agent=self.agent, event_type="prediction",
            timestamp=timezone.now() - timezone.timedelta(seconds=10),
        )
        e2 = AgentEvent.objects.create(
            agent=self.agent, event_type="execution",
        )
        events = list(AgentEvent.objects.all())
        self.assertEqual(events[0].id, e2.id)  # Most recent first

    def test_event_str(self):
        event = AgentEvent.objects.create(
            agent=self.agent, event_type="edge_gate", outcome="block"
        )
        self.assertIn("edge_gate", str(event))
        self.assertIn("block", str(event))


class AgentMetricModelTest(TestCase):
    def setUp(self):
        self.agent = Agent.objects.create(
            name="test_agent", display_name="Test Agent"
        )

    def test_create_metric(self):
        metric = AgentMetric.objects.create(
            agent=self.agent, name="win_rate", value=0.567, instrument="MNQ"
        )
        self.assertEqual(metric.name, "win_rate")
        self.assertAlmostEqual(metric.value, 0.567)

    def test_metric_str(self):
        metric = AgentMetric.objects.create(
            agent=self.agent, name="pnl", value=3205.25
        )
        self.assertIn("pnl", str(metric))


class DecisionPipelineRunModelTest(TestCase):
    def setUp(self):
        self.agent = Agent.objects.create(
            name="test_agent", display_name="Test Agent"
        )

    def test_create_pipeline_run(self):
        run = DecisionPipelineRun.objects.create(
            agent=self.agent,
            cycle_id="cycle_001",
            instrument="MNQ",
            total_stages=7,
            passed_stages=5,
            blocked_at_stage="risk_validation",
            final_outcome="block",
        )
        self.assertEqual(run.total_stages, 7)
        self.assertEqual(run.passed_stages, 5)
        self.assertEqual(run.blocked_at_stage, "risk_validation")

    def test_pipeline_run_with_events(self):
        run = DecisionPipelineRun.objects.create(
            agent=self.agent, cycle_id="cycle_002", instrument="BTC-USD",
        )
        e1 = AgentEvent.objects.create(
            agent=self.agent, pipeline_run=run,
            event_type="price_fetch", outcome="pass",
        )
        e2 = AgentEvent.objects.create(
            agent=self.agent, pipeline_run=run,
            event_type="edge_gate", outcome="block",
        )
        self.assertEqual(run.events.count(), 2)
