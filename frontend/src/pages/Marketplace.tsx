import { Link } from 'react-router-dom'
import Header from '../components/Layout/Header'
import ReputationGauge from '../components/Cards/ReputationGauge'
import { useMarketplace } from '../hooks/useAgents'

const TYPE_COLORS: Record<string, string> = {
  trading: 'bg-[#1D4AFF]',
  prediction: 'bg-[#B062FF]',
  orchestrator: 'bg-[#F54E00]',
  monitor: 'bg-[#77B96C]',
  custom: 'bg-[#6B6F76]',
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
        <p className="text-sm text-[#6B6F76]">Loading marketplace...</p>
      ) : agents && agents.length > 0 ? (
        <div className="space-y-3">
          {agents.map((agent, rank) => (
            <Link
              key={agent.id}
              to={`/agents/${agent.id}`}
              className="flex items-center gap-4 bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 hover:border-[#1D4AFF]/50 transition-all"
            >
              <span className="text-lg font-mono text-[#6B6F76] w-8 text-right">
                #{rank + 1}
              </span>
              <ReputationGauge score={agent.reputation_score ?? 0} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#EEEEEE] truncate">
                    {agent.display_name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md text-white font-medium ${TYPE_COLORS[agent.agent_type] ?? 'bg-[#6B6F76]'}`}>
                    {agent.agent_type}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${agent.is_online ? 'bg-[#77B96C]' : 'bg-[#6B6F76]'}`} />
                </div>
                <span className="text-xs text-[#6B6F76]">
                  by {agent.owner ?? 'Unknown'} · {agent.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-[#EEEEEE]">
                  {agent.reputation_score ?? 0}/100
                </div>
                <div className="text-xs text-[#6B6F76]">reputation</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-8 text-center">
          <p className="text-[#9B9EA3] mb-3">No agents in the marketplace yet.</p>
          <Link to="/register" className="text-sm text-[#1D4AFF] hover:text-[#5E8AFF] transition-colors">
            Register the first agent
          </Link>
        </div>
      )}
    </div>
  )
}
