"""Confidence calibration calculations.

Computes calibration data for the confidence calibration chart:
- Buckets events by predicted confidence
- Calculates actual win rate per bucket
- Computes Brier score for overall calibration quality
"""

from django.db.models import Avg, Count, Q

from events.models import AgentEvent


def get_calibration_data(agent_id: str, buckets: int = 10) -> dict:
    """Calculate confidence calibration for an agent.

    Groups resolved events with confidence scores into buckets,
    calculates actual win rate per bucket, and Brier score.

    Returns:
        Dict with calibration_curve (list of buckets) and brier_score.
    """
    # Get resolved events with confidence
    events = AgentEvent.objects.filter(
        agent_id=agent_id,
        confidence__isnull=False,
        outcome__in=["win", "loss"],
    ).values_list("confidence", "outcome")

    if not events:
        return {"calibration_curve": [], "brier_score": None, "total_samples": 0}

    # Build buckets
    bucket_size = 1.0 / buckets
    bucket_data: dict[int, dict] = {}
    for i in range(buckets):
        bucket_data[i] = {
            "bucket_min": round(i * bucket_size, 2),
            "bucket_max": round((i + 1) * bucket_size, 2),
            "predicted_confidence": round((i + 0.5) * bucket_size, 2),
            "actual_win_rate": 0.0,
            "count": 0,
            "wins": 0,
        }

    brier_sum = 0.0
    total = 0

    for confidence, outcome in events:
        if confidence is None:
            continue
        bucket_idx = min(int(confidence / bucket_size), buckets - 1)
        bucket_idx = max(bucket_idx, 0)

        is_win = 1 if outcome == "win" else 0
        bucket_data[bucket_idx]["count"] += 1
        bucket_data[bucket_idx]["wins"] += is_win

        brier_sum += (confidence - is_win) ** 2
        total += 1

    # Calculate actual win rates
    for b in bucket_data.values():
        if b["count"] > 0:
            b["actual_win_rate"] = round(b["wins"] / b["count"], 4)

    # Filter out empty buckets
    curve = [b for b in bucket_data.values() if b["count"] > 0]

    brier_score = round(brier_sum / total, 4) if total > 0 else None

    return {
        "calibration_curve": curve,
        "brier_score": brier_score,
        "total_samples": total,
    }


def get_pnl_curve(agent_id: str, limit: int = 500) -> list[dict]:
    """Get cumulative PnL curve from resolved events.

    Returns list of {timestamp, pnl, cumulative_pnl} for charting.
    """
    events = (
        AgentEvent.objects.filter(
            agent_id=agent_id,
            event_type="resolution",
            outcome__in=["win", "loss"],
        )
        .order_by("timestamp")
        .values("timestamp", "payload")[:limit]
    )

    curve = []
    cumulative = 0.0
    for event in events:
        pnl = event["payload"].get("pnl", 0) if isinstance(event["payload"], dict) else 0
        cumulative += pnl
        curve.append({
            "timestamp": event["timestamp"].isoformat(),
            "pnl": round(pnl, 2),
            "cumulative_pnl": round(cumulative, 2),
        })

    return curve


def get_outcome_by_type(agent_id: str) -> list[dict]:
    """Get win/loss breakdown by event type for tier analysis."""
    data = (
        AgentEvent.objects.filter(
            agent_id=agent_id,
            outcome__in=["win", "loss"],
        )
        .values("event_type")
        .annotate(
            total=Count("id"),
            wins=Count("id", filter=Q(outcome="win")),
            losses=Count("id", filter=Q(outcome="loss")),
        )
        .order_by("-total")
    )

    result = []
    for row in data:
        win_rate = row["wins"] / row["total"] if row["total"] > 0 else 0
        result.append({
            "event_type": row["event_type"],
            "total": row["total"],
            "wins": row["wins"],
            "losses": row["losses"],
            "win_rate": round(win_rate, 4),
        })

    return result
