"""Event type definitions for the Agent Platform SDK."""


class EventType:
    """Constants for common event types."""

    # Pipeline stages
    PRICE_FETCH = "price_fetch"
    MOMENTUM = "momentum"
    MARKET_LEAN = "market_lean"
    EDGE_GATE = "edge_gate"
    CIRCUIT_BREAKER = "circuit_breaker"
    SIGNAL = "signal"
    TREND_FILTER = "trend_filter"
    REGIME = "regime"
    RANKING = "ranking"
    RISK_VALIDATION = "risk_validation"
    EXECUTION = "execution"
    RESOLUTION = "resolution"
    CLAIM = "claim"

    # Meta events
    HEARTBEAT = "heartbeat"
    PREDICTION = "prediction"
    TRADE = "trade"
    ERROR = "error"
