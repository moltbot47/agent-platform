import { useWebSocket } from '../hooks/useWebSocket'
import type { AgentEvent, EventOutcome, EventType } from '../types/event'

const OUTCOME_COLORS: Record<EventOutcome, string> = {
  pass: 'text-[#77B96C]',
  block: 'text-[#F54E00]',
  modify: 'text-[#F1A82C]',
  win: 'text-[#77B96C]',
  loss: 'text-[#F54E00]',
  pending: 'text-[#6B6F76]',
  error: 'text-[#F54E00]',
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

      {/* Event list */}
      <div className="max-h-[400px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-[#6B6F76]">
              {isConnected ? 'Waiting for events...' : 'Connect to see live events'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2C2E38]">
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
  const outcomeColor = OUTCOME_COLORS[event.outcome] ?? 'text-[#6B6F76]'
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ''

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2C2E38]/50 transition-colors">
      <span className="text-sm w-5 text-center" aria-hidden="true">{icon}</span>
      <span className="text-xs font-mono text-[#6B6F76] w-16 shrink-0">{time}</span>
      <span className="text-xs text-[#9B9EA3] truncate flex-1">
        <span className="text-[#EEEEEE] font-medium">{event.agent_name}</span>
        {' · '}
        {event.event_type.replace(/_/g, ' ')}
        {event.instrument && (
          <span className="text-[#5E8AFF]"> [{event.instrument}]</span>
        )}
        {event.confidence != null && (
          <span className="text-[#9B9EA3]"> ({(event.confidence * 100).toFixed(0)}%)</span>
        )}
      </span>
      <span className={`text-xs font-mono uppercase ${outcomeColor}`}>{event.outcome}</span>
    </div>
  )
}
