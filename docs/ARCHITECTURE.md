# Architecture

## System Context

Agent Platform is an observability and marketplace system for autonomous AI agents. It captures decision events, traces execution pipelines, calculates reputation scores, and provides real-time monitoring via WebSockets.

## Data Flow

```
External Agents (SDK/API)
        │
        ▼ POST /api/v1/events/
┌───────────────────────┐
│   Event Ingest View   │──→ PostHog capture()
│   (DRF + API Key)     │──→ Channel Layer broadcast
└───────────┬───────────┘
            │
            ▼
    ┌───────────────┐     ┌────────────────────┐
    │  AgentEvent   │────→│ DecisionPipelineRun│
    │  (17 types)   │     │ (grouped by cycle) │
    └───────────────┘     └────────────────────┘
            │
    ┌───────┴───────────────────────┐
    │                               │
    ▼                               ▼
┌──────────────┐          ┌─────────────────┐
│ REST API     │          │ WebSocket       │
│ (Dashboard)  │          │ (Live Stream)   │
└──────────────┘          └─────────────────┘
    │                               │
    ▼                               ▼
┌─────────────────────────────────────────┐
│         React Frontend                   │
│  Dashboard │ EventExplorer │ PipelineView│
│  Marketplace │ AgentDetail │ Charts      │
└─────────────────────────────────────────┘
```

## Django Apps

### `agents` — Registry & Identity
- **Agent**: Core entity with UUID PK, name, type, status, soul file
- **AgentAPIKey**: SHA-256 hashed API keys with `ak_` prefix
- **AgentOwnership**: NIL (Name, Image, Likeness) creator attribution
- **AgentLicense**: Licensing terms (exclusive, non-exclusive, open-source)
- **AgentReputation**: 4-factor weighted scoring (accuracy, profitability, reliability, consistency)

### `events` — Observability
- **AgentEvent**: 17 event types, 7 outcome states, JSON payload, cycle grouping
- **AgentMetric**: Time-series metric snapshots
- **DecisionPipelineRun**: Groups events by cycle_id into pipeline traces
- **EventStreamConsumer**: WebSocket consumer for live event streaming
- **Calibration**: Brier score, PnL curves, outcome breakdown analytics

### `bridge` — External Data
- **TurboSyncReader**: Reads Polymarket turbo SQLite DB (369k signals)
- **ApexSyncReader**: Reads Apex futures trade log (187 trades)
- **PipelineBuilder**: Groups imported events into pipeline runs

### `core` — Infrastructure
- **AgentAPIKeyAuthentication**: DRF auth backend
- **PostHog client**: Lazy-init wrapper for analytics capture

## Authentication

Two auth paths:
1. **API Key** (`Authorization: Bearer ak_...`): For agent event ingestion
2. **Session**: For admin and dashboard browsing (public endpoints are AllowAny)

API keys are generated with `secrets.token_urlsafe(32)`, prefixed with `ak_`, and stored as SHA-256 hashes.

## Reputation Scoring

Weighted average of 4 factors, calculated from event data:

| Factor | Weight | Source |
|--------|--------|--------|
| Accuracy | 30% | Win rate from resolved events |
| Profitability | 35% | Profit factor (win PnL / loss PnL) |
| Reliability | 20% | % of days active in window |
| Consistency | 15% | Win rate stability |

## WebSocket Architecture

```
Client ──ws/events/──→ EventStreamConsumer
                              │
                              ├── events_global (group)
                              └── events_agent_{id} (group)

Event Ingest ──→ broadcast_event() ──→ Channel Layer ──→ Consumer groups
```

- Development: `InMemoryChannelLayer` (no Redis required)
- Production: `channels_redis.core.RedisChannelLayer`

## Database Strategy

- **Development**: SQLite (zero config)
- **Production**: PostgreSQL (via Docker Compose)
- **Bridge sources**: Read-only SQLite connections to external trading databases
