import { useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { AgentEvent, EventOutcome, EventType } from '../types/event'

const OUTCOME_COLORS: Record<EventOutcome, string> = {
  pass: 'text-[#77B96C]',
  block: 'text-[#6B6F76]',
  modify: 'text-[#F1A82C]',
  win: 'text-[#77B96C]',
  loss: 'text-[#F54E00]',
  pending: 'text-[#6B6F76]',
  error: 'text-[#F54E00]',
}

const TYPE_BG: Partial<Record<EventType, string>> = {
  execution: 'bg-[#1D4AFF]/10 border-l-2 border-l-[#1D4AFF]',
  resolution: 'bg-[#F7A501]/10 border-l-2 border-l-[#F7A501]',
  signal: 'bg-[#5E8AFF]/5 border-l-2 border-l-[#5E8AFF]',
  trade: 'bg-[#B062FF]/10 border-l-2 border-l-[#B062FF]',
  claim: 'bg-[#77B96C]/10 border-l-2 border-l-[#77B96C]',
}

const TYPE_BADGE: Partial<Record<string, string>> = {
  execution: 'bg-[#1D4AFF]/20 text-[#5E8AFF]',
  signal: 'bg-[#5E8AFF]/20 text-[#5E8AFF]',
  claim: 'bg-[#77B96C]/20 text-[#77B96C]',
}

type FilterMode = 'all' | 'trades' | 'signals'

interface Props {
  agentId?: string
  maxVisible?: number
}

export default function LiveEventFeed({ agentId, maxVisible = 40 }: Props) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const { events, status, eventCount, clearEvents, isConnected } = useWebSocket({
    agentId,
    maxEvents: 100,
  })

  const filtered = events.filter((e) => {
    if (filter === 'trades') return ['execution', 'resolution', 'claim', 'trade'].includes(e.event_type)
    if (filter === 'signals') return ['signal', 'execution', 'resolution', 'edge_gate'].includes(e.event_type)
    return true
  }).slice(0, maxVisible)

  const tradeCount = events.filter((e) => ['execution', 'resolution'].includes(e.event_type)).length

  return (
    <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2C2E38]">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-[#77B96C] animate-pulse shadow-[0_0_6px_rgba(119,185,108,0.4)]' : 'bg-[#6B6F76]'
            }`}
          />
          <span className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider">
            Live Events
          </span>
          {eventCount > 0 && (
            <span className="text-[10px] bg-[#1D4AFF] text-white px-1.5 py-0.5 rounded-md font-mono font-medium">
              {eventCount}
            </span>
          )}
          {tradeCount > 0 && (
            <span className="text-[10px] bg-[#F7A501] text-black px-1.5 py-0.5 rounded-md font-mono font-medium">
              {tradeCount} trades
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#6B6F76]">
            {status === 'connecting'
              ? 'Connecting...'
              : status === 'connected'
                ? 'Connected'
                : status === 'error'
                  ? 'Error'
                  : 'Disconnected'}
          </span>
          {events.length > 0 && (
            <button
              onClick={clearEvents}
              aria-label="Clear all events"
              className="text-[11px] text-[#6B6F76] hover:text-[#9B9EA3] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#2C2E38]">
        {(['all', 'trades', 'signals'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-colors ${
              filter === f
                ? 'bg-[#1D4AFF] text-white'
                : 'text-[#6B6F76] hover:text-[#9B9EA3] hover:bg-[#2C2E38]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'trades' ? 'Trades Only' : 'Signals'}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="max-h-[420px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#6B6F76]">
              {isConnected ? 'Waiting for events...' : 'Connect to see live events'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((event, i) => (
              <EventRow key={event.id ?? `ws-${i}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventRow({ event }: { event: AgentEvent }) {
  const outcomeColor = OUTCOME_COLORS[event.outcome] ?? 'text-[#6B6F76]'
  const rowBg = TYPE_BG[event.event_type] ?? ''
  const isTradeEvent = ['execution', 'resolution', 'claim', 'trade'].includes(event.event_type)
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ''

  const payload = (event.payload ?? {}) as Record<string, unknown>

  // Build a rich detail string based on event type
  let detail = ''
  if (event.event_type === 'execution') {
    const dir = payload.direction ?? ''
    const price = payload.entry_price ? `@${payload.entry_price}` : ''
    const size = payload.size_usdc ? `$${payload.size_usdc}` : ''
    detail = `${dir} ${price} ${size}`.trim()
  } else if (event.event_type === 'resolution') {
    const result = payload.result ?? event.outcome
    const pnl = payload.pnl != null ? `$${Number(payload.pnl).toFixed(2)}` : ''
    detail = `${result} ${pnl}`.trim()
  } else if (event.event_type === 'signal') {
    detail = `${payload.direction ?? ''} ${payload.signal_reason ?? ''}`.trim()
  } else if (event.event_type === 'momentum') {
    detail = payload.skip_reason ? String(payload.skip_reason) : `str: ${payload.strength ?? '?'}`
  } else if (event.event_type === 'price_fetch') {
    const prices = Object.entries(payload)
      .filter(([k]) => k !== 'event_type')
      .map(([k, v]) => `${k}:$${v}`)
      .join(' ')
    detail = prices
  } else if (event.event_type === 'edge_gate') {
    detail = `${payload.direction ?? ''} ${payload.reason ?? ''}`.trim()
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[#2C2E38]/50 ${rowBg} ${isTradeEvent ? 'py-3' : ''}`}>
      <span className="text-xs font-mono text-[#6B6F76] w-16 shrink-0">{time}</span>
      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
        event.event_type === 'resolution'
          ? (event.outcome === 'win' ? 'bg-[#77B96C]/20 text-[#77B96C]' : 'bg-[#F54E00]/20 text-[#F54E00]')
          : TYPE_BADGE[event.event_type] ?? 'bg-[#2C2E38] text-[#6B6F76]'
      }`}>
        {event.event_type.replace(/_/g, ' ')}
      </span>
      {event.instrument && (
        <span className="text-[11px] font-mono text-[#9B9EA3]">{event.instrument}</span>
      )}
      <span className={`text-xs truncate flex-1 ${isTradeEvent ? 'text-[#EEEEEE] font-medium' : 'text-[#6B6F76]'}`}>
        {detail}
      </span>
      <span className={`text-[10px] font-mono uppercase font-medium ${outcomeColor}`}>{event.outcome}</span>
    </div>
  )
}
