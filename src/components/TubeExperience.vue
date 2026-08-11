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
  <div class="rail" :style="{ height: `${railHeight}px` }" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AboutSection from './AboutSection.vue'
import ContactSection from './ContactSection.vue'
import JourneyMenu from './JourneyMenu.vue'
import MapControls from './MapControls.vue'
import ProjectsSection from './ProjectsSection.vue'
import SiteNav from './SiteNav.vue'
import SkillsSection from './SkillsSection.vue'
import TimelineSection from './TimelineSection.vue'
import TubeMap from './TubeMap.vue'
import { usePortfolioAnalytics } from '../composables/usePortfolioAnalytics'
import { useMap } from '../map/useMap'

const map = useMap()
const { travelling, exploring, railHeight } = map
const planeRef = ref<HTMLElement | null>(null)
const welcome = ref(false)
const analyticsPaused = computed(() => welcome.value)

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

const release = () => map.cancelFlight()

onMounted(() => {
  map.setPlane(planeRef.value)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  const { pathname, search, hash } = window.location
  const landing = map.indexOf(hash.slice(1))
  if (hash && landing >= 0) {
    history.replaceState(null, '', pathname + search)
    map.goTo(landing, 0, false)
  } else {
    map.goTo(0, 0, false)
  }

  window.addEventListener('wheel', release, { passive: true })
  window.addEventListener('touchstart', release, { passive: true })
  window.addEventListener('keydown', release)
})

onUnmounted(() => {
  document.documentElement.classList.remove('is-map-exploring')
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto'
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

usePortfolioAnalytics({ ...map, paused: analyticsPaused })
</script>

<style scoped>
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
