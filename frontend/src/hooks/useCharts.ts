import { useQuery } from '@tanstack/react-query'
import { fetchCalibration, fetchPnLCurve, fetchOutcomeByType } from '../api/charts'

export function useCalibration(agentId: string) {
  return useQuery({
    queryKey: ['calibration', agentId],
    queryFn: () => fetchCalibration(agentId),
    enabled: !!agentId,
  })
}

export function usePnLCurve(agentId: string) {
  return useQuery({
    queryKey: ['pnl-curve', agentId],
    queryFn: () => fetchPnLCurve(agentId),
    enabled: !!agentId,
  })
}

export function useOutcomeByType(agentId: string) {
  return useQuery({
    queryKey: ['outcome-by-type', agentId],
    queryFn: () => fetchOutcomeByType(agentId),
    enabled: !!agentId,
  })
}
