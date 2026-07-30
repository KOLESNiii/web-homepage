<template>
  <a class="skip-link" href="#about">Skip to content</a>

  <TubeMap />
  <SiteNav />

  <main class="shell">
    <HeroSection />
    <AboutSection />
    <TimelineSection />
    <SkillsSection />
    <ProjectsSection />
    <ContactSection />
  </main>

  <SiteFooter />
</template>

<script setup lang="ts">
import AboutSection from './components/AboutSection.vue'
import ContactSection from './components/ContactSection.vue'
import HeroSection from './components/HeroSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import SiteNav from './components/SiteNav.vue'
import SkillsSection from './components/SkillsSection.vue'
import TimelineSection from './components/TimelineSection.vue'
import TubeMap from './components/TubeMap.vue'
</script>

<style scoped>
.shell {
  position: relative;
  z-index: 1;
}
</style>
