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
