import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../test/render'
import AgentDetail from '../AgentDetail'
import { mockAgentDetail } from '../../test/fixtures'
import type { TradingStats } from '../../api/events'
import type { CalibrationData, PnLPoint, OutcomeByType } from '../../api/charts'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
  }
})

// Mock hooks
vi.mock('../../hooks/useAgents', () => ({
  useAgent: vi.fn(() => ({
    data: undefined,
    isLoading: true,
  })),
}))

vi.mock('../../hooks/useEvents', () => ({
  useTradingStats: vi.fn(() => ({
    data: undefined,
  })),
}))

vi.mock('../../hooks/useCharts', () => ({
  useCalibration: vi.fn(() => ({
    data: undefined,
  })),
  usePnLCurve: vi.fn(() => ({
    data: undefined,
  })),
  useOutcomeByType: vi.fn(() => ({
    data: undefined,
  })),
}))

// Mock LiveEventFeed to avoid pulling in WebSocket dependencies
vi.mock('../../components/LiveEventFeed', () => ({
  default: ({ agentId }: { agentId?: string }) => (
    <div data-testid="live-event-feed">LiveEventFeed {agentId}</div>
  ),
}))

// Mock chart components to avoid recharts rendering issues in jsdom
vi.mock('../../components/Charts/CalibrationChart', () => ({
  default: ({ brierScore }: { brierScore: number | null }) => (
    <div data-testid="calibration-chart">CalibrationChart brier={brierScore}</div>
  ),
}))
vi.mock('../../components/Charts/PnLChart', () => ({
  default: () => <div data-testid="pnl-chart">PnLChart</div>,
}))
vi.mock('../../components/Charts/OutcomeChart', () => ({
  default: () => <div data-testid="outcome-chart">OutcomeChart</div>,
}))

const { useAgent } = await import('../../hooks/useAgents')
const { useTradingStats } = await import('../../hooks/useEvents')
const { useCalibration, usePnLCurve, useOutcomeByType } = await import('../../hooks/useCharts')
const mockUseAgent = vi.mocked(useAgent)
const mockUseTradingStats = vi.mocked(useTradingStats)
const mockUseCalibration = vi.mocked(useCalibration)
const mockUsePnLCurve = vi.mocked(usePnLCurve)
const mockUseOutcomeByType = vi.mocked(useOutcomeByType)

// ── Fixtures ────────────────────────────────────────────────────────────

const mockStats: TradingStats = {
  wins: 106,
  losses: 81,
  total_trades: 187,
  win_rate: 0.567,
  total_pnl: 3205.25,
  session_pnl: 412.5,
  open_position_count: 2,
  open_positions: [
    {
      cycle_id: 'cyc-001',
      instrument: 'MNQ',
      direction: 'Up',
      entry_price: 21500.25,
      shares: 1,
      size_usdc: 500,
      opened_at: '2026-03-01T14:30:00Z',
    },
    {
      cycle_id: 'cyc-002',
      instrument: 'MES',
      direction: 'Down',
      entry_price: 5820.0,
      shares: 1,
      size_usdc: 250,
      opened_at: '2026-03-01T15:00:00Z',
    },
  ],
  recent_trades: [
    {
      id: 'trade-001',
      event_type: 'execution',
      outcome: 'win',
      instrument: 'MNQ',
      confidence: 0.82,
      timestamp: '2026-03-01T14:00:00Z',
      direction: 'Up',
      entry_price: 21480.0,
      shares: 1,
      size_usdc: 500,
      pnl: 45.5,
      result: 'WIN',
      signal_reason: 'layup',
    },
    {
      id: 'trade-002',
      event_type: 'resolution',
      outcome: 'loss',
      instrument: 'MES',
      confidence: 0.65,
      timestamp: '2026-03-01T13:30:00Z',
      direction: 'Down',
      entry_price: 5810.0,
      shares: 1,
      size_usdc: 250,
      pnl: -22.0,
      result: 'LOSS',
      signal_reason: 'short_range',
    },
  ],
  instruments: [
    { instrument: 'MNQ', total: 72, wins: 44, losses: 28, win_rate: 0.611, pnl: 1668.0 },
    { instrument: 'MES', total: 56, wins: 29, losses: 27, win_rate: 0.518, pnl: 404.0 },
  ],
}

const mockCalibration: CalibrationData = {
  calibration_curve: [
    { bucket_min: 0.5, bucket_max: 0.6, predicted_confidence: 0.55, actual_win_rate: 0.52, count: 30, wins: 16 },
    { bucket_min: 0.6, bucket_max: 0.7, predicted_confidence: 0.65, actual_win_rate: 0.61, count: 40, wins: 24 },
  ],
  brier_score: 0.18,
  total_samples: 70,
}

const mockPnL: PnLPoint[] = [
  { timestamp: '2026-03-01T10:00:00Z', pnl: 100, cumulative_pnl: 100 },
  { timestamp: '2026-03-01T11:00:00Z', pnl: -30, cumulative_pnl: 70 },
  { timestamp: '2026-03-01T12:00:00Z', pnl: 80, cumulative_pnl: 150 },
]

const mockOutcome: OutcomeByType[] = [
  { event_type: 'execution', total: 100, wins: 60, losses: 40, win_rate: 0.6 },
  { event_type: 'resolution', total: 87, wins: 46, losses: 41, win_rate: 0.529 },
]

// Agent with no description (avoids the "trading agent" substring collision)
const mockAgentMinimal = {
  ...mockAgentDetail,
  description: '',
  soul_file: '',
  reputation: null,
  ownership: null,
}

// ── Helpers ─────────────────────────────────────────────────────────────

function setDefaultChartMocks() {
  mockUseCalibration.mockReturnValue({
    data: undefined,
  } as ReturnType<typeof useCalibration>)
  mockUsePnLCurve.mockReturnValue({
    data: undefined,
  } as ReturnType<typeof usePnLCurve>)
  mockUseOutcomeByType.mockReturnValue({
    data: undefined,
  } as ReturnType<typeof useOutcomeByType>)
}

function setDefaultStatsMock() {
  mockUseTradingStats.mockReturnValue({
    data: undefined,
  } as ReturnType<typeof useTradingStats>)
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('AgentDetail', () => {
  beforeEach(() => {
    setDefaultChartMocks()
    setDefaultStatsMock()
  })

  // ── Loading & Error States ──────────────────────────────────────────

  it('renders loading state', () => {
    mockUseAgent.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)
    expect(screen.getByText('Loading agent...')).toBeInTheDocument()
  })

  it('renders not found state when agent is undefined after loading', () => {
    mockUseAgent.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)
    expect(screen.getByText('Agent not found.')).toBeInTheDocument()
  })

  // ── Basic Agent Detail Rendering ────────────────────────────────────

  it('renders agent header with name, type, status, and version', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Test Agent')).toBeInTheDocument()
    // The subtitle is "trading agent · active · v1.0.0"
    expect(screen.getByText('trading agent \u00B7 active \u00B7 v1.0.0')).toBeInTheDocument()
  })

  it('renders online status indicator', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders offline status when agent is not online', () => {
    mockUseAgent.mockReturnValue({
      data: { ...mockAgentMinimal, is_online: false },
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('renders creator ownership info with link', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentDetail,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    const creatorLink = screen.getByText('Durayveon')
    expect(creatorLink).toBeInTheDocument()
    expect(creatorLink.closest('a')).toHaveAttribute('href', 'https://github.com/moltbot47')
    expect(creatorLink.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('renders creator name without link when creator_url is empty', () => {
    const agentNoUrl = {
      ...mockAgentMinimal,
      ownership: {
        ...mockAgentDetail.ownership!,
        creator_url: '',
      },
    }
    mockUseAgent.mockReturnValue({
      data: agentNoUrl,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    // The text "Created by" and "Durayveon" are in the same span
    expect(screen.getByText(/Created by/)).toBeInTheDocument()
    expect(screen.getByText(/Durayveon/)).toBeInTheDocument()
    // Should not be rendered as a link
    const ownershipSpan = screen.getByText(/Created by/)
    expect(ownershipSpan.querySelector('a')).toBeNull()
  })

  it('does not render ownership section when ownership is null', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText(/Created by/)).not.toBeInTheDocument()
  })

  // ── Navigation Links ────────────────────────────────────────────────

  it('renders pipeline traces and events action links', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    const pipelineLink = screen.getByText('View Pipeline Traces')
    expect(pipelineLink).toBeInTheDocument()
    expect(pipelineLink.closest('a')).toHaveAttribute(
      'href',
      '/agents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/pipeline',
    )

    const eventsLink = screen.getByText('View Events')
    expect(eventsLink).toBeInTheDocument()
    expect(eventsLink.closest('a')).toHaveAttribute(
      'href',
      '/events?agent=a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    )
  })

  // ── Trading Stats Section ───────────────────────────────────────────

  it('renders trading stats hero section when stats are available', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Total PnL')).toBeInTheDocument()
    expect(screen.getByText('$3205.25')).toBeInTheDocument()
    // "Wins" appears in stat card AND instrument table header; use getAllByText
    expect(screen.getAllByText('Wins').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('106')).toBeInTheDocument()
    // "Losses" also appears in stat card AND instrument table header
    expect(screen.getAllByText('Losses').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('81')).toBeInTheDocument()
    expect(screen.getByText('Open Positions')).toBeInTheDocument()
    expect(screen.getByText('Session PnL')).toBeInTheDocument()
    expect(screen.getByText('$412.50')).toBeInTheDocument()
  })

  it('does not render trading stats section when total_trades is 0', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: { ...mockStats, total_trades: 0 },
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Total PnL')).not.toBeInTheDocument()
  })

  it('does not render trading stats section when stats is undefined', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Total PnL')).not.toBeInTheDocument()
    expect(screen.queryByText('Session PnL')).not.toBeInTheDocument()
  })

  // ── Reputation Section ──────────────────────────────────────────────

  it('renders reputation stats when reputation data is available', () => {
    mockUseAgent.mockReturnValue({
      data: { ...mockAgentMinimal, reputation: mockAgentDetail.reputation },
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Reputation')).toBeInTheDocument()
    expect(screen.getByText('75/100')).toBeInTheDocument()
    expect(screen.getByText('Profit Factor')).toBeInTheDocument()
    expect(screen.getByText('1.61')).toBeInTheDocument()
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
    expect(screen.getByText('5.0%')).toBeInTheDocument()
  })

  it('renders reputation breakdown section with category labels', () => {
    mockUseAgent.mockReturnValue({
      data: { ...mockAgentMinimal, reputation: mockAgentDetail.reputation },
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Reputation Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Profitability')).toBeInTheDocument()
    expect(screen.getByText('Reliability')).toBeInTheDocument()
    expect(screen.getByText('Consistency')).toBeInTheDocument()
  })

  it('does not render reputation section when reputation is null', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Reputation Breakdown')).not.toBeInTheDocument()
    expect(screen.queryByText('Accuracy')).not.toBeInTheDocument()
  })

  // ── Instrument Breakdown Table ──────────────────────────────────────

  it('renders instrument performance table', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Performance by Instrument')).toBeInTheDocument()

    // Instrument names in rows
    // MNQ appears in instrument table and open positions; use getAllByText
    expect(screen.getAllByText('MNQ').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('MES').length).toBeGreaterThanOrEqual(1)

    // MNQ PnL value is unique
    expect(screen.getByText('$1668.00')).toBeInTheDocument()
    // MES PnL value
    expect(screen.getByText('$404.00')).toBeInTheDocument()
    // Win rates for instruments
    expect(screen.getByText('61.1%')).toBeInTheDocument()
    expect(screen.getByText('51.8%')).toBeInTheDocument()
  })

  it('does not render instrument table when instruments array is empty', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: { ...mockStats, instruments: [] },
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Performance by Instrument')).not.toBeInTheDocument()
  })

  // ── Open Positions Section ──────────────────────────────────────────

  it('renders open positions', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Open Positions (2)')).toBeInTheDocument()
    // Directions in open positions (may also appear in recent trades)
    expect(screen.getAllByText('Up').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Down').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('@21500.25')).toBeInTheDocument()
    expect(screen.getByText('@5820')).toBeInTheDocument()
    // $500 appears in both open positions and recent trades size column; verify at least 1
    expect(screen.getAllByText('$500').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('$250').length).toBeGreaterThanOrEqual(1)
  })

  it('does not render open positions when array is empty', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: { ...mockStats, open_positions: [], open_position_count: 0 },
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText(/Open Positions \(/)).not.toBeInTheDocument()
  })

  // ── Recent Trades Table ─────────────────────────────────────────────

  it('renders recent trades table with headers', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Recent Trades')).toBeInTheDocument()

    // Table headers (some like "Instrument" also appear in the instrument table)
    expect(screen.getAllByText('Time').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Type').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Direction').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Price').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('PnL').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Result').length).toBeGreaterThanOrEqual(1)

    // Trade event types
    expect(screen.getByText('execution')).toBeInTheDocument()
    expect(screen.getByText('resolution')).toBeInTheDocument()
  })

  it('renders recent trade PnL with correct sign formatting', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    // Positive pnl: $45.50
    expect(screen.getByText('$45.50')).toBeInTheDocument()
    // Negative pnl formatted as `$${Number(-22).toFixed(2)}` = "$-22.00"
    expect(screen.getByText('$-22.00')).toBeInTheDocument()
    // Result badges
    expect(screen.getByText('WIN')).toBeInTheDocument()
    expect(screen.getByText('LOSS')).toBeInTheDocument()
  })

  it('does not render recent trades when array is empty', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: { ...mockStats, recent_trades: [] },
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Recent Trades')).not.toBeInTheDocument()
  })

  // ── Charts Section ──────────────────────────────────────────────────

  it('renders PnL chart when data is available', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUsePnLCurve.mockReturnValue({
      data: mockPnL,
    } as ReturnType<typeof usePnLCurve>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByTestId('pnl-chart')).toBeInTheDocument()
  })

  it('renders calibration chart when data is available', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseCalibration.mockReturnValue({
      data: mockCalibration,
    } as ReturnType<typeof useCalibration>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByTestId('calibration-chart')).toBeInTheDocument()
  })

  it('renders outcome chart when data is available', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseOutcomeByType.mockReturnValue({
      data: mockOutcome,
    } as ReturnType<typeof useOutcomeByType>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByTestId('outcome-chart')).toBeInTheDocument()
  })

  it('does not render charts when data is undefined', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByTestId('pnl-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('calibration-chart')).not.toBeInTheDocument()
    expect(screen.queryByTestId('outcome-chart')).not.toBeInTheDocument()
  })

  it('does not render PnL chart when data is empty array', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUsePnLCurve.mockReturnValue({
      data: [],
    } as ReturnType<typeof usePnLCurve>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByTestId('pnl-chart')).not.toBeInTheDocument()
  })

  it('does not render calibration chart when curve is empty', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseCalibration.mockReturnValue({
      data: { ...mockCalibration, calibration_curve: [] },
    } as ReturnType<typeof useCalibration>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByTestId('calibration-chart')).not.toBeInTheDocument()
  })

  it('does not render outcome chart when data is empty array', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseOutcomeByType.mockReturnValue({
      data: [],
    } as ReturnType<typeof useOutcomeByType>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByTestId('outcome-chart')).not.toBeInTheDocument()
  })

  // ── Live Event Feed ─────────────────────────────────────────────────

  it('renders live activity section with LiveEventFeed', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Live Activity')).toBeInTheDocument()
    expect(screen.getByTestId('live-event-feed')).toBeInTheDocument()
  })

  // ── Soul File Section ───────────────────────────────────────────────

  it('renders soul file section when soul_file is present', () => {
    const agentWithSoul = {
      ...mockAgentMinimal,
      soul_file: 'You are a trading agent specializing in micro futures.',
    }
    mockUseAgent.mockReturnValue({
      data: agentWithSoul,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Soul File')).toBeInTheDocument()
    expect(
      screen.getByText('You are a trading agent specializing in micro futures.'),
    ).toBeInTheDocument()
  })

  it('does not render soul file section when soul_file is empty', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Soul File')).not.toBeInTheDocument()
  })

  // ── Description Section ─────────────────────────────────────────────

  it('renders description section when description is present', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentDetail,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('A test trading agent')).toBeInTheDocument()
  })

  it('does not render description section when description is empty', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)

    renderWithProviders(<AgentDetail />)

    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  // ── Full Integration (All Data Present) ─────────────────────────────

  it('renders all sections when complete data is available', () => {
    const agentFull = {
      ...mockAgentDetail,
      soul_file: 'Agent soul configuration',
    }
    mockUseAgent.mockReturnValue({
      data: agentFull,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)
    mockUseCalibration.mockReturnValue({
      data: mockCalibration,
    } as ReturnType<typeof useCalibration>)
    mockUsePnLCurve.mockReturnValue({
      data: mockPnL,
    } as ReturnType<typeof usePnLCurve>)
    mockUseOutcomeByType.mockReturnValue({
      data: mockOutcome,
    } as ReturnType<typeof useOutcomeByType>)

    renderWithProviders(<AgentDetail />)

    // All major sections present
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('View Pipeline Traces')).toBeInTheDocument()
    expect(screen.getByText('Total PnL')).toBeInTheDocument()
    expect(screen.getByText('Reputation')).toBeInTheDocument()
    expect(screen.getByText('Performance by Instrument')).toBeInTheDocument()
    expect(screen.getByText('Open Positions (2)')).toBeInTheDocument()
    expect(screen.getByText('Recent Trades')).toBeInTheDocument()
    expect(screen.getByText('Reputation Breakdown')).toBeInTheDocument()
    expect(screen.getByTestId('pnl-chart')).toBeInTheDocument()
    expect(screen.getByTestId('calibration-chart')).toBeInTheDocument()
    expect(screen.getByTestId('outcome-chart')).toBeInTheDocument()
    expect(screen.getByText('Live Activity')).toBeInTheDocument()
    expect(screen.getByText('Soul File')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  // ── Win Rate stat card shows correct trend ──────────────────────────

  it('renders win rate with up trend when above 50%', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: mockStats,
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    // 56.7% win rate -- stat card should render this value
    expect(screen.getByText('56.7%')).toBeInTheDocument()
  })

  it('renders negative total PnL with down trend', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentMinimal,
      isLoading: false,
    } as ReturnType<typeof useAgent>)
    mockUseTradingStats.mockReturnValue({
      data: { ...mockStats, total_pnl: -500.0, session_pnl: -100.0 },
    } as ReturnType<typeof useTradingStats>)

    renderWithProviders(<AgentDetail />)

    expect(screen.getByText('$-500.00')).toBeInTheDocument()
    expect(screen.getByText('$-100.00')).toBeInTheDocument()
  })
})
