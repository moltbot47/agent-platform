import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import Register from '../Register'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useRegisterAgent
const mockMutate = vi.fn()
vi.mock('../../hooks/useAgents', () => ({
  useRegisterAgent: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  })),
}))

// Mock posthog to avoid side effects
vi.mock('../../lib/posthog', () => ({
  captureEvent: vi.fn(),
}))

describe('Register', () => {
  it('renders step 1 (Agent Info) by default', () => {
    renderWithProviders(<Register />)

    expect(screen.getByText('Register Agent')).toBeInTheDocument()
    expect(screen.getByText('Agent Info')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('polymarket_turbo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Polymarket Turbo Strategy')).toBeInTheDocument()
    expect(screen.getByText('Next: Creator Info')).toBeInTheDocument()
  })

  it('has Next button disabled when name and displayName are empty', () => {
    renderWithProviders(<Register />)

    const nextButton = screen.getByText('Next: Creator Info')
    expect(nextButton).toBeDisabled()
  })

  it('enables Next button when name and displayName are filled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Register />)

    const nameInput = screen.getByPlaceholderText('polymarket_turbo')
    const displayInput = screen.getByPlaceholderText('Polymarket Turbo Strategy')

    await user.type(nameInput, 'test_bot')
    await user.type(displayInput, 'Test Bot')

    const nextButton = screen.getByText('Next: Creator Info')
    expect(nextButton).toBeEnabled()
  })

  it('shows correct step indicator states', () => {
    renderWithProviders(<Register />)

    // Step labels
    expect(screen.getByText('Agent Info')).toBeInTheDocument()
    expect(screen.getByText('Creator')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()

    // Step numbers
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('navigates to step 2 when Next is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Register />)

    await user.type(screen.getByPlaceholderText('polymarket_turbo'), 'test_bot')
    await user.type(screen.getByPlaceholderText('Polymarket Turbo Strategy'), 'Test Bot')
    await user.click(screen.getByText('Next: Creator Info'))

    // Step 2 fields should appear
    expect(screen.getByPlaceholderText('Your name or handle')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Next: Review')).toBeInTheDocument()
  })

  it('shows all agent type buttons', () => {
    renderWithProviders(<Register />)

    expect(screen.getByText('Trading')).toBeInTheDocument()
    expect(screen.getByText('Prediction')).toBeInTheDocument()
    expect(screen.getByText('Orchestrator')).toBeInTheDocument()
    expect(screen.getByText('Monitor')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })
})
