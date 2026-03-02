import { useState } from 'react'
import Header from '../components/Layout/Header'
import AgentCard from '../components/Cards/AgentCard'
import { useAgents } from '../hooks/useAgents'
import type { AgentType } from '../types'

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'trading', label: 'Trading' },
  { value: 'prediction', label: 'Prediction' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'custom', label: 'Custom' },
]

export default function AgentRegistry() {
  const [typeFilter, setTypeFilter] = useState('')
  const { data: agents, isLoading } = useAgents(
    typeFilter ? { type: typeFilter as AgentType } : undefined,
  )

  return (
    <div>
      <Header title="Agent Registry" subtitle="All registered agents on the platform" />

      <div className="flex items-center gap-3 mb-6">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTypeFilter(opt.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              typeFilter === opt.value
                ? 'bg-[#1D4AFF] border-[#1D4AFF] text-white'
                : 'border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[#6B6F76]">Loading agents...</p>
      ) : agents && agents.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#6B6F76]">No agents found.</p>
      )}
    </div>
  )
}
