"""Reputation calculation service.

Recalculates AgentReputation scores based on actual event data.
Factors: accuracy, profitability, reliability, consistency.
"""

import logging
import math
from datetime import timedelta

from django.db.models import Count, Q, Subquery
from django.utils import timezone

from agents.models import Agent, AgentReputation
from events.models import AgentEvent

logger = logging.getLogger(__name__)


def _compute_max_drawdown(pnl_values: list[float]) -> float:
    """Compute max drawdown percentage from a chronological list of PnL values.

    Tracks the cumulative equity curve and measures the largest peak-to-trough
    decline as a fraction (0.0 to 1.0).
    """
    if not pnl_values:
        return 0.0

    cumulative = 0.0
    peak = 0.0
    max_dd = 0.0

    for pnl in pnl_values:
        cumulative += pnl
        if cumulative > peak:
            peak = cumulative
        if peak > 0:
            drawdown = (peak - cumulative) / peak
            max_dd = max(max_dd, drawdown)

    return round(max_dd, 4)


def _compute_sharpe_ratio(pnl_values: list[float]) -> float:
    """Compute Sharpe ratio from a list of per-trade PnL values.

    Uses risk-free rate of 0 (excess return = raw return).
    Returns 0.0 if fewer than 2 trades or zero standard deviation.
    """
    if len(pnl_values) < 2:
        return 0.0

    mean_pnl = sum(pnl_values) / len(pnl_values)
    variance = sum((p - mean_pnl) ** 2 for p in pnl_values) / len(pnl_values)
    std_dev = math.sqrt(variance)

    if std_dev == 0:
        return 0.0

    return round(mean_pnl / std_dev, 4)


def _compute_brier_score(confidence_outcome_pairs: list[tuple[float, str]]) -> float | None:
    """Compute Brier score from (confidence, outcome) pairs.

    Brier score measures calibration quality: lower is better (0 = perfect).
    confidence is the predicted probability; outcome is 'win' or 'loss'.
    Returns None if no valid pairs.
    """
    if not confidence_outcome_pairs:
        return None

    brier_sum = 0.0
    count = 0
    for confidence, outcome in confidence_outcome_pairs:
        if confidence is None:
            continue
        actual = 1.0 if outcome == "win" else 0.0
        brier_sum += (confidence - actual) ** 2
        count += 1

    if count == 0:
        return None

    return round(brier_sum / count, 4)


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

    # PnL from payloads — also collect per-trade PnL and confidence for
    # max_drawdown, sharpe_ratio, and brier_score calculations
    total_pnl = 0.0
    win_pnl = 0.0
    loss_pnl = 0.0
    pnl_values: list[float] = []  # chronological for drawdown + sharpe
    confidence_outcome_pairs: list[tuple[float, str]] = []  # for brier

    for event in resolved.order_by("timestamp").values("outcome", "payload", "confidence"):
        pnl = 0.0
        if isinstance(event["payload"], dict):
            pnl = float(event["payload"].get("pnl", 0))
        total_pnl += pnl
        pnl_values.append(pnl)
        if event["outcome"] == "win":
            win_pnl += pnl
        else:
            loss_pnl += abs(pnl)

        # Collect confidence-outcome pairs for Brier score
        if event["confidence"] is not None:
            confidence_outcome_pairs.append((event["confidence"], event["outcome"]))

    profit_factor = win_pnl / loss_pnl if loss_pnl > 0 else 0.0

    # Derived metrics
    max_drawdown_pct = _compute_max_drawdown(pnl_values)
    sharpe_ratio = _compute_sharpe_ratio(pnl_values)
    brier_score = _compute_brier_score(confidence_outcome_pairs)

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
        from django.db.models.functions import TruncDate

        daily_stats = (
            resolved.annotate(day=TruncDate("timestamp"))
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
    rep.max_drawdown_pct = max_drawdown_pct
    rep.sharpe_ratio = sharpe_ratio
    rep.brier_score = brier_score
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
