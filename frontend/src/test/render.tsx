import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface WrapperProps {
  children: ReactNode
  initialRoute?: string
}

function createWrapper(initialRoute = '/') {
  return function Wrapper({ children }: WrapperProps) {
    const queryClient = createTestQueryClient()
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { initialRoute?: string },
) {
  const { initialRoute, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: createWrapper(initialRoute),
    ...renderOptions,
  })
}
