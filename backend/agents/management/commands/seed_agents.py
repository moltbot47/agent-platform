"""Seed the platform with initial agents and realistic data.

Creates 3 pre-configured agents:
  1. polymarket_turbo — Live Polymarket binary options trader (primary demo agent)
  2. apex_trader — Micro futures trader using LaT-PFN (historical data)
  3. hyperliquid_arb — Cross-exchange arbitrage bot (community example)

Each agent gets: ownership record, reputation scores, API key, and a soul file.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from agents.models import Agent, AgentAPIKey, AgentOwnership, AgentReputation
from core.posthog_client import capture as posthog_capture, identify as posthog_identify

SEED_AGENTS = [
    {
        "name": "polymarket_turbo",
        "display_name": "Polymarket Turbo",
        "agent_type": "trading",
        "status": "active",
        "description": (
            "High-frequency binary options trader on Polymarket CLOB. "
            "5-second polling cycle, momentum-based edge detection, "
            "$1 limit orders with 5-15 minute resolution windows. "
            "369k+ historical signal evaluations."
        ),
        "capabilities": [
            "price_feed",
            "momentum_analysis",
            "market_lean_detection",
            "edge_gating",
            "circuit_breaking",
            "limit_order_execution",
            "position_management",
        ],
        "config": {
            "polling_interval_sec": 5,
            "min_edge_threshold": 0.03,
            "max_position_size_usd": 1.0,
            "resolution_windows": ["5m", "15m"],
            "exchange": "polymarket",
        },
        "version": "2.1.0",
        "soul_file": """# Polymarket Turbo — Soul File

## Identity
I am a high-frequency binary options trader on the Polymarket CLOB.
I specialize in short-duration momentum plays with strict edge gating.

## Personality
- Disciplined: I never trade without a verified edge
- Fast: 5-second decision cycles, millisecond execution
- Adaptive: My edge engine learns from every resolved market
- Conservative: $1 positions, binary outcomes, no leverage

## Decision Pipeline
1. **Price Fetch** — Poll Polymarket orderbook every 5 seconds
2. **Momentum Analysis** — Detect price velocity and acceleration
3. **Market Lean Detection** — Identify directional bias from order flow
4. **Edge Gate** — Apply asset/direction/hour filters from historical win rates
5. **Circuit Breaker** — Block trades during high-loss streaks or drawdown
6. **Execution** — Place limit buy order on CLOB
7. **Resolution** — Wait for 5m/15m window, claim outcome

## Performance
- 369,000+ signal evaluations
- Active since January 2026
- Binary outcomes: clean win/loss tracking
""",
        "ownership": {
            "creator_name": "Durayveon Butler",
            "creator_email": "dbutler@eulaproperties.com",
            "creator_url": "https://github.com/moltbot47",
        },
        "reputation": {
            "overall_score": 72,
            "accuracy_score": 68.5,
            "profitability_score": 71.0,
            "reliability_score": 85.0,
            "consistency_score": 64.0,
            "total_decisions": 369000,
            "total_trades": 12450,
            "win_rate": 0.537,
            "profit_factor": 1.18,
            "sharpe_ratio": 0.92,
            "max_drawdown_pct": 8.2,
            "brier_score": 0.231,
        },
    },
    {
        "name": "apex_trader",
        "display_name": "Apex Futures Trader",
        "agent_type": "trading",
        "status": "active",
        "description": (
            "Automated micro futures trader using LaT-PFN zero-shot "
            "time-series forecasting. Trades MNQ, MES, MYM, MBT on "
            "Apex prop firm accounts via TradersPost webhooks. "
            "NBA shot-tier signal classification with EMA trend filtering."
        ),
        "capabilities": [
            "latpfn_forecasting",
            "signal_generation",
            "trend_filtering",
            "regime_detection",
            "signal_ranking",
            "risk_management",
            "apex_compliance",
            "traderspost_execution",
        ],
        "config": {
            "model": "LaT-PFN",
            "prediction_bars": 60,
            "history_bars": 180,
            "interval": "5m",
            "instruments": ["MNQ", "MES", "MYM", "MBT"],
            "max_risk_per_trade": 0.02,
            "max_daily_loss": 1000,
        },
        "version": "1.4.0",
        "soul_file": """# Apex Futures Trader — Soul File

## Identity
I am an automated futures trader powered by LaT-PFN zero-shot forecasting.
I trade micro futures on Apex prop firm evaluation accounts.

## Personality
- Analytical: Every decision is model-driven, never emotional
- Risk-aware: Drawdown-adaptive sizing, Apex compliance built-in
- Selective: NBA shot-tier system filters signals by confidence
- Trend-following: EMA gate mode rejects counter-trend trades

## Decision Pipeline
1. **Data Fetch** — 240 bars of 5-min OHLCV from yfinance
2. **Forecast** — LaT-PFN predicts next 60 bars (direction + confidence)
3. **Signal Generation** — Composite confidence → NBA shot tier
4. **Trend Filter** — EMA 50/200 gate rejects counter-trend
5. **Regime Detection** — ADX + volatility → regime multiplier
6. **Signal Ranking** — Multi-factor ranking across instruments
7. **Risk Validation** — Position sizing + Apex trailing drawdown check
8. **Execution** — TradersPost webhook → Tradovate → Apex

## Performance (Broker-Confirmed, 02/19-02/23/2026)
- 187 trades | 56.7% WR | PF 1.61 | +$3,205.25
- MNQ: 72 trades, 61.1% WR, +$1,668
- MES: 56 trades, 51.8% WR, +$404
- MBT: 10 trades, 80.0% WR, +$263
- MYM: 48 trades, 50.0% WR, +$256
""",
        "ownership": {
            "creator_name": "Durayveon Butler",
            "creator_email": "dbutler@eulaproperties.com",
            "creator_url": "https://github.com/moltbot47",
        },
        "reputation": {
            "overall_score": 78,
            "accuracy_score": 56.7,
            "profitability_score": 82.0,
            "reliability_score": 90.0,
            "consistency_score": 75.0,
            "total_decisions": 1250,
            "total_trades": 187,
            "win_rate": 0.567,
            "profit_factor": 1.61,
            "sharpe_ratio": 1.34,
            "max_drawdown_pct": 4.8,
            "brier_score": 0.198,
        },
    },
    {
        "name": "hyperliquid_arb",
        "display_name": "Hyperliquid Arbitrage",
        "agent_type": "trading",
        "status": "draft",
        "description": (
            "Cross-exchange arbitrage bot monitoring price discrepancies "
            "between Hyperliquid perps and Binance/Bybit spot. "
            "Designed by the OpenClaw community as a reference agent."
        ),
        "capabilities": [
            "cross_exchange_monitoring",
            "spread_detection",
            "latency_arbitrage",
            "position_hedging",
        ],
        "config": {
            "exchanges": ["hyperliquid", "binance", "bybit"],
            "min_spread_bps": 15,
            "max_position_usd": 500,
        },
        "version": "0.3.0",
        "soul_file": """# Hyperliquid Arbitrage — Soul File

## Identity
I am a cross-exchange arbitrage bot built by the OpenClaw community.
I monitor price spreads between Hyperliquid perps and CEX spot markets.

## Personality
- Precise: I only execute when spread exceeds my minimum threshold
- Fast: Sub-second detection and execution
- Neutral: Market-neutral positions, hedged at all times
- Community-built: Open-source reference implementation

## Status
Currently in draft/development. Community contributions welcome.
""",
        "ownership": {
            "creator_name": "OpenClaw Community",
            "creator_email": "",
            "creator_url": "https://github.com/moltbot47",
        },
        "reputation": {
            "overall_score": 45,
            "accuracy_score": 0.0,
            "profitability_score": 0.0,
            "reliability_score": 50.0,
            "consistency_score": 0.0,
            "total_decisions": 0,
            "total_trades": 0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown_pct": 0.0,
        },
    },
]


class Command(BaseCommand):
    help = "Seed the platform with 3 initial agents and realistic data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing seed agents before re-creating.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            names = [a["name"] for a in SEED_AGENTS]
            deleted, _ = Agent.objects.filter(name__in=names).delete()
            self.stdout.write(f"Deleted {deleted} existing objects.")

        created_count = 0
        for seed_entry in SEED_AGENTS:
            name = seed_entry["name"]
            if Agent.objects.filter(name=name).exists():
                self.stdout.write(self.style.WARNING(f"  skip: {name} (already exists)"))
                continue

            agent_data = {k: v for k, v in seed_entry.items() if k not in ("ownership", "reputation")}
            ownership_data = seed_entry["ownership"]
            reputation_data = seed_entry["reputation"]

            agent = Agent.objects.create(**agent_data)

            AgentOwnership.objects.create(agent=agent, **ownership_data)
            AgentReputation.objects.create(agent=agent, **reputation_data)

            _api_key_obj, raw_key = AgentAPIKey.generate(agent, label="seed-key")

            # Set a recent heartbeat for active agents
            if agent.status == Agent.Status.ACTIVE:
                agent.last_heartbeat = timezone.now()
                agent.save(update_fields=["last_heartbeat"])

            # PostHog: identify + capture
            posthog_identify(
                str(agent.id),
                {
                    "name": agent.name,
                    "display_name": agent.display_name,
                    "agent_type": agent.agent_type,
                    "creator": ownership_data["creator_name"],
                },
            )
            posthog_capture(
                str(agent.id),
                "agent_seeded",
                {
                    "agent_type": agent.agent_type,
                    "status": agent.status,
                    "reputation_score": reputation_data["overall_score"],
                },
            )

            self.stdout.write(self.style.SUCCESS(
                f"  created: {name} (key: {raw_key[:20]}...)"
            ))
            created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nSeeded {created_count} agent(s). "
            f"Total: {Agent.objects.count()} agents."
        ))
