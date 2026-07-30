<template>
  <header
    class="nav"
    :class="{ 'nav--lifted': lifted, 'nav--open': open }"
    :style="{ '--accent-solid': activeColour }"
  >
    <div class="nav__inner">
      <a class="nav__mark" href="#top" @click="close">
        <span class="nav__mark-stop" aria-hidden="true"></span>
        <span class="nav__name">{{ profile.initials }}</span>
      </a>

      <!-- The section list is one line: stops evenly spaced, the travelled
           length filled in the current section's colour. -->
      <nav class="nav__links" aria-label="Sections" :style="{ '--n': sections.length }">
        <span class="nav__track" aria-hidden="true">
          <span class="nav__track-fill" :style="{ width: `${fill}%` }"></span>
        </span>

        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="nav__link"
          :class="{ 'is-active': active === section.id }"
          :style="{ '--stop': lines[section.line].hex }"
          :aria-current="active === section.id ? 'true' : undefined"
        >
          <span class="nav__label">{{ section.label }}</span>
          <span class="nav__stop" aria-hidden="true"></span>
        </a>
      </nav>

      <a class="nav__cv" :href="profile.cv" download>
        <span>CV</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5v9m0 0 3.2-3.2M8 10.5 4.8 7.3M2 13.5h12" />
        </svg>
      </a>

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
        <a
          v-for="(section, index) in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="sheet__stop"
          :class="{ 'is-active': active === section.id }"
          :style="{ '--i': index, '--stop': lines[section.line].hex }"
          @click="close"
        >
          <span class="sheet__marker" aria-hidden="true"></span>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { lines, profile, sections } from '../data/portfolio'
import { rafThrottle } from '../composables/useMotion'

const lifted = ref(false)
const open = ref(false)
const active = ref<string>('')

const close = () => {
  open.value = false
}

const activeIndex = computed(() => sections.findIndex((section) => section.id === active.value))

/** Length of line travelled, as a percentage of the run between end stops. */
const fill = computed(() => {
  if (activeIndex.value < 0) return 0
  return (activeIndex.value / (sections.length - 1)) * 100
})

const activeColour = computed(() => {
  const section = sections[activeIndex.value]
  return section ? lines[section.line].hex : 'var(--tube-victoria)'
})

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
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  border-bottom: 1px solid transparent;
  transition:
    background-color 0.4s var(--ease),
    border-color 0.4s var(--ease);
}

.nav--lifted {
  background: color-mix(in srgb, var(--bg) 74%, transparent);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border-bottom-color: var(--rule);
}

.nav__inner {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 var(--gutter);
  height: 76px;
  display: flex;
  align-items: center;
  gap: 2rem;
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

/* The mark is itself an interchange symbol. */
.nav__mark-stop {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 3px solid var(--text);
  background: var(--bg);
  transition: border-color 0.5s var(--ease);
}

.nav__mark:hover .nav__mark-stop {
  border-color: var(--accent-solid);
}

.nav__links {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  margin-left: auto;
  min-width: min(30rem, 42vw);
  padding-bottom: 0.85rem;
}

/* Track runs between the centres of the first and last stop. */
.nav__track {
  position: absolute;
  left: calc(100% / var(--n) / 2);
  right: calc(100% / var(--n) / 2);
  bottom: 0;
  height: 4px;
  border-radius: 999px;
  background: var(--rule-strong);
}

.nav__track-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent-solid);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent-solid) 60%, transparent);
  transition:
    width 0.55s var(--ease),
    background-color 0.55s var(--ease);
}

.nav__link {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding-bottom: 0.15rem;
  font-size: 0.85rem;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.3s var(--ease);
}

.nav__label {
  transition: transform 0.3s var(--ease);
}

.nav__stop {
  position: absolute;
  bottom: -0.85rem;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 3px solid var(--rule-strong);
  background: var(--bg);
  transition:
    border-color 0.4s var(--ease),
    transform 0.4s var(--ease),
    box-shadow 0.4s var(--ease);
}

.nav__link:hover {
  color: var(--text);
}

.nav__link:hover .nav__label {
  transform: translateY(-2px);
}

.nav__link:hover .nav__stop {
  border-color: var(--stop);
}

.nav__link.is-active {
  color: var(--text);
}

.nav__link.is-active .nav__stop {
  border-color: var(--text);
  transform: scale(1.45);
  box-shadow: 0 0 16px color-mix(in srgb, var(--stop) 70%, transparent);
}

.nav__cv {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.95rem;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--text);
  text-decoration: none;
  transition:
    border-color 0.3s var(--ease),
    color 0.3s var(--ease),
    background-color 0.3s var(--ease);
}

.nav__cv svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav__cv:hover {
  color: var(--accent-solid);
  border-color: color-mix(in srgb, var(--accent-solid) 60%, transparent);
  background: color-mix(in srgb, var(--accent-solid) 10%, transparent);
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

  .nav__toggle {
    display: block;
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
    height: calc(100dvh - 76px);
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

  /* Vertical track behind the stops. */
  .sheet__route::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 1.6rem;
    bottom: 1.6rem;
    width: 4px;
    border-radius: 999px;
    background: var(--rule-strong);
  }

  .sheet__stop {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1.1rem;
    padding: 0.9rem 0;
    font-family: var(--font-display);
    font-size: 1.85rem;
    font-weight: 300;
    color: var(--muted-strong);
    text-decoration: none;
    opacity: 0;
    animation: sheet-in 0.45s var(--ease) forwards;
    animation-delay: calc(var(--i, 0) * 55ms + 60ms);
  }

  .sheet__marker {
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 4px solid var(--stop);
    background: var(--bg);
    transition: transform 0.35s var(--ease);
  }

  .sheet__stop.is-active {
    color: var(--text);
  }

  .sheet__stop.is-active .sheet__marker {
    border-color: var(--text);
    box-shadow: 0 0 18px color-mix(in srgb, var(--stop) 75%, transparent);
    transform: scale(1.15);
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
