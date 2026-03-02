import Header from '../components/Layout/Header'

export default function EventExplorer() {
  return (
    <div>
      <Header title="Event Explorer" subtitle="Browse and filter agent events" />

      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-8 text-center">
        <p className="text-[#7d8590] mb-2">Event stream will appear here after bridge sync.</p>
        <p className="text-xs text-[#484f58]">Sprint 2 — Days 4-6</p>
      </div>
    </div>
  )
}
