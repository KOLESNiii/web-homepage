<template>
  <MapLine section="about">
    <MapPanel section="about" :stop="0" variant="bare">
      <h1 class="hero__title">
        <span v-for="word in titleWords" :key="word" class="hero__word">{{ word }}</span>
      </h1>
      <p class="hero__role">
        <span class="hero__rule" aria-hidden="true"></span>
        {{ profile.role }} · {{ profile.place }}
      </p>
    </MapPanel>

    <MapPanel section="about" :stop="1">
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

    <MapPanel section="about" :stop="2">
      <h2 class="panel-title">Built low, finished high.</h2>
      <p v-for="(paragraph, index) in about" :key="index" class="panel-lede about__para">
        {{ paragraph }}
      </p>
    </MapPanel>

    <MapPanel section="about" :stop="3">
      <h2 class="panel-title">The numbers on the board.</h2>
      <dl class="about__stats">
        <div v-for="stat in stats" :key="stat.label" class="stat">
          <span class="stat__bar" aria-hidden="true"></span>
          <dt class="stat__label">{{ stat.label }}</dt>
          <dd class="stat__value">{{ stat.value }}</dd>
        </div>
      </dl>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { about, academics, contact, profile, projects } from '../data/portfolio'
import { useMap } from '../map/useMap'

const map = useMap()
const titleWords = profile.name.split(' ')

/** Derived from the data so the numbers can't drift out of sync with the page. */
const stats = [
  { value: `${academics.average}%`, label: `${academics.year} average` },
  { value: academics.classification, label: 'Classification' },
  { value: String(projects.length), label: 'Projects shipped' },
  { value: profile.graduates.split(' ')[1] ?? '', label: 'Graduating' },
]
</script>

<style scoped>
.hero__title {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.26em;
  margin-bottom: 1.5rem;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 15cqw, 5.4rem);
  font-weight: 200;
  line-height: 0.94;
  letter-spacing: -0.04em;
}

.hero__word {
  display: inline-block;
}

.hero__role {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text);
  font-size: clamp(0.9rem, 3cqw, 1.1rem);
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
  color: var(--tube-district-ink);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hero__degree {
  margin-top: 0.9rem;
  color: var(--muted);
  font-size: 0.85rem;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.75rem;
}

.about__para + .about__para {
  margin-top: 1.1rem;
}

.about__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.stat {
  position: relative;
  background: var(--bg-raise);
  padding: 1.1rem 1.1rem 1.1rem 1.4rem;
}

/* The section's own line, down the edge of the board. Every cell is the same
   colour because it is the same line. */
.stat__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--track);
  background: var(--line);
}

.stat__label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
  margin-bottom: 0.35rem;
}

.stat__value {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 7cqw, 1.9rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
}

@container (max-width: 340px) {
  .about__stats {
    grid-template-columns: 1fr;
  }
}

@container (max-width: 380px) {
  .hero__actions .btn {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
