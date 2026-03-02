import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/render'
import PipelineView from '../PipelineView'
import { mockAgentDetail, mockPipelineRun } from '../../test/fixtures'

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
  })),
}))

vi.mock('../../hooks/useEvents', () => ({
  usePipelineRuns: vi.fn(() => ({
    data: undefined,
    isLoading: true,
  })),
}))

const { useAgent } = await import('../../hooks/useAgents')
const { usePipelineRuns } = await import('../../hooks/useEvents')
const mockUseAgent = vi.mocked(useAgent)
const mockUsePipelineRuns = vi.mocked(usePipelineRuns)

describe('PipelineView', () => {
  it('renders loading state', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentDetail,
    } as ReturnType<typeof useAgent>)
    mockUsePipelineRuns.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usePipelineRuns>)

    renderWithProviders(<PipelineView />)
    expect(screen.getByText('Loading pipeline runs...')).toBeInTheDocument()
  })

  it('renders pipeline runs', () => {
    const secondRun = {
      ...mockPipelineRun,
      id: 'run-002',
      instrument: 'MES',
      final_outcome: 'block' as const,
      passed_stages: 5,
      blocked_at_stage: 'edge_gate',
    }

    mockUseAgent.mockReturnValue({
      data: mockAgentDetail,
    } as ReturnType<typeof useAgent>)
    mockUsePipelineRuns.mockReturnValue({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [mockPipelineRun, secondRun],
      },
      isLoading: false,
    } as ReturnType<typeof usePipelineRuns>)

    renderWithProviders(<PipelineView />)

    // Header shows agent name
    expect(screen.getByText(/Pipeline — Test Agent/)).toBeInTheDocument()

    // Pipeline run data
    expect(screen.getByText('MNQ')).toBeInTheDocument()
    expect(screen.getByText('MES')).toBeInTheDocument()
    expect(screen.getByText('8/8 stages')).toBeInTheDocument()
    expect(screen.getByText('5/8 stages')).toBeInTheDocument()
    expect(screen.getByText('blocked at edge_gate')).toBeInTheDocument()

    // Subtitle shows run count
    expect(screen.getByText(/2 runs/)).toBeInTheDocument()
  })

  it('renders empty state', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentDetail,
    } as ReturnType<typeof useAgent>)
    mockUsePipelineRuns.mockReturnValue({
      data: {
        count: 0,
        next: null,
        previous: null,
        results: [],
      },
      isLoading: false,
    } as ReturnType<typeof usePipelineRuns>)

    renderWithProviders(<PipelineView />)
    expect(
      screen.getByText('No pipeline runs found. Sync data first.'),
    ).toBeInTheDocument()
  })

  it('renders filter buttons', () => {
    mockUseAgent.mockReturnValue({
      data: mockAgentDetail,
    } as ReturnType<typeof useAgent>)
    mockUsePipelineRuns.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof usePipelineRuns>)

    renderWithProviders(<PipelineView />)

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('win')).toBeInTheDocument()
    expect(screen.getByText('loss')).toBeInTheDocument()
    expect(screen.getByText('block')).toBeInTheDocument()
    expect(screen.getByText('pass')).toBeInTheDocument()
  })

  it('shows fallback agent name when agent not loaded', () => {
    mockUseAgent.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useAgent>)
    mockUsePipelineRuns.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof usePipelineRuns>)

    renderWithProviders(<PipelineView />)
    expect(screen.getByText(/Pipeline — Agent/)).toBeInTheDocument()
  })
})
