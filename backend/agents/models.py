"""Agent registry, API keys, ownership, licensing, and reputation models."""

import hashlib
import secrets
import uuid

from django.db import models
from django.utils import timezone


class Agent(models.Model):
    """An autonomous agent registered on the platform."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        RETIRED = "retired", "Retired"
        DRAFT = "draft", "Draft"

    class AgentType(models.TextChoices):
        TRADING = "trading", "Trading"
        PREDICTION = "prediction", "Prediction"
        ORCHESTRATOR = "orchestrator", "Orchestrator"
        MONITOR = "monitor", "Monitor"
        CUSTOM = "custom", "Custom"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    display_name = models.CharField(max_length=200)
    agent_type = models.CharField(max_length=20, choices=AgentType.choices, default=AgentType.CUSTOM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    description = models.TextField(blank=True)
    soul_file = models.TextField(blank=True, help_text="Markdown personality/config content")
    capabilities = models.JSONField(default=list, blank=True)
    config = models.JSONField(default=dict, blank=True)
    version = models.CharField(max_length=20, default="1.0.0")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_heartbeat = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.display_name} ({self.name})"

    def record_heartbeat(self):
        self.last_heartbeat = timezone.now()
        self.save(update_fields=["last_heartbeat"])

    @property
    def is_online(self):
        if not self.last_heartbeat:
            return False
        return (timezone.now() - self.last_heartbeat).total_seconds() < 300


class AgentAPIKey(models.Model):
    """Per-agent API key for event ingestion. Keys are hashed at rest."""

    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name="api_keys")
    prefix = models.CharField(max_length=12, db_index=True, help_text="Visible prefix (ak_xxxxxxxx)")
    key_hash = models.CharField(max_length=64, unique=True, help_text="SHA-256 hash of the full key")
    label = models.CharField(max_length=100, blank=True, default="default")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Agent API Key"
        verbose_name_plural = "Agent API Keys"

    def __str__(self):
        return f"{self.prefix}... ({self.agent.name})"

    def mark_used(self):
        self.last_used_at = timezone.now()
        self.save(update_fields=["last_used_at"])

    @classmethod
    def generate(cls, agent, label="default"):
        """Create a new API key. Returns (AgentAPIKey, raw_key).

        The raw key is only available at creation time.
        """
        raw_key = f"ak_{secrets.token_hex(24)}"
        prefix = raw_key[:12]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key = cls.objects.create(
            agent=agent,
            prefix=prefix,
            key_hash=key_hash,
            label=label,
        )
        return api_key, raw_key


class AgentOwnership(models.Model):
    """NIL-style ownership record: who created and owns an agent."""

    agent = models.OneToOneField(Agent, on_delete=models.CASCADE, related_name="ownership")
    creator_name = models.CharField(max_length=200)
    creator_email = models.EmailField(blank=True)
    creator_url = models.URLField(blank=True, help_text="GitHub/LinkedIn profile")
    revenue_share_pct = models.DecimalField(max_digits=5, decimal_places=2, default=70.00)
    chain_verified = models.BooleanField(default=False)
    chain_address = models.CharField(max_length=42, blank=True)
    chain_tx_hash = models.CharField(max_length=66, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Agent Ownership"
        verbose_name_plural = "Agent Ownerships"

    def __str__(self):
        return f"{self.creator_name} owns {self.agent.name}"


class AgentLicense(models.Model):
    """License terms for hiring/deploying an agent."""

    class LicenseType(models.TextChoices):
        EXCLUSIVE = "exclusive", "Exclusive"
        NON_EXCLUSIVE = "non_exclusive", "Non-Exclusive"
        OPEN_SOURCE = "open_source", "Open Source"
        EVALUATION = "evaluation", "Evaluation"

    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name="licenses")
    license_type = models.CharField(max_length=20, choices=LicenseType.choices)
    licensee_name = models.CharField(max_length=200)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    revenue_share_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.license_type} — {self.licensee_name} → {self.agent.name}"


class AgentReputation(models.Model):
    """Performance-based reputation score (0-100), recalculated periodically."""

    agent = models.OneToOneField(Agent, on_delete=models.CASCADE, related_name="reputation")
    overall_score = models.IntegerField(default=50)
    accuracy_score = models.FloatField(default=0.0)
    profitability_score = models.FloatField(default=0.0)
    reliability_score = models.FloatField(default=0.0)
    consistency_score = models.FloatField(default=0.0)
    total_decisions = models.IntegerField(default=0)
    total_trades = models.IntegerField(default=0)
    win_rate = models.FloatField(default=0.0)
    profit_factor = models.FloatField(default=0.0)
    sharpe_ratio = models.FloatField(default=0.0)
    max_drawdown_pct = models.FloatField(default=0.0)
    brier_score = models.FloatField(null=True, blank=True)
    last_calculated = models.DateTimeField(auto_now=True)
    calculation_window_days = models.IntegerField(default=30)

    class Meta:
        verbose_name = "Agent Reputation"

    def __str__(self):
        return f"{self.agent.name}: {self.overall_score}/100"
