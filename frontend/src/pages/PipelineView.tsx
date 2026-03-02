import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Layout/Header'
import { useAgent } from '../hooks/useAgents'
import { usePipelineRuns } from '../hooks/useEvents'
import type { EventOutcome, PipelineRun } from '../types/event'

const OUTCOME_COLORS: Record<EventOutcome, { bg: string; text: string; border: string }> = {
  pass: { bg: 'bg-[#22242C]', text: 'text-[#77B96C]', border: 'border-[#4B7A3E]' },
  block: { bg: 'bg-[#22242C]', text: 'text-[#F54E00]', border: 'border-[#DF4313]' },
  modify: { bg: 'bg-[#22242C]', text: 'text-[#F1A82C]', border: 'border-[#F1A82C]' },
  win: { bg: 'bg-[#22242C]', text: 'text-[#77B96C]', border: 'border-[#4B7A3E]' },
  loss: { bg: 'bg-[#22242C]', text: 'text-[#F54E00]', border: 'border-[#DF4313]' },
  pending: { bg: 'bg-[#22242C]', text: 'text-[#6B6F76]', border: 'border-[#2C2E38]' },
  error: { bg: 'bg-[#22242C]', text: 'text-[#F54E00]', border: 'border-[#DF4313]' },
}

const OUTCOME_BADGE: Record<EventOutcome, string> = {
  pass: 'bg-[#4B7A3E] text-white',
  block: 'bg-[#DF4313] text-white',
  modify: 'bg-[#F1A82C] text-white',
  win: 'bg-[#77B96C] text-white',
  loss: 'bg-[#F54E00] text-white',
  pending: 'bg-[#3C3E48] text-[#EEEEEE]',
  error: 'bg-[#DF4313] text-white',
}

export default function PipelineView() {
  const { id } = useParams<{ id: string }>()
  const { data: agent } = useAgent(id ?? '')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data, isLoading } = usePipelineRuns(id ?? '', {
    outcome: outcomeFilter || undefined,
    limit,
    offset,
  })

  const runs = data?.results ?? []
  const totalCount = data?.count ?? 0
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  useEffect(() => { setExpandedRun(null) }, [outcomeFilter, offset])

  return (
    <div>
      <Header
        title={`Pipeline — ${agent?.display_name ?? 'Agent'}`}
        subtitle={`Decision pipeline traces — ${totalCount.toLocaleString()} runs`}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        {['', 'win', 'loss', 'block', 'pass'].map((f) => (
          <button
            key={f}
            onClick={() => { setOutcomeFilter(f); setOffset(0) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              outcomeFilter === f
                ? 'bg-[#1D4AFF] border-[#1D4AFF] text-white'
                : 'border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Pipeline runs */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-10 text-center">
            <p className="text-[#6B6F76]">Loading pipeline runs...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-10 text-center">
            <p className="text-[#6B6F76]">No pipeline runs found. Sync data first.</p>
          </div>
        ) : (
          runs.map((run) => (
            <PipelineRunCard
              key={run.id}
              run={run}
              isExpanded={expandedRun === run.id}
              onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs text-[#6B6F76]">
            Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!data?.next}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PipelineRunCard({
  run,
  isExpanded,
  onToggle,
}: {
  run: PipelineRun
  isExpanded: boolean
  onToggle: () => void
}) {
  const outcomeStyle = OUTCOME_COLORS[run.final_outcome as EventOutcome] ?? OUTCOME_COLORS.pending

  return (
    <div className={`border rounded-xl ${outcomeStyle.border} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#22242C] hover:bg-[#2C2E38]/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${OUTCOME_BADGE[run.final_outcome as EventOutcome] ?? OUTCOME_BADGE.pending}`}>
            {run.final_outcome}
          </span>
          <span className="text-sm text-[#EEEEEE] font-mono">{run.instrument || '—'}</span>
          <span className="text-xs text-[#6B6F76]">
            {run.passed_stages}/{run.total_stages} stages
          </span>
          {run.blocked_at_stage && (
            <span className="text-xs text-[#F54E00]">
              blocked at {run.blocked_at_stage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {run.duration_ms != null && (
            <span className="text-xs text-[#6B6F76] font-mono">{run.duration_ms}ms</span>
          )}
          <span className="text-xs text-[#6B6F76]">
            {new Date(run.started_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </span>
          <span className="text-[#6B6F76]">{isExpanded ? '−' : '+'}</span>
        </div>
      </button>

      {/* Stage visualization */}
      <div className="flex h-1">
        {Array.from({ length: run.total_stages }).map((_, i) => {
          let color = 'bg-[#4B7A3E]'
          if (i >= run.passed_stages) {
            color = run.blocked_at_stage ? 'bg-[#DF4313]' : 'bg-[#3C3E48]'
          }
          return <div key={i} className={`flex-1 ${color}`} />
        })}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-5 py-4 bg-[#1D1F27] border-t border-[#2C2E38]">
          <div className="grid grid-cols-4 gap-4 text-xs mb-4">
            <div>
              <span className="text-[#6B6F76]">Cycle ID</span>
              <p className="text-[#EEEEEE] font-mono mt-0.5">{run.cycle_id}</p>
            </div>
            <div>
              <span className="text-[#6B6F76]">Started</span>
              <p className="text-[#EEEEEE] mt-0.5">{new Date(run.started_at).toISOString()}</p>
            </div>
            <div>
              <span className="text-[#6B6F76]">Completed</span>
              <p className="text-[#EEEEEE] mt-0.5">
                {run.completed_at ? new Date(run.completed_at).toISOString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-[#6B6F76]">Duration</span>
              <p className="text-[#EEEEEE] mt-0.5">
                {run.duration_ms != null ? `${run.duration_ms}ms` : '—'}
              </p>
            </div>
          </div>

          {run.events && run.events.length > 0 && (
            <div className="space-y-1 mt-3">
              <p className="text-xs text-[#6B6F76] uppercase tracking-wider mb-2 font-medium">Events</p>
              {run.events.map((event, idx) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 text-xs py-2 border-b border-[#2C2E38] last:border-0"
                >
                  <span className="text-[#6B6F76] w-4">{idx + 1}</span>
                  <span className="text-[#9B9EA3] font-mono w-28">{event.event_type}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-xs ${OUTCOME_BADGE[event.outcome] ?? OUTCOME_BADGE.pending}`}>
                    {event.outcome}
                  </span>
                  <span className="text-[#9B9EA3]">{event.instrument || ''}</span>
                  {event.confidence != null && (
                    <span className="text-[#6B6F76]">{(event.confidence * 100).toFixed(1)}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
