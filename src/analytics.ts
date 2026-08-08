import posthog, { type CaptureOptions } from 'posthog-js'

const projectToken = import.meta.env.VITE_POSTHOG_KEY?.trim()

export const analyticsEnabled = Boolean(projectToken)

/**
 * Start anonymous product analytics when a PostHog project token is present.
 * The SDK handles pageviews, page leaves, click autocapture, heatmaps, and
 * session replay. Input contents are masked before replay data is sent.
 */
export function initAnalytics() {
  if (!projectToken) return

  posthog.init(projectToken, {
    api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com',
    defaults: '2026-05-30',
    autocapture: true,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_heatmaps: true,
    session_recording: {
      maskAllInputs: true,
    },
    person_profiles: 'identified_only',
  })
}

export function capture(
  event: string,
  properties?: Record<string, unknown>,
  options?: CaptureOptions,
) {
  if (!analyticsEnabled) return
  posthog.capture(event, properties, options)
}
