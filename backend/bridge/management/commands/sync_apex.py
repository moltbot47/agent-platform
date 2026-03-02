"""Sync Apex historical trades → AgentEvent records.

Usage:
    python manage.py sync_apex              # Sync all trades
    python manage.py sync_apex --metrics    # Also calculate metrics
"""

from django.core.management.base import BaseCommand

from agents.models import Agent
from bridge.apex_sync import ApexSyncReader


class Command(BaseCommand):
    help = "Import Apex historical trades from trade_log.db into AgentEvent records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--metrics", action="store_true",
            help="Also sync aggregate metrics.",
        )
        parser.add_argument(
            "--agent-name", default="apex_trader",
            help="Agent name to sync to (default: apex_trader).",
        )

    def handle(self, *args, **options):
        try:
            agent = Agent.objects.get(name=options["agent_name"])
        except Agent.DoesNotExist:
            self.stderr.write(self.style.ERROR(
                f"Agent '{options['agent_name']}' not found. Run 'seed_agents' first."
            ))
            return

        reader = ApexSyncReader()
        self.stdout.write(f"Syncing Apex trades for: {agent.display_name}")
        self.stdout.write(f"Source: {reader.db_path}")

        try:
            stats = reader.sync(agent=agent)
        except FileNotFoundError as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return

        self.stdout.write(self.style.SUCCESS(
            f"\nSync complete:"
            f"\n  Processed: {stats['total']:,}"
            f"\n  Created:   {stats['created']:,} events"
            f"\n  Skipped:   {stats['skipped']:,} (already synced)"
            f"\n  Resolved:  {stats['resolved']:,}"
        ))

        if options["metrics"]:
            self.stdout.write("\nSyncing metrics...")
            metrics = reader.sync_metrics(agent)
            self.stdout.write(self.style.SUCCESS(
                f"  Win rate:      {metrics['win_rate']:.2%}"
                f"\n  Profit factor: {metrics['profit_factor']:.2f}"
                f"\n  Total PnL:     ${metrics['total_pnl']:.2f}"
                f"\n  Trades:        {metrics['executed']:,} executed / {metrics['total_trades']:,} total"
            ))
