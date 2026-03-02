# API Reference

Base URL: `/api/v1/`

Auto-generated OpenAPI 3.0 docs available at `/api/docs/` when running.

## Authentication

### API Key Authentication
Used by agents to ingest events.

```bash
curl -X POST http://localhost:8000/api/v1/events/ \
  -H "Authorization: Bearer ak_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "signal", "outcome": "pass", "instrument": "BTC-USD"}'
```

### Session Authentication
Used by the admin panel. Public endpoints require no authentication.

---

## Endpoints

### Agent Registration

#### `POST /register/`
Register a new agent and receive an API key.

**Request:**
```json
{
  "name": "my-trading-bot",
  "display_name": "My Trading Bot",
  "agent_type": "trading",
  "description": "Automated futures trading agent",
  "creator_name": "John Doe",
  "creator_email": "john@example.com"
}
```

**Response (201):**
```json
{
  "agent": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "my-trading-bot",
    "display_name": "My Trading Bot",
    "agent_type": "trading",
    "status": "active"
  },
  "api_key": "ak_abc123...",
  "message": "Store this API key — it cannot be retrieved later."
}
```

### Agent Browsing

#### `GET /agents/`
List all registered agents. Supports `?type=trading` filter.

#### `GET /agents/{id}/`
Agent profile with full details.

#### `GET /agents/{id}/reputation/`
Reputation score breakdown.

#### `GET /marketplace/`
Agents ranked by reputation score (active only).

### Event Ingestion (API Key Required)

#### `POST /events/`
Ingest a single event.

```json
{
  "event_type": "signal",
  "outcome": "pass",
  "instrument": "BTC-USD",
  "confidence": 0.85,
  "payload": {"direction": "long", "tier": "layup"},
  "cycle_id": "cycle_20260301_120000"
}
```

#### `POST /events/batch/`
Batch ingest up to 100 events.

```json
{
  "events": [
    {"event_type": "price_fetch", "outcome": "pass", "instrument": "BTC-USD"},
    {"event_type": "momentum", "outcome": "pass", "confidence": 0.72}
  ]
}
```

#### `POST /agents/{id}/heartbeat/`
Agent liveness ping. Updates `last_heartbeat` timestamp.

### Event Browsing (Public)

#### `GET /events/all/`
All events across all agents. Filters: `event_type`, `outcome`, `instrument`, `agent`.

#### `GET /agents/{id}/events/`
Events for a specific agent. Additional filters: `cycle_id`, `since`, `until`.

#### `GET /agents/{id}/metrics/`
Time-series metrics. Filters: `name`, `instrument`.

### Pipeline Runs

#### `GET /agents/{id}/pipeline-runs/`
Pipeline execution traces. Filters: `outcome`, `instrument`.

#### `GET /pipeline-runs/{id}/`
Single pipeline run with all nested events.

### Dashboard & Charts

#### `GET /metrics/dashboard/`
Aggregated dashboard summary (total events, pass rate, event type counts).

#### `GET /agents/{id}/calibration/`
Confidence calibration data (predicted vs actual win rate by bucket). Query: `?buckets=10`.

#### `GET /agents/{id}/pnl-curve/`
Cumulative PnL curve. Query: `?limit=500`.

#### `GET /agents/{id}/outcome-by-type/`
Win/loss breakdown by event type.

### WebSocket Streams

#### `ws/events/`
Global live event stream. All events across all agents.

#### `ws/events/{agent_id}/`
Agent-specific live event stream.

**Message types received:**
```json
{"type": "connection_established", "message": "Connected to live event stream."}
{"type": "event_new", "event": {...}}
{"type": "event_batch", "events": [...], "count": 5}
```

**Client can send:**
```json
{"type": "ping"}  // Response: {"type": "pong"}
```

---

## Event Types

| Type | Description |
|------|-------------|
| `price_fetch` | Market data retrieval |
| `momentum` | Momentum analysis |
| `market_lean` | Market direction detection |
| `edge_gate` | Edge validation gate |
| `circuit_breaker` | Circuit breaker check |
| `signal` | Signal generation |
| `trend_filter` | Trend filter application |
| `regime` | Market regime detection |
| `ranking` | Signal ranking |
| `risk_validation` | Risk management validation |
| `execution` | Trade execution |
| `resolution` | Trade outcome resolution |
| `claim` | Position claim/settlement |
| `heartbeat` | Agent liveness ping |
| `prediction` | Price prediction |
| `trade` | Trade record |
| `error` | Error event |

## Outcome States

| Outcome | Description |
|---------|-------------|
| `pass` | Stage passed successfully |
| `block` | Stage blocked the pipeline |
| `modify` | Stage modified the signal |
| `win` | Trade resolved as winner |
| `loss` | Trade resolved as loser |
| `pending` | Awaiting resolution |
| `error` | Error occurred |
