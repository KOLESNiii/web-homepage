<template>
  <MapLine section="about">
    <MapPanel section="about" :stop="0">
      <h2 class="panel-title">Built low, finished high.</h2>
      <p v-for="(paragraph, index) in about" :key="index" class="panel-lede about__para">
        {{ paragraph }}
      </p>
    </MapPanel>

    <MapPanel section="about" :stop="1">
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
import { about, academics, profile, projects } from '../data/portfolio'

/** Derived from the data so the numbers can't drift out of sync with the page. */
const stats = [
  { value: `${academics.average}%`, label: `${academics.year} average` },
  { value: academics.classification, label: 'Classification' },
  { value: String(projects.length), label: 'Projects shipped' },
  { value: profile.graduates.split(' ')[1] ?? '', label: 'Graduating' },
]
</script>

<style scoped>
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
</style>
