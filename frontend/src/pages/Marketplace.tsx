import Header from '../components/Layout/Header'
import AgentCard from '../components/Cards/AgentCard'
import { useMarketplace } from '../hooks/useAgents'

export default function Marketplace() {
  const { data: agents, isLoading } = useMarketplace()

  return (
    <div>
      <Header
        title="Marketplace"
        subtitle="Discover agents ranked by reputation"
      />

      {isLoading ? (
        <p className="text-sm text-[#484f58]">Loading marketplace...</p>
      ) : agents && agents.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
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
