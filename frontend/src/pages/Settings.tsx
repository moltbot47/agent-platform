import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Layout/Header'

type HealthStatus = 'checking' | 'healthy' | 'unhealthy' | 'unknown'

const API_BASE = '/api/v1'
const WS_BASE = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

async function probeApi(): Promise<HealthStatus> {
  try {
    const resp = await fetch(`${API_BASE}/metrics/dashboard/`, { signal: AbortSignal.timeout(5000) })
    return resp.ok ? 'healthy' : 'unhealthy'
  } catch {
    return 'unhealthy'
  }
}

function probeWs(url: string): Promise<HealthStatus> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(`${url}/ws/events/`)
      const timeout = setTimeout(() => { ws.close(); resolve('unhealthy') }, 5000)
      ws.onopen = () => { clearTimeout(timeout); resolve('healthy'); ws.close() }
      ws.onerror = () => { clearTimeout(timeout); resolve('unhealthy') }
    } catch {
      resolve('unhealthy')
    }
  })
}

export default function Settings() {
  const [apiStatus, setApiStatus] = useState<HealthStatus>('checking')
  const [wsStatus, setWsStatus] = useState<HealthStatus>('checking')
  const [wsUrl, setWsUrl] = useState(WS_BASE)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    setApiStatus('checking')
    setWsStatus('checking')
    const [api, ws] = await Promise.all([probeApi(), probeWs(wsUrl)])
    setApiStatus(api)
    setWsStatus(ws)
    setLastCheck(new Date().toLocaleTimeString())
  }, [wsUrl])

  // Initial health check on mount
  useEffect(() => {
    let cancelled = false
    Promise.all([probeApi(), probeWs(wsUrl)]).then(([api, ws]) => {
      if (cancelled) return
      setApiStatus(api)
      setWsStatus(ws)
      setLastCheck(new Date().toLocaleTimeString())
    })
    return () => { cancelled = true }
  }, [wsUrl])

  const statusDot = (s: HealthStatus) => {
    if (s === 'checking') return 'bg-[#F1A82C] animate-pulse'
    if (s === 'healthy') return 'bg-[#77B96C] shadow-[0_0_6px_rgba(119,185,108,0.4)]'
    if (s === 'unhealthy') return 'bg-[#F54E00]'
    return 'bg-[#6B6F76]'
  }

  const statusLabel = (s: HealthStatus) => {
    if (s === 'checking') return 'Checking...'
    if (s === 'healthy') return 'Connected'
    if (s === 'unhealthy') return 'Unreachable'
    return 'Unknown'
  }

  return (
    <div>
      <Header title="Settings" subtitle="Platform configuration and connection status" />

      <div className="max-w-xl space-y-6">
        {/* Connection Status */}
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#9B9EA3] uppercase tracking-wider">
              Connection Status
            </h3>
            <button
              onClick={checkHealth}
              className="text-[11px] px-3 py-1 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${statusDot(apiStatus)}`} />
                <span className="text-sm text-[#EEEEEE]">REST API</span>
              </div>
              <span className={`text-xs font-mono ${apiStatus === 'healthy' ? 'text-[#77B96C]' : apiStatus === 'unhealthy' ? 'text-[#F54E00]' : 'text-[#9B9EA3]'}`}>
                {statusLabel(apiStatus)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${statusDot(wsStatus)}`} />
                <span className="text-sm text-[#EEEEEE]">WebSocket</span>
              </div>
              <span className={`text-xs font-mono ${wsStatus === 'healthy' ? 'text-[#77B96C]' : wsStatus === 'unhealthy' ? 'text-[#F54E00]' : 'text-[#9B9EA3]'}`}>
                {statusLabel(wsStatus)}
              </span>
            </div>

            {lastCheck && (
              <p className="text-[11px] text-[#6B6F76] pt-1">
                Last checked: {lastCheck}
              </p>
            )}
          </div>
        </div>

        {/* WebSocket URL */}
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            WebSocket Configuration
          </h3>
          <div>
            <label className="block text-xs text-[#6B6F76] mb-1.5 font-medium">WebSocket URL</label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8000"
              className="w-full bg-[#1D1F27] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none transition-colors font-mono"
            />
            <p className="text-[11px] text-[#6B6F76] mt-1.5">
              Set via <span className="font-mono text-[#9B9EA3]">VITE_WS_URL</span> environment variable. Changes here are session-only.
            </p>
          </div>
        </div>

        {/* API Info */}
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            API Reference
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6F76]">Backend URL</span>
              <span className="text-xs font-mono text-[#9B9EA3]">{window.location.hostname}:8000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6F76]">API Base</span>
              <span className="text-xs font-mono text-[#9B9EA3]">/api/v1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6F76]">Documentation</span>
              <a
                href="/api/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1D4AFF] hover:text-[#5E8AFF] transition-colors"
              >
                OpenAPI Docs
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6F76]">Schema</span>
              <a
                href="/api/schema/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1D4AFF] hover:text-[#5E8AFF] transition-colors"
              >
                OpenAPI Schema (YAML)
              </a>
            </div>
          </div>
        </div>

        {/* PostHog */}
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            Analytics (PostHog)
          </h3>
          <p className="text-xs text-[#6B6F76]">
            PostHog analytics is configured via environment variables.
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6F76]">Project API Key</span>
              <span className="text-xs font-mono text-[#9B9EA3]">
                {import.meta.env.VITE_POSTHOG_KEY ? 'Configured' : 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6F76]">Host</span>
              <span className="text-xs font-mono text-[#9B9EA3]">
                {import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
