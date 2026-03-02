"""Pipeline builder — groups AgentEvents into DecisionPipelineRun records.

Takes already-synced AgentEvent records and groups them by cycle_id
into pipeline runs. Each pipeline run tracks the full decision flow
for one signal evaluation cycle.
"""

import logging
from collections import defaultdict

from django.utils import timezone

from agents.models import Agent
from events.models import AgentEvent, DecisionPipelineRun

logger = logging.getLogger(__name__)

# Ordered pipeline stages for turbo strategy
TURBO_STAGES = [
    "price_fetch", "momentum", "market_lean", "edge_gate",
    "circuit_breaker", "execution", "resolution", "claim",
]

# Ordered pipeline stages for Apex strategy
APEX_STAGES = [
    "prediction", "signal", "trend_filter", "regime",
    "ranking", "risk_validation", "execution", "resolution",
]


def build_pipeline_runs(agent: Agent, limit: int = 50000) -> dict:
    """Group existing events into pipeline runs.

    Finds events with cycle_ids that don't already have a pipeline run,
    groups them, and creates DecisionPipelineRun records.

    Returns:
        Dict with build stats.
    """
    # Find events without pipeline runs
    events = (
        AgentEvent.objects.filter(agent=agent, pipeline_run__isnull=True)
        .exclude(cycle_id="")
        .order_by("timestamp")[:limit]
    )

    # Group by cycle_id
    cycles: dict[str, list[AgentEvent]] = defaultdict(list)
    for event in events:
        cycles[event.cycle_id].append(event)

    stats = {"cycles": len(cycles), "runs_created": 0, "events_linked": 0}

    # Determine stage order based on agent
    stages = TURBO_STAGES if "turbo" in agent.name else APEX_STAGES

    runs_to_create = []
    event_updates = []

    for cycle_id, cycle_events in cycles.items():
        # Skip if pipeline run already exists
        if DecisionPipelineRun.objects.filter(agent=agent, cycle_id=cycle_id).exists():
            continue

        # Determine pipeline outcome
        sorted_events = sorted(cycle_events, key=lambda e: e.timestamp)
        first_event = sorted_events[0]
        last_event = sorted_events[-1]

        # Count stages
        event_types = [e.event_type for e in sorted_events]
        total_stages = len(sorted_events)
        passed = sum(1 for e in sorted_events if e.outcome in ("pass", "win"))

        # Find where it was blocked (if any)
        blocked_at = ""
        for e in sorted_events:
            if e.outcome == "block":
                blocked_at = e.event_type
                break

        # Determine final outcome
        final_outcome = "pending"
        if any(e.outcome == "win" for e in sorted_events):
            final_outcome = "win"
        elif any(e.outcome == "loss" for e in sorted_events):
            final_outcome = "loss"
        elif blocked_at:
            final_outcome = "block"
        elif any(e.event_type == "execution" for e in sorted_events):
            final_outcome = "pass"

        # Calculate duration
        duration_ms = None
        if len(sorted_events) > 1:
            delta = (last_event.timestamp - first_event.timestamp).total_seconds() * 1000
            duration_ms = int(delta) if delta > 0 else None

        # Determine instrument
        instrument = ""
        for e in sorted_events:
            if e.instrument:
                instrument = e.instrument
                break

        run = DecisionPipelineRun(
            agent=agent,
            cycle_id=cycle_id,
            instrument=instrument,
            final_outcome=final_outcome,
            total_stages=total_stages,
            passed_stages=passed,
            blocked_at_stage=blocked_at,
            duration_ms=duration_ms,
            started_at=first_event.timestamp,
            completed_at=last_event.timestamp if total_stages > 1 else None,
        )
        runs_to_create.append(run)

    # Bulk create pipeline runs
    if runs_to_create:
        created_runs = DecisionPipelineRun.objects.bulk_create(runs_to_create, batch_size=500)
        stats["runs_created"] = len(created_runs)

        # Now link events to their pipeline runs
        # Build a cycle_id -> run mapping
        run_map = {run.cycle_id: run for run in created_runs}

        for cycle_id, cycle_events in cycles.items():
            run = run_map.get(cycle_id)
            if run:
                event_ids = [e.id for e in cycle_events]
                updated = AgentEvent.objects.filter(id__in=event_ids).update(pipeline_run=run)
                stats["events_linked"] += updated

    return stats
