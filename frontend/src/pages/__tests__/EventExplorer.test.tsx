import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/render'
import EventExplorer from '../EventExplorer'
import { mockEvent, mockEventBlock } from '../../test/fixtures'

// Mock hooks
vi.mock('../../hooks/useEvents', () => ({
  useAllEvents: vi.fn(() => ({
    data: undefined,
    isLoading: true,
  })),
}))

const { useAllEvents } = await import('../../hooks/useEvents')
const mockUseAllEvents = vi.mocked(useAllEvents)

describe('EventExplorer', () => {
  it('renders loading state', () => {
    mockUseAllEvents.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<EventExplorer />)
    expect(screen.getByText('Loading events...')).toBeInTheDocument()
  })

  it('renders events table with data', () => {
    mockUseAllEvents.mockReturnValue({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [mockEvent, mockEventBlock],
      },
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<EventExplorer />)

    // Table headers
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByText('Agent')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Instrument')).toBeInTheDocument()
    expect(screen.getByText('Outcome')).toBeInTheDocument()
    expect(screen.getByText('Confidence')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()

    // Event data renders
    expect(screen.getAllByText('Test Agent')).toHaveLength(2)
    expect(screen.getByText('prediction')).toBeInTheDocument()
    expect(screen.getByText('edge_gate')).toBeInTheDocument()

    // Subtitle shows total count
    expect(screen.getByText(/2 total/)).toBeInTheDocument()
  })

  it('renders empty state message', () => {
    mockUseAllEvents.mockReturnValue({
      data: {
        count: 0,
        next: null,
        previous: null,
        results: [],
      },
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<EventExplorer />)
    expect(
      screen.getByText('No events found. Run bridge sync to populate.'),
    ).toBeInTheDocument()
  })

  it('renders filter selects with correct options', () => {
    mockUseAllEvents.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<EventExplorer />)

    // Event type filter options
    const typeSelect = screen.getByLabelText('Filter by event type') as HTMLSelectElement
    expect(typeSelect).toBeInTheDocument()
    expect(typeSelect.options).toHaveLength(10) // All Types + 9 event types
    expect(typeSelect.options[0].textContent).toBe('All Types')
    expect(typeSelect.options[1].textContent).toBe('Price Fetch')

    // Outcome filter options
    const outcomeSelect = screen.getByLabelText('Filter by outcome') as HTMLSelectElement
    expect(outcomeSelect).toBeInTheDocument()
    expect(outcomeSelect.options).toHaveLength(6) // All Outcomes + 5 outcomes
    expect(outcomeSelect.options[0].textContent).toBe('All Outcomes')
    expect(outcomeSelect.options[1].textContent).toBe('Pass')
  })

  it('shows pagination when totalCount exceeds limit', () => {
    mockUseAllEvents.mockReturnValue({
      data: {
        count: 120,
        next: 'http://api/events/?offset=50',
        previous: null,
        results: Array.from({ length: 50 }, (_, i) => ({
          ...mockEvent,
          id: `evt-${i}`,
        })),
      },
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<EventExplorer />)

    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText(/Showing 1–50 of 120/)).toBeInTheDocument()
  })

  it('does not show pagination when totalCount is within limit', () => {
    mockUseAllEvents.mockReturnValue({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [mockEvent, mockEventBlock],
      },
      isLoading: false,
    } as ReturnType<typeof useAllEvents>)

    renderWithProviders(<EventExplorer />)

    expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })
})
