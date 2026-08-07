<template>
  <MapLine section="path">
    <MapPanel v-for="(entry, index) in timeline" :key="entry.title" section="path" :stop="index">
      <p class="stopcard__meta">
        <span class="stopcard__period">{{ entry.period }}</span>
        <span class="stopcard__kind">{{ entry.kind }}</span>
      </p>
      <h2 class="panel-title">{{ entry.title }}</h2>
      <p class="stopcard__org">{{ entry.org }}</p>
      <p class="panel-body">{{ entry.detail }}</p>
    </MapPanel>

    <!-- Results board: the same information a departure board gives you —
         where it's going, and how it's running. -->
    <MapPanel section="path" :stop="timeline.length">
      <div class="board__head">
        <div>
          <p class="board__eyebrow">{{ academics.year }} results</p>
          <p class="board__prev">{{ academics.previous }}</p>
        </div>
        <div class="board__score">
          <span class="board__average">{{ academics.average }}%</span>
          <span class="board__class">{{ academics.classification }}</span>
        </div>
      </div>

      <ul class="board__rows">
        <li v-for="module in academics.modules" :key="module.code" class="row">
          <span class="row__title">{{ module.title }}</span>
          <span class="row__mark" :style="{ color: markColour(module.mark) }">{{
            module.mark.toFixed(1)
          }}</span>
        </li>
      </ul>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { academics, lineInk, timeline } from '../data/portfolio'

const markColour = (mark: number) => {
  if (mark >= 80) return lineInk('district')
  if (mark >= 70) return lineInk('victoria')
  return 'var(--muted-strong)'
}
</script>

<style scoped>
.stopcard__meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-bottom: 0.5rem;
}

.stopcard__period {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--line-ink);
}

.stopcard__kind {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--faint);
}

.stopcard__org {
  font-size: 0.88rem;
  color: var(--muted);
  margin-bottom: 0.8rem;
}

/* -------------------------------------------------------------------------
   Results board
   ------------------------------------------------------------------------- */

.board__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  margin-bottom: 0.35rem;
  border-bottom: 1px solid var(--rule);
}

.board__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text);
  margin-bottom: 0.3rem;
}

.board__prev {
  font-size: 0.78rem;
  color: var(--muted);
}

.board__score {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.board__average {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 8cqw, 2.2rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
}

.board__class {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tube-district-ink);
}

.board__rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.42rem 0;
  border-bottom: 1px solid var(--rule);
}

.row:last-child {
  border-bottom: 0;
}

.row__title {
  font-size: 0.86rem;
  color: var(--muted-strong);
}

.row__mark {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
</style>
