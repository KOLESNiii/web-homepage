<template>
  <button class="skip-link" type="button" @click="skip">Skip to the content</button>

  <TubeMap />

  <div class="world" :class="{ 'world--travelling': travelling }">
    <div ref="planeRef" class="world__plane">
      <HeroSection />
      <AboutSection />
      <TimelineSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
    </div>
  </div>

  <SiteNav />

  <!-- The only thing in normal flow: the length of the journey, as scroll. -->
  <div class="rail" :style="{ height: `${railHeight}px` }" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AboutSection from './components/AboutSection.vue'
import ContactSection from './components/ContactSection.vue'
import HeroSection from './components/HeroSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import SiteNav from './components/SiteNav.vue'
import SkillsSection from './components/SkillsSection.vue'
import TimelineSection from './components/TimelineSection.vue'
import TubeMap from './components/TubeMap.vue'
import { useMap } from './map/useMap'

const map = useMap()
const { travelling, railHeight } = map
const planeRef = ref<HTMLElement | null>(null)

const skip = () => map.goTo(map.indexOf('about'))

/** A flight is only ever a courtesy — the moment you steer, it stops. */
const release = () => map.cancelFlight()

onMounted(() => {
  map.setPlane(planeRef.value)

  // The browser would otherwise restore the last scroll position, or try to
  // scroll a section into view — and a section has no box of its own to
  // scroll to. Where the journey starts is ours to decide.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  const landing = map.indexOf(window.location.hash.slice(1))
  if (landing > 0) {
    const target = Math.round(map.scrollForPlatform(landing, 0))
    window.scrollTo(0, target)
    // Chrome makes its own attempt at the hash after load; go again behind it.
    window.addEventListener('load', () => window.scrollTo(0, target), { once: true })
  }

  window.addEventListener('wheel', release, { passive: true })
  window.addEventListener('touchstart', release, { passive: true })
  window.addEventListener('keydown', release)
})

onUnmounted(() => {
  map.setPlane(null)
  window.removeEventListener('wheel', release)
  window.removeEventListener('touchstart', release)
  window.removeEventListener('keydown', release)
})
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
