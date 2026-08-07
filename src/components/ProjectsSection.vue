<template>
  <MapLine section="work">
    <MapPanel
      v-for="(project, index) in projects"
      :key="project.title"
      section="work"
      :stop="index"
    >
      <p class="project__meta">
        <span class="project__year">{{ project.year }}</span>
        <span class="project__blurb">{{ project.blurb }}</span>
      </p>

      <h2 class="panel-title">{{ project.title }}</h2>
      <p class="panel-body project__description">{{ project.description }}</p>

      <!-- The stack, set out the way a line sets out the stations on it. -->
      <ul class="tech">
        <li v-for="item in project.tech" :key="item" class="tech__item">
          <span class="stop stop--across" aria-hidden="true"></span>
          {{ item }}
        </li>
      </ul>

      <p v-if="project.repo || project.demo" class="project__links">
        <a v-if="project.repo" class="link" :href="project.repo" target="_blank" rel="noopener">
          Source
        </a>
        <a v-if="project.demo" class="link" :href="project.demo" target="_blank" rel="noopener">
          Live
        </a>
      </p>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { projects } from '../data/portfolio'
</script>

<style scoped>
.project__meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.45rem;
}

.project__year {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  color: var(--line-ink);
}

.project__blurb {
  font-size: 0.86rem;
  color: var(--muted);
}

.project__description {
  margin-top: 0.7rem;
}

.tech {
  --stop: var(--line);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.1rem;
  list-style: none;
  margin: 1.1rem 0 0;
  padding: 0;
}

.tech__item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.project__links {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.35rem;
}
</style>
