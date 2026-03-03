import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import AgentCard from '../AgentCard'
import { mockAgentListItem } from '../../../test/fixtures'

describe('AgentCard', () => {
  it('renders agent display name', () => {
    renderWithProviders(<AgentCard agent={mockAgentListItem} />)
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('renders agent type badge', () => {
    renderWithProviders(<AgentCard agent={mockAgentListItem} />)
    expect(screen.getByText('trading')).toBeInTheDocument()
  })

  it('renders owner name', () => {
    renderWithProviders(<AgentCard agent={mockAgentListItem} />)
    expect(screen.getByText('durayveon')).toBeInTheDocument()
  })

  it('shows "Unknown creator" when owner is null', () => {
    renderWithProviders(
      <AgentCard agent={{ ...mockAgentListItem, owner: null }} />,
    )
    expect(screen.getByText('Unknown creator')).toBeInTheDocument()
  })

  it('renders reputation score', () => {
    renderWithProviders(<AgentCard agent={mockAgentListItem} />)
    expect(screen.getByText('75/100')).toBeInTheDocument()
  })

  it('does not render reputation when null', () => {
    renderWithProviders(
      <AgentCard agent={{ ...mockAgentListItem, reputation_score: null }} />,
    )
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument()
  })

  it('links to agent detail page', () => {
    renderWithProviders(<AgentCard agent={mockAgentListItem} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/agents/${mockAgentListItem.id}`)
  })

  it('shows green indicator when online', () => {
    const { container } = renderWithProviders(
      <AgentCard agent={{ ...mockAgentListItem, is_online: true }} />,
    )
    const indicator = container.querySelector('.rounded-full')!
    expect(indicator.className).toContain('bg-[#77B96C]')
  })

  it('shows grey indicator when offline', () => {
    const { container } = renderWithProviders(
      <AgentCard agent={{ ...mockAgentListItem, is_online: false }} />,
    )
    const indicator = container.querySelector('.rounded-full')!
    expect(indicator.className).toContain('bg-[#6B6F76]')
  })
})
