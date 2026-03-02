import { Link } from 'react-router-dom'
import type { AgentListItem } from '../../types'

interface AgentCardProps {
  agent: AgentListItem
}

const TYPE_COLORS: Record<string, string> = {
  trading: 'bg-[#1D4AFF]',
  prediction: 'bg-[#B062FF]',
  orchestrator: 'bg-[#F54E00]',
  monitor: 'bg-[#77B96C]',
  custom: 'bg-[#6B6F76]',
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      to={`/agents/${agent.id}`}
      className="block bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 hover:border-[#1D4AFF]/50 hover:bg-[#22242C]/80 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${agent.is_online ? 'bg-[#77B96C] shadow-[0_0_6px_rgba(119,185,108,0.4)]' : 'bg-[#6B6F76]'}`}
          />
          <span className="text-sm font-medium text-[#EEEEEE]">{agent.display_name}</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-md text-white font-medium ${TYPE_COLORS[agent.agent_type] ?? TYPE_COLORS.custom}`}
        >
          {agent.agent_type}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[#9B9EA3]">
        <span>{agent.owner ?? 'Unknown creator'}</span>
        {agent.reputation_score != null && (
          <span className="font-mono text-[#EEEEEE] bg-[#2C2E38] px-2 py-0.5 rounded-md">{agent.reputation_score}/100</span>
        )}
      </div>
    </Link>
  )
}
