"""Event capture and metrics models.

Three models:
  AgentEvent    — Single decision-point event (prediction, execution, etc.)
  AgentMetric   — Time-series metric snapshot (win_rate, pnl, etc.)
  DecisionPipelineRun — Groups events from one decision cycle
"""

import uuid

from django.db import models
from django.utils import timezone


class AgentEvent(models.Model):
    """A single event emitted by an agent during a decision cycle."""

    class EventType(models.TextChoices):
        # Pipeline stages
        PRICE_FETCH = "price_fetch", "Price Fetch"
        MOMENTUM = "momentum", "Momentum Analysis"
        MARKET_LEAN = "market_lean", "Market Lean Detection"
        EDGE_GATE = "edge_gate", "Edge Gate"
        CIRCUIT_BREAKER = "circuit_breaker", "Circuit Breaker"
        SIGNAL = "signal", "Signal Generation"
        TREND_FILTER = "trend_filter", "Trend Filter"
        REGIME = "regime", "Regime Detection"
        RANKING = "ranking", "Signal Ranking"
        RISK_VALIDATION = "risk_validation", "Risk Validation"
        EXECUTION = "execution", "Execution"
        RESOLUTION = "resolution", "Resolution"
        CLAIM = "claim", "Claim"
        # Meta events
        HEARTBEAT = "heartbeat", "Heartbeat"
        PREDICTION = "prediction", "Prediction"
        TRADE = "trade", "Trade"
        ERROR = "error", "Error"

    class Outcome(models.TextChoices):
        PASS = "pass", "Pass"
        BLOCK = "block", "Block"
        MODIFY = "modify", "Modify"
        WIN = "win", "Win"
        LOSS = "loss", "Loss"
        PENDING = "pending", "Pending"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(
        "agents.Agent", on_delete=models.CASCADE, related_name="events", db_index=True
    )
    pipeline_run = models.ForeignKey(
        "DecisionPipelineRun",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    event_type = models.CharField(max_length=30, choices=EventType.choices, db_index=True)
    outcome = models.CharField(
        max_length=10, choices=Outcome.choices, default=Outcome.PENDING, db_index=True
    )
    instrument = models.CharField(max_length=30, blank=True, db_index=True)
    confidence = models.FloatField(null=True, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    cycle_id = models.CharField(
        max_length=100, blank=True, db_index=True,
        help_text="Groups events from the same decision cycle"
    )
    duration_ms = models.IntegerField(
        null=True, blank=True, help_text="How long this step took (ms)"
    )
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["agent", "-timestamp"]),
            models.Index(fields=["agent", "event_type", "-timestamp"]),
            models.Index(fields=["cycle_id", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.agent.name}:{self.event_type} [{self.outcome}] @ {self.timestamp:%H:%M:%S}"


class AgentMetric(models.Model):
    """Time-series metric snapshot for an agent."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(
        "agents.Agent", on_delete=models.CASCADE, related_name="metrics", db_index=True
    )
    name = models.CharField(max_length=50, db_index=True)
    value = models.FloatField()
    instrument = models.CharField(max_length=30, blank=True)
    tier = models.CharField(max_length=30, blank=True)
    tags = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["agent", "name", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.agent.name}:{self.name}={self.value} @ {self.timestamp:%H:%M:%S}"


class DecisionPipelineRun(models.Model):
    """Groups all events from a single decision cycle for one instrument."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(
        "agents.Agent", on_delete=models.CASCADE, related_name="pipeline_runs", db_index=True
    )
    cycle_id = models.CharField(max_length=100, db_index=True)
    instrument = models.CharField(max_length=30, blank=True)
    final_outcome = models.CharField(
        max_length=10, choices=AgentEvent.Outcome.choices, default="pending"
    )
    total_stages = models.IntegerField(default=0)
    passed_stages = models.IntegerField(default=0)
    blocked_at_stage = models.CharField(max_length=30, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["agent", "-started_at"]),
        ]

    def __str__(self):
        return f"{self.agent.name}:{self.instrument} [{self.final_outcome}] @ {self.started_at:%H:%M:%S}"
