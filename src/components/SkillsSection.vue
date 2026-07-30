<template>
  <MapLine section="stack">
    <MapPanel v-for="(group, index) in skills" :key="group.label" section="stack" :stop="index">
      <h2 class="panel-title">{{ group.label }}</h2>

      <!-- The items are stations on the same line the panel hangs off, so the
           branch keeps the section's colour all the way along. -->
      <ul class="branch">
        <li v-for="item in group.items" :key="item" class="station">
          <span class="station__track" aria-hidden="true"></span>
          <span class="stop stop--across" aria-hidden="true"></span>
          <span class="station__label">{{ item }}</span>
        </li>
      </ul>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { skills } from '../data/portfolio'
</script>

<style scoped>
.branch {
  --stop: var(--line);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 0.9rem;
  list-style: none;
  margin: 0.9rem 0 0;
  padding: 0;
}

.station {
  display: inline-flex;
  align-items: center;
}

.station__track {
  width: clamp(0.8rem, 3cqw, 1.6rem);
  height: var(--track);
  background: var(--line);
}

.station__label {
  margin: 0 0.35rem 0 0.55rem;
  font-size: 0.88rem;
  color: var(--muted-strong);
  white-space: nowrap;
}

/* Terminus stub, so the branch runs off the panel rather than being cut dead.
   It hangs off the last station rather than being its own item, otherwise it
   can wrap onto a row by itself and read as a stray mark. */
.station:last-child::after {
  content: '';
  width: clamp(0.8rem, 3cqw, 1.6rem);
  height: var(--track);
  margin-left: 0.55rem;
  background: var(--line);
  -webkit-mask-image: linear-gradient(90deg, #000 20%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 20%, transparent 100%);
}
</style>
