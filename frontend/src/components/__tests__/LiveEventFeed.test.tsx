import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import LiveEventFeed from '../LiveEventFeed'
import { mockEvent, mockEventBlock } from '../../test/fixtures'

// Mock useWebSocket hook
const mockClearEvents = vi.fn()
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    events: [],
    status: 'disconnected' as const,
    eventCount: 0,
    clearEvents: mockClearEvents,
    isConnected: false,
  })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useWebSocket } = await import('../../hooks/useWebSocket')
const mockUseWebSocket = vi.mocked(useWebSocket)

describe('LiveEventFeed', () => {
  it('shows disconnected state when not connected', () => {
    renderWithProviders(<LiveEventFeed />)
    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByText('Connect to see live events')).toBeInTheDocument()
  })

  it('shows connected state', () => {
    mockUseWebSocket.mockReturnValue({
      events: [],
      status: 'connected',
      eventCount: 0,
      clearEvents: mockClearEvents,
      isConnected: true,
    })
    renderWithProviders(<LiveEventFeed />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Waiting for events...')).toBeInTheDocument()
  })

  it('shows connecting state', () => {
    mockUseWebSocket.mockReturnValue({
      events: [],
      status: 'connecting',
      eventCount: 0,
      clearEvents: mockClearEvents,
      isConnected: false,
    })
    renderWithProviders(<LiveEventFeed />)
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
  })

  it('renders event rows when events present', () => {
    mockUseWebSocket.mockReturnValue({
      events: [mockEvent, mockEventBlock],
      status: 'connected',
      eventCount: 2,
      clearEvents: mockClearEvents,
      isConnected: true,
    })
    renderWithProviders(<LiveEventFeed />)
    expect(screen.getByText('2')).toBeInTheDocument() // event count badge
    expect(screen.getAllByText('Test Agent')).toHaveLength(2)
  })

  it('shows clear button when events exist', async () => {
    mockUseWebSocket.mockReturnValue({
      events: [mockEvent],
      status: 'connected',
      eventCount: 1,
      clearEvents: mockClearEvents,
      isConnected: true,
    })
    renderWithProviders(<LiveEventFeed />)
    const clearBtn = screen.getByText('Clear')
    await userEvent.click(clearBtn)
    expect(mockClearEvents).toHaveBeenCalled()
  })

  it('displays instrument in brackets', () => {
    mockUseWebSocket.mockReturnValue({
      events: [mockEvent],
      status: 'connected',
      eventCount: 1,
      clearEvents: mockClearEvents,
      isConnected: true,
    })
    renderWithProviders(<LiveEventFeed />)
    expect(screen.getByText('[MNQ]')).toBeInTheDocument()
  })

  it('displays confidence as percentage', () => {
    mockUseWebSocket.mockReturnValue({
      events: [mockEvent],
      status: 'connected',
      eventCount: 1,
      clearEvents: mockClearEvents,
      isConnected: true,
    })
    renderWithProviders(<LiveEventFeed />)
    expect(screen.getByText('(85%)')).toBeInTheDocument()
  })
})
