<template>
  <header
    class="legend"
    :class="{ 'legend--open': open }"
    aria-label="Portfolio navigation"
    @keydown.esc="closeSheet"
  >
    <div class="legend__inner">
      <button class="legend__mark" type="button" aria-label="Go to the start" @click="jump(0)">
        <span class="stop stop--change" aria-hidden="true"></span>
        <span class="legend__initials">{{ profile.initials }}</span>
      </button>

      <!-- The key, as printed in the corner of the map: one swatch per line. -->
      <nav class="key" aria-label="Lines">
        <button
          v-for="(section, index) in sections"
          :key="section.id"
          class="key__item"
          type="button"
          :class="{ 'is-active': active === index }"
          :style="{ '--line': lineColour(section.line) }"
          :aria-current="active === index ? 'location' : undefined"
          @click="jump(index)"
        >
          <span class="key__bar" aria-hidden="true"></span>
          <span class="key__label">{{ section.label }}</span>
        </button>
      </nav>

      <div class="legend__tools">
        <button
          class="chip chip--icon"
          type="button"
          :aria-label="theme === 'dark' ? 'Switch to the paper map' : 'Switch to the night map'"
          @click="toggle"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3.2" />
            <path
              d="M8 .8v1.9M8 13.3v1.9M.8 8h1.9M13.3 8h1.9M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"
            />
          </svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.6 9.9A6 6 0 0 1 6.1 2.4a6 6 0 1 0 7.5 7.5Z" />
          </svg>
        </button>

        <a
          class="chip chip--cv"
          :href="profile.cv"
          download
          aria-label="Download curriculum vitae (PDF)"
        >
          <span>CV</span>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1.5v9m0 0 3.2-3.2M8 10.5 4.8 7.3M2 13.5h12" />
          </svg>
        </a>
      </div>

      <button
        ref="toggleButton"
        class="legend__toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="legend-sheet"
        :aria-label="open ? 'Close the key' : 'Open the key'"
        @click="toggleSheet"
      >
        <span></span>
        <span></span>
      </button>
    </div>

    <div
      id="legend-sheet"
      ref="sheet"
      class="sheet"
      :hidden="!open"
      @keydown="trapSheetFocus"
    >
      <p class="sheet__title">Key</p>

      <button
        v-for="(section, index) in sections"
        :key="section.id"
        class="sheet__row"
        type="button"
        :class="{ 'is-active': active === index }"
        :style="{ '--line': lineColour(section.line), '--i': index }"
        @click="jump(index)"
      >
        <span class="sheet__bar" aria-hidden="true"></span>
        <span class="sheet__label">{{ section.label }}</span>
        <span class="sheet__line">{{ lines[section.line].name }}</span>
      </button>

      <a
        class="sheet__cv"
        :href="profile.cv"
        download
        aria-label="Download curriculum vitae (PDF)"
        @click="open = false"
      >
        Download CV
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5v9m0 0 3.2-3.2M8 10.5 4.8 7.3M2 13.5h12" />
        </svg>
      </a>
    </div>
  </header>

  <!-- Where you are, the way the platform tells you. -->
  <p
    class="where"
    :class="{ 'where--away': travelling || exploring }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span class="where__bar" :style="{ background: lineColour(current.line) }" aria-hidden="true" />
    <span class="where__line">{{ lines[current.line].name }} line</span>
    <span class="where__stop">{{ platform + 1 }} / {{ current.stops }}</span>
  </p>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { lineColour, lines, profile, sections } from '../data/portfolio'
import { useMap } from '../map/useMap'
import { useTheme } from '../composables/useTheme'

/**
 * The legend. Every top-level section is a line, so the nav is the thing a map
 * uses to list its lines — a key, not a row of links. Picking one flies the
 * camera to it.
 */

const map = useMap()
const { theme, toggle } = useTheme()

const open = ref(false)
const toggleButton = ref<HTMLButtonElement | null>(null)
const sheet = ref<HTMLElement | null>(null)
const active = map.activeIndex
const platform = map.platformIndex
const travelling = map.travelling
const exploring = map.exploring
const current = computed(() => sections[active.value] ?? sections[0])

function jump(index: number) {
  open.value = false
  if (exploring.value) {
    map.focusPlatform(index, 0)
    return
  }
  map.goTo(index)
}

function toggleSheet() {
  open.value = !open.value
}

function closeSheet() {
  open.value = false
}

function trapSheetFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return

  const focusable = Array.from(
    sheet.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  const current = document.activeElement
  if (event.shiftKey && current === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && current === last) {
    event.preventDefault()
    first.focus()
  }
}

// Lock the page while the sheet is up, otherwise the map moves underneath it.
watch(open, async (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
  if (isOpen) {
    await nextTick()
    sheet.value?.querySelector<HTMLElement>('button, a[href]')?.focus()
  } else {
    toggleButton.value?.focus()
  }
})
</script>

<style scoped>
.legend {
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border-bottom: 1px solid var(--rule);
}

.legend__inner {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 var(--gutter);
  height: 68px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.legend__mark {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  letter-spacing: 0.14em;
  color: var(--text);
  min-height: 44px;
}

/* -------------------------------------------------------------------------
   The key
   ------------------------------------------------------------------------- */

.key {
  display: flex;
  align-items: center;
  gap: 1.35rem;
  margin-left: auto;
}

.key__item {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: 0;
  padding: 0.35rem 0;
  cursor: pointer;
  font-size: 0.84rem;
  color: var(--muted);
  min-height: 44px;
  transition: color 0.3s var(--ease);
}

/* The swatch is the line, at the weight the line is drawn. */
.key__bar {
  width: 1.75rem;
  height: var(--track);
  background: var(--line);
  opacity: 0.55;
  transition:
    opacity 0.3s var(--ease),
    width 0.3s var(--ease);
}

.key__item:hover,
.key__item.is-active {
  color: var(--text);
}

.key__item:hover .key__bar,
.key__item.is-active .key__bar {
  opacity: 1;
}

.key__item.is-active .key__bar {
  width: 2.5rem;
}

/* -------------------------------------------------------------------------
   Tools
   ------------------------------------------------------------------------- */

.legend__tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 44px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.3s var(--ease),
    color 0.3s var(--ease);
}

.chip--icon {
  width: 44px;
  flex: none;
}

.chip--cv {
  padding: 0 0.9rem;
}

.chip svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chip:hover {
  color: var(--tube-victoria-ink);
  border-color: var(--tube-victoria-ink);
}

.legend__toggle {
  display: none;
  width: 44px;
  height: 44px;
  border: 1px solid var(--rule-strong);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.legend__toggle span {
  position: absolute;
  left: 50%;
  width: 16px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: transform 0.35s var(--ease);
}

.legend__toggle span:nth-child(1) {
  transform: translate(-50%, -4px);
}
.legend__toggle span:nth-child(2) {
  transform: translate(-50%, 4px);
}

.legend--open .legend__toggle span:nth-child(1) {
  transform: translate(-50%, 0) rotate(45deg);
}
.legend--open .legend__toggle span:nth-child(2) {
  transform: translate(-50%, 0) rotate(-45deg);
}

.sheet {
  display: none;
}

/* -------------------------------------------------------------------------
   Where you are
   ------------------------------------------------------------------------- */

.where {
  position: fixed;
  left: var(--gutter);
  bottom: 1.35rem;
  z-index: 55;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.85rem 0.5rem 0.6rem;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-strong);
  transition: opacity 0.4s var(--ease);
}

.where--away {
  opacity: 0;
}

.where__bar {
  width: 1.4rem;
  height: var(--track);
}

.where__stop {
  color: var(--faint);
}

/* -------------------------------------------------------------------------
   Narrow: the key as a printed list
   ------------------------------------------------------------------------- */

@media (max-width: 940px) {
  .key,
  .chip--cv {
    display: none;
  }

  .legend__tools {
    margin-left: auto;
  }

  .legend__toggle {
    display: block;
  }

  .legend--open {
    background: var(--bg);
  }

  .sheet {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1.5rem var(--gutter) 2.5rem;
    height: calc(100dvh - 68px);
    background: var(--bg);
    overflow-y: auto;
  }

  .sheet[hidden] {
    display: none;
  }

  .sheet__title {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--faint);
    margin-bottom: 1rem;
  }

  .sheet__row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.85rem 0;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--rule);
    text-align: left;
    cursor: pointer;
    color: var(--muted-strong);
    opacity: 0;
    animation: sheet-in 0.4s var(--ease) forwards;
    animation-delay: calc(var(--i, 0) * 45ms + 50ms);
  }

  .sheet__bar {
    flex: none;
    width: 2.75rem;
    height: var(--track);
    background: var(--line);
  }

  .sheet__label {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 300;
  }

  .sheet__row.is-active {
    color: var(--text);
  }

  .sheet__line {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
  }

  .sheet__cv {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.75rem;
    padding: 1rem 1.25rem;
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text);
    text-decoration: none;
  }

  .sheet__cv svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .where {
    bottom: 0.9rem;
    font-size: 0.58rem;
  }
}

/* A phone-width panel fills the screen, so the chip would sit on top of it.
   The panel's own mark says the same thing, in the same words. */
@media (max-width: 700px) {
  .where {
    display: none;
  }
}

@keyframes sheet-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet__row {
    opacity: 1;
    animation: none;
  }
}
</style>
