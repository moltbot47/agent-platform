import { Link } from 'react-router-dom'
import type { AgentListItem } from '../../types'

interface AgentCardProps {
  agent: AgentListItem
}

const TYPE_COLORS: Record<string, string> = {
  trading: 'bg-[#1f6feb]',
  prediction: 'bg-[#a371f7]',
  orchestrator: 'bg-[#f0883e]',
  monitor: 'bg-[#3fb950]',
  custom: 'bg-[#7d8590]',
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      to={`/agents/${agent.id}`}
      className="block bg-[#0d1117] border border-[#21262d] rounded-lg p-4 hover:border-[#388bfd] transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${agent.is_online ? 'bg-[#3fb950]' : 'bg-[#484f58]'}`}
          />
          <span className="text-sm font-medium text-[#e6edf3]">{agent.display_name}</span>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded text-white ${TYPE_COLORS[agent.agent_type] ?? TYPE_COLORS.custom}`}
        >
          {agent.agent_type}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[#7d8590]">
        <span>{agent.owner ?? 'Unknown creator'}</span>
        {agent.reputation_score != null && (
          <span className="font-mono text-[#e6edf3]">{agent.reputation_score}/100</span>
        )}
      </div>
    </Link>
  )
}
