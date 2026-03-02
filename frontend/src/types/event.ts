export type EventType =
  | 'data_fetch'
  | 'prediction'
  | 'signal_generation'
  | 'trend_filter'
  | 'regime_detection'
  | 'confidence_adjustment'
  | 'signal_ranking'
  | 'risk_validation'
  | 'apex_compliance'
  | 'execution'
  | 'position_exit'
  | 'cycle_start'
  | 'cycle_end'
  | 'heartbeat'
  | 'error'
  | 'message_sent'
  | 'message_received'
  // Polymarket turbo-specific
  | 'momentum_analysis'
  | 'market_lean'
  | 'edge_gate'
  | 'circuit_breaker'
  | 'resolution'
  | 'claim'

export interface AgentEvent {
  id: number
  agent_id: string
  event_type: EventType
  cycle: number | null
  instrument: string
  payload: Record<string, unknown>
  outcome: Record<string, unknown> | null
  posthog_event_id: string
  timestamp: string
}

export interface DashboardSummary {
  total_agents: number
  active_agents: number
  total_decisions_today: number
  total_trades_today: number
  aggregate_win_rate: number
  aggregate_pnl_today: number
  top_agent: {
    name: string
    pnl: number
  } | null
}
