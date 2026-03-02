import Header from '../components/Layout/Header'

export default function Settings() {
  return (
    <div>
      <Header title="Settings" subtitle="Platform configuration" />

      <div className="max-w-xl space-y-6">
        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            PostHog
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#6B6F76] mb-1.5 font-medium">Project API Key</label>
              <input
                type="text"
                disabled
                placeholder="Configure in .env"
                className="w-full bg-[#1D1F27] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#6B6F76] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B6F76] mb-1.5 font-medium">Host</label>
              <input
                type="text"
                disabled
                placeholder="https://us.posthog.com"
                className="w-full bg-[#1D1F27] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#6B6F76] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5">
          <h3 className="text-sm font-medium text-[#9B9EA3] mb-4 uppercase tracking-wider">
            API
          </h3>
          <p className="text-xs text-[#6B6F76]">
            Backend running at{' '}
            <span className="font-mono text-[#9B9EA3]">{window.location.hostname}:8000</span>
          </p>
          <p className="text-xs text-[#6B6F76] mt-2">
            API docs at{' '}
            <a href="/api/docs/" className="text-[#1D4AFF] hover:text-[#5E8AFF] transition-colors">
              /api/docs/
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
