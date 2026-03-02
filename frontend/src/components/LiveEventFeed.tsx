import { useWebSocket } from '../hooks/useWebSocket'
import type { AgentEvent, EventOutcome, EventType } from '../types/event'

const OUTCOME_COLORS: Record<EventOutcome, string> = {
  pass: 'text-[#3fb950]',
  block: 'text-[#f85149]',
  modify: 'text-[#d29922]',
  win: 'text-[#3fb950]',
  loss: 'text-[#f85149]',
  pending: 'text-[#484f58]',
  error: 'text-[#f85149]',
}

const TYPE_ICONS: Partial<Record<EventType, string>> = {
  price_fetch: '📡',
  momentum: '📈',
  market_lean: '🎯',
  edge_gate: '🚦',
  circuit_breaker: '⚡',
  signal: '📊',
  execution: '🔄',
  resolution: '✅',
  prediction: '🔮',
  trade: '💰',
  heartbeat: '💓',
  error: '⚠️',
}

interface Props {
  agentId?: string
  maxVisible?: number
}

export default function LiveEventFeed({ agentId, maxVisible = 25 }: Props) {
  const { events, status, eventCount, clearEvents, isConnected } = useWebSocket({
    agentId,
    maxEvents: maxVisible,
  })

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-[#3fb950] animate-pulse' : 'bg-[#484f58]'
            }`}
          />
          <span className="text-xs font-medium text-[#7d8590] uppercase tracking-wide">
            Live Events
          </span>
          {eventCount > 0 && (
            <span className="text-xs bg-[#1f6feb] text-white px-1.5 py-0.5 rounded font-mono">
              {eventCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#484f58]">
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
              className="text-xs text-[#484f58] hover:text-[#7d8590] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Event list */}
      <div className="max-h-[400px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#484f58]">
              {isConnected ? 'Waiting for events...' : 'Connect to see live events'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d]">
            {events.map((event, i) => (
              <EventRow key={event.id ?? `ws-${i}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventRow({ event }: { event: AgentEvent }) {
  const icon = TYPE_ICONS[event.event_type] ?? '●'
  const outcomeColor = OUTCOME_COLORS[event.outcome] ?? 'text-[#484f58]'
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ''

  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-[#161b22] transition-colors">
      <span className="text-sm w-5 text-center" aria-hidden="true">{icon}</span>
      <span className="text-xs font-mono text-[#484f58] w-16 shrink-0">{time}</span>
      <span className="text-xs text-[#7d8590] truncate flex-1">
        <span className="text-[#e6edf3] font-medium">{event.agent_name}</span>
        {' · '}
        {event.event_type.replace(/_/g, ' ')}
        {event.instrument && (
          <span className="text-[#58a6ff]"> [{event.instrument}]</span>
        )}
        {event.confidence != null && (
          <span className="text-[#7d8590]"> ({(event.confidence * 100).toFixed(0)}%)</span>
        )}
      </span>
      <span className={`text-xs font-mono uppercase ${outcomeColor}`}>{event.outcome}</span>
    </div>
  )
}
