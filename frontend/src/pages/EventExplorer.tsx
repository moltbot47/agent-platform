import { useState } from 'react'
import Header from '../components/Layout/Header'
import { useAllEvents } from '../hooks/useEvents'
import type { EventOutcome, EventType } from '../types/event'

const QUICK_FILTERS = [
  { label: 'Trades', types: 'execution,resolution' },
  { label: 'Signals', types: 'signal,edge_gate' },
  { label: 'All', types: '' },
  { label: 'Momentum', types: 'momentum' },
  { label: 'Prices', types: 'price_fetch' },
] as const

const OUTCOMES: { value: string; label: string }[] = [
  { value: '', label: 'All Outcomes' },
  { value: 'pass', label: 'Pass' },
  { value: 'block', label: 'Block' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'pending', label: 'Pending' },
]

const OUTCOME_COLORS: Record<EventOutcome, string> = {
  pass: 'bg-[#4B7A3E] text-white',
  block: 'bg-[#3C3E48] text-[#9B9EA3]',
  modify: 'bg-[#F1A82C] text-white',
  win: 'bg-[#77B96C] text-white',
  loss: 'bg-[#F54E00] text-white',
  pending: 'bg-[#3C3E48] text-[#EEEEEE]',
  error: 'bg-[#DF4313] text-white',
}

const TYPE_COLORS: Partial<Record<EventType, string>> = {
  execution: 'text-[#1D4AFF]',
  resolution: 'text-[#F7A501]',
  trade: 'text-[#B062FF]',
  edge_gate: 'text-[#F54E00]',
  market_lean: 'text-[#5E8AFF]',
  momentum: 'text-[#6B6F76]',
  signal: 'text-[#5E8AFF]',
  claim: 'text-[#77B96C]',
  price_fetch: 'text-[#9B9EA3]',
}

const ROW_HIGHLIGHT: Partial<Record<string, string>> = {
  execution: 'bg-[#1D4AFF]/5',
  resolution: 'bg-[#F7A501]/5',
  claim: 'bg-[#77B96C]/5',
}

export default function EventExplorer() {
  const [activeQuickFilter, setActiveQuickFilter] = useState(0) // Default: Trades
  const [outcome, setOutcome] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const quickFilter = QUICK_FILTERS[activeQuickFilter]
  const eventType = quickFilter.types

  const { data, isLoading } = useAllEvents({
    event_type: eventType || undefined,
    outcome: outcome || undefined,
    limit,
    offset,
  })

  const events = data?.results ?? []
  const totalCount = data?.count ?? 0
  const hasNext = !!data?.next
  const hasPrev = offset > 0

  return (
    <div>
      <Header
        title="Event Explorer"
        subtitle={`Browse and filter agent events — ${totalCount.toLocaleString()} total`}
      />

      {/* Quick filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {QUICK_FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => { setActiveQuickFilter(i); setOffset(0) }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeQuickFilter === i
                ? 'bg-[#1D4AFF] text-white'
                : 'bg-[#22242C] border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#3C3E48]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto">
          <label htmlFor="outcome-filter" className="sr-only">Filter by outcome</label>
          <select
            id="outcome-filter"
            value={outcome}
            onChange={(e) => { setOutcome(e.target.value); setOffset(0) }}
            className="bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-1.5 text-xs text-[#EEEEEE] focus:border-[#1D4AFF] focus:outline-none"
          >
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl overflow-hidden" role="region" aria-label="Events table">
        <table className="w-full text-sm" aria-label="Agent events">
          <thead>
            <tr className="border-b border-[#2C2E38] text-[#9B9EA3] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">Agent</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Instrument</th>
              <th className="text-left px-4 py-3 font-medium">Outcome</th>
              <th className="text-right px-4 py-3 font-medium">Confidence</th>
              <th className="text-left px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#6B6F76]">
                  Loading events...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#6B6F76]">
                  No events found for this filter.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr
                  key={event.id}
                  className={`border-b border-[#2C2E38] hover:bg-[#2C2E38]/50 transition-colors ${ROW_HIGHLIGHT[event.event_type] ?? ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#9B9EA3] whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-[#EEEEEE] text-xs">
                    {event.agent_name}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs font-medium ${TYPE_COLORS[event.event_type] ?? 'text-[#9B9EA3]'}`}>
                    {event.event_type}
                  </td>
                  <td className="px-4 py-3 text-[#EEEEEE] font-mono text-xs">
                    {event.instrument || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ${OUTCOME_COLORS[event.outcome]}`}>
                      {event.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#9B9EA3]">
                    {event.confidence != null ? `${(event.confidence * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9B9EA3] max-w-xs truncate">
                    {summarizePayload(event.event_type, event.payload)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs text-[#6B6F76]">
            Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={!hasPrev}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!hasNext}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function summarizePayload(eventType: string, payload: Record<string, unknown>): string {
  if (!payload || Object.keys(payload).length === 0) return '—'

  const parts: string[] = []

  if (eventType === 'execution') {
    if (payload.direction) parts.push(String(payload.direction))
    if (payload.entry_price) parts.push(`@${payload.entry_price}`)
    if (payload.size_usdc) parts.push(`$${payload.size_usdc}`)
    if (payload.signal_reason) parts.push(String(payload.signal_reason))
  } else if (eventType === 'resolution') {
    if (payload.result) parts.push(String(payload.result))
    if (payload.direction) parts.push(String(payload.direction))
    if (payload.pnl != null) parts.push(`PnL: $${Number(payload.pnl).toFixed(2)}`)
    if (payload.session_pnl != null) parts.push(`Session: $${Number(payload.session_pnl).toFixed(2)}`)
  } else if (eventType === 'signal') {
    if (payload.direction) parts.push(String(payload.direction))
    if (payload.signal_reason) parts.push(String(payload.signal_reason))
    if (payload.signal_type) parts.push(String(payload.signal_type))
  } else if (eventType === 'momentum') {
    if (payload.direction) parts.push(String(payload.direction))
    if (payload.strength != null) parts.push(`str: ${payload.strength}`)
    if (payload.skip_reason) parts.push(String(payload.skip_reason))
  } else {
    if (payload.direction) parts.push(String(payload.direction))
    if (payload.reason) parts.push(String(payload.reason))
    if (payload.pnl != null) parts.push(`PnL: $${Number(payload.pnl).toFixed(2)}`)
    if (payload.signal_reason) parts.push(String(payload.signal_reason))
    if (payload.skip_reason) parts.push(String(payload.skip_reason))
  }

  return parts.join(' · ') || JSON.stringify(payload).slice(0, 80)
}
