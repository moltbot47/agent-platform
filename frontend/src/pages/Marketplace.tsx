import { Link } from 'react-router-dom'
import Header from '../components/Layout/Header'
import ReputationGauge from '../components/Cards/ReputationGauge'
import { useMarketplace } from '../hooks/useAgents'

const TYPE_COLORS: Record<string, string> = {
  trading: 'bg-[#1f6feb]',
  prediction: 'bg-[#a371f7]',
  orchestrator: 'bg-[#f0883e]',
  monitor: 'bg-[#3fb950]',
  custom: 'bg-[#484f58]',
}

export default function Marketplace() {
  const { data: agents, isLoading } = useMarketplace()

  return (
    <div>
      <Header
        title="Marketplace"
        subtitle={`Discover agents ranked by reputation${agents ? ` — ${agents.length} listed` : ''}`}
      />

      {isLoading ? (
        <p className="text-sm text-[#484f58]">Loading marketplace...</p>
      ) : agents && agents.length > 0 ? (
        <div className="space-y-3">
          {agents.map((agent, rank) => (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
              className="flex items-center gap-4 bg-[#0d1117] border border-[#21262d] rounded-lg p-4 hover:border-[#388bfd] transition-colors"
            >
              <span className="text-lg font-mono text-[#484f58] w-8 text-right">
                #{rank + 1}
              </span>
              <ReputationGauge score={agent.reputation_score ?? 0} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#e6edf3] truncate">
                    {agent.display_name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-white ${TYPE_COLORS[agent.agent_type] ?? 'bg-[#484f58]'}`}>
                    {agent.agent_type}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${agent.is_online ? 'bg-[#3fb950]' : 'bg-[#484f58]'}`} />
                </div>
                <span className="text-xs text-[#484f58]">
                  by {agent.owner ?? 'Unknown'} · {agent.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-[#e6edf3]">
                  {agent.reputation_score ?? 0}/100
                </div>
                <div className="text-xs text-[#484f58]">reputation</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-8 text-center">
          <p className="text-[#7d8590] mb-2">No agents in the marketplace yet.</p>
          <a href="/register" className="text-sm text-[#58a6ff] hover:underline">
            Register the first agent
          </a>
        </div>
      )}
    </div>
  )
}
