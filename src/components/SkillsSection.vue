<template>
  <MapLine section="stack">
    <!-- One stop per skill, close together, the way an inner-city stretch of
         line calls at a station every few hundred yards. The group name labels
         the stretch it opens rather than boxing the ones that follow it. The
         line turns and runs sideways here and there, so a name hangs under the
         track as often as beside it. -->
    <MapPanel
      v-for="(station, index) in skillStops"
      :key="station.item"
      section="stack"
      :stop="index"
      variant="name"
    >
      <p v-if="station.group" class="group">{{ station.group }}</p>
      <p class="name">{{ station.item }}</p>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { skillStops } from '../data/portfolio'
</script>

<style scoped>
/* The first stop of a group carries the group's name above its own, the way a
   map labels the stretch of line a run of stations belongs to. */
.group {
  margin-bottom: 0.25rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--text);
  white-space: nowrap;
}

.name {
  font-size: 1rem;
  line-height: 1.15;
  font-weight: 300;
  color: var(--text);
  white-space: nowrap;
}
</style>
