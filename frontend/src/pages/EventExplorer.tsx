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
  pass: 'bg-[#238636] text-white',
  block: 'bg-[#da3633] text-white',
  modify: 'bg-[#d29922] text-white',
  win: 'bg-[#3fb950] text-white',
  loss: 'bg-[#f85149] text-white',
  pending: 'bg-[#484f58] text-[#e6edf3]',
  error: 'bg-[#da3633] text-white',
}

const TYPE_COLORS: Partial<Record<EventType, string>> = {
  execution: 'text-[#a371f7]',
  resolution: 'text-[#f0883e]',
  trade: 'text-[#a371f7]',
  edge_gate: 'text-[#f85149]',
  market_lean: 'text-[#58a6ff]',
  momentum: 'text-[#3fb950]',
  signal: 'text-[#58a6ff]',
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
      <div className="flex gap-3 mb-4">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setOffset(0) }}
          className="bg-[#0d1117] border border-[#21262d] rounded px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={outcome}
          onChange={(e) => { setOutcome(e.target.value); setOffset(0) }}
          className="bg-[#0d1117] border border-[#21262d] rounded px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#388bfd] focus:outline-none"
        >
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#21262d] text-[#7d8590] text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Time</th>
              <th className="text-left px-4 py-3">Agent</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Instrument</th>
              <th className="text-left px-4 py-3">Outcome</th>
              <th className="text-right px-4 py-3">Confidence</th>
              <th className="text-left px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#484f58]">
                  Loading events...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#484f58]">
                  No events found. Run bridge sync to populate.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-[#7d8590] whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-[#e6edf3]">
                    {event.agent_name}
                  </td>
                  <td className={`px-4 py-2.5 font-mono text-xs ${TYPE_COLORS[event.event_type] ?? 'text-[#7d8590]'}`}>
                    {event.event_type}
                  </td>
                  <td className="px-4 py-2.5 text-[#e6edf3] font-mono text-xs">
                    {event.instrument || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${OUTCOME_COLORS[event.outcome]}`}>
                      {event.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-[#7d8590]">
                    {event.confidence != null ? `${(event.confidence * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#484f58] max-w-xs truncate">
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#484f58]">
            Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={!hasPrev}
              className="text-xs px-3 py-1.5 rounded border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!hasNext}
              className="text-xs px-3 py-1.5 rounded border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
