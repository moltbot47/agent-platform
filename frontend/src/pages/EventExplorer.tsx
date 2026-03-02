import { useState } from 'react'
import Header from '../components/Layout/Header'
import { useAllEvents } from '../hooks/useEvents'
import type { EventOutcome, EventType } from '../types/event'

const EVENT_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'price_fetch', label: 'Price Fetch' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'market_lean', label: 'Market Lean' },
  { value: 'edge_gate', label: 'Edge Gate' },
  { value: 'signal', label: 'Signal' },
  { value: 'execution', label: 'Execution' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'trade', label: 'Trade' },
  { value: 'prediction', label: 'Prediction' },
]

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
  block: 'bg-[#DF4313] text-white',
  modify: 'bg-[#F1A82C] text-white',
  win: 'bg-[#77B96C] text-white',
  loss: 'bg-[#F54E00] text-white',
  pending: 'bg-[#3C3E48] text-[#EEEEEE]',
  error: 'bg-[#DF4313] text-white',
}

const TYPE_COLORS: Partial<Record<EventType, string>> = {
  execution: 'text-[#B062FF]',
  resolution: 'text-[#F7A501]',
  trade: 'text-[#B062FF]',
  edge_gate: 'text-[#F54E00]',
  market_lean: 'text-[#5E8AFF]',
  momentum: 'text-[#77B96C]',
  signal: 'text-[#5E8AFF]',
}

export default function EventExplorer() {
  const [eventType, setEventType] = useState('')
  const [outcome, setOutcome] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

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

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <label htmlFor="event-type-filter" className="sr-only">Filter by event type</label>
        <select
          id="event-type-filter"
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setOffset(0) }}
          className="bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-1.5 text-sm text-[#EEEEEE] focus:border-[#1D4AFF] focus:outline-none"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label htmlFor="outcome-filter" className="sr-only">Filter by outcome</label>
        <select
          id="outcome-filter"
          value={outcome}
          onChange={(e) => { setOutcome(e.target.value); setOffset(0) }}
          className="bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-1.5 text-sm text-[#EEEEEE] focus:border-[#1D4AFF] focus:outline-none"
        >
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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
                  No events found. Run bridge sync to populate.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-[#2C2E38] hover:bg-[#2C2E38]/50 transition-colors"
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
                  <td className="px-4 py-3 text-[#EEEEEE]">
                    {event.agent_name}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${TYPE_COLORS[event.event_type] ?? 'text-[#9B9EA3]'}`}>
                    {event.event_type}
                  </td>
                  <td className="px-4 py-3 text-[#EEEEEE] font-mono text-xs">
                    {event.instrument || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${OUTCOME_COLORS[event.outcome]}`}>
                      {event.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#9B9EA3]">
                    {event.confidence != null ? `${(event.confidence * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B6F76] max-w-xs truncate">
                    {summarizePayload(event.payload)}
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

function summarizePayload(payload: Record<string, unknown>): string {
  if (!payload || Object.keys(payload).length === 0) return '—'

  const parts: string[] = []
  if (payload.direction) parts.push(`${payload.direction}`)
  if (payload.signal_direction) parts.push(`${payload.signal_direction}`)
  if (payload.pnl != null) parts.push(`PnL: $${Number(payload.pnl).toFixed(2)}`)
  if (payload.entry_price) parts.push(`entry: ${payload.entry_price}`)
  if (payload.result) parts.push(`${payload.result}`)
  if (payload.signal_reason) parts.push(`${payload.signal_reason}`)
  if (payload.skip_reason) parts.push(`${payload.skip_reason}`)

  return parts.join(' | ') || JSON.stringify(payload).slice(0, 80)
}
