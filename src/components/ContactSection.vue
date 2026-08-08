<template>
  <MapLine section="contact">
    <MapPanel section="contact" :stop="0">
      <h2 class="panel-title">{{ contact.heading }}</h2>

      <!-- Service status row, the shape the board uses: line, then how it runs. -->
      <p class="status">
        <span class="status__bar" aria-hidden="true"></span>
        <span class="status__line">Graduate roles</span>
        <span class="status__state">{{ contact.status }}</span>
      </p>

      <p class="panel-body">{{ contact.note }}</p>
    </MapPanel>

    <MapPanel section="contact" :stop="1">
      <h2 class="panel-title">Ways through.</h2>

      <div class="contact__actions">
        <a class="btn btn--primary" :href="`mailto:${profile.email}`">
          {{ profile.email }}
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 8h12m0 0-4.5-4.5M14 8l-4.5 4.5" />
          </svg>
        </a>
        <a class="btn btn--ghost" :href="profile.cv" download>Download CV</a>
      </div>

      <ul class="channels">
        <li v-for="channel in channels" :key="channel.label">
          <a :href="channel.href" target="_blank" rel="noopener noreferrer" class="channel">
            <span class="channel__bar" aria-hidden="true"></span>
            <span class="channel__label">{{ channel.label }}</span>
            <span class="channel__handle">{{ channel.handle }}</span>
          </a>
        </li>
      </ul>
    </MapPanel>

    <MapPanel section="contact" :stop="2">
      <footer class="end">
        <p class="end__title">End of the line.</p>
        <p class="end__note">© {{ year }} {{ profile.name }} · built with Vue</p>
        <button class="link" type="button" @click="map.goTo(0)">Back to the start</button>
      </footer>
    </MapPanel>
  </MapLine>
</template>

<script setup lang="ts">
import MapLine from './MapLine.vue'
import MapPanel from './MapPanel.vue'
import { contact, profile } from '../data/portfolio'
import { useMap } from '../map/useMap'

const map = useMap()
const year = new Date().getFullYear()

const handleOf = (url: string) => url.replace(/\/+$/, '').split('/').pop() || url

const channels = [
  { label: 'GitHub', href: profile.github, handle: `@${handleOf(profile.github)}` },
  { label: 'LinkedIn', href: profile.linkedin, handle: profile.name },
]
</script>

<style scoped>
.status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin: 0.9rem 0 1.1rem;
}

.status__bar {
  width: 2.25rem;
  height: var(--track);
  background: var(--tube-district);
}

.status__line {
  font-size: 0.9rem;
  color: var(--text);
}

.status__state {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tube-district-ink);
}

.contact__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1.1rem 0 1.6rem;
}

.channels {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.channel {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.1rem 1rem 1.5rem;
  background: var(--bg-raise);
  text-decoration: none;
  transition: background-color 0.35s var(--ease);
}

.channel:hover {
  background: var(--bg-sunk);
}

.channel__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--track);
  background: var(--line);
}

.channel__label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.channel__handle {
  margin-left: auto;
  font-size: 0.86rem;
  color: var(--text);
  font-weight: 300;
}

.end__title {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 7cqw, 2rem);
  font-weight: 300;
  letter-spacing: -0.02em;
  margin-bottom: 0.6rem;
}

.end__note {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--faint);
  margin-bottom: 1.2rem;
}

.end .link {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
</style>
