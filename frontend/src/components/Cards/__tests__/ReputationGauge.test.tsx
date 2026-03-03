import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import ReputationGauge from '../ReputationGauge'

describe('ReputationGauge', () => {
  it('renders the score text', () => {
    renderWithProviders(<ReputationGauge score={75} />)
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('renders accessible SVG with aria-label', () => {
    renderWithProviders(<ReputationGauge score={85} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label', 'Reputation score: 85 out of 100')
  })

  it('renders SVG title for screen readers', () => {
    renderWithProviders(<ReputationGauge score={50} />)
    expect(screen.getByTitle('Reputation: 50/100')).toBeInTheDocument()
  })

  it('uses green color for high scores (>=70)', () => {
    const { container } = renderWithProviders(<ReputationGauge score={85} />)
    const scoreSpan = container.querySelector('span')!
    expect(scoreSpan.style.color).toBe('rgb(119, 185, 108)') // #77B96C
  })

  it('uses amber color for medium scores (50-69)', () => {
    const { container } = renderWithProviders(<ReputationGauge score={55} />)
    const scoreSpan = container.querySelector('span')!
    expect(scoreSpan.style.color).toBe('rgb(241, 168, 44)') // #F1A82C
  })

  it('uses orange color for low scores (30-49)', () => {
    const { container } = renderWithProviders(<ReputationGauge score={35} />)
    const scoreSpan = container.querySelector('span')!
    expect(scoreSpan.style.color).toBe('rgb(247, 165, 1)') // #F7A501
  })

  it('uses red color for very low scores (<30)', () => {
    const { container } = renderWithProviders(<ReputationGauge score={15} />)
    const scoreSpan = container.querySelector('span')!
    expect(scoreSpan.style.color).toBe('rgb(245, 78, 0)') // #F54E00
  })

  it('renders at small size', () => {
    const { container } = renderWithProviders(<ReputationGauge score={50} size="sm" />)
    const wrapper = container.firstElementChild!
    expect(wrapper).toHaveStyle({ width: '48px', height: '48px' })
  })

  it('renders at large size', () => {
    const { container } = renderWithProviders(<ReputationGauge score={50} size="lg" />)
    const wrapper = container.firstElementChild!
    expect(wrapper).toHaveStyle({ width: '96px', height: '96px' })
  })

  it('defaults to medium size', () => {
    const { container } = renderWithProviders(<ReputationGauge score={50} />)
    const wrapper = container.firstElementChild!
    expect(wrapper).toHaveStyle({ width: '72px', height: '72px' })
  })
})
