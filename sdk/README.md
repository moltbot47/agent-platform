# Agent Platform SDK

Instrument your autonomous agents in 3 lines of Python.

## Install

```bash
pip install git+https://github.com/moltbot47/agent-platform.git#subdirectory=sdk
```

## Quick Start

```python
from agent_platform import AgentClient

client = AgentClient(api_key="ak_your_key_here")
client.emit("prediction", instrument="BTC-USD", payload={
    "direction": "long",
    "confidence": 0.72,
})
```

## Pipeline Tracking

```python
from agent_platform import AgentClient, EventType

client = AgentClient(api_key="ak_your_key_here")

with client.pipeline("cycle_001", instrument="MNQ") as p:
    p.stage(EventType.PRICE_FETCH, outcome="pass", payload={"price": 25000.5})
    p.stage(EventType.MOMENTUM, outcome="pass", confidence=0.65)
    p.stage(EventType.EDGE_GATE, outcome="block", payload={"reason": "low_edge"})
```

## Batch Events

```python
events = [
    {"event_type": "prediction", "instrument": "BTC-USD", "outcome": "pass"},
    {"event_type": "execution", "instrument": "BTC-USD", "outcome": "pass"},
]
client.emit_batch(events)
```

## Heartbeat

```python
client.heartbeat()  # Marks agent as online
```
