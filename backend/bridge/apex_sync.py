"""ApexSyncReader — reads trade_log.db and creates AgentEvents.

Maps historical Apex futures trades → AgentEvent records.
Each trade becomes a trade event + optional resolution event.
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


class ApexSyncReader:
    """Reads trade_log.db and syncs to AgentEvent records."""

    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or getattr(settings, "TRADE_LOG_DB", "")

    def _get_connection(self) -> sqlite3.Connection:
        if not Path(self.db_path).exists():
            raise FileNotFoundError(f"Trade log DB not found: {self.db_path}")
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def sync(self, agent: Agent, limit: int = 10000) -> dict:
        """Sync Apex trades → AgentEvent records."""
        conn = self._get_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM trades ORDER BY timestamp ASC LIMIT ?", (limit,)
            ).fetchall()
        finally:
            conn.close()

        stats = {"total": len(rows), "created": 0, "skipped": 0, "resolved": 0}
        events_to_create = []

        for row in rows:
            ts = _parse_timestamp(row["timestamp"])
            cycle_id = f"apex_trade_{row['id']}"

            if AgentEvent.objects.filter(agent=agent, cycle_id=cycle_id).exists():
                stats["skipped"] += 1
                continue

            # Trade event
            events_to_create.append(AgentEvent(
                agent=agent,
                event_type="trade",
                outcome="pass",
                instrument=row["instrument"],
                confidence=None,
                cycle_id=cycle_id,
                timestamp=ts,
                payload={
                    "direction": row["direction"],
                    "shot_tier": row["shot_tier"] or "",
                    "entry_price": row["entry_price"],
                    "stop_loss": row["stop_loss"],
                    "take_profit": row["take_profit"],
                    "position_size": row["position_size"],
                    "risk_dollars": row["risk_dollars"],
                    "regime": row["regime"] or "",
                    "execution_status": row["execution_status"],
                },
            ))

            # Resolution if PnL exists
            if row["pnl_dollars"] is not None:
                stats["resolved"] += 1
                is_win = row["pnl_dollars"] > 0
                events_to_create.append(AgentEvent(
                    agent=agent,
                    event_type="resolution",
                    outcome="win" if is_win else "loss",
                    instrument=row["instrument"],
                    cycle_id=cycle_id,
                    timestamp=ts,
                    payload={
                        "pnl": row["pnl_dollars"],
                        "exit_price": row["exit_price"],
                        "exit_reason": row["exit_reason"] or "",
                        "time_in_trade_minutes": row["time_in_trade_minutes"],
                    },
                ))

        if events_to_create:
            AgentEvent.objects.bulk_create(events_to_create, batch_size=500)
            stats["created"] = len(events_to_create)

            posthog_capture(
                str(agent.id),
                "apex_sync_completed",
                {
                    "events_created": stats["created"],
                    "trades_processed": stats["total"],
                    "resolved_count": stats["resolved"],
                },
            )

        return stats

    def sync_metrics(self, agent: Agent) -> dict:
        """Calculate aggregate metrics from Apex trades."""
        conn = self._get_connection()
        try:
            total = conn.execute("SELECT COUNT(*) FROM trades").fetchone()[0]
            executed = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE execution_status='executed'"
            ).fetchone()[0]
            resolved = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE pnl_dollars IS NOT NULL"
            ).fetchone()[0]
            wins = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE pnl_dollars > 0"
            ).fetchone()[0]
            total_pnl = conn.execute(
                "SELECT COALESCE(SUM(pnl_dollars), 0) FROM trades WHERE pnl_dollars IS NOT NULL"
            ).fetchone()[0]
            win_pnl = conn.execute(
                "SELECT COALESCE(SUM(pnl_dollars), 0) FROM trades WHERE pnl_dollars > 0"
            ).fetchone()[0]
            loss_pnl = conn.execute(
                "SELECT COALESCE(ABS(SUM(pnl_dollars)), 0) FROM trades WHERE pnl_dollars < 0"
            ).fetchone()[0]
        finally:
            conn.close()

        win_rate = wins / resolved if resolved > 0 else 0
        profit_factor = win_pnl / loss_pnl if loss_pnl > 0 else 0

        now = timezone.now()
        metrics = [
            AgentMetric(agent=agent, name="total_trades", value=total, timestamp=now),
            AgentMetric(agent=agent, name="executed_trades", value=executed, timestamp=now),
            AgentMetric(agent=agent, name="win_rate", value=round(win_rate, 4), timestamp=now),
            AgentMetric(agent=agent, name="profit_factor", value=round(profit_factor, 2), timestamp=now),
            AgentMetric(agent=agent, name="total_pnl", value=round(total_pnl, 2), timestamp=now),
        ]
        AgentMetric.objects.bulk_create(metrics)

        return {
            "total_trades": total,
            "executed": executed,
            "resolved": resolved,
            "win_rate": round(win_rate, 4),
            "profit_factor": round(profit_factor, 2),
            "total_pnl": round(total_pnl, 2),
        }


def _parse_timestamp(ts_str: str) -> datetime:
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        dt = datetime.now(tz.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz.utc)
    return dt
