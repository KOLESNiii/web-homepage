<template>
  <a class="skip-link" href="#main-content" @click.prevent="skip">Skip to the content</a>

  <TubeMap :blocked="welcome" />

  <main
    id="main-content"
    class="world"
    :class="{ 'world--travelling': travelling, 'world--exploring': exploring }"
    :inert="welcome"
    tabindex="-1"
    aria-describedby="journey-instructions"
  >
    <p id="journey-instructions" class="sr-only">
      <template v-if="exploring">
        Map mode is active. Drag or use the arrow keys to pan, and use the wheel, pinch gesture,
        plus or minus keys to zoom. Content cards remain attached to their stations and their
        links are interactive. Use the line key to focus a section, or resume the guided journey.
      </template>
      <template v-else>
        Scroll to travel through the portfolio. You can also use the section key above to jump
        directly to a line. Every section is available in document order for keyboard and screen
        reader users.
      </template>
    </p>
    <div ref="planeRef" class="world__plane">
      <AboutSection />
      <TimelineSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
    </div>
  </main>

  <SiteNav v-if="!welcome" />
  <MapControls v-if="!welcome" @open-menu="openMenu" />
  <JourneyMenu :open="welcome" @choose="choose" @explore="explore" />

  <!-- The only thing in normal flow: the length of the journey, as scroll. -->
  <div class="rail" :style="{ height: `${railHeight}px` }" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AboutSection from './components/AboutSection.vue'
import ContactSection from './components/ContactSection.vue'
import JourneyMenu from './components/JourneyMenu.vue'
import MapControls from './components/MapControls.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import SiteNav from './components/SiteNav.vue'
import SkillsSection from './components/SkillsSection.vue'
import TimelineSection from './components/TimelineSection.vue'
import TubeMap from './components/TubeMap.vue'
import { usePortfolioAnalytics } from './composables/usePortfolioAnalytics'
import { useMap } from './map/useMap'

const map = useMap()
const { travelling, exploring, railHeight } = map
const planeRef = ref<HTMLElement | null>(null)
const welcome = ref(false)

const skip = () => {
  map.goTo(map.indexOf('about'), 2)
  document.getElementById('main-content')?.focus({ preventScroll: true })
}

async function choose(index: number) {
  welcome.value = false
  map.goTo(index)
  await nextTick()
  document.getElementById('main-content')?.focus({ preventScroll: true })
}

async function explore() {
  welcome.value = false
  map.enterExplore()
  map.focusPlatform(0, 0)
  await nextTick()
  document.querySelector<HTMLElement>('.tube-map')?.focus({ preventScroll: true })
}

function openMenu() {
  map.enterExplore(true)
  welcome.value = true
}

/** A flight is only ever a courtesy — the moment you steer, it stops. */
const release = () => map.cancelFlight()

onMounted(() => {
  map.setPlane(planeRef.value)

  // The browser would otherwise restore the last scroll position, or try to
  // scroll a section into view — and a section has no box of its own to
  // scroll to. Where the journey starts is ours to decide.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  const { pathname, search, hash } = window.location
  const landing = map.indexOf(hash.slice(1))
  if (hash && landing >= 0) {
    // The browser scrolls to the fragment itself, on its own schedule — and a
    // section here is `display: contents`, so it has no box and that lands at
    // the top. Spend the fragment: take it out of the URL so there is nothing
    // left for the browser to aim at, and go where it asked for ourselves.
    // Nothing writes the hash back as you travel, so it was only ever an entry.
    history.replaceState(null, '', pathname + search)
    map.goTo(landing, 0, false)
  } else {
    // The portfolio itself is the landing page: arrive directly at the name,
    // with the route picker available later rather than blocking first paint.
    map.goTo(0, 0, false)
  }

  window.addEventListener('wheel', release, { passive: true })
  window.addEventListener('touchstart', release, { passive: true })
  window.addEventListener('keydown', release)
})

onUnmounted(() => {
  document.documentElement.classList.remove('is-map-exploring')
  map.setPlane(null)
  window.removeEventListener('wheel', release)
  window.removeEventListener('touchstart', release)
  window.removeEventListener('keydown', release)
})

watch(
  exploring,
  (active) => document.documentElement.classList.toggle('is-map-exploring', active),
  { immediate: true, flush: 'sync' },
)

// Register after the map's mount hook so fragment landings are measured as
// their real destination rather than briefly appearing as the default line.
usePortfolioAnalytics({ ...map, paused: welcome })
</script>

<style scoped>
/*
 * Nothing here scrolls. `.world` is a window onto the map and `.world__plane`
 * is the map itself, moved under it by the camera; the panels inside are
 * positioned in map coordinates and travel with it.
 */
.world {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
}

.world__plane {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
}

</style>
