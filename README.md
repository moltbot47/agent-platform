# Agent Platform

Full-stack observability, ownership, and marketplace platform for autonomous AI agents. Built with Django 5, React 19, TypeScript, and real-time WebSockets.

**Live data**: 369,000+ signal evaluations from a Polymarket trading bot and 187 historical futures trades from an Apex prop firm account — all flowing through the platform's event pipeline, visualized in real time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                      │
│  Dashboard │ EventExplorer │ PipelineView │ Marketplace │ SDK   │
│  Recharts  │ TanStack Query│ useWebSocket │ Tailwind CSS       │
└────────────┬──────────────────────────────────┬─────────────────┘
             │ REST API (DRF)                   │ WebSocket
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Django 5 + Channels)                  │
│                                                                  │
│  agents/          events/           bridge/          core/       │
│  ├─ Registry      ├─ Capture        ├─ turbo_sync    ├─ Auth    │
│  ├─ Ownership     ├─ Pipeline       ├─ apex_sync     ├─ PostHog │
│  ├─ Reputation    ├─ Calibration    └─ pipeline_     └─ Perms   │
│  └─ Marketplace   ├─ WebSocket          builder                 │
│                   └─ Dashboard                                   │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
     ┌───────▼───────┐                 ┌────────▼────────┐
     │   PostgreSQL   │                 │  Redis (Channels)│
     │   (SQLite dev) │                 │  InMemory (dev)  │
     └───────────────┘                  └─────────────────┘
             ▲
    ┌────────┴────────────────────────┐
    │        Data Bridges             │
    │  turbo_analytics.db  (369k)     │
    │  trade_log.db        (187)      │
    └─────────────────────────────────┘
```

## Features

### Agent Activity Monitor
Real-time observability for autonomous agents. Visualizes the full decision pipeline as a step diagram with pass/block/modify status per stage.

- **Event capture** — 17 event types (price_fetch, momentum, edge_gate, execution, resolution...)
- **Pipeline tracing** — group events into decision pipeline runs, track stages + outcomes
- **Confidence calibration** — Brier score analysis, predicted vs actual win rate by bucket
- **PnL curves** — cumulative profit/loss tracking per agent
- **Live WebSocket feed** — events stream in real time via Django Channels

### Agent Control Panel
Public registration and management for autonomous agents. API key auth for event ingestion.

- **Public registration** — no login required, get an API key instantly
- **Agent profiles** — shareable URLs with stats, reputation, ownership info
- **Reputation scoring** — 4-factor weighted score (accuracy 30%, profitability 35%, reliability 20%, consistency 15%)
- **NIL ownership model** — creator attribution, revenue share, licensing

### Agent Marketplace
Discovery and ranking by reputation score.

- **Ranked listing** — agents sorted by overall reputation (0-100)
- **Type badges** — trading, prediction, orchestrator, monitor, custom
- **Online indicators** — heartbeat-based liveness detection
- **Circular reputation gauge** — SVG component with color-coded scoring

### Python SDK
Instrument any agent in 3 lines:

```python
from agent_platform import AgentClient

client = AgentClient(api_key="ak_your_key")
client.emit("prediction", instrument="BTC-USD", payload={"direction": "long", "confidence": 0.72})
```

Pipeline context manager for grouped events:

```python
with client.pipeline("BTC-USD") as p:
    p.stage("data_fetch", outcome="pass")
    p.stage("signal", outcome="pass", confidence=0.85)
    p.stage("execution", outcome="pass", payload={"price": 67500})
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django 5, Django REST Framework, Django Channels, Daphne |
| **Frontend** | React 19, TypeScript (strict), Vite, Tailwind CSS v4 |
| **Data** | Recharts, TanStack React Query |
| **Auth** | API key (SHA-256 hashed, `ak_` prefix) |
| **Real-time** | WebSockets via Django Channels |
| **Analytics** | PostHog (Python + JS SDKs) |
| **API docs** | drf-spectacular (OpenAPI 3.0) |
| **Deploy** | Docker, Docker Compose, Nginx, Daphne ASGI |
| **Database** | SQLite (dev) / PostgreSQL (prod) |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm or yarn

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # Edit with your settings
python manage.py migrate
python manage.py seed_agents  # Seed 3 demo agents
python manage.py runserver 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### Bridge (import trading data)

```bash
# Sync 369k Polymarket turbo signals
python manage.py sync_turbo

# Import 187 Apex historical trades
python manage.py sync_apex

# Group events into pipeline runs
python manage.py build_pipelines

# Recalculate reputation scores
python manage.py recalculate_reputation
```

### Docker (production)

```bash
cd deploy
docker compose up --build
# App: http://localhost (Nginx)
# API: http://localhost/api/v1/
# Docs: http://localhost/api/docs/
```

---

## API Reference

Full OpenAPI 3.0 docs at `/api/docs/` when running.

### Public Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/register/` | Register agent, receive API key |
| `GET` | `/api/v1/agents/` | Browse registered agents |
| `GET` | `/api/v1/agents/{id}/` | Agent profile + stats |
| `GET` | `/api/v1/agents/{id}/reputation/` | Reputation breakdown |
| `GET` | `/api/v1/marketplace/` | Ranked agent marketplace |
| `GET` | `/api/v1/events/all/` | Browse all events |
| `GET` | `/api/v1/metrics/dashboard/` | Dashboard aggregation |

### Authenticated Endpoints (API Key)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/events/` | Ingest single event |
| `POST` | `/api/v1/events/batch/` | Batch ingest (up to 100) |
| `POST` | `/api/v1/agents/{id}/heartbeat/` | Agent heartbeat |

### WebSocket Endpoints
| Path | Description |
|------|-------------|
| `ws/events/` | Global live event stream |
| `ws/events/{agent_id}/` | Agent-specific live stream |

### Chart Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/agents/{id}/calibration/` | Confidence calibration data |
| `GET` | `/api/v1/agents/{id}/pnl-curve/` | Cumulative PnL curve |
| `GET` | `/api/v1/agents/{id}/outcome-by-type/` | Win/loss by event type |

---

## Project Structure

```
agent-platform/
├── backend/
│   ├── agents/              # Agent registry, ownership, reputation, API keys
│   │   ├── models.py        # Agent, AgentAPIKey, AgentOwnership, AgentLicense, AgentReputation
│   │   ├── views.py         # 8 views: list, detail, register, reputation, marketplace
│   │   ├── reputation.py    # 4-factor reputation calculation service
│   │   └── tests/           # 18 tests
│   ├── events/              # Event capture, pipelines, charts, WebSocket
│   │   ├── models.py        # AgentEvent (17 types), AgentMetric, DecisionPipelineRun
│   │   ├── views.py         # 11 views: ingest, browse, dashboard, calibration, PnL
│   │   ├── consumers.py     # WebSocket EventStreamConsumer
│   │   ├── broadcast.py     # Channel layer broadcast on event ingest
│   │   ├── calibration.py   # Brier score, PnL curve, outcome breakdown
│   │   └── tests/           # 17 tests
│   ├── bridge/              # Data bridges to external SQLite databases
│   │   ├── turbo_sync.py    # TurboSyncReader (369k Polymarket signals)
│   │   ├── apex_sync.py     # ApexSyncReader (187 futures trades)
│   │   └── pipeline_builder.py  # Groups events into pipeline runs
│   └── core/                # Auth, permissions, PostHog wrapper
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, AgentDetail, EventExplorer, PipelineView, Marketplace
│   │   ├── components/      # LiveEventFeed, Charts (Calibration, PnL, Outcome), ReputationGauge
│   │   ├── hooks/           # useAgents, useEvents, useCharts, useWebSocket
│   │   ├── api/             # Typed Axios client, agents, events, charts
│   │   └── types/           # TypeScript interfaces matching Django models
│   └── package.json
├── sdk/                     # Python SDK (pip installable)
│   ├── agent_platform/
│   │   ├── client.py        # AgentClient with pipeline context manager
│   │   └── types.py         # EventType constants
│   └── setup.py
├── deploy/
│   ├── Dockerfile           # Multi-stage build (Node + Python)
│   ├── docker-compose.yml   # Backend + PostgreSQL + Redis + Nginx
│   └── nginx.conf           # Reverse proxy with WebSocket support
└── Makefile                 # Dev commands
```

---

## Data Pipeline

The platform bridges data from two live trading systems:

### Polymarket Turbo (Primary — 369,000+ events)
5-second polling cycle, $1 binary option trades. Full decision pipeline:

```
Price Fetch → Momentum Analysis → Market Lean Detection
  → Edge Engine Gate → Circuit Breaker Check
    → Execution → Resolution → Claim
```

### Apex Futures (Secondary — 187 trades)
LaT-PFN zero-shot forecasting on micro futures (MNQ, MES, MBT, MYM). Decision pipeline:

```
Data Fetch → Forecast → Signal Generation → Trend Filter
  → Ranking → Risk Validation → Execution → Resolution
```

---

## Testing

```bash
# Run all 40 backend tests
cd backend && python manage.py test -v2

# Run specific test modules
python manage.py test agents.tests -v2      # 18 agent tests
python manage.py test events.tests -v2      # 17 event tests
python manage.py test events.tests.test_websocket -v2  # 5 WebSocket tests
```

---

## Development

```bash
make help                # Show all commands
make backend-run         # Django dev server (port 8000)
make frontend-dev        # Vite dev server (port 5173)
make backend-test        # Run backend tests
make sync-turbo          # Import Polymarket data
make sync-apex           # Import Apex data
```

---

## Environment Variables

See `.env.example` for all configuration options:

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | dev key | Django secret key |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DB_ENGINE` | `sqlite3` | Database engine |
| `POSTHOG_API_KEY` | — | PostHog project API key |
| `TRADING_SYSTEM_DIR` | `~/latpfn-trading` | Path to trading system data |
| `CHANNEL_LAYER_BACKEND` | `InMemoryChannelLayer` | Channels backend |

---

## License

MIT
