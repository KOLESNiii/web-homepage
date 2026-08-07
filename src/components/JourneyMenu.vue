<template>
  <Transition name="arrival">
    <div v-if="open" class="arrival" role="dialog" aria-modal="true" aria-labelledby="arrival-title">
      <section ref="panel" class="arrival__panel" @keydown="trapFocus">
        <p class="arrival__eyebrow">
          <span class="stop stop--change" aria-hidden="true"></span>
          Portfolio network
        </p>

        <h1 id="arrival-title" class="arrival__title">Where would you like to go?</h1>
        <p class="arrival__intro">
          Take the guided route through the work, or open the map and find your own way around.
        </p>

        <div class="arrival__actions">
          <button ref="firstButton" class="arrival__start" type="button" @click="$emit('choose', 0)">
            Start the journey
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 10h14m0 0-5-5m5 5-5 5" />
            </svg>
          </button>
          <button class="arrival__explore" type="button" @click="$emit('explore')">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m3 5 4-2 6 2 4-2v12l-4 2-6-2-4 2V5Zm4-2v12m6-10v12" />
            </svg>
            Explore the map
          </button>
        </div>

        <div class="arrival__divider">
          <span>or choose a line</span>
        </div>

        <nav class="arrival__lines" aria-label="Choose a portfolio section">
          <button
            v-for="(section, index) in sections"
            :key="section.id"
            class="arrival__line"
            type="button"
            :style="{ '--line': lineColour(section.line), '--i': index }"
            @click="$emit('choose', index)"
          >
            <span class="arrival__route" aria-hidden="true">
              <span class="arrival__station"></span>
            </span>
            <span>
              <strong>{{ section.label }}</strong>
              <small>{{ lines[section.line].name }} line</small>
            </span>
          </button>
        </nav>

        <p class="arrival__hint">You can switch between guided travel and map mode at any time.</p>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { lineColour, lines, sections } from '../data/portfolio'

const props = defineProps<{ open: boolean }>()
defineEmits<{
  choose: [index: number]
  explore: []
}>()

const panel = ref<HTMLElement | null>(null)
const firstButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    firstButton.value?.focus({ preventScroll: true })
  },
  { immediate: true },
)

function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const focusable = Array.from(panel.value?.querySelectorAll<HTMLElement>('button') ?? [])
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<style scoped>
.arrival {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  align-items: center;
  padding: max(5.5rem, 9vh) var(--gutter) 2rem;
  pointer-events: auto;
  background: linear-gradient(90deg, color-mix(in srgb, var(--bg) 82%, transparent), transparent 68%);
}

.arrival__panel {
  width: min(32rem, 100%);
  max-height: calc(100dvh - 7.5rem);
  overflow-y: auto;
  padding: clamp(1.5rem, 4vw, 2.4rem);
  background: color-mix(in srgb, var(--bg-raise) 94%, transparent);
  border: 1px solid var(--rule-strong);
  border-radius: 18px;
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
}

.arrival__eyebrow {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1.2rem;
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.arrival__title {
  max-width: 11ch;
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 5.3vw, 4rem);
  font-weight: 250;
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.arrival__intro {
  max-width: 42ch;
  margin-top: 1rem;
  color: var(--muted-strong);
}

.arrival__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.6rem;
}

.arrival__start,
.arrival__explore {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0.72rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.25s var(--ease), border-color 0.25s var(--ease);
}

.arrival__start {
  border: 1px solid var(--text);
  background: var(--text);
  color: var(--bg);
  font-weight: 500;
}

.arrival__explore {
  border: 1px solid var(--rule-strong);
  background: transparent;
  color: var(--text);
}

.arrival__start:hover,
.arrival__explore:hover {
  transform: translateY(-2px);
}

.arrival__explore:hover {
  border-color: var(--tube-victoria-ink);
}

.arrival__actions svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.arrival__divider {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 1.6rem 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
}

.arrival__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--rule);
}

.arrival__lines {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

.arrival__line {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  padding: 0.65rem 0.6rem;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  opacity: 0;
  animation: line-in 0.45s var(--ease) forwards;
  animation-delay: calc(var(--i) * 40ms + 140ms);
}

.arrival__line:hover {
  background: var(--wash);
}

.arrival__route {
  position: relative;
  flex: none;
  width: 2.5rem;
  height: var(--track);
  background: var(--line);
}

.arrival__station {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 17px;
  transform: translate(-50%, -50%);
  background: var(--line);
}

.arrival__line strong,
.arrival__line small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrival__line strong {
  font-size: 0.88rem;
  font-weight: 450;
}

.arrival__line small {
  margin-top: 0.08rem;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--faint);
}

.arrival__hint {
  margin-top: 1.1rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.04em;
  color: var(--faint);
}

.arrival-enter-active,
.arrival-leave-active {
  transition: opacity 0.35s var(--ease);
}

.arrival-enter-active .arrival__panel,
.arrival-leave-active .arrival__panel {
  transition: transform 0.45s var(--ease), opacity 0.3s var(--ease);
}

.arrival-enter-from,
.arrival-leave-to,
.arrival-enter-from .arrival__panel,
.arrival-leave-to .arrival__panel {
  opacity: 0;
}

.arrival-enter-from .arrival__panel,
.arrival-leave-to .arrival__panel {
  transform: translateY(18px);
}

@keyframes line-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 640px) {
  .arrival {
    align-items: end;
    padding: 5rem 0 0;
    background: linear-gradient(0deg, color-mix(in srgb, var(--bg) 92%, transparent), transparent 84%);
  }

  .arrival__panel {
    width: 100%;
    max-height: calc(100dvh - 5rem);
    padding: 1.4rem var(--gutter) max(1.5rem, env(safe-area-inset-bottom));
    border-width: 1px 0 0;
    border-radius: 18px 18px 0 0;
  }

  .arrival__title {
    font-size: clamp(2.1rem, 11vw, 3.2rem);
  }

  .arrival__actions > * {
    flex: 1 1 11rem;
  }
}

@media (max-width: 380px) {
  .arrival__lines { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .arrival__line { opacity: 1; animation: none; }
}
</style>
