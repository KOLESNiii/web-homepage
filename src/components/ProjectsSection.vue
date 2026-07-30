<template>
  <!-- Wide viewports: a pinned line you travel along, one station per project. -->
  <section
    v-if="wide"
    id="work"
    ref="sectionRef"
    class="work"
    :style="{ '--steps': steps }"
    aria-labelledby="work-title"
  >
    <div class="work__sticky">
      <div class="work__head">
        <p class="eyebrow">04 / Work</p>
        <h2 id="work-title" class="section__title">{{ heading }}</h2>
      </div>

      <div class="platform">
        <article
          v-for="(project, index) in projects"
          :key="project.title"
          class="plate"
          :class="{ 'is-active': index === activeIndex }"
          :aria-hidden="index !== activeIndex"
          :inert="index !== activeIndex"
        >
          <!-- Platform nameboard: name on a coloured band, as on the wall. -->
          <p class="plate__sign">
            <span class="plate__band" aria-hidden="true"></span>
            <span class="plate__name">{{ project.title }}</span>
            <span class="plate__year">{{ project.year }}</span>
          </p>

          <p class="plate__blurb">{{ project.blurb }}</p>
          <p class="plate__text">{{ project.description }}</p>

          <p class="plate__connections">Connections</p>
          <ul class="tags">
            <li v-for="tech in project.tech" :key="tech" class="tag">{{ tech }}</li>
          </ul>

          <p class="plate__links">
            <a v-if="project.demo" class="link" :href="project.demo" target="_blank" rel="noopener"
              >Live</a
            >
            <a v-if="project.repo" class="link" :href="project.repo" target="_blank" rel="noopener"
              >Source</a
            >
          </p>
        </article>
      </div>

      <!-- The line itself: pans so the current station sits under the pointer. -->
      <div class="strip">
        <span class="strip__pointer" aria-hidden="true"></span>
        <div class="strip__route" :style="routeStyle">
          <button
            v-for="(project, index) in projects"
            :key="project.title"
            type="button"
            class="node"
            :class="{ 'is-active': index === activeIndex }"
            :style="nodeStyle(index)"
            :aria-current="index === activeIndex ? 'true' : undefined"
            @click="jumpTo(index)"
          >
            <span class="node__track" aria-hidden="true"></span>
            <span
              class="stop node__marker"
              :class="index === activeIndex ? 'stop--change' : 'stop--across'"
              aria-hidden="true"
            ></span>
            <span class="node__label">{{ project.title }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Narrow viewports: the same line, stood on its end. -->
  <section v-else id="work" class="work-compact section" aria-labelledby="work-compact-title">
    <div class="section__head">
      <p v-reveal class="eyebrow">04 / Work</p>
      <h2 id="work-compact-title" v-reveal="60" class="section__title">{{ heading }}</h2>
    </div>

    <ol class="vroute">
      <span class="vroute__line" aria-hidden="true"></span>

      <li
        v-for="(project, index) in projects"
        :key="project.title"
        v-reveal="Math.min(index, 3) * 70"
        class="vstop"
      >
        <span class="stop vstop__stop" aria-hidden="true"></span>

        <div class="vstop__body">
          <p class="vstop__meta">
            <span class="vstop__year">{{ project.year }}</span>
            <span class="vstop__index">{{ pad(index + 1) }} / {{ pad(projects.length) }}</span>
          </p>
          <h3 class="vstop__title">{{ project.title }}</h3>
          <p class="vstop__blurb">{{ project.blurb }}</p>
          <p class="vstop__text">{{ project.description }}</p>
          <ul class="tags">
            <li v-for="tech in project.tech" :key="tech" class="tag">{{ tech }}</li>
          </ul>
          <p class="plate__links">
            <a v-if="project.demo" class="link" :href="project.demo" target="_blank" rel="noopener"
              >Live</a
            >
            <a v-if="project.repo" class="link" :href="project.repo" target="_blank" rel="noopener"
              >Source</a
            >
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { projects } from '../data/portfolio'
import { rafThrottle, useReducedMotion } from '../composables/useMotion'

const sectionRef = ref<HTMLElement | null>(null)

const heading = `${projects.length} stations, one line.`

/**
 * The panning strip needs real horizontal room, so below this width we render
 * the vertical route instead. Swapping with `v-if` rather than CSS keeps exactly
 * one `id="work"` on the page for the nav anchor and scroll-spy.
 */
const wheelQuery = window.matchMedia('(min-width: 1024px)')
const wide = ref(wheelQuery.matches)
const onQueryChange = (event: MediaQueryListEvent) => {
  wide.value = event.matches
}

/** Where the scroll actually is, 0…1 across the pinned section. */
const target = ref(0)
/** Eased follower — the strip renders from this, so panning never snaps. */
const eased = ref(0)
const viewportWidth = ref(1440)
const reduced = useReducedMotion()

const steps = projects.length - 1
const pad = (value: number) => String(value).padStart(2, '0')

/** Distance between stations, in px. Also the width of one node. */
const gap = computed(() => Math.min(Math.max(viewportWidth.value * 0.155, 150), 260))

const activeIndex = computed(() => Math.round(eased.value * steps))

/** Slides the route so the eased position lands on the fixed pointer. */
const routeStyle = computed<CSSProperties>(() => ({
  '--gap': `${gap.value}px`,
  transform: `translate3d(${-eased.value * steps * gap.value}px, 0, 0)`,
}))

const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** Stations fade with distance from the pointer. The line's colour never changes. */
function nodeStyle(index: number): CSSProperties {
  const distance = Math.abs(index - eased.value * steps)
  return { opacity: (1 - 0.66 * smoothstep(0, 2.6, distance)).toFixed(3) }
}

let frame = 0

function tick() {
  const difference = target.value - eased.value
  if (Math.abs(difference) < 0.0004) {
    eased.value = target.value
    frame = 0
    return
  }
  eased.value += difference * 0.14
  frame = requestAnimationFrame(tick)
}

function settle() {
  if (reduced.value) {
    eased.value = target.value
    return
  }
  if (!frame) frame = requestAnimationFrame(tick)
}

const onScroll = rafThrottle(() => {
  const section = sectionRef.value
  if (!section) return

  const rect = section.getBoundingClientRect()
  const travel = rect.height - window.innerHeight
  if (travel <= 0) return

  target.value = Math.max(0, Math.min(1, -rect.top / travel))
  settle()
})

const onResize = rafThrottle(() => {
  viewportWidth.value = window.innerWidth
  onScroll()
})

/** Clicking a station scrolls to the point in the pin where it's current. */
function jumpTo(index: number) {
  const section = sectionRef.value
  if (!section) return

  const travel = section.offsetHeight - window.innerHeight
  const top = section.offsetTop + (index / steps) * travel
  window.scrollTo({ top, behavior: reduced.value ? 'auto' : 'smooth' })
}

onMounted(() => {
  viewportWidth.value = window.innerWidth
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  wheelQuery.addEventListener('change', onQueryChange)
  onScroll()
  eased.value = target.value
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  wheelQuery.removeEventListener('change', onQueryChange)
  onScroll.cancel()
  onResize.cancel()
  if (frame) cancelAnimationFrame(frame)
})
</script>

<style scoped>
/* ---------- shared ---------- */

/* Every project is a station on the same line, so there is exactly one colour
   in this section and the track never changes it. */
.work,
.work-compact {
  --accent: var(--tube-elizabeth-ink);
  --accent-solid: var(--tube-elizabeth);
  --stop: var(--tube-elizabeth);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Connections read as little stubs of the line. */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem 0.35rem 0.5rem;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.tag::before {
  content: '';
  width: 14px;
  height: 4px;
  background: var(--stop);
}

.plate__links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  min-height: 1rem;
}

/* ---------- desktop: pinned line ---------- */

.work {
  position: relative;
  /* One viewport to pin, plus dwell time per station. */
  height: calc(100vh + var(--steps) * 42vh);
}

.work__sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.work__head {
  width: 100%;
  max-width: var(--measure);
  margin: 0 auto;
  padding: clamp(6rem, 13vh, 8.5rem) var(--gutter) 0;
}

.platform {
  position: relative;
  flex: 1;
  width: 100%;
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

.plate {
  position: absolute;
  top: 50%;
  width: min(44rem, 68%);
  transform: translateY(-46%);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.4s var(--ease),
    transform 0.55s var(--ease);
}

.plate.is-active {
  opacity: 1;
  transform: translateY(-50%);
  pointer-events: auto;
}

/* Nameboard: colour band, then the name. */
.plate__sign {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  margin-bottom: 0.85rem;
}

.plate__band {
  flex: none;
  width: clamp(2.5rem, 6vw, 4.5rem);
  height: 10px;
  background: var(--stop);
}

.plate__name {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.8vw, 3rem);
  font-weight: 300;
  letter-spacing: -0.035em;
  line-height: 1.02;
}

.plate__year {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  color: var(--faint);
  align-self: flex-end;
  padding-bottom: 0.5rem;
}

.plate__blurb {
  font-size: 1.05rem;
  color: var(--tube-elizabeth-ink);
  font-weight: 300;
  margin-bottom: 1.25rem;
  padding-left: calc(clamp(2.5rem, 6vw, 4.5rem) + 1.1rem);
}

.plate__text {
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--muted-strong);
  font-weight: 300;
  margin-bottom: 1.5rem;
  max-width: 42rem;
}

.plate__connections {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--faint);
  margin-bottom: 0.75rem;
}

/* ---------- the strip ---------- */

.strip {
  position: relative;
  flex: none;
  height: 8.5rem;
  /* Fade the line out at both edges so it reads as continuing off-diagram. */
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}

/* Fixed "you are here" pointer the stations pass beneath. */
.strip__pointer {
  position: absolute;
  left: 50%;
  top: 0.4rem;
  z-index: 3;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid var(--text);
}

.strip__route {
  position: absolute;
  left: 50%;
  top: 2rem;
  display: flex;
  /* Half a station left, so the first marker centres under the pointer. */
  margin-left: calc(var(--gap) / -2);
  will-change: transform;
}

.node {
  position: relative;
  flex: none;
  width: var(--gap);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  color: var(--muted);
  transition: color 0.4s var(--ease);
}

/* One line, one colour: each station owns the length of track to the next. */
.node__track {
  position: absolute;
  left: 50%;
  top: 5px;
  width: 100%;
  height: var(--track);
  background: var(--stop);
}

.node:last-child .node__track {
  -webkit-mask-image: linear-gradient(90deg, #000 15%, transparent 85%);
  mask-image: linear-gradient(90deg, #000 15%, transparent 85%);
}

.node__marker {
  position: relative;
  z-index: 2;
}

.node__label {
  font-size: 0.78rem;
  line-height: 1.25;
  text-align: center;
  max-width: 100%;
  padding: 0 0.4rem;
  transition: color 0.4s var(--ease);
}

.node:hover {
  color: var(--text);
}

.node:hover .stop--across {
  transform: scaleY(1.3);
}

.node.is-active {
  color: var(--text);
}

/* ---------- mobile: vertical route ---------- */

.vroute {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0.5rem 0 1.5rem;
}

.vroute__line {
  position: absolute;
  left: 4px;
  top: 0;
  bottom: 0;
  width: var(--track);
  background: var(--stop);
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 3%, #000 95%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 3%, #000 95%, transparent);
}

.vstop {
  position: relative;
  padding: 0 0 clamp(2.5rem, 6vw, 3.25rem) clamp(2.5rem, 5vw, 3.25rem);
}

.vstop:last-child {
  padding-bottom: 0;
}

.vstop__stop {
  position: absolute;
  left: 4px;
  top: 7px;
  width: 24px;
}

.vstop__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.55rem;
}

.vstop__year {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  color: var(--tube-elizabeth-ink);
}

.vstop__index {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  color: var(--faint);
}

.vstop__title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 6vw, 2rem);
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 0.35rem;
}

.vstop__blurb {
  font-size: 0.92rem;
  color: var(--tube-elizabeth-ink);
  font-weight: 300;
  margin-bottom: 1rem;
}

.vstop__text {
  font-size: 1rem;
  line-height: 1.68;
  color: var(--muted-strong);
  font-weight: 300;
  margin-bottom: 1.25rem;
}

/* Short viewports: the longest descriptions would otherwise run into the strip,
   and the sticky section clips rather than scrolls. */
@media (min-width: 1024px) and (max-height: 880px) {
  .work__head {
    padding-top: 5.25rem;
  }

  .plate__name {
    font-size: clamp(1.7rem, 3.2vw, 2.4rem);
  }

  .plate__blurb {
    font-size: 0.95rem;
    margin-bottom: 1rem;
  }

  .plate__text {
    font-size: 0.98rem;
    line-height: 1.62;
    margin-bottom: 1.2rem;
  }

  .plate__links {
    margin-top: 1.1rem;
  }

  .strip {
    height: 7.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .plate,
  .strip__route,
  .node__marker {
    transition: none;
  }
}
</style>
