"""TurboSyncReader — reads turbo_analytics.db and creates AgentEvents.

Maps Polymarket turbo signal evaluations → AgentEvent records.
Each signal evaluation becomes one event. Traded signals get additional
execution + resolution events.
"""

import logging
import sqlite3
from datetime import datetime, timezone as tz
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from agents.models import Agent
from core.posthog_client import capture as posthog_capture
from events.models import AgentEvent, AgentMetric

logger = logging.getLogger(__name__)

# Map turbo signal states to event types + outcomes
SIGNAL_TYPE_MAP = {
    "market_lean": "market_lean",
    "contrarian": "momentum",
    "momentum": "momentum",
}


class TurboSyncReader:
    """Reads turbo_analytics.db and syncs to AgentEvent records."""

    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or getattr(settings, "TURBO_ANALYTICS_DB", "")

    def _get_connection(self) -> sqlite3.Connection:
        if not Path(self.db_path).exists():
            raise FileNotFoundError(f"Turbo analytics DB not found: {self.db_path}")
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_total_count(self) -> int:
        conn = self._get_connection()
        try:
            return conn.execute("SELECT COUNT(*) FROM turbo_signals").fetchone()[0]
        finally:
            conn.close()

    def sync(
        self,
        agent: Agent,
        limit: int = 10000,
        since: datetime | None = None,
        traded_only: bool = False,
    ) -> dict:
        """Sync turbo signals → AgentEvent records.

        Args:
            agent: The polymarket_turbo Agent instance.
            limit: Max rows to process per sync.
            since: Only sync signals after this timestamp.
            traded_only: Only sync signals that were actually traded.

        Returns:
            Dict with sync stats.
        """
        conn = self._get_connection()
        try:
            query = "SELECT * FROM turbo_signals"
            conditions = []
            params = []

            if since:
                conditions.append("timestamp > ?")
                params.append(since.isoformat())

            if traded_only:
                conditions.append("traded = 1")

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp ASC LIMIT ?"
            params.append(limit)

            rows = conn.execute(query, params).fetchall()
        finally:
            conn.close()

        stats = {"total": len(rows), "created": 0, "skipped": 0, "traded": 0, "resolved": 0}

        events_to_create = []
        for row in rows:
            ts = _parse_timestamp(row["timestamp"])
            cycle_id = f"turbo_{row['id']}"
            instrument = f"{row['asset'].upper()}-USD"

            # Check if already synced
            if AgentEvent.objects.filter(agent=agent, cycle_id=cycle_id).exists():
                stats["skipped"] += 1
                continue

            # Signal evaluation event
            if row["signal_generated"]:
                event_type = SIGNAL_TYPE_MAP.get(row["signal_type"], "signal")
                outcome = "pass"
                confidence = row["up_price"] or row["down_price"] or 0.0
            else:
                event_type = "edge_gate"
                outcome = "block"
                confidence = None

            events_to_create.append(AgentEvent(
                agent=agent,
                event_type=event_type,
                outcome=outcome,
                instrument=instrument,
                confidence=confidence,
                cycle_id=cycle_id,
                timestamp=ts,
                payload={
                    "asset": row["asset"],
                    "timeframe": row["timeframe"],
                    "signal_type": row["signal_type"] or "",
                    "signal_direction": row["signal_direction"] or "",
                    "signal_reason": row["signal_reason"] or "",
                    "skip_reason": row["skip_reason"] or "",
                    "up_price": row["up_price"],
                    "down_price": row["down_price"],
                    "momentum_strength": row["momentum_strength"],
                    "momentum_direction": row["momentum_direction"] or "",
                },
            ))

            # If traded, add execution event
            if row["traded"]:
                stats["traded"] += 1
                events_to_create.append(AgentEvent(
                    agent=agent,
                    event_type="execution",
                    outcome="pass",
                    instrument=instrument,
                    confidence=confidence,
                    cycle_id=cycle_id,
                    timestamp=ts,
                    payload={
                        "entry_price": row["entry_price"],
                        "shares": row["shares"],
                        "size_usdc": row["size_usdc"],
                        "order_id": row["order_id"] or "",
                        "direction": row["signal_direction"] or "",
                    },
                ))

                # If resolved, add resolution event
                if row["result"]:
                    stats["resolved"] += 1
                    events_to_create.append(AgentEvent(
                        agent=agent,
                        event_type="resolution",
                        outcome="win" if row["result"] == "win" else "loss",
                        instrument=instrument,
                        cycle_id=cycle_id,
                        timestamp=ts,
                        payload={
                            "outcome_price": row["outcome"],
                            "pnl": row["pnl"],
                            "result": row["result"],
                        },
                    ))

        if events_to_create:
            AgentEvent.objects.bulk_create(events_to_create, batch_size=500)
            stats["created"] = len(events_to_create)

            # PostHog summary
            posthog_capture(
                str(agent.id),
                "turbo_sync_completed",
                {
                    "events_created": stats["created"],
                    "signals_processed": stats["total"],
                    "traded_count": stats["traded"],
                },
            )

        return stats

    def sync_metrics(self, agent: Agent) -> dict:
        """Calculate and store aggregate metrics from turbo signals."""
        conn = self._get_connection()
        try:
            total = conn.execute("SELECT COUNT(*) FROM turbo_signals").fetchone()[0]
            traded = conn.execute(
                "SELECT COUNT(*) FROM turbo_signals WHERE traded=1"
            ).fetchone()[0]
            wins = conn.execute(
                "SELECT COUNT(*) FROM turbo_signals WHERE result='win'"
            ).fetchone()[0]
            losses = conn.execute(
                "SELECT COUNT(*) FROM turbo_signals WHERE result='loss'"
            ).fetchone()[0]
            total_pnl = conn.execute(
                "SELECT COALESCE(SUM(pnl), 0) FROM turbo_signals WHERE pnl IS NOT NULL"
            ).fetchone()[0]
            win_pnl = conn.execute(
                "SELECT COALESCE(SUM(pnl), 0) FROM turbo_signals WHERE result='win'"
            ).fetchone()[0]
            loss_pnl = conn.execute(
                "SELECT COALESCE(ABS(SUM(pnl)), 0) FROM turbo_signals WHERE result='loss'"
            ).fetchone()[0]
        finally:
            conn.close()

        resolved = wins + losses
        win_rate = wins / resolved if resolved > 0 else 0
        profit_factor = win_pnl / loss_pnl if loss_pnl > 0 else 0

        now = timezone.now()
        metrics = [
            AgentMetric(agent=agent, name="total_signals", value=total, timestamp=now),
            AgentMetric(agent=agent, name="traded_count", value=traded, timestamp=now),
            AgentMetric(agent=agent, name="win_rate", value=round(win_rate, 4), timestamp=now),
            AgentMetric(agent=agent, name="profit_factor", value=round(profit_factor, 2), timestamp=now),
            AgentMetric(agent=agent, name="total_pnl", value=round(total_pnl, 2), timestamp=now),
            AgentMetric(agent=agent, name="resolved_trades", value=resolved, timestamp=now),
        ]
        AgentMetric.objects.bulk_create(metrics)

        return {
            "total_signals": total,
            "traded": traded,
            "resolved": resolved,
            "win_rate": round(win_rate, 4),
            "profit_factor": round(profit_factor, 2),
            "total_pnl": round(total_pnl, 2),
        }


def _parse_timestamp(ts_str: str) -> datetime:
    """Parse ISO timestamp string to timezone-aware datetime."""
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        dt = datetime.now(tz.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz.utc)
    return dt
