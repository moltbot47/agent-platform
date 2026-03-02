"""Build DecisionPipelineRun records from existing events.

Usage:
    python manage.py build_pipelines                          # All agents
    python manage.py build_pipelines --agent-name polymarket_turbo
"""

from django.core.management.base import BaseCommand

from agents.models import Agent
from bridge.pipeline_builder import build_pipeline_runs


class Command(BaseCommand):
    help = "Group existing AgentEvents into DecisionPipelineRun records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--agent-name", default="",
            help="Specific agent to build pipelines for (default: all agents).",
        )
        parser.add_argument(
            "--limit", type=int, default=50000,
            help="Max events to process (default: 50000).",
        )

    def handle(self, *args, **options):
        if options["agent_name"]:
            agents = Agent.objects.filter(name=options["agent_name"])
        else:
            agents = Agent.objects.all()

        for agent in agents:
            self.stdout.write(f"Building pipelines for: {agent.display_name}")
            stats = build_pipeline_runs(agent, limit=options["limit"])
            self.stdout.write(self.style.SUCCESS(
                f"  Cycles found:    {stats['cycles']:,}"
                f"\n  Runs created:    {stats['runs_created']:,}"
                f"\n  Events linked:   {stats['events_linked']:,}"
            ))

        self.stdout.write(self.style.SUCCESS("\nDone."))
