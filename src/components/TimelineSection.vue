<template>
  <section id="path" class="path section">
    <div class="section__head">
      <p v-reveal class="eyebrow">02 / Path</p>
      <h2 v-reveal="60" class="section__title">Stations so far.</h2>
    </div>

    <ol class="route">
      <li
        v-for="(entry, index) in timeline"
        :key="entry.title"
        v-reveal="index * 80"
        class="stopcard"
        :style="{ '--stop': lines[entry.line].hex, '--stop-ink': lines[entry.line].ink }"
      >
        <span class="stopcard__track" aria-hidden="true"></span>
        <span
          class="stopcard__marker"
          :class="{ 'stopcard__marker--interchange': entry.interchange }"
          aria-hidden="true"
        ></span>

        <div class="stopcard__body">
          <p class="stopcard__meta">
            <span class="stopcard__period">{{ entry.period }}</span>
            <span class="stopcard__kind">{{
              entry.kind === 'education' ? 'Education' : 'Work'
            }}</span>
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
import { academics, lines, timeline } from '../data/portfolio'

const markColour = (mark: number) => {
  if (mark >= 80) return lines.district.ink
  if (mark >= 70) return lines.victoria.ink
  return 'var(--muted-strong)'
}
</script>

<style scoped>
.path {
  --accent: var(--tube-central-ink);
  --accent-solid: var(--tube-central);
}

.route {
  list-style: none;
  margin: 0 0 clamp(3.5rem, 8vw, 5.5rem);
  padding: 0;
}

.stopcard {
  position: relative;
  padding: 0 0 clamp(2.5rem, 5vw, 3.5rem) clamp(2.5rem, 5vw, 3.75rem);
}

/* Each entry owns its length of track, so the line changes colour where the
   thread of the story does. */
.stopcard__track {
  position: absolute;
  left: 5px;
  top: 8px;
  bottom: -8px;
  width: var(--track);
  border-radius: 999px;
  background: var(--stop);
  opacity: 0.22;
  transition: opacity 0.8s var(--ease);
}

.stopcard:last-child .stopcard__track {
  bottom: auto;
  height: 2.5rem;
  /* Terminus: the line fades out rather than stopping dead. */
  -webkit-mask-image: linear-gradient(180deg, #000 30%, transparent 100%);
  mask-image: linear-gradient(180deg, #000 30%, transparent 100%);
}

.stopcard.is-revealed .stopcard__track {
  opacity: 1;
}

.stopcard__marker {
  position: absolute;
  left: 0;
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 4px solid var(--rule-strong);
  background: var(--bg);
  transition:
    border-color 0.7s var(--ease),
    box-shadow 0.7s var(--ease);
}

.stopcard.is-revealed .stopcard__marker {
  border-color: var(--stop);
  box-shadow: 0 0 18px color-mix(in srgb, var(--stop) 55%, transparent);
}

/* Interchange: the white double-ring, exactly as on the map. */
.stopcard__marker--interchange {
  left: -2px;
  top: 2px;
  width: 20px;
  height: 20px;
}

.stopcard.is-revealed .stopcard__marker--interchange {
  border-color: var(--text);
  box-shadow: 0 0 22px color-mix(in srgb, var(--stop) 70%, transparent);
}

.stopcard__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-bottom: 0.7rem;
}

.stopcard__period {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--stop-ink);
}

.stopcard__kind {
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--faint);
}

.stopcard__title {
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  margin-bottom: 0.2rem;
}

.stopcard__org {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 0.8rem;
}

.stopcard__detail {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--muted-strong);
  max-width: 46rem;
  font-weight: 300;
}

/* -------------------------------------------------------------------------
   Results board
   ------------------------------------------------------------------------- */

.board {
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--bg-raise) 75%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  /* Line-colour rule across the top of the board. */
  box-shadow: inset 0 var(--track) 0 -3px var(--tube-central);
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
  background: rgba(255, 255, 255, 0.025);
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
