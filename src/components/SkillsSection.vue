<template>
  <section id="stack" class="stack section">
    <div class="section__head">
      <p v-reveal class="eyebrow">03 / Stack</p>
      <h2 v-reveal="60" class="section__title">Four lines, and what they call at.</h2>
    </div>

    <div class="stack__lines">
      <div
        v-for="(group, index) in skills"
        :key="group.label"
        v-reveal="index * 90"
        class="line"
        :style="{ '--stop': lines[group.line].hex }"
      >
        <!-- The group name is the line name; each item is a station on it. -->
        <span class="line__name">{{ group.label }}</span>

        <span v-for="item in group.items" :key="item" class="station">
          <span class="station__track" aria-hidden="true"></span>
          <span class="station__stop" aria-hidden="true"></span>
          <span class="station__label">{{ item }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { lines, skills } from '../data/portfolio'
</script>

<style scoped>
.stack {
  --accent: var(--tube-district-ink);
  --accent-solid: var(--tube-district);
}

.stack__lines {
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 5vw, 3rem);
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 1.1rem;
}

/* Line name set the way the map sets it: colour block, plain label. */
.line__name {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: var(--stop);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}

.station {
  display: inline-flex;
  align-items: center;
}

.station__track {
  width: clamp(1rem, 2.5vw, 2rem);
  height: var(--track);
  background: var(--stop);
}

.station__stop {
  width: 13px;
  height: 13px;
  margin-left: -3px;
  border-radius: 50%;
  border: 3px solid var(--stop);
  background: var(--bg);
  transition:
    transform 0.35s var(--ease),
    box-shadow 0.35s var(--ease);
}

.station__label {
  margin-left: 0.55rem;
  font-size: 0.9rem;
  color: var(--muted-strong);
  white-space: nowrap;
  transition: color 0.35s var(--ease);
}

.station:hover .station__stop {
  transform: scale(1.25);
  box-shadow: 0 0 16px color-mix(in srgb, var(--stop) 70%, transparent);
}

.station:hover .station__label {
  color: var(--text);
}

/**
 * Terminus stub, so the line runs off the diagram rather than being cut dead.
 * It hangs off the last station rather than being its own flex item, otherwise
 * it can wrap onto a row by itself and read as a stray mark.
 */
.station:last-child::after {
  content: '';
  width: clamp(1rem, 2.5vw, 2rem);
  height: var(--track);
  margin-left: 0.55rem;
  background: var(--stop);
  -webkit-mask-image: linear-gradient(90deg, #000 20%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 20%, transparent 100%);
}

@media (max-width: 600px) {
  .station__label {
    font-size: 0.82rem;
  }

  .station__track {
    width: 0.75rem;
  }
}
</style>
