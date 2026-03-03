import client from './client'
import type { AgentEvent, DashboardSummary, PipelineRun } from '../types/event'

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export async function fetchAllEvents(params?: {
  event_type?: string
  outcome?: string
  instrument?: string
  agent?: string
  limit?: number
  offset?: number
}): Promise<PaginatedResponse<AgentEvent>> {
  const { data } = await client.get('/events/all/', { params })
  return data
}

export async function fetchAgentEvents(
  agentId: string,
  params?: {
    event_type?: string
    outcome?: string
    instrument?: string
    limit?: number
    offset?: number
  }
): Promise<PaginatedResponse<AgentEvent>> {
  const { data } = await client.get(`/agents/${agentId}/events/`, { params })
  return data
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await client.get('/metrics/dashboard/')
  return data
}

export async function fetchPipelineRuns(
  agentId: string,
  params?: { outcome?: string; instrument?: string; limit?: number; offset?: number }
): Promise<PaginatedResponse<PipelineRun>> {
  const { data } = await client.get(`/agents/${agentId}/pipeline-runs/`, { params })
  return data
}

export async function fetchPipelineRunDetail(runId: string): Promise<PipelineRun> {
  const { data } = await client.get(`/pipeline-runs/${runId}/`)
  return data
}

export interface TradingStats {
  wins: number
  losses: number
  total_trades: number
  win_rate: number
  total_pnl: number
  session_pnl: number
  open_positions: {
    cycle_id: string
    instrument: string
    direction: string
    entry_price: number | null
    shares: number | null
    size_usdc: number | null
    opened_at: string
  }[]
  open_position_count: number
  recent_trades: {
    id: string
    event_type: string
    outcome: string
    instrument: string
    confidence: number | null
    timestamp: string
    direction: string
    entry_price: number | null
    shares: number | null
    size_usdc: number | null
    pnl: number | null
    result: string
    signal_reason: string
  }[]
  instruments: {
    instrument: string
    total: number
    wins: number
    losses: number
    win_rate: number
    pnl: number
  }[]
}

export async function fetchTradingStats(agentId: string): Promise<TradingStats> {
  const { data } = await client.get(`/agents/${agentId}/trading-stats/`)
  return data
}

export async function buildPipelines(agentId: string): Promise<{ cycles: number; runs_created: number; events_linked: number }> {
  const { data } = await client.post(`/agents/${agentId}/build-pipelines/`)
  return data
}
