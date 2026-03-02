import { Link, useParams } from 'react-router-dom'
import Header from '../components/Layout/Header'
import StatCard from '../components/Cards/StatCard'
import CalibrationChart from '../components/Charts/CalibrationChart'
import PnLChart from '../components/Charts/PnLChart'
import OutcomeChart from '../components/Charts/OutcomeChart'
import { useAgent } from '../hooks/useAgents'
import { useCalibration, usePnLCurve, useOutcomeByType } from '../hooks/useCharts'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: agent, isLoading } = useAgent(id ?? '')
  const { data: calibration } = useCalibration(id ?? '')
  const { data: pnlCurve } = usePnLCurve(id ?? '')
  const { data: outcomeData } = useOutcomeByType(id ?? '')

  if (isLoading) return <p className="text-sm text-[#6B6F76]">Loading agent...</p>
  if (!agent) return <p className="text-sm text-[#F54E00]">Agent not found.</p>

  const rep = agent.reputation

  return (
    <div>
      <Header
        title={agent.display_name}
        subtitle={`${agent.agent_type} agent · ${agent.status} · v${agent.version}`}
      />

      <div className="flex items-center gap-3 mb-6">
        <span
          className={`w-3 h-3 rounded-full ${agent.is_online ? 'bg-[#77B96C] shadow-[0_0_6px_rgba(119,185,108,0.4)]' : 'bg-[#6B6F76]'}`}
        />
        <span className="text-sm text-[#9B9EA3]">
          {agent.is_online ? 'Online' : 'Offline'}
        </span>
        {agent.ownership && (
          <span className="text-sm text-[#9B9EA3]">
            · Created by{' '}
            {agent.ownership.creator_url ? (
              <a
                href={agent.ownership.creator_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1D4AFF] hover:text-[#5E8AFF] transition-colors"
              >
                {agent.ownership.creator_name}
              </a>
            ) : (
              agent.ownership.creator_name
            )}
          </span>
        )}
      </div>

      {/* Action links */}
      <div className="flex gap-3 mb-6">
        <Link
          to={`/agents/${id}/pipeline`}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#2C2E38] text-[#1D4AFF] hover:border-[#1D4AFF]/50 transition-all"
        >
          View Pipeline Traces
        </Link>
        <Link
          to={`/events?agent=${id}`}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#2C2E38] text-[#1D4AFF] hover:border-[#1D4AFF]/50 transition-all"
        >
          View Events
        </Link>
      </div>

      {rep && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="Reputation" value={`${rep.overall_score}/100`} />
          <StatCard label="Win Rate" value={`${(rep.win_rate * 100).toFixed(1)}%`} />
          <StatCard label="Profit Factor" value={rep.profit_factor.toFixed(2)} />
          <StatCard label="Total Trades" value={rep.total_trades} />
          <StatCard
            label="Max Drawdown"
            value={`${rep.max_drawdown_pct.toFixed(1)}%`}
            trend={rep.max_drawdown_pct > 10 ? 'down' : 'neutral'}
          />
        </div>
      )}

      {rep && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <h3 className="text-xs font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            Reputation Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Accuracy', value: rep.accuracy_score },
              { label: 'Profitability', value: rep.profitability_score },
              { label: 'Reliability', value: rep.reliability_score },
              { label: 'Consistency', value: rep.consistency_score },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-[#9B9EA3] w-24">{item.label}</span>
                <div className="flex-1 h-2 bg-[#2C2E38] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1D4AFF] rounded-full transition-all"
                    style={{ width: `${Math.min(item.value * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-[#EEEEEE] w-12 text-right">
                  {(item.value * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {calibration && calibration.calibration_curve.length > 0 && (
          <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
            <CalibrationChart
              data={calibration.calibration_curve}
              brierScore={calibration.brier_score}
            />
          </div>
        )}
        {pnlCurve && pnlCurve.length > 0 && (
          <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
            <PnLChart data={pnlCurve} />
          </div>
        )}
      </div>

      {outcomeData && outcomeData.length > 0 && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <OutcomeChart data={outcomeData} />
        </div>
      )}

      {agent.soul_file && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <h3 className="text-xs font-medium text-[#9B9EA3] mb-3 uppercase tracking-wider">
            Soul File
          </h3>
          <pre className="text-xs text-[#EEEEEE] whitespace-pre-wrap font-mono leading-relaxed">
            {agent.soul_file}
          </pre>
        </div>
      )}

      {agent.description && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <h3 className="text-xs font-medium text-[#9B9EA3] mb-2 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-sm text-[#EEEEEE]">{agent.description}</p>
        </div>
      )}
    </div>
  )
}
