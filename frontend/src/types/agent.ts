export type AgentStatus = 'active' | 'paused' | 'retired' | 'draft'
export type AgentType = 'trading' | 'prediction' | 'orchestrator' | 'monitor' | 'custom'
export type LicenseType = 'exclusive' | 'non_exclusive' | 'open_source' | 'evaluation'

export interface Agent {
  id: string
  name: string
  display_name: string
  agent_type: AgentType
  status: AgentStatus
  description: string
  soul_file: string
  capabilities: string[]
  config: Record<string, unknown>
  version: string
  created_at: string
  updated_at: string
  last_heartbeat: string | null
  is_online: boolean
}

export interface AgentListItem {
  id: string
  name: string
  display_name: string
  agent_type: AgentType
  status: AgentStatus
  reputation_score: number | null
  owner: string | null
  is_online: boolean
  last_heartbeat: string | null
  created_at: string
  updated_at: string
}

export interface AgentOwnership {
  creator_name: string
  creator_url: string
  revenue_share_pct: number
  chain_verified: boolean
  chain_address: string
  chain_tx_hash: string
  created_at: string
}

export interface AgentLicense {
  id: number
  agent: string
  license_type: LicenseType
  licensee_name: string
  monthly_fee: number
  revenue_share_pct: number
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface AgentReputation {
  overall_score: number
  accuracy_score: number
  profitability_score: number
  reliability_score: number
  consistency_score: number
  total_decisions: number
  total_trades: number
  win_rate: number
  profit_factor: number
  sharpe_ratio: number
  max_drawdown_pct: number
  brier_score: number | null
  last_calculated: string
  calculation_window_days: number
}

export interface AgentDetail extends Agent {
  ownership: AgentOwnership | null
  reputation: AgentReputation | null
  licenses: AgentLicense[]
}

export interface RegistrationRequest {
  name: string
  display_name: string
  agent_type: AgentType
  description?: string
  soul_file?: string
  capabilities?: string[]
  creator_name: string
  creator_email?: string
  creator_url?: string
  license_type?: LicenseType
}

export interface RegistrationResponse {
  agent: AgentDetail
  api_key: string
  api_key_prefix: string
  message: string
}
