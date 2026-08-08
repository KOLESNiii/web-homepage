import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import { capture } from '../analytics'
import { sections } from '../data/portfolio'

interface PortfolioAnalyticsState {
  activeIndex: Ref<number>
  platformIndex: Ref<number>
  exploring: Ref<boolean>
}

interface TimedView {
  index: number
  startedAt: number | null
}

/**
 * Measure deliberate time at each line and station. Time while the page is in
 * the background is excluded, and the final interval is sent on page exit.
 */
export function usePortfolioAnalytics({
  activeIndex,
  platformIndex,
  exploring,
}: PortfolioAnalyticsState) {
  let sectionView: TimedView | null = null
  let stopView: TimedView | null = null
  let stopSectionIndex = activeIndex.value
  let stopMode = exploring.value ? 'map' : 'journey'
  let stopWatchers: Array<() => void> = []

  const now = () => performance.now()
  const sectionProperties = (index: number) => ({
    section_id: sections[index]?.id ?? 'unknown',
    section_label: sections[index]?.label ?? 'Unknown',
    section_index: index,
  })

  function finishSection(reason: string) {
    if (!sectionView || sectionView.startedAt === null) return
    const durationSeconds = (now() - sectionView.startedAt) / 1000
    if (durationSeconds >= 0.25) {
      capture('portfolio_section_time', {
        ...sectionProperties(sectionView.index),
        duration_seconds: Number(durationSeconds.toFixed(2)),
        exit_reason: reason,
      })
    }
    sectionView.startedAt = null
  }

  function finishStop(reason: string) {
    if (!stopView || stopView.startedAt === null) return
    const durationSeconds = (now() - stopView.startedAt) / 1000
    if (durationSeconds >= 0.25) {
      capture('portfolio_stop_time', {
        ...sectionProperties(stopSectionIndex),
        stop_index: stopView.index,
        stop_number: stopView.index + 1,
        view_mode: stopMode,
        duration_seconds: Number(durationSeconds.toFixed(2)),
        exit_reason: reason,
      })
    }
    stopView.startedAt = null
  }

  function beginSection(index: number, announce = true) {
    sectionView = { index, startedAt: document.hidden ? null : now() }
    if (announce) capture('portfolio_section_viewed', sectionProperties(index))
  }

  function beginStop(sectionIndex: number, stopIndex: number, announce = true) {
    stopSectionIndex = sectionIndex
    stopMode = exploring.value ? 'map' : 'journey'
    stopView = { index: stopIndex, startedAt: document.hidden ? null : now() }
    if (announce) {
      capture('portfolio_stop_viewed', {
        ...sectionProperties(sectionIndex),
        stop_index: stopIndex,
        stop_number: stopIndex + 1,
        view_mode: stopMode,
      })
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      finishStop('page_hidden')
      finishSection('page_hidden')
      return
    }

    if (sectionView) sectionView.startedAt = now()
    if (stopView) stopView.startedAt = now()
  }

  function onPageHide() {
    finishStop('page_exit')
    finishSection('page_exit')
  }

  onMounted(() => {
    beginSection(activeIndex.value)
    beginStop(activeIndex.value, platformIndex.value)

    stopWatchers = [
      watch(activeIndex, (index) => {
        finishSection('section_changed')
        beginSection(index)
      }),
      watch([activeIndex, platformIndex, exploring], ([sectionIndex, stopIndex]) => {
        finishStop('stop_changed')
        beginStop(sectionIndex, stopIndex)
      }),
    ]

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
  })

  onUnmounted(() => {
    stopWatchers.forEach((stop) => stop())
    stopWatchers = []
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    finishStop('app_unmounted')
    finishSection('app_unmounted')
  })
}
