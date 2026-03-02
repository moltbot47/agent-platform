import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentEvent } from '../types/event'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketMessage {
  type: string
  event?: AgentEvent
  events?: AgentEvent[]
  count?: number
  message?: string
  agent_id?: string
}

interface UseWebSocketOptions {
  agentId?: string
  maxEvents?: number
  enabled?: boolean
}

const WS_BASE = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8000`

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { agentId, maxEvents = 200, enabled = true } = options
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [eventCount, setEventCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10

  const connect = useCallback(() => {
    if (!enabled) return

    const path = agentId ? `ws/events/${agentId}/` : 'ws/events/'
    const url = `${WS_BASE}/${path}`

    setStatus('connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      reconnectAttempts.current = 0
    }

    ws.onmessage = (msg) => {
      try {
        const data: WebSocketMessage = JSON.parse(msg.data)

        if (data.type === 'event_new' && data.event) {
          setEvents((prev) => [data.event!, ...prev].slice(0, maxEvents))
          setEventCount((c) => c + 1)
        } else if (data.type === 'event_batch' && data.events) {
          setEvents((prev) => [...data.events!, ...prev].slice(0, maxEvents))
          setEventCount((c) => c + (data.count ?? data.events!.length))
        }
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onerror = () => {
      setStatus('error')
    }

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null

      // Auto-reconnect with exponential backoff
      if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
        reconnectAttempts.current += 1
        reconnectTimeout.current = setTimeout(connect, delay)
      }
    }
  }, [agentId, enabled, maxEvents])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const clearEvents = useCallback(() => {
    setEvents([])
    setEventCount(0)
  }, [])

  return {
    events,
    status,
    eventCount,
    clearEvents,
    isConnected: status === 'connected',
  }
}
