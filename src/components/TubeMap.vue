<template>
  <div class="tube-map" aria-hidden="true">
    <canvas ref="canvasRef" class="tube-map__canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { sections } from '../data/portfolio'
import type { Route, Station, Train } from '../map/network'
import { advanceTrains } from '../map/trains'
import { pointAt } from '../map/network'
import { useMap } from '../map/useMap'
import { useReducedMotion } from '../composables/useMotion'
import { useTheme } from '../composables/useTheme'

/**
 * The map, drawn.
 *
 * Everything here is in map coordinates; the camera in `useMap` decides which
 * part of them you are looking at. Strokes never fall below a pixel and a half
 * on screen, so pulling back to the whole network thins the diagram without
 * ever losing it.
 */

const TRACK = 7
const TICK = 5.5

const canvasRef = ref<HTMLCanvasElement | null>(null)
const reduced = useReducedMotion()
const { theme } = useTheme()
const map = useMap()

let ctx: CanvasRenderingContext2D | null = null
let width = 0
let height = 0
let dpr = 1
let frame = 0
let lastTime = 0
let resizeTimer = 0
let lastWidth = 0
let lastHeight = 0

let ground = '#12161d'
let changeFill = '#ffffff'
let changeRing = '#10141a'

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

const cssColour = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

function readPalette() {
  ground = cssColour('--bg', '#12161d')
  changeFill = cssColour('--interchange-fill', '#ffffff')
  changeRing = cssColour('--interchange-ring', '#10141a')

  for (const route of map.network.value?.routes ?? []) {
    route.colour = cssColour(`--tube-${route.key}`, '#888')
  }
}

/* -------------------------------------------------------------------------
   Drawing
   ------------------------------------------------------------------------- */

interface View {
  left: number
  right: number
  top: number
  bottom: number
  zoom: number
}

/** A stroke width in world units that never draws thinner than `floor` on screen. */
const gauge = (world: number, zoom: number, floor: number) => Math.max(world * zoom, floor) / zoom

function drawRoute(route: Route, view: View) {
  if (!ctx) return

  ctx.strokeStyle = route.colour
  ctx.lineWidth = gauge(TRACK, view.zoom, 1.6)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()

  let drawing = false
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1]
    const b = route.points[i]
    if (!a || !b) continue
    if (
      Math.max(a.y, b.y) < view.top ||
      Math.min(a.y, b.y) > view.bottom ||
      Math.max(a.x, b.x) < view.left ||
      Math.min(a.x, b.x) > view.right
    ) {
      drawing = false
      continue
    }
    if (!drawing) {
      ctx.moveTo(a.x, a.y)
      drawing = true
    }
    ctx.lineTo(b.x, b.y)
  }
  ctx.stroke()
}

const onScreen = (station: Station, view: View) =>
  station.y >= view.top &&
  station.y <= view.bottom &&
  station.x >= view.left &&
  station.x <= view.right

/** One dash across the track, in the line's own colour. */
function drawStops(route: Route, view: View) {
  if (!ctx) return

  const reach = TRACK * 1.55
  ctx.lineCap = 'butt'
  ctx.strokeStyle = route.colour
  ctx.lineWidth = gauge(TICK, view.zoom, 1.4)
  ctx.beginPath()

  for (const station of route.stations) {
    if (station.change || !onScreen(station, view)) continue
    ctx.moveTo(
      station.x - Math.cos(station.angle) * reach,
      station.y - Math.sin(station.angle) * reach,
    )
    ctx.lineTo(
      station.x + Math.cos(station.angle) * reach,
      station.y + Math.sin(station.angle) * reach,
    )
  }
  ctx.stroke()
}

/**
 * A white circle ringed in black. It belongs to both the lines that meet
 * there, so it is drawn last and at full strength — on the real map an
 * interchange is solid however faint the lines through it are.
 */
function drawInterchanges(route: Route, view: View) {
  if (!ctx) return

  const radius = gauge(TRACK * 0.85, view.zoom, 2.2)
  ctx.fillStyle = changeFill
  ctx.strokeStyle = changeRing
  ctx.lineWidth = gauge(2.6, view.zoom, 0.9)

  for (const station of route.stations) {
    if (!station.change || !onScreen(station, view)) continue
    ctx.beginPath()
    ctx.arc(station.x, station.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * The carriage is a short run of the route rather than a straight capsule, so
 * a train rounds a corner instead of cutting it.
 */
function drawTrain(route: Route, train: Train, view: View) {
  if (!ctx) return

  const steps = 6
  const head = train.pos
  const tail = train.pos - train.length
  if (head < -train.length || tail > route.length) return

  ctx.beginPath()
  for (let s = 0; s <= steps; s++) {
    const along = head - (train.length * s) / steps
    const arc = route.direction === 1 ? along : route.length - along
    const point = pointAt(route, arc)
    if (s === 0) {
      if (point.y < view.top - 300 || point.y > view.bottom + 300) return
      if (point.x < view.left - 300 || point.x > view.right + 300) return
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Cut the train out of its own line in the ground colour first, so it slides
  // along as a detached bead rather than vanishing into same-coloured track.
  ctx.strokeStyle = ground
  ctx.lineWidth = gauge(TRACK + 9, view.zoom, 4.5)
  ctx.stroke()

  ctx.strokeStyle = route.colour
  ctx.lineWidth = gauge(TRACK, view.zoom, 1.6)
  ctx.stroke()
}

function draw() {
  const network = map.network.value
  if (!ctx || !network) return

  const camera = map.camera
  const zoom = camera.zoom
  const view: View = {
    left: camera.x - camera.ax / zoom,
    right: camera.x + (width - camera.ax) / zoom,
    top: camera.y - camera.ay / zoom,
    bottom: camera.y + (height - camera.ay) / zoom,
    zoom,
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.translate(camera.ax, camera.ay)
  ctx.scale(zoom, zoom)
  ctx.translate(-camera.x, -camera.y)

  // Reading the line you are on, it is the only one at full strength. Pulled
  // back to the whole map, every line matters equally.
  const fit = map.metrics.value.fitZoom
  const focus = clamp01((zoom - fit) / (1 - fit || 1))
  const away = 0.9 - 0.52 * focus
  const here = map.activeIndex.value
  const alphaFor = (index: number) => (index === here && index < sections.length ? 1 : away)

  // One pass per layer, not per line: drawn line by line, the next line's
  // track paints over the last line's stations.
  network.routes.forEach((route, index) => {
    if (!ctx) return
    ctx.globalAlpha = alphaFor(index)
    drawRoute(route, view)
  })

  // Pulled back this far a train is smaller than the gap it cuts in its own
  // line, so it would read as a break in the track rather than as a train.
  if (zoom > 0.45) {
    network.routes.forEach((route, index) => {
      if (!ctx) return
      ctx.globalAlpha = alphaFor(index)
      for (const train of route.trains) drawTrain(route, train, view)
    })
  }

  // Below this the symbols are smaller than the lines carrying them.
  if (zoom > 0.3) {
    network.routes.forEach((route, index) => {
      if (!ctx) return
      ctx.globalAlpha = alphaFor(index)
      drawStops(route, view)
    })

    ctx.globalAlpha = 1
    for (const route of network.routes) drawInterchanges(route, view)
  }

  ctx.globalAlpha = 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/* -------------------------------------------------------------------------
   The loop
   ------------------------------------------------------------------------- */

/** Camera state as a string, to spot a frame that would draw the same thing. */
const signature = () => {
  const { x, y, zoom, ax, ay } = map.camera
  return `${x}|${y}|${zoom}|${ax}|${ay}|${map.activeIndex.value}`
}
let lastFrame = ''

function render(time: number) {
  frame = requestAnimationFrame(render)

  const delta = Math.min((time - lastTime) / 1000, 0.05)
  lastTime = time

  map.tick(time)

  // Nothing is running, so the only thing that can change the picture is the
  // camera. If that hasn't moved either, the last frame is still correct.
  if (reduced.value) {
    const now = signature()
    if (now === lastFrame) return
    lastFrame = now
  } else {
    advanceTrains(map.network.value?.routes ?? [], delta)
  }

  draw()
}

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function start() {
  stop()
  lastTime = performance.now()
  frame = requestAnimationFrame(render)
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return

  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  ctx = canvas.getContext('2d')
  map.rebuild()
  readPalette()
}

/**
 * Mobile browsers fire resize as the URL bar collapses. Nothing on the page
 * reflows with it, so only a real change of shape is worth rebuilding for.
 */
function onResize() {
  if (window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 120) return
  lastWidth = window.innerWidth
  lastHeight = window.innerHeight
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(resize, 180)
}

function onVisibility() {
  if (document.hidden) stop()
  else start()
}

watch(reduced, (value) => {
  map.setReducedMotion(value)
})

watch(theme, () => {
  readPalette()
})

onMounted(() => {
  lastWidth = window.innerWidth
  lastHeight = window.innerHeight
  map.setReducedMotion(reduced.value)
  resize()
  start()

  window.addEventListener('resize', onResize, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stop()
  window.clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<style scoped>
.tube-map {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* The diagram runs under the legend rather than into it. */
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 5.5rem);
  mask-image: linear-gradient(180deg, transparent, #000 5.5rem);
}

.tube-map__canvas {
  display: block;
}
</style>
