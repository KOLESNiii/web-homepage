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

    <!-- Results boards: the same information a departure board gives you —
         where it's going, and how it's running. -->
    <MapPanel
      v-for="(results, index) in resultBoards"
      :key="results.year"
      section="path"
      :stop="timeline.length + index"
      :offset-y="index === 0 ? -48 : 44"
      dense
    >
      <div class="results-board">
        <div class="board__head">
          <div>
            <p class="board__eyebrow">{{ results.year }} results</p>
          </div>
          <div class="board__score">
            <span class="board__average">{{ results.average.toFixed(2) }}%</span>
            <span v-if="results.classification" class="board__class">{{
              results.classification
            }}</span>
          </div>
        </div>

        <p v-if="results.recognition" class="board__recognition">{{ results.recognition }}</p>

        <ul class="board__rows">
          <li v-for="module in results.modules" :key="module.title" class="row">
            <div class="row__main">
              <span class="row__title">{{ module.title }}</span>
              <span class="row__mark" :style="{ color: markColour(module.mark) }">{{
                formatMark(module.mark)
              }}</span>
            </div>
            <div v-if="module.grade || module.registrationStatus" class="row__details">
              <span v-if="module.grade">{{ module.grade }}</span>
              <span v-if="module.registrationStatus">{{ module.registrationStatus }}</span>
            </div>
          </li>
        </ul>
      </div>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { academics, firstYearAcademics, lineInk, timeline } from '../data/portfolio'

const resultBoards = [academics, firstYearAcademics]

const formatMark = (mark: number | string) => (typeof mark === 'number' ? mark.toFixed(2) : mark)

const markColour = (mark: number | string) => {
  if (typeof mark !== 'number') return lineInk('district')
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
  font-size: 0.82rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text);
  margin-bottom: 0.3rem;
}

.board__score {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}

.board__average {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 9cqw, 2.6rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
}

.board__class {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--tube-district-ink);
}

.board__recognition {
  margin: 0.9rem 0 0.8rem;
  padding: 0.45rem 0 0.65rem;
  border-bottom: 2px solid var(--line);
  font-family: var(--font-display);
  font-size: clamp(1rem, 4cqw, 1.3rem);
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--text);
}

.board__rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.row {
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--rule);
}

.row:last-child {
  border-bottom: 0;
}

.row__main {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.row__title {
  font-size: 0.98rem;
  color: var(--muted-strong);
}

.row__mark {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}

.row__details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.85rem;
  margin-top: 0.12rem;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.03em;
}
</style>
