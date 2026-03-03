import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/render'
import Dashboard from '../Dashboard'
import {
  mockAgentListItem,
  mockDashboardSummary,
} from '../../test/fixtures'

// Mock hooks
vi.mock('../../hooks/useAgents', () => ({
  useAgents: vi.fn(() => ({
    data: undefined,
    isLoading: true,
  })),
}))

vi.mock('../../hooks/useEvents', () => ({
  useDashboardSummary: vi.fn(() => ({
    data: undefined,
  })),
  useAllEvents: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}))

// Mock LiveEventFeed to avoid pulling in WebSocket dependencies
vi.mock('../../components/LiveEventFeed', () => ({
  default: () => <div data-testid="live-event-feed">LiveEventFeed</div>,
}))

// Mock recharts to avoid rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
}))

const { useAgents } = await import('../../hooks/useAgents')
const { useDashboardSummary, useAllEvents } = await import('../../hooks/useEvents')
const mockUseAgents = vi.mocked(useAgents)
const mockUseDashboardSummary = vi.mocked(useDashboardSummary)
const mockUseAllEvents = vi.mocked(useAllEvents)

describe('Dashboard', () => {
  beforeEach(() => {
    mockUseAllEvents.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)
  })

  it('renders loading skeleton state', () => {
    mockUseAgents.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useDashboardSummary>)

    renderWithProviders(<Dashboard />)
    // Loading state now shows skeleton cards (animated placeholders)
    expect(screen.getByText('Registered Agents')).toBeInTheDocument()
  })

  it('renders dashboard with agent and summary data', () => {
    const activeAgent = { ...mockAgentListItem, status: 'active' as const, is_online: true }
    const inactiveAgent = {
      ...mockAgentListItem,
      id: 'agent-2',
      name: 'inactive_agent',
      display_name: 'Inactive Agent',
      status: 'inactive' as const,
      is_online: false,
    }

    mockUseAgents.mockReturnValue({
      data: [activeAgent, inactiveAgent],
      isLoading: false,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: mockDashboardSummary,
    } as ReturnType<typeof useDashboardSummary>)

    renderWithProviders(<Dashboard />)

    // Header
    expect(screen.getByText('Dashboard')).toBeInTheDocument()

    // Stat cards - top row
    expect(screen.getByText('Total Agents')).toBeInTheDocument()
    expect(screen.getByText('Online Now')).toBeInTheDocument()
    expect(screen.getByText('Events Today')).toBeInTheDocument()
    expect(screen.getByText('Pipeline Runs')).toBeInTheDocument()

    // Agent count value
    expect(screen.getByText('2')).toBeInTheDocument()

    // Events today value
    expect(screen.getByText('1250')).toBeInTheDocument()
  })

  it('renders time-series charts when event data is available', () => {
    const now = new Date()
    const recentEvents = Array.from({ length: 10 }, (_, i) => ({
      id: `evt-${i}`,
      agent: 'a1',
      agent_name: 'Test',
      pipeline_run: null,
      event_type: i % 3 === 0 ? 'resolution' : 'prediction',
      outcome: i % 2 === 0 ? 'win' : 'loss',
      instrument: 'MNQ',
      confidence: 0.7,
      payload: {},
      cycle_id: `c-${i}`,
      duration_ms: 100,
      timestamp: new Date(now.getTime() - i * 3_600_000).toISOString(),
      created_at: new Date(now.getTime() - i * 3_600_000).toISOString(),
    }))

    mockUseAgents.mockReturnValue({
      data: [mockAgentListItem],
      isLoading: false,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: mockDashboardSummary,
    } as ReturnType<typeof useDashboardSummary>)
    mockUseAllEvents.mockReturnValue({
      data: { count: 10, next: null, previous: null, results: recentEvents },
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<Dashboard />)

    // Charts section should render
    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument()
    expect(screen.getByText('Events Per Hour (24h)')).toBeInTheDocument()
    expect(screen.getByText('Rolling Win Rate')).toBeInTheDocument()
  })

  it('renders empty state when no agents registered', () => {
    mockUseAgents.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useDashboardSummary>)

    renderWithProviders(<Dashboard />)

    expect(screen.getByText('No agents registered yet.')).toBeInTheDocument()
    expect(screen.getByText('Register your first agent')).toBeInTheDocument()
  })

  it('does not render trading stats when no wins/losses', () => {
    mockUseAgents.mockReturnValue({
      data: [mockAgentListItem],
      isLoading: false,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useDashboardSummary>)

    renderWithProviders(<Dashboard />)

    expect(screen.queryByText('Executions')).not.toBeInTheDocument()
  })
})
