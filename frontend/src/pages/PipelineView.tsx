import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Layout/Header'
import { useAgent } from '../hooks/useAgents'
import { usePipelineRuns } from '../hooks/useEvents'
import type { EventOutcome, PipelineRun } from '../types/event'

const OUTCOME_COLORS: Record<EventOutcome, { bg: string; text: string; border: string }> = {
  pass: { bg: 'bg-[#0d1117]', text: 'text-[#3fb950]', border: 'border-[#238636]' },
  block: { bg: 'bg-[#0d1117]', text: 'text-[#f85149]', border: 'border-[#da3633]' },
  modify: { bg: 'bg-[#0d1117]', text: 'text-[#d29922]', border: 'border-[#d29922]' },
  win: { bg: 'bg-[#0d1117]', text: 'text-[#3fb950]', border: 'border-[#238636]' },
  loss: { bg: 'bg-[#0d1117]', text: 'text-[#f85149]', border: 'border-[#da3633]' },
  pending: { bg: 'bg-[#0d1117]', text: 'text-[#484f58]', border: 'border-[#21262d]' },
  error: { bg: 'bg-[#0d1117]', text: 'text-[#f85149]', border: 'border-[#da3633]' },
}

const OUTCOME_BADGE: Record<EventOutcome, string> = {
  pass: 'bg-[#238636] text-white',
  block: 'bg-[#da3633] text-white',
  modify: 'bg-[#d29922] text-white',
  win: 'bg-[#3fb950] text-white',
  loss: 'bg-[#f85149] text-white',
  pending: 'bg-[#484f58] text-[#e6edf3]',
  error: 'bg-[#da3633] text-white',
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

  return (
    <div>
      <Header
        title={`Pipeline — ${agent?.display_name ?? 'Agent'}`}
        subtitle={`Decision pipeline traces — ${totalCount.toLocaleString()} runs`}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {['', 'win', 'loss', 'block', 'pass'].map((f) => (
          <button
            key={f}
            onClick={() => { setOutcomeFilter(f); setOffset(0) }}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              outcomeFilter === f
                ? 'bg-[#1f6feb] border-[#1f6feb] text-white'
                : 'border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd]'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Pipeline runs */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-8 text-center">
            <p className="text-[#484f58]">Loading pipeline runs...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-8 text-center">
            <p className="text-[#484f58]">No pipeline runs found. Sync data first.</p>
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#484f58]">
            Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="text-xs px-3 py-1.5 rounded border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd] transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!data?.next}
              className="text-xs px-3 py-1.5 rounded border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd] transition-colors disabled:opacity-40"
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
    <div className={`border rounded-lg ${outcomeStyle.border} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0d1117] hover:bg-[#161b22] transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${OUTCOME_BADGE[run.final_outcome as EventOutcome] ?? OUTCOME_BADGE.pending}`}>
            {run.final_outcome}
          </span>
          <span className="text-sm text-[#e6edf3] font-mono">{run.instrument || '—'}</span>
          <span className="text-xs text-[#484f58]">
            {run.passed_stages}/{run.total_stages} stages
          </span>
          {run.blocked_at_stage && (
            <span className="text-xs text-[#f85149]">
              blocked at {run.blocked_at_stage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {run.duration_ms != null && (
            <span className="text-xs text-[#484f58] font-mono">{run.duration_ms}ms</span>
          )}
          <span className="text-xs text-[#484f58]">
            {new Date(run.started_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </span>
          <span className="text-[#484f58]">{isExpanded ? '−' : '+'}</span>
        </div>
      </button>

      {/* Stage visualization (always visible as mini bar) */}
      <div className="flex h-1">
        {Array.from({ length: run.total_stages }).map((_, i) => {
          let color = 'bg-[#238636]' // pass
          if (i >= run.passed_stages) {
            color = run.blocked_at_stage ? 'bg-[#da3633]' : 'bg-[#484f58]'
          }
          return <div key={i} className={`flex-1 ${color}`} />
        })}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 py-3 bg-[#161b22] border-t border-[#21262d]">
          <div className="grid grid-cols-4 gap-4 text-xs mb-3">
            <div>
              <span className="text-[#484f58]">Cycle ID</span>
              <p className="text-[#e6edf3] font-mono mt-0.5">{run.cycle_id}</p>
            </div>
            <div>
              <span className="text-[#484f58]">Started</span>
              <p className="text-[#e6edf3] mt-0.5">{new Date(run.started_at).toISOString()}</p>
            </div>
            <div>
              <span className="text-[#484f58]">Completed</span>
              <p className="text-[#e6edf3] mt-0.5">
                {run.completed_at ? new Date(run.completed_at).toISOString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-[#484f58]">Duration</span>
              <p className="text-[#e6edf3] mt-0.5">
                {run.duration_ms != null ? `${run.duration_ms}ms` : '—'}
              </p>
            </div>
          </div>

          {/* Event list within pipeline */}
          {run.events && run.events.length > 0 && (
            <div className="space-y-1 mt-3">
              <p className="text-xs text-[#484f58] uppercase tracking-wide mb-2">Events</p>
              {run.events.map((event, idx) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 text-xs py-1.5 border-b border-[#21262d] last:border-0"
                >
                  <span className="text-[#484f58] w-4">{idx + 1}</span>
                  <span className="text-[#7d8590] font-mono w-28">{event.event_type}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${OUTCOME_BADGE[event.outcome] ?? OUTCOME_BADGE.pending}`}>
                    {event.outcome}
                  </span>
                  <span className="text-[#7d8590]">{event.instrument || ''}</span>
                  {event.confidence != null && (
                    <span className="text-[#484f58]">{(event.confidence * 100).toFixed(1)}%</span>
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
