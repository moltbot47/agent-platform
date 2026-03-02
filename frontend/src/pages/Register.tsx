import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Layout/Header'
import { useRegisterAgent } from '../hooks/useAgents'
import type { AgentType } from '../types'

const AGENT_TYPES: { value: AgentType; label: string }[] = [
  { value: 'trading', label: 'Trading' },
  { value: 'prediction', label: 'Prediction' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'custom', label: 'Custom' },
]

const STEPS = ['Agent Info', 'Creator', 'Review'] as const
type Step = (typeof STEPS)[number]

export default function Register() {
  const navigate = useNavigate()
  const registerMutation = useRegisterAgent()

  const [step, setStep] = useState<Step>('Agent Info')
  const [apiKey, setApiKey] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [agentType, setAgentType] = useState<AgentType>('trading')
  const [description, setDescription] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [creatorEmail, setCreatorEmail] = useState('')
  const [creatorUrl, setCreatorUrl] = useState('')

  const stepIndex = STEPS.indexOf(step)

  const handleSubmit = () => {
    registerMutation.mutate(
      {
        name,
        display_name: displayName,
        agent_type: agentType,
        description: description || undefined,
        creator_name: creatorName,
        creator_email: creatorEmail || undefined,
        creator_url: creatorUrl || undefined,
      },
      {
        onSuccess: (data) => {
          setApiKey(data.api_key)
        },
      },
    )
  }

  if (apiKey) {
    return (
      <div>
        <Header title="Registration Complete" subtitle="Your agent is live on the platform" />

        <div className="bg-[#0d1117] border border-[#3fb950] rounded-lg p-6 mb-6 max-w-xl">
          <h3 className="text-sm font-medium text-[#3fb950] mb-3 uppercase tracking-wide">
            Your API Key
          </h3>
          <p className="text-xs text-[#7d8590] mb-3">
            Copy this key now — it will not be shown again.
          </p>
          <div className="bg-[#161b22] border border-[#21262d] rounded p-3 font-mono text-sm text-[#e6edf3] break-all select-all">
            {apiKey}
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-6 mb-6 max-w-xl">
          <h3 className="text-sm font-medium text-[#7d8590] mb-3 uppercase tracking-wide">
            Quick Start
          </h3>
          <pre className="text-xs text-[#e6edf3] whitespace-pre-wrap font-mono leading-relaxed bg-[#161b22] border border-[#21262d] rounded p-3">
{`pip install agent-platform-sdk

from agent_platform import AgentClient
client = AgentClient(api_key="${apiKey}")
client.emit("prediction", instrument="BTC-USD", payload={
    "direction": "long",
    "confidence": 0.72
})`}
          </pre>
        </div>

        <button
          onClick={() => navigate('/agents')}
          className="text-sm px-4 py-2 rounded bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors"
        >
          View All Agents
        </button>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Register Agent"
        subtitle="Add your agent to the platform and get an API key"
      />

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                i <= stepIndex
                  ? 'bg-[#1f6feb] text-white'
                  : 'bg-[#21262d] text-[#484f58]'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs ${
                i === stepIndex ? 'text-[#e6edf3]' : 'text-[#484f58]'
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-[#21262d]" />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-xl">
        {/* Step 1: Agent Info */}
        {step === 'Agent Info' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Agent Name (unique identifier)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="polymarket_turbo"
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Polymarket Turbo Strategy"
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Agent Type
              </label>
              <div className="flex gap-2">
                {AGENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAgentType(t.value)}
                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                      agentType === t.value
                        ? 'bg-[#1f6feb] border-[#1f6feb] text-white'
                        : 'border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your agent do?"
                rows={3}
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#388bfd] focus:outline-none resize-none"
              />
            </div>
            <button
              onClick={() => setStep('Creator')}
              disabled={!name || !displayName}
              className="text-sm px-4 py-2 rounded bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Creator Info
            </button>
          </div>
        )}

        {/* Step 2: Creator */}
        {step === 'Creator' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Creator Name
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Your name or handle"
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Email (optional — for API key recovery)
              </label>
              <input
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#7d8590] mb-1.5">
                Profile URL (optional — GitHub, X, website)
              </label>
              <input
                type="url"
                value={creatorUrl}
                onChange={(e) => setCreatorUrl(e.target.value)}
                placeholder="https://github.com/yourname"
                className="w-full bg-[#0d1117] border border-[#21262d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#388bfd] focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('Agent Info')}
                className="text-sm px-4 py-2 rounded border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('Review')}
                disabled={!creatorName}
                className="text-sm px-4 py-2 rounded bg-[#1f6feb] text-white hover:bg-[#388bfd] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'Review' && (
          <div className="space-y-4">
            <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#7d8590]">Name</span>
                <span className="text-[#e6edf3] font-mono">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#7d8590]">Display Name</span>
                <span className="text-[#e6edf3]">{displayName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#7d8590]">Type</span>
                <span className="text-[#e6edf3]">{agentType}</span>
              </div>
              {description && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7d8590]">Description</span>
                  <span className="text-[#e6edf3] text-right max-w-xs">{description}</span>
                </div>
              )}
              <div className="border-t border-[#21262d] pt-3 flex justify-between text-sm">
                <span className="text-[#7d8590]">Creator</span>
                <span className="text-[#e6edf3]">{creatorName}</span>
              </div>
              {creatorEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7d8590]">Email</span>
                  <span className="text-[#e6edf3]">{creatorEmail}</span>
                </div>
              )}
            </div>

            {registerMutation.error && (
              <div className="bg-[#0d1117] border border-[#f85149] rounded-lg p-3 text-sm text-[#f85149]">
                Registration failed. {(registerMutation.error as Error).message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('Creator')}
                className="text-sm px-4 py-2 rounded border border-[#21262d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#388bfd] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={registerMutation.isPending}
                className="text-sm px-4 py-2 rounded bg-[#3fb950] text-white hover:bg-[#2ea043] transition-colors disabled:opacity-40"
              >
                {registerMutation.isPending ? 'Registering...' : 'Register Agent'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
