import { useQuery } from '@tanstack/react-query'
import { fetchAllEvents, fetchAgentEvents, fetchDashboardSummary, fetchPipelineRuns, fetchTradingStats } from '../api/events'

export function useAllEvents(params?: {
  event_type?: string
  outcome?: string
  instrument?: string
  agent?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['events', 'all', params],
    queryFn: () => fetchAllEvents(params),
    staleTime: 10_000,
  })
}

export function useAgentEvents(agentId: string, params?: {
  event_type?: string
  outcome?: string
  instrument?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['events', agentId, params],
    queryFn: () => fetchAgentEvents(agentId, params),
    enabled: !!agentId,
  })
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
    refetchInterval: 30_000,
  })
}

export function usePipelineRuns(agentId: string, params?: {
  outcome?: string
  instrument?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['pipeline-runs', agentId, params],
    queryFn: () => fetchPipelineRuns(agentId, params),
    enabled: !!agentId,
  })
}

export function useTradingStats(agentId: string) {
  return useQuery({
    queryKey: ['trading-stats', agentId],
    queryFn: () => fetchTradingStats(agentId),
    enabled: !!agentId,
    refetchInterval: 15_000,
  })
}
