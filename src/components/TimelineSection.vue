<template>
  <section id="path" class="path section">
    <div class="section__head">
      <p v-reveal class="eyebrow">02 / Path</p>
      <h2 v-reveal="60" class="section__title">Two lines, running together.</h2>
    </div>

    <!-- Line key, as printed in the corner of the map. -->
    <ul v-reveal="90" class="key">
      <li v-for="entry in key" :key="entry.kind" class="key__item">
        <span class="key__bar" :style="{ '--stop': entry.colour }" aria-hidden="true"></span>
        {{ entry.label }}
      </li>
    </ul>

    <ol class="route">
      <span class="route__line route__line--education" aria-hidden="true"></span>
      <span class="route__line route__line--work" aria-hidden="true"></span>

      <li
        v-for="(entry, index) in timeline"
        :key="entry.title"
        v-reveal="index * 80"
        class="stopcard"
        :class="`stopcard--${entry.kind}`"
      >
        <span
          class="stop stopcard__stop"
          :class="{ 'stop--change': entry.interchange }"
          aria-hidden="true"
        ></span>

        <div class="stopcard__body">
          <p class="stopcard__meta">
            <span class="stopcard__period">{{ entry.period }}</span>
            <span class="stopcard__kind">{{ lines[timelineLines[entry.kind]].name }} line</span>
          </p>
          <h3 class="stopcard__title">{{ entry.title }}</h3>
          <p class="stopcard__org">{{ entry.org }}</p>
          <p class="stopcard__detail">{{ entry.detail }}</p>
        </div>
      </li>
    </ol>

    <!-- Results board: the same information a departure board gives you —
         where it's going, and how it's running. -->
    <div v-reveal="80" class="board">
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
          <span class="row__code">{{ module.code }}</span>
          <span class="row__title">{{ module.title }}</span>
          <span class="row__mark" :style="{ color: markColour(module.mark) }">{{
            module.mark.toFixed(2)
          }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { academics, lineColour, lineInk, lines, timeline, timelineLines } from '../data/portfolio'

const key = [
  { kind: 'work', label: 'Work', colour: lineColour(timelineLines.work) },
  { kind: 'education', label: 'Education', colour: lineColour(timelineLines.education) },
]

const markColour = (mark: number) => {
  if (mark >= 80) return lineInk('district')
  if (mark >= 70) return lineInk('victoria')
  return 'var(--muted-strong)'
}
</script>

<style scoped>
.path {
  --accent: var(--tube-central-ink);
  --accent-solid: var(--tube-central);
  /* Where the two tracks sit in the gutter, and how wide that gutter is. */
  --education-x: 8px;
  --work-x: 48px;
  --gutter-width: 5.25rem;
}

/* -------------------------------------------------------------------------
   Line key
   ------------------------------------------------------------------------- */

.key {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  list-style: none;
  margin: 0 0 2.25rem;
  padding: 0;
}

.key__item {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.key__bar {
  width: 1.75rem;
  height: var(--track);
  background: var(--stop);
}

/* -------------------------------------------------------------------------
   The two lines
   ------------------------------------------------------------------------- */

.route {
  position: relative;
  list-style: none;
  margin: 0 0 clamp(3.5rem, 8vw, 5rem);
  padding: 0.5rem 0 1.5rem;
}

/* Each line runs the whole length in its own colour and fades off-diagram at
   both ends, because both of them started before this list and continue past
   it. Neither ever changes colour. */
.route__line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: var(--track);
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 4%, #000 94%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 4%, #000 94%, transparent);
}

.route__line--education {
  left: var(--education-x);
  background: var(--tube-victoria);
}

.route__line--work {
  left: var(--work-x);
  background: var(--tube-central);
}

.stopcard {
  position: relative;
  padding: 0 0 clamp(2.25rem, 5vw, 3.25rem) var(--gutter-width);
}

.stopcard:last-child {
  padding-bottom: 0;
}

/* The station sits on its own line and reaches out towards its label. */
.stopcard__stop {
  position: absolute;
  top: 6px;
  /* Reaches clear of its own track so it reads as a station, not a kink. */
  width: 24px;
}

.stopcard--education .stopcard__stop {
  left: var(--education-x);
  --stop: var(--tube-victoria);
}

.stopcard--work .stopcard__stop {
  left: var(--work-x);
  --stop: var(--tube-central);
}

/* An interchange straddles its line rather than reaching off it. */
.stopcard__stop.stop--change {
  top: 0;
  width: 17px;
}

.stopcard--education .stopcard__stop.stop--change {
  left: calc(var(--education-x) - 5px);
}

.stopcard--work .stopcard__stop.stop--change {
  left: calc(var(--work-x) - 5px);
}

.stopcard__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-bottom: 0.6rem;
}

.stopcard__period {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.stopcard--education .stopcard__period {
  color: var(--tube-victoria-ink);
}

.stopcard--work .stopcard__period {
  color: var(--tube-central-ink);
}

.stopcard__kind {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--faint);
}

.stopcard__title {
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  margin-bottom: 0.2rem;
}

.stopcard__org {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 0.75rem;
}

.stopcard__detail {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--muted-strong);
  max-width: 44rem;
  font-weight: 300;
}

/* -------------------------------------------------------------------------
   Results board
   ------------------------------------------------------------------------- */

/* The board belongs to the education line, so it wears its colour on top. */
.board {
  border: 1px solid var(--rule);
  border-top: var(--track) solid var(--tube-victoria);
  border-radius: var(--radius);
  background: var(--bg-raise);
  overflow: hidden;
}

.board__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1.4rem clamp(1.1rem, 3vw, 1.75rem);
  border-bottom: 1px solid var(--rule);
}

.board__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text);
  margin-bottom: 0.35rem;
}

.board__prev {
  font-size: 0.82rem;
  color: var(--muted);
}

.board__score {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.board__average {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 5vw, 2.6rem);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
}

.board__class {
  font-family: var(--font-mono);
  font-size: 0.7rem;
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
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr) 4.5rem;
  gap: 1rem;
  align-items: baseline;
  padding: 0.7rem clamp(1.1rem, 3vw, 1.75rem);
  border-bottom: 1px solid var(--rule);
  transition: background-color 0.3s var(--ease);
}

.row:last-child {
  border-bottom: 0;
}

.row:hover {
  background: var(--wash);
}

.row__code {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: var(--faint);
}

.row__title {
  font-size: 0.94rem;
  color: var(--muted-strong);
}

.row__mark {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 620px) {
  .path {
    --education-x: 6px;
    --work-x: 36px;
    --gutter-width: 4rem;
  }

  .stopcard__stop {
    width: 20px;
  }

  .row {
    grid-template-columns: minmax(0, 1fr) 4rem;
    row-gap: 0.15rem;
  }

  .row__code {
    grid-column: 1;
    grid-row: 1;
  }

  .row__title {
    grid-column: 1;
    grid-row: 2;
    font-size: 0.88rem;
  }

  .row__mark {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
  }
}
</style>
