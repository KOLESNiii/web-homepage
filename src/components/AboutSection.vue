<template>
  <section id="about" class="about section">
    <div class="section__head">
      <p v-reveal class="eyebrow">01 / About</p>
      <h2 v-reveal="60" class="section__title">Built low, finished high.</h2>
    </div>

    <div class="about__body">
      <div class="about__copy">
        <p
          v-for="(paragraph, index) in about"
          :key="index"
          v-reveal="120 + index * 80"
          class="lede"
        >
          {{ paragraph }}
        </p>
      </div>

      <dl class="about__stats">
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          v-reveal="160 + index * 80"
          class="stat"
          :style="{ '--stop': stat.colour }"
        >
          <span class="stat__bar" aria-hidden="true"></span>
          <dt class="stat__label">{{ stat.label }}</dt>
          <dd class="stat__value">{{ stat.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
import { about, academics, lines, profile, projects } from '../data/portfolio'

/** Derived from the data so the numbers can't drift out of sync with the page. */
const stats = [
  {
    value: `${academics.average}%`,
    label: `${academics.year} average`,
    colour: lines.central.hex,
  },
  { value: academics.classification, label: 'Classification', colour: lines.victoria.hex },
  { value: String(projects.length), label: 'Projects shipped', colour: lines.district.hex },
  {
    value: profile.graduates.split(' ')[1] ?? '',
    label: 'Graduating',
    colour: lines.elizabeth.hex,
  },
]
</script>

<style scoped>
.about__body {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: clamp(2.5rem, 6vw, 5rem);
  align-items: start;
}

.about__copy .lede + .lede {
  margin-top: 1.6rem;
}

.about__stats {
  display: grid;
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  overflow: hidden;
}

.stat {
  position: relative;
  background: var(--bg);
  padding: 1.35rem 1.5rem;
}

/* Line-colour bar down the edge of each cell, board-style. */
.stat__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--track);
  background: var(--stop);
}

.stat__label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
  margin-bottom: 0.45rem;
}

.stat__value {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4.5vw, 2.4rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
}

@media (max-width: 900px) {
  .about__body {
    grid-template-columns: 1fr;
  }

  .about__stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .about__stats {
    grid-template-columns: 1fr;
  }
}
</style>
