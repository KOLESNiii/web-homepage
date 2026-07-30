<template>
  <section id="contact" class="contact section">
    <div class="section__head">
      <p v-reveal class="eyebrow">05 / Contact</p>
      <h2 v-reveal="60" class="section__title">{{ contact.heading }}</h2>
    </div>

    <!-- Service status row, the shape the board uses: line, then how it's running. -->
    <p v-reveal="90" class="status">
      <span class="status__bar" aria-hidden="true"></span>
      <span class="status__line">Graduate roles</span>
      <span class="status__state">{{ contact.status }}</span>
    </p>

    <p v-reveal="130" class="lede contact__lede">{{ contact.note }}</p>

    <div v-reveal="180" class="contact__actions">
      <a class="btn btn--primary" :href="`mailto:${profile.email}`">
        {{ profile.email }}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 8h12m0 0-4.5-4.5M14 8l-4.5 4.5" />
        </svg>
      </a>
      <a class="btn btn--ghost" :href="profile.cv" download>Download CV</a>
    </div>

    <ul v-reveal="230" class="contact__links">
      <li v-for="channel in channels" :key="channel.label">
        <a :href="channel.href" target="_blank" rel="noopener noreferrer" class="channel">
          <span class="channel__bar" aria-hidden="true"></span>
          <span class="channel__label">{{ channel.label }}</span>
          <span class="channel__handle">{{ channel.handle }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { contact, profile } from '../data/portfolio'

const handleOf = (url: string) => url.replace(/\/+$/, '').split('/').pop() || url

const channels = [
  {
    label: 'GitHub',
    href: profile.github,
    handle: `@${handleOf(profile.github)}`,
  },
  {
    label: 'LinkedIn',
    href: profile.linkedin,
    handle: profile.name,
  },
]
</script>

<style scoped>
.contact {
  --accent: var(--tube-bakerloo-ink);
  --accent-solid: var(--tube-bakerloo);
}

.status {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.status__bar {
  width: 3rem;
  height: var(--track);
  background: var(--tube-district);
}

.status__line {
  font-size: 0.95rem;
  color: var(--text);
}

.status__state {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tube-district-ink);
}

.contact__lede {
  max-width: 42rem;
  margin-bottom: 2.5rem;
}

.contact__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-bottom: 3.5rem;
}

.contact__links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: 1px;
  background: var(--rule);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  overflow: hidden;
}

.channel {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.35rem 1.5rem 1.35rem 2rem;
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
  background: var(--accent-solid);
}

.channel__label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.channel__handle {
  margin-left: auto;
  font-size: 0.9rem;
  color: var(--text);
  font-weight: 300;
}

@media (max-width: 560px) {
  .contact__actions .btn {
    flex: 1 1 100%;
    justify-content: center;
  }

  .channel__handle {
    font-size: 0.82rem;
  }
}
</style>
