import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import StatCard from '../StatCard'

describe('StatCard', () => {
  it('renders label and value', () => {
    renderWithProviders(<StatCard label="Total Events" value={369000} />)
    expect(screen.getByText('Total Events')).toBeInTheDocument()
    expect(screen.getByText('369000')).toBeInTheDocument()
  })

  it('renders string value', () => {
    renderWithProviders(<StatCard label="Status" value="Online" />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders subtext when provided', () => {
    renderWithProviders(
      <StatCard label="Win Rate" value="56.7%" subtext="+2.3% this week" trend="up" />,
    )
    expect(screen.getByText('+2.3% this week')).toBeInTheDocument()
  })

  it('does not render subtext when not provided', () => {
    const { container } = renderWithProviders(
      <StatCard label="Events" value={100} />,
    )
    // Only label and value paragraphs
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
  })

  it('applies green color for upward trend', () => {
    renderWithProviders(
      <StatCard label="PnL" value="$3,205" subtext="+15%" trend="up" />,
    )
    const subtext = screen.getByText('+15%')
    expect(subtext.className).toContain('text-[#3fb950]')
  })

  it('applies red color for downward trend', () => {
    renderWithProviders(
      <StatCard label="Drawdown" value="-$500" subtext="-2.5%" trend="down" />,
    )
    const subtext = screen.getByText('-2.5%')
    expect(subtext.className).toContain('text-[#f85149]')
  })

  it('applies neutral color when no trend', () => {
    renderWithProviders(
      <StatCard label="Count" value={42} subtext="steady" trend="neutral" />,
    )
    const subtext = screen.getByText('steady')
    expect(subtext.className).toContain('text-[#7d8590]')
  })
})
