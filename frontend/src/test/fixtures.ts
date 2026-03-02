import type { AgentListItem, AgentDetail, RegistrationResponse } from '../types'
import type { AgentEvent, DashboardSummary, PipelineRun } from '../types/event'

export const mockAgentListItem: AgentListItem = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'test_agent',
  display_name: 'Test Agent',
  agent_type: 'trading',
  status: 'active',
  reputation_score: 75,
  owner: 'durayveon',
  is_online: true,
  last_heartbeat: '2026-03-01T12:00:00Z',
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
}

export const mockAgentDetail: AgentDetail = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'test_agent',
  display_name: 'Test Agent',
  agent_type: 'trading',
  status: 'active',
  description: 'A test trading agent',
  soul_file: '',
  capabilities: ['trading', 'analysis'],
  config: {},
  version: '1.0.0',
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
  last_heartbeat: '2026-03-01T12:00:00Z',
  is_online: true,
  ownership: {
    creator_name: 'Durayveon',
    creator_url: 'https://github.com/moltbot47',
    revenue_share_pct: 10,
    chain_verified: false,
    chain_address: '',
    chain_tx_hash: '',
    created_at: '2026-02-01T00:00:00Z',
  },
  reputation: {
    overall_score: 75,
    accuracy_score: 80,
    profitability_score: 70,
    reliability_score: 85,
    consistency_score: 65,
    total_decisions: 500,
    total_trades: 187,
    win_rate: 0.567,
    profit_factor: 1.61,
    sharpe_ratio: 1.2,
    max_drawdown_pct: 5.0,
    brier_score: 0.18,
    last_calculated: '2026-03-01T12:00:00Z',
    calculation_window_days: 30,
  },
  licenses: [],
}

export const mockEvent: AgentEvent = {
  id: 'evt-001',
  agent: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  agent_name: 'Test Agent',
  pipeline_run: null,
  event_type: 'prediction',
  outcome: 'pass',
  instrument: 'MNQ',
  confidence: 0.85,
  payload: { direction: 'long' },
  cycle_id: 'cycle-001',
  duration_ms: 150,
  timestamp: '2026-03-01T12:00:00Z',
  created_at: '2026-03-01T12:00:00Z',
}

export const mockEventBlock: AgentEvent = {
  ...mockEvent,
  id: 'evt-002',
  event_type: 'edge_gate',
  outcome: 'block',
  confidence: 0.3,
}

export const mockEventWin: AgentEvent = {
  ...mockEvent,
  id: 'evt-003',
  event_type: 'resolution',
  outcome: 'win',
  confidence: null,
}

export const mockEventLoss: AgentEvent = {
  ...mockEvent,
  id: 'evt-004',
  event_type: 'resolution',
  outcome: 'loss',
  confidence: null,
}

export const mockDashboardSummary: DashboardSummary = {
  total_events: 369000,
  events_today: 1250,
  total_pipeline_runs: 45000,
  pass_rate: 12.5,
  avg_duration_ms: 450,
  event_type_counts: {
    prediction: 45000,
    price_fetch: 90000,
    execution: 5600,
  },
  outcome_counts: {
    pass: 5600,
    block: 39400,
    pending: 324000,
  },
}

export const mockPipelineRun: PipelineRun = {
  id: 'run-001',
  agent: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  agent_name: 'Test Agent',
  cycle_id: 'cycle-001',
  instrument: 'MNQ',
  final_outcome: 'pass',
  total_stages: 8,
  passed_stages: 8,
  blocked_at_stage: '',
  duration_ms: 1200,
  started_at: '2026-03-01T12:00:00Z',
  completed_at: '2026-03-01T12:00:01Z',
  events: [mockEvent],
}

export const mockRegistrationResponse: RegistrationResponse = {
  agent: mockAgentDetail,
  api_key: 'ak_abc123def456abc123def456abc123def456abc123def456ab',
  api_key_prefix: 'ak_abc123',
  message: 'Agent registered successfully',
}
