<template>
  <MapLine section="home">
    <MapPanel section="home" :stop="0" variant="bare">
      <h1 class="hero__title">
        <span v-for="word in titleWords" :key="word" class="hero__word">{{ word }}</span>
      </h1>
      <p class="hero__role">
        <span class="hero__rule" aria-hidden="true"></span>
        {{ profile.role }} · {{ profile.place }}
      </p>
    </MapPanel>

    <MapPanel section="home" :stop="1">
      <p class="hero__status">
        <span class="hero__status-bar" aria-hidden="true"></span>
        <span class="hero__status-name">{{ contact.status }}</span>
      </p>

      <p class="panel-lede">{{ profile.tagline }}</p>

      <p class="hero__degree">{{ profile.degree }} · graduating {{ profile.graduates }}</p>

      <div class="hero__actions">
        <button class="btn btn--primary" type="button" @click="map.goTo(map.indexOf('work'))">
          See the work
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 8h12m0 0-4.5-4.5M14 8l-4.5 4.5" />
          </svg>
        </button>
        <button class="btn btn--ghost" type="button" @click="map.goTo(map.indexOf('contact'))">
          Get in touch
        </button>
      </div>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { contact, profile } from '../data/portfolio'
import { useMap } from '../map/useMap'

const map = useMap()
const titleWords = profile.name.split(' ')
</script>

<style scoped>
.hero__title {
  font-family: var(--font-display);
  font-weight: 200;
  font-size: clamp(2.4rem, 15cqw, 5.4rem);
  line-height: 0.94;
  letter-spacing: -0.04em;
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.26em;
  margin-bottom: 1.5rem;
}

.hero__word {
  display: inline-block;
}

.hero__role {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: clamp(0.9rem, 3cqw, 1.1rem);
  color: var(--text);
  font-weight: 300;
}

.hero__rule {
  flex: none;
  width: clamp(1.75rem, 8cqw, 3rem);
  height: var(--track);
  background: var(--tube-victoria);
}

.hero__status {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1.1rem;
}

.hero__status-bar {
  width: 2.25rem;
  height: var(--track);
  background: var(--tube-district);
}

.hero__status-name {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tube-district-ink);
}

.hero__degree {
  margin-top: 0.9rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.75rem;
}

@container (max-width: 380px) {
  .hero__actions .btn {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
