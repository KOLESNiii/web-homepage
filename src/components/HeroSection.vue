<template>
  <section id="top" class="hero">
    <div class="hero__inner" :style="parallax">
      <p class="hero__status">
        <span class="hero__status-bar" aria-hidden="true"></span>
        <span class="hero__status-name">{{ contact.status }}</span>
        <span class="hero__status-note"
          >{{ profile.degree }} · graduating {{ profile.graduates }}</span
        >
      </p>

      <h1 class="hero__title">
        <span
          v-for="(word, index) in titleWords"
          :key="word"
          class="hero__word"
          :style="{ '--i': index }"
          >{{ word }}</span
        >
      </h1>

      <p class="hero__role">
        <span class="hero__role-line" aria-hidden="true"></span>
        {{ profile.role }} · {{ profile.place }}
      </p>

      <p class="hero__tagline">{{ profile.tagline }}</p>

      <div class="hero__actions">
        <a class="btn btn--primary" href="#work">
          See the work
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 8h12m0 0-4.5-4.5M14 8l-4.5 4.5" />
          </svg>
        </a>
        <a class="btn btn--ghost" href="#contact">Get in touch</a>
      </div>
    </div>

    <!-- Platform sign: the whole site as one line, one colour, five stations. -->
    <div class="calls">
      <p class="calls__label">This line calls at</p>
      <div class="calls__route" :style="{ '--n': sections.length }">
        <span class="calls__track" aria-hidden="true"></span>
        <a
          v-for="section in sections"
          :key="section.id"
          class="calls__stop"
          :href="`#${section.id}`"
        >
          <span class="stop stop--across calls__marker" aria-hidden="true"></span>
          <span class="calls__name">{{ section.label }}</span>
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { contact, profile, sections } from '../data/portfolio'
import { rafThrottle, useReducedMotion } from '../composables/useMotion'

const titleWords = profile.name.split(' ')
const offset = ref(0)
const reduced = useReducedMotion()

// Hero drifts up and dims as you scroll past it — cheap depth, no library.
const parallax = computed(() => {
  if (reduced.value) return undefined
  return {
    transform: `translate3d(0, ${offset.value * 80}px, 0)`,
    opacity: String(Math.max(0, 1 - offset.value * 1.4)),
  }
})

const onScroll = rafThrottle(() => {
  offset.value = Math.min(1, window.scrollY / Math.max(window.innerHeight, 1))
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  onScroll.cancel()
})
</script>

<style scoped>
.hero {
  --stop: var(--tube-victoria);
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: var(--measure);
  margin: 0 auto;
  padding: 8rem var(--gutter) 11rem;
}

.hero__inner {
  position: relative;
  z-index: 1;
  will-change: transform, opacity;
}

/* -------------------------------------------------------------------------
   Service status row — the board's own layout: colour bar, line, status
   ------------------------------------------------------------------------- */

.hero__status {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-bottom: 2.25rem;
  opacity: 0;
  animation: rise 0.8s var(--ease) 0.1s forwards;
}

.hero__status-bar {
  width: 2.5rem;
  height: var(--track);
  background: var(--tube-district);
}

.hero__status-name {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tube-district-ink);
}

.hero__status-note {
  font-size: 0.82rem;
  color: var(--muted);
}

.hero__title {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(2.6rem, 9vw, 7rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  margin-bottom: 1.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.28em;
}

.hero__word {
  display: inline-block;
  opacity: 0;
  animation: rise 0.9s var(--ease) forwards;
  animation-delay: calc(0.22s + var(--i) * 0.11s);
}

.hero__role {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: clamp(0.95rem, 2.2vw, 1.2rem);
  font-weight: 300;
  color: var(--text);
  margin-bottom: 0.9rem;
  opacity: 0;
  animation: rise 0.8s var(--ease) 0.5s forwards;
}

.hero__role-line {
  flex: none;
  width: clamp(2rem, 7vw, 3.5rem);
  height: var(--track);
  background: var(--stop);
}

.hero__tagline {
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  color: var(--muted);
  font-weight: 300;
  max-width: 36rem;
  margin-bottom: 2.5rem;
  padding-left: calc(clamp(2rem, 7vw, 3.5rem) + 1rem);
  opacity: 0;
  animation: rise 0.8s var(--ease) 0.62s forwards;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  padding-left: calc(clamp(2rem, 7vw, 3.5rem) + 1rem);
  opacity: 0;
  animation: rise 0.8s var(--ease) 0.74s forwards;
}

/* -------------------------------------------------------------------------
   Calls-at strip
   ------------------------------------------------------------------------- */

.calls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.5rem;
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 var(--gutter);
  opacity: 0;
  animation: rise 0.9s var(--ease) 1s forwards;
}

.calls__label {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--faint);
  margin-bottom: 1.5rem;
}

.calls__route {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  align-items: start;
}

.calls__track {
  position: absolute;
  left: calc(100% / var(--n) / 2);
  right: calc(100% / var(--n) / 2);
  top: 5px;
  height: 5px;
  background: var(--stop);
}

.calls__stop {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding-top: 0;
  text-decoration: none;
  color: var(--muted);
  font-size: 0.8rem;
  transition: color 0.3s var(--ease);
}

.calls__marker {
  flex: none;
}

.calls__stop:hover {
  color: var(--text);
}

.calls__stop:hover .calls__marker {
  transform: scaleY(1.35);
}

.calls__name {
  text-align: center;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 700px) {
  .hero {
    padding-bottom: 11rem;
  }

  .hero__status {
    gap: 0.55rem 0.9rem;
  }

  .hero__status-note {
    flex-basis: 100%;
  }

  .hero__tagline,
  .hero__actions {
    padding-left: 0;
  }

  .hero__actions .btn {
    flex: 1 1 auto;
    justify-content: center;
  }

  .calls__name {
    font-size: 0.68rem;
    line-height: 1.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__status,
  .hero__word,
  .hero__role,
  .hero__tagline,
  .hero__actions,
  .calls {
    opacity: 1;
    animation: none;
  }
}
</style>
