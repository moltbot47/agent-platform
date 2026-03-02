/**
 * PostHog analytics client for the Agent Platform frontend.
 *
 * Reads configuration from environment variables:
 *   VITE_POSTHOG_KEY  — PostHog project API key
 *   VITE_POSTHOG_HOST — PostHog instance URL (default: https://us.i.posthog.com)
 *
 * Falls back to no-op if key is not set (dev without analytics).
 */

import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY ?? ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let initialized = false

export function initPostHog(): void {
  if (initialized || !POSTHOG_KEY) return
  initialized = true

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
  })
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return
  posthog.capture(event, properties)
}

export function identifyUser(distinctId: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return
  posthog.identify(distinctId, properties)
}

export { posthog }
