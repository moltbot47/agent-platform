import { Link } from 'react-router-dom'
import Header from '../components/Layout/Header'
import StatCard from '../components/Cards/StatCard'
import AgentCard from '../components/Cards/AgentCard'
import LiveEventFeed from '../components/LiveEventFeed'
import { useAgents } from '../hooks/useAgents'
import { useDashboardSummary } from '../hooks/useEvents'

export default function Dashboard() {
  const { data: agents, isLoading } = useAgents()
  const { data: summary } = useDashboardSummary()

  const activeCount = agents?.filter((a) => a.status === 'active').length ?? 0
  const onlineCount = agents?.filter((a) => a.is_online).length ?? 0

  // Extract meaningful stats from summary
  const executions = summary?.event_type_counts?.execution ?? 0
  const resolutions = summary?.event_type_counts?.resolution ?? 0
  const wins = summary?.outcome_counts?.win ?? 0
  const losses = summary?.outcome_counts?.loss ?? 0
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '—'

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

      {/* Two-column layout: agents + live feed */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-4">
            Registered Agents
          </h3>
          {isLoading ? (
            <p className="text-sm text-[#6B6F76]">Loading...</p>
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
