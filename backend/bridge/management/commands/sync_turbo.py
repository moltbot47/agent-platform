"""Sync Polymarket turbo signals → AgentEvent records.

Usage:
    python manage.py sync_turbo                    # Sync up to 10k signals
    python manage.py sync_turbo --limit 50000      # Sync more
    python manage.py sync_turbo --traded-only       # Only traded signals
    python manage.py sync_turbo --metrics           # Also calculate metrics
"""

from django.core.management.base import BaseCommand

from agents.models import Agent
from bridge.turbo_sync import TurboSyncReader


class Command(BaseCommand):
    help = "Sync Polymarket turbo signals from turbo_analytics.db into AgentEvent records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit", type=int, default=10000,
            help="Max rows to sync (default: 10000)",
        )
        parser.add_argument(
            "--traded-only", action="store_true",
            help="Only sync signals that were actually traded.",
        )
        parser.add_argument(
            "--metrics", action="store_true",
            help="Also sync aggregate metrics.",
        )
        parser.add_argument(
            "--agent-name", default="polymarket_turbo",
            help="Agent name to sync to (default: polymarket_turbo).",
        )

    def handle(self, *args, **options):
        try:
            agent = Agent.objects.get(name=options["agent_name"])
        except Agent.DoesNotExist:
            self.stderr.write(self.style.ERROR(
                f"Agent '{options['agent_name']}' not found. Run 'seed_agents' first."
            ))
            return

        reader = TurboSyncReader()
        self.stdout.write(f"Syncing turbo signals for: {agent.display_name}")
        self.stdout.write(f"Source: {reader.db_path}")

        try:
            total = reader.get_total_count()
            self.stdout.write(f"Total signals in DB: {total:,}")
        except FileNotFoundError as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return

        stats = reader.sync(
            agent=agent,
            limit=options["limit"],
            traded_only=options["traded_only"],
        )

        self.stdout.write(self.style.SUCCESS(
            f"\nSync complete:"
            f"\n  Processed: {stats['total']:,}"
            f"\n  Created:   {stats['created']:,} events"
            f"\n  Skipped:   {stats['skipped']:,} (already synced)"
            f"\n  Traded:    {stats['traded']:,}"
            f"\n  Resolved:  {stats['resolved']:,}"
        ))

        if options["metrics"]:
            self.stdout.write("\nSyncing metrics...")
            metrics = reader.sync_metrics(agent)
            self.stdout.write(self.style.SUCCESS(
                f"  Win rate:      {metrics['win_rate']:.2%}"
                f"\n  Profit factor: {metrics['profit_factor']:.2f}"
                f"\n  Total PnL:     ${metrics['total_pnl']:.2f}"
                f"\n  Resolved:      {metrics['resolved']:,} / {metrics['traded']:,} traded"
            ))
