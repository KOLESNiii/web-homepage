<template>
  <section class="refresh-demo" aria-labelledby="refresh-demo-title">
    <header class="refresh-demo__header">
      <div>
        <p class="refresh-demo__kicker">Live demo · runs in your browser</p>
        <h2 id="refresh-demo-title">Rearrange a real room.</h2>
        <p>
          Move furniture and watch collisions, door swings and Feng Shui update. Add real IKEA pieces,
          replay a recorded agent run, then drop a figure in and walk through it.
        </p>
      </div>
      <a class="refresh-demo__out" :href="DEMO_URL" target="_blank" rel="noopener" @click="track('new_tab')">
        Open full screen <ArrowUpRight :size="15" aria-hidden="true" />
      </a>
    </header>

    <div ref="stage" class="refresh-demo__stage" :class="{ 'is-live': live }">
      <iframe
        v-if="live"
        :src="DEMO_URL"
        title="Refresh interactive demo"
        allow="fullscreen; pointer-lock; autoplay"
        loading="eager"
      ></iframe>
      <button v-else type="button" class="refresh-demo__poster" @click="launch">
        <img src="/project-media/refresh.webp" alt="The Refresh editor: a 3D bedroom beside an agent proposal that raises the Feng Shui score from 50 to 99" />
        <span class="refresh-demo__play">
          <Play :size="18" aria-hidden="true" />
          Launch the demo
        </span>
        <span class="refresh-demo__note">About 17 MB · best on a laptop or desktop</span>
      </button>
    </div>

    <p class="refresh-demo__caption">
      No backend: the spatial engine’s Python runs in the page with Pyodide, giving the same numbers as the
      server. The agent replies are real Claude runs, recorded on each room’s starting layout and replayed
      there, so you don’t need an API key.
    </p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ArrowUpRight, Play } from 'lucide-vue-next'
import { capture } from '../analytics'

const DEMO_URL = '/demos/refresh/'
const live = ref(false)
const stage = ref<HTMLElement | null>(null)

function track(how: 'inline' | 'new_tab') {
  capture('portfolio_demo_launched', { project: 'Refresh', how })
}

/** Phones get the page itself: the editor needs a pointer and the room to see it. */
function launch() {
  if (window.matchMedia('(max-width: 760px)').matches) {
    track('new_tab')
    window.open(DEMO_URL, '_blank', 'noopener')
    return
  }
  track('inline')
  live.value = true
  // The live stage is taller than the poster: bring all of it below the sticky header.
  void nextTick(() => stage.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
</script>

<style scoped>
.refresh-demo { margin-bottom: 60px; }
.refresh-demo__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-bottom: 22px; }
.refresh-demo__kicker { font: 500 11px/1.3 JetBrains Mono, monospace; letter-spacing: .09em; text-transform: uppercase; color: var(--sleek-accent); }
.refresh-demo__header h2 { margin-top: 10px; font: 400 clamp(36px, 4.5vw, 58px)/1 'Instrument Serif', Georgia, serif; }
.refresh-demo__header p:last-child { max-width: 620px; margin-top: 12px; color: var(--sleek-muted); font-size: 15px; }
.refresh-demo__out { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; color: var(--sleek-muted); font-size: 13px; text-decoration: none; }
.refresh-demo__out:hover { color: var(--sleek-accent); }

.refresh-demo__stage { position: relative; scroll-margin-top: 88px; aspect-ratio: 16 / 10; max-height: calc(100svh - 120px); overflow: hidden; border: 1px solid var(--sleek-rule); background: #eae0ce; }
.refresh-demo__stage.is-live { aspect-ratio: auto; height: min(calc(100svh - 120px), 820px); min-height: 600px; }
.refresh-demo__stage iframe { display: block; width: 100%; height: 100%; border: 0; }

.refresh-demo__poster { position: absolute; inset: 0; display: block; width: 100%; padding: 0; border: 0; background: none; cursor: pointer; }
.refresh-demo__poster img { width: 100%; height: 100%; object-fit: cover; object-position: left top; transition: transform .6s ease, filter .3s ease; }
.refresh-demo__poster::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(23, 26, 24, .45), rgba(23, 26, 24, 0) 45%); }
.refresh-demo__poster:hover img { transform: scale(1.015); filter: saturate(1.05); }
.refresh-demo__play { position: absolute; z-index: 1; left: 50%; top: 50%; display: inline-flex; white-space: nowrap; align-items: center; gap: 10px; padding: 14px 22px; background: var(--sleek-text); color: var(--sleek-bg); font: 600 14px/1 Manrope, sans-serif; transform: translate(-50%, -50%); transition: background-color .2s ease, transform .2s ease; }
.refresh-demo__poster:hover .refresh-demo__play, .refresh-demo__poster:focus-visible .refresh-demo__play { background: var(--sleek-accent); color: #fff; transform: translate(-50%, calc(-50% - 2px)); }
.refresh-demo__note { position: absolute; z-index: 1; left: 18px; bottom: 16px; color: #f7f3ea; font: 500 11px/1.3 JetBrains Mono, monospace; letter-spacing: .06em; }

.refresh-demo__caption { max-width: 760px; margin-top: 14px; color: var(--sleek-muted); font-size: 12px; line-height: 1.6; }

@media (max-width: 760px) {
  .refresh-demo__header { flex-direction: column; align-items: flex-start; gap: 14px; }
  .refresh-demo__stage { aspect-ratio: 4 / 3; }
}
</style>
