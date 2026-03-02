import client from './client'

export interface CalibrationBucket {
  bucket_min: number
  bucket_max: number
  predicted_confidence: number
  actual_win_rate: number
  count: number
  wins: number
}

export interface CalibrationData {
  calibration_curve: CalibrationBucket[]
  brier_score: number | null
  total_samples: number
}

export interface PnLPoint {
  timestamp: string
  pnl: number
  cumulative_pnl: number
}

export interface OutcomeByType {
  event_type: string
  total: number
  wins: number
  losses: number
  win_rate: number
}

export async function fetchCalibration(agentId: string): Promise<CalibrationData> {
  const { data } = await client.get(`/agents/${agentId}/calibration/`)
  return data
}

export async function fetchPnLCurve(agentId: string, limit = 500): Promise<PnLPoint[]> {
  const { data } = await client.get(`/agents/${agentId}/pnl-curve/`, { params: { limit } })
  return data
}

export async function fetchOutcomeByType(agentId: string): Promise<OutcomeByType[]> {
  const { data } = await client.get(`/agents/${agentId}/outcome-by-type/`)
  return data
}
