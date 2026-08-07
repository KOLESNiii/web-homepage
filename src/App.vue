<template>
  <a class="skip-link" href="#main-content" @click.prevent="skip">Skip to the content</a>

  <TubeMap />

  <main
    id="main-content"
    class="world"
    :class="{ 'world--travelling': travelling }"
    tabindex="-1"
    aria-describedby="journey-instructions"
  >
    <p id="journey-instructions" class="sr-only">
      Scroll to travel through the portfolio. You can also use the section key above to jump
      directly to a line. Every section is available in document order for keyboard and screen
      reader users.
    </p>
    <div ref="planeRef" class="world__plane">
      <HeroSection />
      <AboutSection />
      <TimelineSection />
      <SkillsSection />
      <ProjectsSection />
      <ContactSection />
    </div>
  </main>

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

const skip = () => {
  map.goTo(map.indexOf('about'))
  document.getElementById('main-content')?.focus({ preventScroll: true })
}

/**
 * Land on a deep link. The document is only as tall as the rail, and the rail
 * is only as tall as the journey once the map has measured it — so the first
 * attempt can be clamped by a layout that has not caught up yet, and how many
 * frames that takes is the browser's business. Ask until it takes.
 */
function land(target: number) {
  let tries = 12
  const again = () => {
    if (tries-- <= 0 || Math.abs(window.scrollY - target) < 2) return
    window.scrollTo(0, target)
    requestAnimationFrame(again)
  }
  again()
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
  if (landing > 0) {
    // The browser scrolls to the fragment itself, on its own schedule — and a
    // section here is `display: contents`, so it has no box and that lands at
    // the top. Spend the fragment: take it out of the URL so there is nothing
    // left for the browser to aim at, and go where it asked for ourselves.
    // Nothing writes the hash back as you travel, so it was only ever an entry.
    history.replaceState(null, '', pathname + search)
    land(Math.round(map.scrollForPlatform(landing, 0)))
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
