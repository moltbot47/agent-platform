import { Link, useParams } from 'react-router-dom'
import Header from '../components/Layout/Header'
import StatCard from '../components/Cards/StatCard'
import CalibrationChart from '../components/Charts/CalibrationChart'
import PnLChart from '../components/Charts/PnLChart'
import OutcomeChart from '../components/Charts/OutcomeChart'
import LiveEventFeed from '../components/LiveEventFeed'
import { useAgent } from '../hooks/useAgents'
import { useCalibration, usePnLCurve, useOutcomeByType } from '../hooks/useCharts'
import { useTradingStats } from '../hooks/useEvents'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: agent, isLoading } = useAgent(id ?? '')
  const { data: calibration } = useCalibration(id ?? '')
  const { data: pnlCurve } = usePnLCurve(id ?? '')
  const { data: outcomeData } = useOutcomeByType(id ?? '')
  const { data: stats } = useTradingStats(id ?? '')

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

      {/* Trading Stats — hero section */}
      {stats && stats.total_trades > 0 && (
        <div className="grid grid-cols-6 gap-4 mb-6">
          <StatCard
            label="Total PnL"
            value={`$${stats.total_pnl.toFixed(2)}`}
            trend={stats.total_pnl >= 0 ? 'up' : 'down'}
          />
          <StatCard label="Wins" value={stats.wins} trend="up" />
          <StatCard label="Losses" value={stats.losses} trend="down" />
          <StatCard
            label="Win Rate"
            value={`${(stats.win_rate * 100).toFixed(1)}%`}
            trend={stats.win_rate > 0.5 ? 'up' : 'down'}
          />
          <StatCard label="Open Positions" value={stats.open_position_count} />
          <StatCard
            label="Session PnL"
            value={`$${stats.session_pnl.toFixed(2)}`}
            trend={stats.session_pnl >= 0 ? 'up' : 'down'}
          />
        </div>
      )}

      {/* Reputation stats */}
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

      {/* Instrument breakdown */}
      {stats && stats.instruments.length > 0 && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <h3 className="text-xs font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            Performance by Instrument
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#6B6F76] text-xs uppercase tracking-wider border-b border-[#2C2E38]">
                  <th className="text-left pb-2 font-medium">Instrument</th>
                  <th className="text-right pb-2 font-medium">Trades</th>
                  <th className="text-right pb-2 font-medium">Wins</th>
                  <th className="text-right pb-2 font-medium">Losses</th>
                  <th className="text-right pb-2 font-medium">Win Rate</th>
                  <th className="text-right pb-2 font-medium">PnL</th>
                </tr>
              </thead>
              <tbody>
                {stats.instruments.map((inst) => (
                  <tr key={inst.instrument} className="border-b border-[#2C2E38]/50">
                    <td className="py-2 font-mono text-[#EEEEEE]">{inst.instrument}</td>
                    <td className="py-2 text-right text-[#9B9EA3]">{inst.total}</td>
                    <td className="py-2 text-right text-[#77B96C]">{inst.wins}</td>
                    <td className="py-2 text-right text-[#F54E00]">{inst.losses}</td>
                    <td className="py-2 text-right text-[#EEEEEE]">{(inst.win_rate * 100).toFixed(1)}%</td>
                    <td className={`py-2 text-right font-mono ${inst.pnl >= 0 ? 'text-[#77B96C]' : 'text-[#F54E00]'}`}>
                      ${inst.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Open Positions */}
      {stats && stats.open_positions.length > 0 && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <h3 className="text-xs font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            Open Positions ({stats.open_positions.length})
          </h3>
          <div className="space-y-2">
            {stats.open_positions.map((pos) => (
              <div key={pos.cycle_id} className="flex items-center gap-4 px-3 py-2 bg-[#1D1F27] rounded-lg">
                <span className={`text-xs font-mono font-bold ${pos.direction === 'Up' ? 'text-[#77B96C]' : 'text-[#F54E00]'}`}>
                  {pos.direction}
                </span>
                <span className="text-xs font-mono text-[#EEEEEE]">{pos.instrument}</span>
                {pos.entry_price && (
                  <span className="text-xs text-[#9B9EA3]">@{pos.entry_price}</span>
                )}
                {pos.size_usdc && (
                  <span className="text-xs text-[#6B6F76]">${pos.size_usdc}</span>
                )}
                <span className="text-[10px] text-[#6B6F76] ml-auto">
                  {new Date(pos.opened_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {stats && stats.recent_trades.length > 0 && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <h3 className="text-xs font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            Recent Trades
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B6F76] uppercase tracking-wider border-b border-[#2C2E38]">
                  <th className="text-left pb-2 font-medium">Time</th>
                  <th className="text-left pb-2 font-medium">Type</th>
                  <th className="text-left pb-2 font-medium">Instrument</th>
                  <th className="text-left pb-2 font-medium">Direction</th>
                  <th className="text-right pb-2 font-medium">Price</th>
                  <th className="text-right pb-2 font-medium">Size</th>
                  <th className="text-right pb-2 font-medium">PnL</th>
                  <th className="text-left pb-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[#2C2E38]/50">
                    <td className="py-2 font-mono text-[#6B6F76] whitespace-nowrap">
                      {new Date(trade.timestamp).toLocaleString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className={`py-2 font-mono ${
                      trade.event_type === 'execution' ? 'text-[#1D4AFF]' : 'text-[#F7A501]'
                    }`}>
                      {trade.event_type}
                    </td>
                    <td className="py-2 font-mono text-[#EEEEEE]">{trade.instrument}</td>
                    <td className={`py-2 font-mono font-bold ${
                      trade.direction === 'Up' ? 'text-[#77B96C]' : 'text-[#F54E00]'
                    }`}>
                      {trade.direction}
                    </td>
                    <td className="py-2 text-right font-mono text-[#9B9EA3]">
                      {trade.entry_price ?? '—'}
                    </td>
                    <td className="py-2 text-right font-mono text-[#9B9EA3]">
                      {trade.size_usdc ? `$${trade.size_usdc}` : '—'}
                    </td>
                    <td className={`py-2 text-right font-mono ${
                      trade.pnl != null
                        ? trade.pnl >= 0 ? 'text-[#77B96C]' : 'text-[#F54E00]'
                        : 'text-[#6B6F76]'
                    }`}>
                      {trade.pnl != null ? `$${Number(trade.pnl).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2">
                      {trade.result && (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          trade.result === 'WIN' ? 'bg-[#77B96C]/20 text-[#77B96C]' : 'bg-[#F54E00]/20 text-[#F54E00]'
                        }`}>
                          {trade.result}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reputation breakdown */}
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
        {pnlCurve && pnlCurve.length > 0 && (
          <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
            <PnLChart data={pnlCurve} />
          </div>
        )}
        {calibration && calibration.calibration_curve.length > 0 && (
          <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
            <CalibrationChart
              data={calibration.calibration_curve}
              brierScore={calibration.brier_score}
            />
          </div>
        )}
      </div>

      {outcomeData && outcomeData.length > 0 && (
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 mb-6">
          <OutcomeChart data={outcomeData} />
        </div>
      )}

      {/* Live event feed for this agent */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-[#9B9EA3] uppercase tracking-wider mb-4">
          Live Activity
        </h3>
        <LiveEventFeed agentId={id} maxVisible={30} />
      </div>

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
