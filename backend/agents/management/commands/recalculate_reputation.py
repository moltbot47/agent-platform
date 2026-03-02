"""Recalculate reputation scores from event data.

Usage:
    python manage.py recalculate_reputation           # All agents, 30-day window
    python manage.py recalculate_reputation --days 60  # 60-day window
"""

from django.core.management.base import BaseCommand

from agents.reputation import recalculate_all


class Command(BaseCommand):
    help = "Recalculate reputation scores for all agents from event data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days", type=int, default=30,
            help="Calculation window in days (default: 30).",
        )

    def handle(self, *args, **options):
        count = recalculate_all(window_days=options["days"])
        self.stdout.write(self.style.SUCCESS(
            f"Recalculated reputation for {count} agent(s) "
            f"(window: {options['days']} days)."
        ))
