import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Header from '../components/Layout/Header'
import StatCard from '../components/Cards/StatCard'
import AgentCard from '../components/Cards/AgentCard'
import LiveEventFeed from '../components/LiveEventFeed'
import { useAgents } from '../hooks/useAgents'
import { useDashboardSummary, useAllEvents } from '../hooks/useEvents'

/**
 * Build events-per-hour buckets from recent events.
 * Uses the most recent event timestamp as the reference point to avoid
 * calling Date.now() during render (impure).
 */
function useEventsPerHour(events: { timestamp: string }[] | undefined) {
  return useMemo(() => {
    if (!events || events.length === 0) return []
    // Use most recent event timestamp as the "now" reference
    const mostRecent = events.reduce(
      (max, ev) => Math.max(max, new Date(ev.timestamp).getTime()),
      0,
    )
    if (mostRecent === 0) return []
    const buckets: Record<number, number> = {}
    for (let h = 23; h >= 0; h--) {
      buckets[h] = 0
    }
    for (const ev of events) {
      const ts = new Date(ev.timestamp).getTime()
      const hoursAgo = Math.floor((mostRecent - ts) / 3_600_000)
      if (hoursAgo >= 0 && hoursAgo < 24) {
        buckets[hoursAgo] = (buckets[hoursAgo] ?? 0) + 1
      }
    }
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${23 - i}h ago`,
      count: buckets[23 - i] ?? 0,
    }))
  }, [events])
}

/** Build rolling win rate from recent resolution events. */
function useRollingWinRate(events: { outcome: string; timestamp: string }[] | undefined) {
  return useMemo(() => {
    if (!events || events.length === 0) return []
    // Filter to resolutions only, sort oldest first
    const resolutions = events
      .filter((e) => e.outcome === 'win' || e.outcome === 'loss')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    if (resolutions.length < 2) return []
    let wins = 0
    let total = 0
    const points: { index: number; winRate: number }[] = []
    for (const ev of resolutions) {
      total++
      if (ev.outcome === 'win') wins++
      points.push({ index: total, winRate: Math.round((wins / total) * 100) })
    }
    return points
  }, [events])
}

export default function Dashboard() {
  const { data: agents, isLoading } = useAgents()
  const { data: summary } = useDashboardSummary()
  const { data: recentEvents } = useAllEvents({ limit: 200 })

  const onlineCount = agents?.filter((a) => a.is_online).length ?? 0

  // Extract meaningful stats from summary
  const executions = summary?.event_type_counts?.execution ?? 0
  const resolutions = summary?.event_type_counts?.resolution ?? 0
  const wins = summary?.outcome_counts?.win ?? 0
  const losses = summary?.outcome_counts?.loss ?? 0
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—'

  const eventsPerHour = useEventsPerHour(recentEvents?.results)
  const rollingWinRate = useRollingWinRate(recentEvents?.results)

  return (
    <div>
      <Header title="Dashboard" subtitle="Agent Platform overview" />

      <div className="grid grid-cols-4 gap-5 mb-6">
        <StatCard label="Total Agents" value={agents?.length ?? 0} />
        <StatCard label="Online Now" value={onlineCount} trend={onlineCount > 0 ? 'up' : 'neutral'} />
        <StatCard
          label="Events Today"
          value={summary?.events_today ?? 0}
          subtext={summary ? `${summary.total_events.toLocaleString()} total` : undefined}
        />
        <StatCard
          label="Pipeline Runs"
          value={summary?.total_pipeline_runs ?? 0}
          subtext={summary?.pass_rate ? `${summary.pass_rate}% pass` : undefined}
        />
      </div>

      {/* Trading stats row */}
      {(wins > 0 || losses > 0 || executions > 0) && (
        <div className="grid grid-cols-4 gap-5 mb-6">
          <StatCard label="Executions" value={executions} />
          <StatCard label="Resolutions" value={resolutions} />
          <StatCard
            label="Win Rate"
            value={winRate === '—' ? '—' : `${winRate}%`}
            trend={Number(winRate) > 50 ? 'up' : Number(winRate) < 50 ? 'down' : 'neutral'}
          />
          <StatCard
            label="W / L"
            value={`${wins} / ${losses}`}
            trend={wins > losses ? 'up' : wins < losses ? 'down' : 'neutral'}
          />
        </div>
      )}

      {/* Time-series charts */}
      {(eventsPerHour.length > 0 || rollingWinRate.length > 0) && (
        <div className="grid grid-cols-2 gap-5 mb-6" data-testid="dashboard-charts">
          {eventsPerHour.length > 0 && (
            <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
              <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-3">
                Events Per Hour (24h)
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={eventsPerHour} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2E38" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: '#6B6F76', fontSize: 9 }}
                    stroke="#2C2E38"
                    interval={5}
                  />
                  <YAxis
                    tick={{ fill: '#6B6F76', fontSize: 10 }}
                    stroke="#2C2E38"
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{ background: '#22242C', border: '1px solid #2C2E38', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9B9EA3' }}
                  />
                  <Bar dataKey="count" fill="#1D4AFF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {rollingWinRate.length > 0 && (
            <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
              <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-3">
                Rolling Win Rate
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={rollingWinRate} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="wrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#77B96C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#77B96C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2E38" />
                  <XAxis
                    dataKey="index"
                    tick={{ fill: '#6B6F76', fontSize: 10 }}
                    stroke="#2C2E38"
                    label={{ value: 'Trade #', fill: '#6B6F76', fontSize: 10, position: 'insideBottom', offset: -2 }}
                  />
                  <YAxis
                    tick={{ fill: '#6B6F76', fontSize: 10 }}
                    stroke="#2C2E38"
                    domain={[0, 100]}
                    width={35}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#22242C', border: '1px solid #2C2E38', borderRadius: 8, fontSize: 12 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any) => [`${value}%`, 'Win Rate']) as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={((label: any) => `Trade #${label}`) as any}
                  />
                  <Area
                    type="monotone"
                    dataKey="winRate"
                    stroke="#77B96C"
                    fill="url(#wrGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Two-column layout: agents + live feed */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-4">
            Registered Agents
          </h3>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 animate-pulse">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2C2E38]" />
                    <div className="h-4 w-32 bg-[#2C2E38] rounded" />
                  </div>
                  <div className="h-3 w-24 bg-[#2C2E38] rounded" />
                </div>
              ))}
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-8 text-center">
              <p className="text-[#9B9EA3] mb-3">No agents registered yet.</p>
              <Link to="/register" className="text-sm text-[#1D4AFF] hover:text-[#5E8AFF] transition-colors">
                Register your first agent
              </Link>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-4">
            Live Stream
          </h3>
          <LiveEventFeed />
        </div>
      </div>
    </div>
  )
}
