"""Reputation calculation service.

Recalculates AgentReputation scores based on actual event data.
Factors: accuracy, profitability, reliability, consistency.
"""

import logging
from datetime import timedelta

from django.db.models import Count, Q, Subquery
from django.utils import timezone

from agents.models import Agent, AgentReputation
from events.models import AgentEvent

logger = logging.getLogger(__name__)


def recalculate_reputation(agent: Agent, window_days: int = 30) -> AgentReputation:
    """Recalculate reputation scores from event data.

    Args:
        agent: Agent to recalculate.
        window_days: How many days of data to consider.

    Returns:
        Updated AgentReputation instance.
    """
    rep, _ = AgentReputation.objects.get_or_create(agent=agent)
    cutoff = timezone.now() - timedelta(days=window_days)

    # Get resolved events — aggregate wins/losses in one query
    resolved = AgentEvent.objects.filter(
        agent=agent,
        event_type="resolution",
        outcome__in=["win", "loss"],
        timestamp__gte=cutoff,
    )
    agg = resolved.aggregate(
        total=Count("id"),
        wins=Count("id", filter=Q(outcome="win")),
        losses=Count("id", filter=Q(outcome="loss")),
    )
    total_resolved = agg["total"]
    wins = agg["wins"]
    losses = agg["losses"]

    # Win rate
    win_rate = wins / total_resolved if total_resolved > 0 else 0.0

    # PnL from payloads
    total_pnl = 0.0
    win_pnl = 0.0
    loss_pnl = 0.0
    for event in resolved.values("outcome", "payload"):
        pnl = 0.0
        if isinstance(event["payload"], dict):
            pnl = float(event["payload"].get("pnl", 0))
        total_pnl += pnl
        if event["outcome"] == "win":
            win_pnl += pnl
        else:
            loss_pnl += abs(pnl)

    profit_factor = win_pnl / loss_pnl if loss_pnl > 0 else 0.0

    # Total decisions (all events, not just resolved)
    total_decisions = AgentEvent.objects.filter(
        agent=agent, timestamp__gte=cutoff
    ).count()

    # Reliability: % of days agent was active (had events)
    days_active = (
        AgentEvent.objects.filter(agent=agent, timestamp__gte=cutoff)
        .dates("timestamp", "day")
        .count()
    )
    reliability = min(days_active / max(window_days, 1), 1.0)

    # Consistency: stability of win rate over time
    # Higher score = more stable performance (low variance in daily win rates)
    # With sufficient data, measure variance across daily win rates
    if total_resolved >= 10:
        # Get daily win counts
        from django.db.models import FloatField, Value
        from django.db.models.functions import Cast

        daily_stats = (
            resolved.extra(select={"day": "DATE(timestamp)"})
            .values("day")
            .annotate(
                day_total=Count("id"),
                day_wins=Count("id", filter=Q(outcome="win")),
            )
            .filter(day_total__gte=2)  # Only days with enough trades
        )
        daily_win_rates = [
            d["day_wins"] / d["day_total"] for d in daily_stats if d["day_total"] > 0
        ]
        if len(daily_win_rates) >= 2:
            mean_wr = sum(daily_win_rates) / len(daily_win_rates)
            variance = sum((wr - mean_wr) ** 2 for wr in daily_win_rates) / len(daily_win_rates)
            # Lower variance = higher consistency (0-1 scale)
            # Max variance for a binary outcome is 0.25 (all 0s and 1s)
            consistency = max(0.0, 1.0 - (variance / 0.25))
        else:
            consistency = 0.5  # Insufficient data, neutral score
    else:
        consistency = 0.5  # Insufficient data

    # Calculate component scores (0-100 scale)
    accuracy_score = min(win_rate * 100, 100)
    profitability_score = min(profit_factor * 30, 100)  # PF 3.3+ = 100
    reliability_score = reliability * 100
    consistency_score = consistency * 100

    # Overall score: weighted average
    overall = (
        accuracy_score * 0.30
        + profitability_score * 0.35
        + reliability_score * 0.20
        + consistency_score * 0.15
    )

    # Update reputation
    rep.overall_score = int(round(overall))
    rep.accuracy_score = round(accuracy_score, 1)
    rep.profitability_score = round(profitability_score, 1)
    rep.reliability_score = round(reliability_score, 1)
    rep.consistency_score = round(consistency_score, 1)
    rep.total_decisions = total_decisions
    rep.total_trades = total_resolved
    rep.win_rate = round(win_rate, 4)
    rep.profit_factor = round(profit_factor, 2)
    rep.max_drawdown_pct = 0  # Would need equity curve
    rep.calculation_window_days = window_days
    rep.save()

    logger.info(
        "Reputation recalculated for %s: %d/100 (WR: %.1f%%, PF: %.2f)",
        agent.name, rep.overall_score, win_rate * 100, profit_factor,
    )

    return rep


def recalculate_all(window_days: int = 30) -> int:
    """Recalculate reputation for all agents with events."""
    # Get agent IDs that have events in one query instead of N+1
    agent_ids_with_events = (
        AgentEvent.objects.values_list("agent_id", flat=True).distinct()
    )
    agents = Agent.objects.filter(id__in=Subquery(agent_ids_with_events))
    count = 0
    for agent in agents:
        recalculate_reputation(agent, window_days)
        count += 1
    return count
