<template>
  <header class="nav" :class="{ 'nav--lifted': lifted, 'nav--open': open }">
    <div class="nav__inner">
      <a class="nav__mark" href="#top" @click="close">
        <span class="stop stop--change" aria-hidden="true"></span>
        <span class="nav__name">{{ profile.initials }}</span>
      </a>

      <!-- The sections are stations on one line, so the track is one colour
           end to end. Where you are is the interchange circle, not a fill. -->
      <nav class="nav__links" aria-label="Sections" :style="{ '--n': sections.length }">
        <span class="nav__track" aria-hidden="true"></span>

        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="nav__link"
          :class="{ 'is-active': active === section.id }"
          :aria-current="active === section.id ? 'true' : undefined"
        >
          <span class="nav__label">{{ section.label }}</span>
          <span
            class="stop nav__stop"
            :class="active === section.id ? 'stop--change' : 'stop--across'"
            aria-hidden="true"
          ></span>
        </a>
      </nav>

      <div class="nav__tools">
        <button
          class="nav__ground"
          type="button"
          :aria-label="theme === 'dark' ? 'Switch to the paper map' : 'Switch to the night map'"
          @click="toggle"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3.2" />
            <path
              d="M8 .8v1.9M8 13.3v1.9M.8 8h1.9M13.3 8h1.9M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"
            />
          </svg>
          <svg v-else viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.6 9.9A6 6 0 0 1 6.1 2.4a6 6 0 1 0 7.5 7.5Z" />
          </svg>
        </button>

        <a class="nav__cv" :href="profile.cv" download>
          <span>CV</span>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1.5v9m0 0 3.2-3.2M8 10.5 4.8 7.3M2 13.5h12" />
          </svg>
        </a>
      </div>

      <button
        class="nav__toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="nav-sheet"
        :aria-label="open ? 'Close menu' : 'Open menu'"
        @click="open = !open"
      >
        <span></span>
        <span></span>
      </button>
    </div>

    <div id="nav-sheet" class="nav__sheet" :hidden="!open">
      <div class="sheet__route">
        <span class="sheet__track" aria-hidden="true"></span>

        <a
          v-for="(section, index) in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="sheet__stop"
          :class="{ 'is-active': active === section.id }"
          :style="{ '--i': index }"
          @click="close"
        >
          <span
            class="stop sheet__marker"
            :class="active === section.id ? 'stop--change' : ''"
            aria-hidden="true"
          ></span>
          <span class="sheet__label">{{ section.label }}</span>
          <span class="sheet__index">{{ String(index + 1).padStart(2, '0') }}</span>
        </a>
      </div>

      <a
        class="sheet__cv"
        :href="profile.cv"
        :style="{ '--i': sections.length }"
        download
        @click="close"
      >
        Download CV
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5v9m0 0 3.2-3.2M8 10.5 4.8 7.3M2 13.5h12" />
        </svg>
      </a>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { profile, sections } from '../data/portfolio'
import { rafThrottle } from '../composables/useMotion'
import { useTheme } from '../composables/useTheme'

const lifted = ref(false)
const open = ref(false)
const active = ref<string>('')
const { theme, toggle } = useTheme()

const close = () => {
  open.value = false
}

const onScroll = rafThrottle(() => {
  lifted.value = window.scrollY > window.innerHeight * 0.5
})

let observer: IntersectionObserver | null = null

// Lock the page while the mobile sheet is up, otherwise it scrolls underneath.
watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) active.value = entry.target.id
      }
    },
    // Band across the middle of the viewport: whatever crosses it is "current".
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
  )
  for (const section of sections) {
    const element = document.getElementById(section.id)
    if (element) observer.observe(element)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  onScroll.cancel()
  observer?.disconnect()
  document.body.style.overflow = ''
})
</script>

<style scoped>
.nav {
  --stop: var(--tube-victoria);
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  border-bottom: 1px solid transparent;
  transition:
    background-color 0.4s var(--ease),
    border-color 0.4s var(--ease);
}

.nav--lifted {
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border-bottom-color: var(--rule);
}

.nav__inner {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 var(--gutter);
  height: 74px;
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.nav__mark {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  letter-spacing: 0.14em;
  color: var(--text);
  text-decoration: none;
}

.nav__links {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  margin-left: auto;
  min-width: min(28rem, 40vw);
}

/* One line, one colour, running between the two end stations. */
.nav__track {
  position: absolute;
  left: calc(100% / var(--n) / 2);
  right: calc(100% / var(--n) / 2);
  bottom: 6px;
  height: 5px;
  background: var(--stop);
}

.nav__link {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 1.6rem;
  font-size: 0.85rem;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.3s var(--ease);
}

/* Both symbols centre on the track: the dash across it, the circle over it. */
.nav__stop {
  position: absolute;
  bottom: 0;
}

.nav__stop.stop--across {
  bottom: 0.5px;
}

.nav__link:hover {
  color: var(--text);
}

.nav__link:hover .stop--across {
  transform: scaleY(1.35);
}

.nav__link.is-active {
  color: var(--text);
}

.nav__tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav__ground,
.nav__cv {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 36px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.3s var(--ease),
    color 0.3s var(--ease);
}

.nav__ground {
  width: 36px;
  flex: none;
}

.nav__cv {
  padding: 0 0.95rem;
}

.nav__ground svg,
.nav__cv svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav__ground:hover,
.nav__cv:hover {
  color: var(--tube-victoria-ink);
  border-color: var(--tube-victoria-ink);
}

.nav__toggle {
  display: none;
  margin-left: auto;
  width: 42px;
  height: 42px;
  border: 1px solid var(--rule-strong);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  position: relative;
}

.nav__toggle span {
  position: absolute;
  left: 50%;
  width: 16px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: transform 0.35s var(--ease);
}

.nav__toggle span:nth-child(1) {
  transform: translate(-50%, -4px);
}
.nav__toggle span:nth-child(2) {
  transform: translate(-50%, 4px);
}

.nav--open .nav__toggle span:nth-child(1) {
  transform: translate(-50%, 0) rotate(45deg);
}
.nav--open .nav__toggle span:nth-child(2) {
  transform: translate(-50%, 0) rotate(-45deg);
}

.nav__sheet {
  display: none;
}

/* -------------------------------------------------------------------------
   Mobile: the same line, stood on its end
   ------------------------------------------------------------------------- */

@media (max-width: 900px) {
  .nav__links,
  .nav__cv {
    display: none;
  }

  .nav__tools {
    margin-left: auto;
  }

  .nav__toggle {
    display: block;
    margin-left: 0;
  }

  .nav--open {
    background: var(--bg);
    border-bottom-color: var(--rule);
  }

  .nav__sheet {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2rem;
    padding: 2rem var(--gutter) 2.5rem;
    height: calc(100dvh - 74px);
    background: var(--bg);
    overflow-y: auto;
  }

  .nav__sheet[hidden] {
    display: none;
  }

  .sheet__route {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .sheet__track {
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 5px;
    background: var(--stop);
    -webkit-mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent);
    mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent);
  }

  .sheet__stop {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1.1rem;
    padding: 0.9rem 0;
    font-family: var(--font-display);
    font-size: 1.75rem;
    font-weight: 300;
    color: var(--muted-strong);
    text-decoration: none;
    opacity: 0;
    animation: sheet-in 0.45s var(--ease) forwards;
    animation-delay: calc(var(--i, 0) * 55ms + 60ms);
  }

  /* The dash reaches out from the track towards its label. */
  .sheet__marker {
    flex: none;
    margin-left: -1px;
  }

  .sheet__marker.stop--change {
    margin-left: -3px;
  }

  .sheet__stop.is-active {
    color: var(--text);
  }

  .sheet__label {
    line-height: 1.1;
  }

  .sheet__index {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    color: var(--faint);
  }

  .sheet__cv {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.35rem;
    border: 1px solid var(--rule-strong);
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text);
    text-decoration: none;
    opacity: 0;
    animation: sheet-in 0.45s var(--ease) forwards;
    animation-delay: calc(var(--i, 0) * 55ms + 60ms);
  }

  .sheet__cv svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @keyframes sheet-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet__stop,
  .sheet__cv {
    opacity: 1;
    animation: none;
  }
}
</style>
