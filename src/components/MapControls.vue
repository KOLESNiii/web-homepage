<template>
  <aside class="map-tools" :class="{ 'map-tools--exploring': exploring }" aria-label="Map controls">
    <template v-if="exploring">
      <p class="map-tools__mode"><span aria-hidden="true"></span> Map mode</p>
      <div class="map-tools__zoom" role="group" aria-label="Zoom controls">
        <button type="button" aria-label="Zoom out" @click="map.zoomBy(0.78)">−</button>
        <button class="map-tools__fit" type="button" @click="map.fitOverview">Fit</button>
        <button type="button" aria-label="Zoom in" @click="map.zoomBy(1.28)">+</button>
      </div>
      <button class="map-tools__action" type="button" @click="$emit('open-menu')">
        Journey menu
      </button>
      <button class="map-tools__action map-tools__action--primary" type="button" @click="resume">
        Resume journey
      </button>
      <p class="map-tools__hint">Drag to pan · zoom in to read the station cards</p>
    </template>

    <button v-else class="map-tools__explore" type="button" @click="startExplore">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m3 5 4-2 6 2 4-2v12l-4 2-6-2-4 2V5Zm4-2v12m6-10v12" />
      </svg>
      Explore map
    </button>
  </aside>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { useMap } from '../map/useMap'

defineEmits<{ 'open-menu': [] }>()

const map = useMap()
const exploring = map.exploring

function resume() {
  map.goTo(map.activeIndex.value, map.platformIndex.value)
}

async function startExplore() {
  map.enterExplore()
  await nextTick()
  document.querySelector<HTMLElement>('.tube-map')?.focus({ preventScroll: true })
}
</script>

<style scoped>
.map-tools {
  position: fixed;
  right: var(--gutter);
  bottom: 1.25rem;
  z-index: 58;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-mono);
}

.map-tools--exploring {
  padding: 0.55rem;
  border: 1px solid var(--rule-strong);
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-raise) 92%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.map-tools__mode {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.45rem;
  font-size: 0.6rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--muted);
}

.map-tools__mode span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tube-district);
}

.map-tools__zoom {
  display: flex;
  height: 38px;
  overflow: hidden;
  border: 1px solid var(--rule-strong);
  border-radius: 9px;
}

.map-tools__zoom button,
.map-tools__action,
.map-tools__explore {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: var(--text);
}

.map-tools__zoom button {
  min-width: 38px;
  padding: 0 0.55rem;
  font-size: 1.05rem;
}

.map-tools__zoom button + button {
  border-left: 1px solid var(--rule);
}

.map-tools__zoom .map-tools__fit {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.map-tools__zoom button:hover,
.map-tools__action:hover {
  background: var(--wash);
}

.map-tools__action {
  min-height: 38px;
  padding: 0 0.8rem;
  border: 1px solid var(--rule-strong);
  border-radius: 9px;
  font-size: 0.62rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.map-tools__action--primary {
  border-color: var(--text);
  background: var(--text);
  color: var(--bg);
}

.map-tools__action--primary:hover {
  background: var(--text);
}

.map-tools__hint {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.55rem);
  width: max-content;
  padding: 0.35rem 0.55rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  font-size: 0.55rem;
  color: var(--faint);
}

.map-tools__explore {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0 0.95rem;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.map-tools__explore:hover {
  border-color: var(--tube-victoria-ink);
  color: var(--tube-victoria-ink);
}

.map-tools__explore svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 760px) {
  .map-tools {
    right: 0.8rem;
    bottom: max(0.8rem, env(safe-area-inset-bottom));
  }

  .map-tools--exploring {
    display: grid;
    grid-template-columns: auto 1fr 1fr;
    max-width: calc(100vw - 1.6rem);
  }

  .map-tools__mode { display: none; }
  .map-tools__zoom { grid-column: 1 / -1; }
  .map-tools__zoom button { flex: 1; }
  .map-tools__action { white-space: nowrap; }
  .map-tools__hint { display: none; }
}
</style>
