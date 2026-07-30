<template>
  <article class="panel" :class="{ 'panel--bare': bare }" :style="style" @focusin="onFocus">
    <span class="panel__leader" aria-hidden="true"></span>

    <p v-if="!bare" class="panel__mark">
      <span class="panel__bar" aria-hidden="true"></span>
      {{ lines[line].name }} line
      <span class="panel__stop">{{ String(stop + 1).padStart(2, '0') }}</span>
    </p>

    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { lineColour, lineInk, lines, sections } from '../data/portfolio'
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
 */

const props = defineProps<{
  section: string
  stop: number
  /** Drop the line-and-platform mark — for the panel that opens the journey. */
  bare?: boolean
}>()

const map = useMap()

const index = computed(() => map.indexOf(props.section))
const line = computed(() => sections[index.value]?.line ?? 'victoria')

const style = computed(() => {
  const platform = map.platform(index.value, props.stop)
  const { panelGap, panelWidth } = map.metrics.value
  return {
    left: `${(platform?.x ?? 0) + panelGap}px`,
    top: `${platform?.y ?? 0}px`,
    width: `${panelWidth}px`,
    '--line': lineColour(line.value),
    '--line-ink': lineInk(line.value),
    '--leader': `${panelGap}px`,
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

/*
 * The station tick, drawn long. A stop on a single line is one dash across
 * the track reaching out towards its name — here the name is the whole panel,
 * so the dash reaches all the way to it. It straddles the track by a few px
 * at the far end, the way a tick does.
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

.panel--bare {
  background: transparent;
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
}

.panel__mark {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1.1rem;
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--line-ink);
}

.panel__bar {
  width: 1.6rem;
  height: var(--track);
  background: var(--line);
}

.panel__stop {
  margin-left: auto;
  color: var(--faint);
  letter-spacing: 0.12em;
}
</style>
