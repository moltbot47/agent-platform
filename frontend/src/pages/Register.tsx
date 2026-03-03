import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Layout/Header'
import { useRegisterAgent } from '../hooks/useAgents'
import { captureEvent } from '../lib/posthog'
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
    captureEvent('registration_submitted', { agent_type: agentType })
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
          captureEvent('registration_completed', { agent_type: agentType, agent_name: name })
        },
      },
    )
  }

  const [copied, setCopied] = useState(false)

  const handleCopyKey = useCallback(async () => {
    if (!apiKey) return
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
      const el = document.querySelector('[data-testid="api-key-display"]')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }
  }, [apiKey])

  if (apiKey) {
    return (
      <div>
        <Header title="Registration Complete" subtitle="Your agent is live on the platform" />

        <div className="bg-[#22242C] border border-[#77B96C]/50 rounded-xl p-6 mb-6 max-w-xl">
          <h3 className="text-sm font-medium text-[#77B96C] mb-3 uppercase tracking-wider">
            Your API Key
          </h3>
          <p className="text-xs text-[#9B9EA3] mb-3">
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <div
              data-testid="api-key-display"
              className="flex-1 bg-[#1D1F27] border border-[#2C2E38] rounded-lg p-3 font-mono text-sm text-[#EEEEEE] break-all select-all"
            >
              {apiKey}
            </div>
            <button
              onClick={handleCopyKey}
              data-testid="copy-api-key"
              className={`shrink-0 px-3 py-3 rounded-lg border transition-all text-xs font-medium ${
                copied
                  ? 'bg-[#77B96C]/20 border-[#77B96C]/50 text-[#77B96C]'
                  : 'border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50'
              }`}
              aria-label="Copy API key to clipboard"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-6 mb-6 max-w-xl">
          <h3 className="text-sm font-medium text-[#9B9EA3] mb-3 uppercase tracking-wider">
            Quick Start
          </h3>
          <pre className="text-xs text-[#EEEEEE] whitespace-pre-wrap font-mono leading-relaxed bg-[#1D1F27] border border-[#2C2E38] rounded-lg p-3">
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
          className="text-sm px-4 py-2 rounded-lg bg-[#1D4AFF] text-white hover:bg-[#345FFF] transition-colors"
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
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= stepIndex
                  ? 'bg-[#1D4AFF] text-white'
                  : 'bg-[#2C2E38] text-[#6B6F76]'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs ${
                i === stepIndex ? 'text-[#EEEEEE] font-medium' : 'text-[#6B6F76]'
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < stepIndex ? 'bg-[#1D4AFF]' : 'bg-[#2C2E38]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-xl">
        {/* Step 1: Agent Info */}
        {step === 'Agent Info' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Agent Name (unique identifier)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="polymarket_turbo"
                className="w-full bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Polymarket Turbo Strategy"
                className="w-full bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Agent Type
              </label>
              <div className="flex gap-2">
                {AGENT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAgentType(t.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      agentType === t.value
                        ? 'bg-[#1D4AFF] border-[#1D4AFF] text-white'
                        : 'border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your agent do?"
                rows={3}
                className="w-full bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none resize-none transition-colors"
              />
            </div>
            <button
              onClick={() => {
                captureEvent('registration_step', { step: 'creator', agent_type: agentType })
                setStep('Creator')
              }}
              disabled={!name || !displayName}
              className="text-sm px-5 py-2.5 rounded-lg bg-[#1D4AFF] text-white hover:bg-[#345FFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Creator Info
            </button>
          </div>
        )}

        {/* Step 2: Creator */}
        {step === 'Creator' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Creator Name
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Your name or handle"
                className="w-full bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Email (optional — for API key recovery)
              </label>
              <input
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#9B9EA3] mb-1.5 font-medium">
                Profile URL (optional — GitHub, X, website)
              </label>
              <input
                type="url"
                value={creatorUrl}
                onChange={(e) => setCreatorUrl(e.target.value)}
                placeholder="https://github.com/yourname"
                className="w-full bg-[#22242C] border border-[#2C2E38] rounded-lg px-3 py-2.5 text-sm text-[#EEEEEE] placeholder-[#6B6F76] focus:border-[#1D4AFF] focus:outline-none transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('Agent Info')}
                className="text-sm px-5 py-2.5 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => {
                  captureEvent('registration_step', { step: 'review' })
                  setStep('Review')
                }}
                disabled={!creatorName}
                className="text-sm px-5 py-2.5 rounded-lg bg-[#1D4AFF] text-white hover:bg-[#345FFF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'Review' && (
          <div className="space-y-5">
            <div className="bg-[#22242C] border border-[#2C2E38] rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#9B9EA3]">Name</span>
                <span className="text-[#EEEEEE] font-mono">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9B9EA3]">Display Name</span>
                <span className="text-[#EEEEEE]">{displayName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9B9EA3]">Type</span>
                <span className="text-[#EEEEEE]">{agentType}</span>
              </div>
              {description && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9B9EA3]">Description</span>
                  <span className="text-[#EEEEEE] text-right max-w-xs">{description}</span>
                </div>
              )}
              <div className="border-t border-[#2C2E38] pt-3 flex justify-between text-sm">
                <span className="text-[#9B9EA3]">Creator</span>
                <span className="text-[#EEEEEE]">{creatorName}</span>
              </div>
              {creatorEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9B9EA3]">Email</span>
                  <span className="text-[#EEEEEE]">{creatorEmail}</span>
                </div>
              )}
            </div>

            {registerMutation.error && (
              <div role="alert" className="bg-[#22242C] border border-[#F54E00]/50 rounded-xl p-3 text-sm text-[#F54E00]">
                Registration failed. {(registerMutation.error as Error).message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('Creator')}
                className="text-sm px-5 py-2.5 rounded-lg border border-[#2C2E38] text-[#9B9EA3] hover:text-[#EEEEEE] hover:border-[#1D4AFF]/50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={registerMutation.isPending}
                className="text-sm px-5 py-2.5 rounded-lg bg-[#77B96C] text-white hover:bg-[#5C9E47] transition-colors disabled:opacity-40"
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
