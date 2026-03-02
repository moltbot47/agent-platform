import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useRouteError: vi.fn(),
    isRouteErrorResponse: vi.fn(),
  }
})

const { useRouteError, isRouteErrorResponse } = await import('react-router-dom')
const mockUseRouteError = vi.mocked(useRouteError)
const mockIsRouteErrorResponse = vi.mocked(isRouteErrorResponse)

describe('ErrorBoundary', () => {
  it('renders generic error message for unknown errors', () => {
    mockUseRouteError.mockReturnValue('unknown error')
    mockIsRouteErrorResponse.mockReturnValue(false)

    render(
      <ErrorBoundary />,
      { wrapper: ({ children }) => {
        const { MemoryRouter } = require('react-router-dom')
        return <MemoryRouter>{children}</MemoryRouter>
      }},
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument()
  })

  it('renders Error message for Error instances', () => {
    mockUseRouteError.mockReturnValue(new Error('Network timeout'))
    mockIsRouteErrorResponse.mockReturnValue(false)

    render(
      <ErrorBoundary />,
      { wrapper: ({ children }) => {
        const { MemoryRouter } = require('react-router-dom')
        return <MemoryRouter>{children}</MemoryRouter>
      }},
    )

    expect(screen.getByText('Network timeout')).toBeInTheDocument()
  })

  it('renders link back to dashboard', () => {
    mockUseRouteError.mockReturnValue('error')
    mockIsRouteErrorResponse.mockReturnValue(false)

    render(
      <ErrorBoundary />,
      { wrapper: ({ children }) => {
        const { MemoryRouter } = require('react-router-dom')
        return <MemoryRouter>{children}</MemoryRouter>
      }},
    )

    const link = screen.getByText('Back to Dashboard')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
