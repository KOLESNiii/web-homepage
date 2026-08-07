<template>
  <article
    class="panel"
    :class="[`panel--${variant}`, { 'panel--sideways': sideways, 'panel--dense': dense }]"
    :style="style"
    @focusin="onFocus"
  >
    <span class="panel__leader" aria-hidden="true"></span>
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { lineColour, lineInk, sections } from '../data/portfolio'
import { useMap } from '../map/useMap'

/**
 * One panel, pinned to one platform.
 *
 * Panels live in map coordinates inside the transformed plane, so they travel
 * with the diagram rather than with the document. Only the line you are on
 * shows its panels — the rest are faded out and take no clicks, which keeps
 * the diagram readable. They stay in the document and in the tab order,
 * though: tabbing onto one brings the camera to it, so keyboard and screen
 * reader users travel the whole journey rather than one line of it.
 *
 * Three shapes:
 *
 *   card   a boxed panel
 *   bare   its contents, unboxed — for the panel that opens the journey
 *   name   a small boxed label, for stops that are a word long
 */

const props = withDefaults(
  defineProps<{
    section: string
    stop: number
    variant?: 'card' | 'bare' | 'name'
    /** Fine placement adjustment for cards whose content needs extra room. */
    offsetY?: number
    /** Tighter card padding for content-heavy panels that must fit a viewport. */
    dense?: boolean
  }>(),
  { variant: 'card', offsetY: 0, dense: false },
)

const map = useMap()

const index = computed(() => map.indexOf(props.section))
const line = computed(() => sections[index.value]?.line ?? 'victoria')
const platform = computed(() => map.platform(index.value, props.stop))

/** A name sits where a station name sits: just clear of its own tick. */
const NAME_GAP = 20

/** On a run across the map, beside the track would mean on top of it. */
const sideways = computed(() => platform.value?.sideways ?? false)

const style = computed(() => {
  const spot = platform.value
  const { panelGap, panelWidth } = map.metrics.value
  const gap = props.variant === 'name' ? NAME_GAP : panelGap
  const x = spot?.x ?? 0
  const y = spot?.y ?? 0

  return {
    left: `${sideways.value ? x : x + gap}px`,
    top: `${y + (sideways.value ? gap : 0) + props.offsetY}px`,
    // A name is as wide as its word; everything else takes the column width.
    ...(props.variant === 'name' ? { maxWidth: `${panelWidth}px` } : { width: `${panelWidth}px` }),
    '--line': lineColour(line.value),
    '--line-ink': lineInk(line.value),
    '--leader': `${gap + (sideways.value ? props.offsetY : 0)}px`,
  }
})

/**
 * Tabbing onto a panel further along has to bring the camera with it — the
 * page does not scroll, so nothing else would put it on screen.
 */
function onFocus() {
  const target = map.scrollForPlatform(index.value, props.stop)
  if (Math.abs(window.scrollY - target) < map.metrics.value.vh * 0.4) return
  map.cancelFlight()
  window.scrollTo(0, Math.round(target))
}
</script>

<style scoped>
.panel {
  position: absolute;
  transform: translateY(-50%);
  container-type: inline-size;
  padding: clamp(1.4rem, 4cqw, 2rem);
  background: var(--bg-raise);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  pointer-events: auto;
  opacity: 1;
  transition: opacity 0.4s var(--ease);
}

/* Hung below the track rather than beside it, so its top-left corner is the
   thing level with the platform and nothing sits over the line. */
.panel--sideways {
  transform: none;
}

.panel--dense {
  padding: 0.75rem 1.25rem;
}

/*
 * The station tick, drawn long. A stop on a single line is one dash across
 * the track reaching out towards its name — where the name is a whole panel,
 * the dash reaches all the way to it. It straddles the track by a few px at
 * the far end, the way a tick does.
 */
.panel__leader {
  position: absolute;
  right: 100%;
  top: 50%;
  width: calc(var(--leader) + 13px);
  height: var(--track);
  margin-top: calc(var(--track) / -2);
  background: var(--line);
}

/* The same tick, stood up: the track is above the panel now, not beside it. */
.panel--sideways .panel__leader {
  right: auto;
  top: auto;
  bottom: 100%;
  left: calc(var(--track) / -2);
  width: var(--track);
  height: calc(var(--leader) + 13px);
  margin-top: 0;
}

.panel--bare {
  background: transparent;
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
}

/* A station name, boxed: the label a map prints beside a tick, not a panel. */
.panel--name {
  container-type: normal;
  width: max-content;
  padding: 0.4rem 0.7rem;
  border-radius: 7px;
}
</style>
