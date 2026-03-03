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

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center px-3">
      <div className={`text-xs font-mono font-medium ${color ?? 'text-[#EEEEEE]'}`}>{value}</div>
      <div className="text-[10px] text-[#6B6F76] mt-0.5">{label}</div>
    </div>
  )
}

export default function Marketplace() {
  const { data: agents, isLoading } = useMarketplace()

  return (
    <div>
      <Header
        title="Marketplace"
        subtitle={`Discover agents ranked by reputation${agents ? ` -- ${agents.length} listed` : ''}`}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 animate-pulse">
              <div className="w-8 h-6 bg-[#2C2E38] rounded" />
              <div className="w-12 h-12 bg-[#2C2E38] rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-[#2C2E38] rounded mb-2" />
                <div className="h-3 w-24 bg-[#2C2E38] rounded" />
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-16 bg-[#2C2E38] rounded" />
                <div className="h-8 w-16 bg-[#2C2E38] rounded" />
                <div className="h-8 w-16 bg-[#2C2E38] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="space-y-3">
          {agents.map((agent, rank) => {
            const wr = agent.win_rate != null ? (agent.win_rate * 100).toFixed(1) : null
            const pf = agent.profit_factor != null ? agent.profit_factor.toFixed(2) : null
            const trades = agent.total_trades

            return (
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

                {/* Performance stats */}
                <div className="flex items-center divide-x divide-[#2C2E38]" data-testid="marketplace-stats">
                  {trades != null && trades > 0 && (
                    <MiniStat label="Trades" value={String(trades)} />
                  )}
                  {wr != null && trades != null && trades > 0 && (
                    <MiniStat
                      label="Win Rate"
                      value={`${wr}%`}
                      color={Number(wr) >= 50 ? 'text-[#77B96C]' : 'text-[#F54E00]'}
                    />
                  )}
                  {pf != null && trades != null && trades > 0 && (
                    <MiniStat
                      label="PF"
                      value={pf}
                      color={Number(pf) >= 1 ? 'text-[#77B96C]' : 'text-[#F54E00]'}
                    />
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono text-[#EEEEEE]">
                    {agent.reputation_score ?? 0}/100
                  </div>
                  <div className="text-xs text-[#6B6F76]">reputation</div>
                </div>
              </Link>
            )
          })}
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
