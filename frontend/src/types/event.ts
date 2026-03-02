export type EventType =
  | 'price_fetch'
  | 'momentum'
  | 'market_lean'
  | 'edge_gate'
  | 'circuit_breaker'
  | 'signal'
  | 'trend_filter'
  | 'regime'
  | 'ranking'
  | 'risk_validation'
  | 'execution'
  | 'resolution'
  | 'claim'
  | 'heartbeat'
  | 'prediction'
  | 'trade'
  | 'error'

export type EventOutcome = 'pass' | 'block' | 'modify' | 'win' | 'loss' | 'pending' | 'error'

export interface AgentEvent {
  id: string
  agent: string
  agent_name: string
  pipeline_run: string | null
  event_type: EventType
  outcome: EventOutcome
  instrument: string
  confidence: number | null
  payload: Record<string, unknown>
  cycle_id: string
  duration_ms: number | null
  timestamp: string
  created_at: string
}

export interface DashboardSummary {
  total_events: number
  events_today: number
  total_pipeline_runs: number
  pass_rate: number
  avg_duration_ms: number | null
  event_type_counts: Record<string, number>
  outcome_counts: Record<string, number>
}

export interface PipelineRun {
  id: string
  agent: string
  agent_name: string
  cycle_id: string
  instrument: string
  final_outcome: EventOutcome
  total_stages: number
  passed_stages: number
  blocked_at_stage: string
  duration_ms: number | null
  started_at: string
  completed_at: string | null
  events?: AgentEvent[]
}
