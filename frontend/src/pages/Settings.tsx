import Header from '../components/Layout/Header'

export default function Settings() {
  return (
    <div>
      <Header title="Settings" subtitle="Platform configuration" />

      <div className="max-w-xl space-y-6">
        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[#7d8590] mb-3 uppercase tracking-wide">
            PostHog
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#484f58] mb-1">Project API Key</label>
              <input
                type="text"
                disabled
                placeholder="Configure in .env"
                className="w-full bg-[#161b22] border border-[#21262d] rounded px-3 py-2 text-sm text-[#484f58] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-[#484f58] mb-1">Host</label>
              <input
                type="text"
                disabled
                placeholder="https://us.posthog.com"
                className="w-full bg-[#161b22] border border-[#21262d] rounded px-3 py-2 text-sm text-[#484f58] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[#7d8590] mb-3 uppercase tracking-wide">
            API
          </h3>
          <p className="text-xs text-[#484f58]">
            Backend running at{' '}
            <span className="font-mono text-[#7d8590]">{window.location.hostname}:8000</span>
          </p>
          <p className="text-xs text-[#484f58] mt-1">
            API docs at{' '}
            <a href="/api/docs/" className="text-[#58a6ff] hover:underline">
              /api/docs/
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
