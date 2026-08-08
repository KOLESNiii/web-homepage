import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { capture } from '../analytics'
import {
  academics,
  firstYearAcademics,
  projects,
  sections,
  skillStops,
  timeline,
} from '../data/portfolio'

interface PortfolioAnalyticsState {
  activeIndex: Ref<number>
  platformIndex: Ref<number>
  exploring: Ref<boolean>
  travelling: Ref<boolean>
  paused?: Ref<boolean>
}

type PaneType =
  | 'intro'
  | 'about'
  | 'stats'
  | 'timeline'
  | 'results'
  | 'skill'
  | 'project'
  | 'contact'

interface PaneDescriptor {
  pane_id: string
  pane_type: PaneType
  pane_label: string
}

interface TimedPane {
  sectionIndex: number
  stopIndex: number
  viewMode: 'journey' | 'map'
  trackingMethod: 'active_stop' | 'intersection'
  startedAt: number | null
}

interface TimedSection {
  index: number
  startedAt: number | null
}

const MAP_VISIBILITY_THRESHOLD = 0.6

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const paneDescriptors: Record<string, PaneDescriptor[]> = {
  about: [
    { pane_id: 'about:introduction', pane_type: 'intro', pane_label: 'Introduction' },
    { pane_id: 'about:status', pane_type: 'intro', pane_label: 'Current status' },
    { pane_id: 'about:story', pane_type: 'about', pane_label: 'Built low, finished high.' },
    { pane_id: 'about:stats', pane_type: 'stats', pane_label: 'The numbers on the board.' },
  ],
  path: [
    ...timeline.map((entry) => ({
      pane_id: `path:${slug(entry.title)}`,
      pane_type: 'timeline' as const,
      pane_label: entry.title,
    })),
    ...[academics, firstYearAcademics].map((results) => ({
      pane_id: `path:${slug(`${results.year} results`)}`,
      pane_type: 'results' as const,
      pane_label: `${results.year} results`,
    })),
  ],
  skills: skillStops.map((station) => ({
    pane_id: `skills:${slug(station.item)}`,
    pane_type: 'skill' as const,
    pane_label: station.item,
  })),
  work: projects.map((project) => ({
    pane_id: `work:${slug(project.title)}`,
    pane_type: 'project' as const,
    pane_label: project.title,
  })),
  contact: [
    {
      pane_id: 'contact:open-to-roles',
      pane_type: 'contact',
      pane_label: 'Open to graduate roles.',
    },
    { pane_id: 'contact:ways-through', pane_type: 'contact', pane_label: 'Ways through.' },
    { pane_id: 'contact:end-of-the-line', pane_type: 'contact', pane_label: 'End of the line.' },
  ],
}

/**
 * Measure time spent on each readable pane. Journey mode has one active pane
 * at a time; map mode can show several panes, so it uses actual viewport
 * intersection instead of the last selected station. Hidden-tab and travel
 * time are excluded, and page-exit events bypass PostHog's request queue.
 */
export function usePortfolioAnalytics({
  activeIndex,
  platformIndex,
  exploring,
  travelling,
  paused,
}: PortfolioAnalyticsState) {
  const pauseState = paused ?? ref(false)
  let sectionView: TimedSection | null = null
  let journeyPaneView: TimedPane | null = null
  const mapPaneViews = new Map<string, TimedPane>()
  const paneElements = new Map<string, HTMLElement>()
  let mapObserver: IntersectionObserver | null = null
  let stopWatchers: Array<() => void> = []

  const now = () => performance.now()
  const canTrack = () => !document.hidden && !travelling.value && !pauseState.value
  const paneKey = (sectionIndex: number, stopIndex: number) => `${sectionIndex}:${stopIndex}`

  const sectionProperties = (index: number) => ({
    section_id: sections[index]?.id ?? 'unknown',
    section_label: sections[index]?.label ?? 'Unknown',
    section_index: index,
  })

  function paneProperties(sectionIndex: number, stopIndex: number) {
    const section = sections[sectionIndex]
    const descriptor = section ? paneDescriptors[section.id]?.[stopIndex] : undefined

    return {
      ...sectionProperties(sectionIndex),
      pane_id: descriptor?.pane_id ?? `${section?.id ?? 'unknown'}:${stopIndex}`,
      pane_type: descriptor?.pane_type ?? 'unknown',
      pane_label: descriptor?.pane_label ?? `Pane ${stopIndex + 1}`,
      pane_index: stopIndex,
      // Keep the old names available for existing PostHog breakdowns.
      stop_index: stopIndex,
      stop_number: stopIndex + 1,
    }
  }

  const exitOptions = (reason: string) =>
    reason === 'page_exit' ? { send_instantly: true, transport: 'sendBeacon' as const } : undefined

  function elapsedMilliseconds(startedAt: number) {
    return Math.max(0, Math.round(now() - startedAt))
  }

  function finishSection(reason: string) {
    if (!sectionView || sectionView.startedAt === null) return

    const durationMs = elapsedMilliseconds(sectionView.startedAt)
    if (durationMs > 0) {
      capture(
        'portfolio_section_time',
        {
          ...sectionProperties(sectionView.index),
          duration_ms: durationMs,
          duration_seconds: durationMs / 1000,
          exit_reason: reason,
        },
        exitOptions(reason),
      )
    }
    sectionView.startedAt = null
  }

  function finishPane(view: TimedPane, reason: string) {
    if (view.startedAt === null) return

    const durationMs = elapsedMilliseconds(view.startedAt)
    if (durationMs > 0) {
      capture(
        'portfolio_stop_time',
        {
          ...paneProperties(view.sectionIndex, view.stopIndex),
          view_mode: view.viewMode,
          tracking_method: view.trackingMethod,
          duration_ms: durationMs,
          duration_seconds: durationMs / 1000,
          exit_reason: reason,
        },
        exitOptions(reason),
      )
    }
    view.startedAt = null
  }

  function beginSection(index: number, announce = true) {
    sectionView = { index, startedAt: canTrack() ? now() : null }
    if (announce && canTrack()) capture('portfolio_section_viewed', sectionProperties(index))
  }

  function beginJourneyPane(sectionIndex: number, stopIndex: number, announce = true) {
    journeyPaneView = {
      sectionIndex,
      stopIndex,
      viewMode: 'journey',
      trackingMethod: 'active_stop',
      startedAt: canTrack() ? now() : null,
    }
    if (announce && canTrack()) {
      capture('portfolio_stop_viewed', {
        ...paneProperties(sectionIndex, stopIndex),
        view_mode: 'journey',
        tracking_method: 'active_stop',
      })
    }
  }

  function beginMapPane(sectionIndex: number, stopIndex: number, announce = true) {
    const key = paneKey(sectionIndex, stopIndex)
    if (mapPaneViews.has(key)) return

    mapPaneViews.set(key, {
      sectionIndex,
      stopIndex,
      viewMode: 'map',
      trackingMethod: 'intersection',
      startedAt: canTrack() ? now() : null,
    })
    if (announce && canTrack()) {
      capture('portfolio_stop_viewed', {
        ...paneProperties(sectionIndex, stopIndex),
        view_mode: 'map',
        tracking_method: 'intersection',
      })
    }
  }

  function finishMapPane(sectionIndex: number, stopIndex: number, reason: string) {
    const key = paneKey(sectionIndex, stopIndex)
    const view = mapPaneViews.get(key)
    if (!view) return
    finishPane(view, reason)
    mapPaneViews.delete(key)
  }

  function finishAllMapPanes(reason: string) {
    for (const view of mapPaneViews.values()) finishPane(view, reason)
    mapPaneViews.clear()
  }

  function paneFromElement(element: HTMLElement) {
    const sectionId = element.dataset.paneSection
    const stopIndex = Number(element.dataset.paneIndex)
    const sectionIndex = sections.findIndex((section) => section.id === sectionId)
    if (sectionIndex < 0 || !Number.isInteger(stopIndex) || stopIndex < 0) return null
    return { sectionIndex, stopIndex }
  }

  function isReadableInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const area = rect.width * rect.height
    if (area <= 0) return false

    const visibleWidth = Math.max(
      0,
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0),
    )
    const visibleHeight = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
    )
    const opacity = Number.parseFloat(getComputedStyle(element).opacity)
    return opacity > 0 && (visibleWidth * visibleHeight) / area >= MAP_VISIBILITY_THRESHOLD
  }

  function setMapPaneVisibility(element: HTMLElement, visible: boolean) {
    const pane = paneFromElement(element)
    if (!pane) return

    if (visible && canTrack() && exploring.value) {
      beginMapPane(pane.sectionIndex, pane.stopIndex)
    } else {
      finishMapPane(pane.sectionIndex, pane.stopIndex, 'pane_left_view')
    }
  }

  function syncMapPaneViews() {
    if (!exploring.value || !canTrack()) {
      finishAllMapPanes(pauseState.value ? 'tracking_paused' : 'map_closed')
      return
    }

    for (const element of paneElements.values()) {
      setMapPaneVisibility(element, isReadableInViewport(element))
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      finishAllMapPanes('page_hidden')
      finishJourneyPane('page_hidden')
      finishSection('page_hidden')
      return
    }

    if (!canTrack()) return

    if (exploring.value) {
      void nextTick(syncMapPaneViews)
    } else {
      if (sectionView) {
        sectionView.startedAt = now()
      } else {
        beginSection(activeIndex.value, false)
      }
      if (journeyPaneView) {
        journeyPaneView.startedAt = now()
      } else {
        beginJourneyPane(activeIndex.value, platformIndex.value, false)
      }
    }
  }

  function onPageHide() {
    finishAllMapPanes('page_exit')
    finishJourneyPane('page_exit')
    finishSection('page_exit')
  }

  function finishJourneyPane(reason: string) {
    if (!journeyPaneView) return
    finishPane(journeyPaneView, reason)
    journeyPaneView = null
  }

  onMounted(() => {
    for (const element of document.querySelectorAll<HTMLElement>(
      '[data-pane-section][data-pane-index]',
    )) {
      const pane = paneFromElement(element)
      if (pane) paneElements.set(paneKey(pane.sectionIndex, pane.stopIndex), element)
    }

    mapObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setMapPaneVisibility(
            entry.target as HTMLElement,
            entry.isIntersecting && entry.intersectionRatio >= MAP_VISIBILITY_THRESHOLD,
          )
        }
      },
      { threshold: [0, MAP_VISIBILITY_THRESHOLD] },
    )
    for (const element of paneElements.values()) mapObserver.observe(element)

    stopWatchers = [
      watch([activeIndex, travelling, pauseState, exploring], ([sectionIndex]) => {
        finishSection(travelling.value ? 'travel_started' : 'section_changed')
        if (canTrack() && !exploring.value) beginSection(sectionIndex)
      }),
      watch(
        [activeIndex, platformIndex, travelling, pauseState, exploring],
        ([sectionIndex, stopIndex]) => {
          finishJourneyPane(travelling.value ? 'travel_started' : 'pane_changed')
          if (canTrack() && !exploring.value) beginJourneyPane(sectionIndex, stopIndex)
        },
      ),
      watch(exploring, (isExploring) => {
        if (isExploring) {
          finishJourneyPane('map_opened')
          void nextTick(syncMapPaneViews)
        } else {
          finishAllMapPanes('map_closed')
        }
      }),
      watch(pauseState, (isPaused) => {
        if (isPaused) finishAllMapPanes('tracking_paused')
        else void nextTick(syncMapPaneViews)
      }),
    ]

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    // App performs its initial route selection in its own mount hook. Starting
    // after the first tick guarantees we time that final destination, regardless
    // of lifecycle-hook registration order.
    void nextTick(() => {
      if (canTrack() && !exploring.value) {
        beginSection(activeIndex.value)
        beginJourneyPane(activeIndex.value, platformIndex.value)
      } else {
        syncMapPaneViews()
      }
    })
  })

  onUnmounted(() => {
    stopWatchers.forEach((stop) => stop())
    stopWatchers = []
    mapObserver?.disconnect()
    mapObserver = null
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    finishAllMapPanes('app_unmounted')
    finishJourneyPane('app_unmounted')
    finishSection('app_unmounted')
  })
}
