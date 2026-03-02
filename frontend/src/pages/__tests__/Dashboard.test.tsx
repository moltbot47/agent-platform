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
}))

// Mock LiveEventFeed to avoid pulling in WebSocket dependencies
vi.mock('../../components/LiveEventFeed', () => ({
  default: () => <div data-testid="live-event-feed">LiveEventFeed</div>,
}))

const { useAgents } = await import('../../hooks/useAgents')
const { useDashboardSummary } = await import('../../hooks/useEvents')
const mockUseAgents = vi.mocked(useAgents)
const mockUseDashboardSummary = vi.mocked(useDashboardSummary)

describe('Dashboard', () => {
  it('renders loading state', () => {
    mockUseAgents.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useDashboardSummary>)

    renderWithProviders(<Dashboard />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
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
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Online Now')).toBeInTheDocument()
    expect(screen.getByText('Events Today')).toBeInTheDocument()

    // Agent count value
    expect(screen.getByText('2')).toBeInTheDocument()

    // Events today value (rendered as raw number by StatCard)
    expect(screen.getByText('1250')).toBeInTheDocument()

    // Summary stats row (appears when total_events > 0)
    expect(screen.getByText('Pipeline Runs')).toBeInTheDocument()
    expect(screen.getByText('Pass Rate')).toBeInTheDocument()
    expect(screen.getByText('Avg Duration')).toBeInTheDocument()
    expect(screen.getByText('12.5%')).toBeInTheDocument()
    expect(screen.getByText('450ms')).toBeInTheDocument()
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

  it('does not render event stats row when no summary data', () => {
    mockUseAgents.mockReturnValue({
      data: [mockAgentListItem],
      isLoading: false,
    } as ReturnType<typeof useAgents>)
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useDashboardSummary>)

    renderWithProviders(<Dashboard />)

    expect(screen.queryByText('Pipeline Runs')).not.toBeInTheDocument()
    expect(screen.queryByText('Pass Rate')).not.toBeInTheDocument()
  })
})
