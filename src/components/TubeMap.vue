<template>
  <div class="tube-map" aria-hidden="true">
    <canvas ref="canvasRef" class="tube-map__canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { LineKey } from '../data/portfolio'
import { spine } from '../data/portfolio'
import { useReducedMotion } from '../composables/useMotion'
import { useTheme } from '../composables/useTheme'

/**
 * The map the whole site travels along.
 *
 * One line — the spine — runs the full height of the document, and the camera
 * pans sideways to keep it in the same place on screen, so scrolling reads as
 * riding it. Other lines run near it, crossing at interchanges. Trains run on
 * all of them, and because each line holds its trains in a queue ordered by
 * position, one can never pass another: it closes up behind instead.
 *
 * Routes only ever run vertically or at 45°, which is the rule that makes a
 * diagram read as a tube map rather than as a road atlas.
 */

interface Point {
  x: number
  y: number
}

interface Station {
  x: number
  y: number
  /** Perpendicular to the track, so the dash sits across it. */
  angle: number
  change: boolean
}

interface Train {
  /** Distance along the route, in its own direction of travel. */
  pos: number
  speed: number
  length: number
}

interface Route {
  colour: string
  points: Point[]
  /** Cumulative arc length at each point; last entry is the total. */
  cumulative: number[]
  length: number
  /** 1 runs with the polyline, -1 against it. */
  direction: 1 | -1
  stations: Station[]
  /** Ordered front of the queue first — the invariant that stops overtaking. */
  trains: Train[]
}

const TRACK = 7
const TICK = 2.6
/** Bumper to bumper minimum, so a following train closes up rather than passes. */
const HEADWAY = 190
/** How far outside the viewport to keep drawing, in px. */
const MARGIN = 120

const canvasRef = ref<HTMLCanvasElement | null>(null)
const reduced = useReducedMotion()
const { theme } = useTheme()

let ctx: CanvasRenderingContext2D | null = null
let routes: Route[] = []
let width = 0
let height = 0
let pageHeight = 0
let dpr = 1
let frame = 0
let lastTime = 0
let resizeTimer = 0

/** Where the spine sits on screen, and the eased pan that keeps it there. */
let anchorX = 0
let panX = 0
let panTarget = 0

let ground = '#12161d'
let changeFill = '#ffffff'
let changeRing = '#10141a'

const random = (min: number, max: number) => min + Math.random() * (max - min)

/** The lines that run alongside the spine, in the order they fan out from it. */
const NEIGHBOURS: LineKey[] = [
  'central',
  'district',
  'elizabeth',
  'overground',
  'metropolitan',
  'bakerloo',
  'dlr',
]

const cssColour = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/* -------------------------------------------------------------------------
   Building the network
   ------------------------------------------------------------------------- */

/**
 * A route down the page: long vertical runs joined by 45° jogs. Both ends run
 * well outside the document so the line always leaves the frame rather than
 * stopping in open space.
 */
function buildRoute(startX: number, minX: number, maxX: number, colour: string): Route {
  const top = -MARGIN * 4
  const bottom = pageHeight + MARGIN * 4

  let x = startX
  let y = top
  const points: Point[] = [{ x, y }]

  while (y < bottom) {
    y += random(150, 420)
    points.push({ x, y })

    if (Math.random() < 0.62) {
      let shift = (Math.random() < 0.5 ? -1 : 1) * random(70, 200)
      if (x + shift < minX || x + shift > maxX) shift = -shift
      if (x + shift < minX || x + shift > maxX) continue

      x += shift
      y += Math.abs(shift) // 45°, by construction
      points.push({ x, y })
    }
  }

  const cumulative: number[] = [0]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    total += Math.hypot(b.x - a.x, b.y - a.y)
    cumulative.push(total)
  }

  return {
    colour,
    points,
    cumulative,
    length: total,
    direction: Math.random() < 0.5 ? 1 : -1,
    stations: [],
    trains: [],
  }
}

/** Where two segments cross, or null. Used to place interchanges. */
function crossing(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const ax = a2.x - a1.x
  const ay = a2.y - a1.y
  const bx = b2.x - b1.x
  const by = b2.y - b1.y

  const denominator = ax * by - ay * bx
  if (Math.abs(denominator) < 1e-6) return null

  const t = ((b1.x - a1.x) * by - (b1.y - a1.y) * bx) / denominator
  const u = ((b1.x - a1.x) * ay - (b1.y - a1.y) * ax) / denominator
  if (t < 0 || t > 1 || u < 0 || u > 1) return null

  return { x: a1.x + ax * t, y: a1.y + ay * t }
}

/** Every place two different lines meet gets the white interchange circle. */
function placeInterchanges() {
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const one = routes[i]
      const two = routes[j]
      if (!one || !two) continue

      for (let a = 1; a < one.points.length; a++) {
        const a1 = one.points[a - 1]
        const a2 = one.points[a]
        if (!a1 || !a2) continue
        const aTop = Math.min(a1.y, a2.y)
        const aBottom = Math.max(a1.y, a2.y)

        for (let b = 1; b < two.points.length; b++) {
          const b1 = two.points[b - 1]
          const b2 = two.points[b]
          if (!b1 || !b2) continue
          // Cheap reject: segments that don't share a band of the page can't meet.
          if (Math.max(b1.y, b2.y) < aTop || Math.min(b1.y, b2.y) > aBottom) continue

          const hit = crossing(a1, a2, b1, b2)
          if (!hit) continue

          const station: Station = { x: hit.x, y: hit.y, angle: 0, change: true }
          one.stations.push(station)
          two.stations.push({ ...station })
        }
      }
    }
  }
}

/** Plain stations: a dash across the track, spaced out along each line. */
function placeStations() {
  for (const route of routes) {
    const changes = route.stations.filter((station) => station.change)

    for (let at = random(120, 300); at < route.length; at += random(150, 340)) {
      const here = pointAt(route, at)
      const ahead = pointAt(route, Math.min(at + 4, route.length))
      if (!here || !ahead) continue

      // A dash immediately next to an interchange reads as a smudge.
      const crowded = changes.some(
        (change) => Math.abs(change.x - here.x) < 70 && Math.abs(change.y - here.y) < 70,
      )
      if (crowded) continue

      route.stations.push({
        x: here.x,
        y: here.y,
        angle: Math.atan2(ahead.y - here.y, ahead.x - here.x) + Math.PI / 2,
        change: false,
      })
    }
  }
}

function seedTrains() {
  for (const route of routes) {
    const count = Math.max(2, Math.min(Math.round(route.length / 2400), 7))
    route.trains = []

    // Laid down front first, each one at least a headway behind the last, so
    // the queue starts in the order the no-overtaking rule needs it to stay in.
    let pos = random(0, route.length)
    for (let i = 0; i < count; i++) {
      route.trains.push({ pos, speed: random(55, 130), length: random(52, 90) })
      pos -= HEADWAY + random(120, 900)
    }
  }
}

function buildNetwork() {
  const columns = width < 780 ? 4 : NEIGHBOURS.length
  anchorX = width * (width < 780 ? 0.16 : 0.1)

  routes = []

  // The spine first, so it's routes[0] and the camera can follow it.
  routes.push(
    buildRoute(anchorX, width * 0.02, width * 0.24, cssColour(`--tube-${spine}`, '#0098d4')),
  )

  for (let i = 0; i < columns; i++) {
    const key = NEIGHBOURS[i]
    if (!key) continue
    // Fan out to the right of the spine, one band each, overlapping a little
    // so lines cross often enough to earn their interchanges.
    const band = width * (0.24 + (i / columns) * 0.86)
    routes.push(
      buildRoute(
        band,
        band - width * 0.16,
        band + width * 0.16,
        cssColour(`--tube-${key}`, '#888'),
      ),
    )
  }

  placeInterchanges()
  placeStations()
  seedTrains()
}

/* -------------------------------------------------------------------------
   Geometry
   ------------------------------------------------------------------------- */

/** Walks a route's polyline and returns the point at `distance` along it. */
function pointAt(route: Route, distance: number): Point | null {
  if (distance < 0 || distance > route.length) return null

  let i = 1
  while (i < route.cumulative.length && (route.cumulative[i] ?? 0) < distance) i++

  const previous = route.cumulative[i - 1] ?? 0
  const next = route.cumulative[i] ?? previous
  const a = route.points[i - 1]
  const b = route.points[i]
  if (!a || !b) return null

  const ratio = (distance - previous) / (next - previous || 1)
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio }
}

/** The spine is monotonic in y, so its x at a given depth is well defined. */
function spineXAt(y: number): number {
  const route = routes[0]
  if (!route) return anchorX

  const points = route.points
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b || b.y < y) continue
    if (a.y > y) return a.x
    const ratio = (y - a.y) / (b.y - a.y || 1)
    return a.x + (b.x - a.x) * ratio
  }
  return points[points.length - 1]?.x ?? anchorX
}

/* -------------------------------------------------------------------------
   Drawing
   ------------------------------------------------------------------------- */

function drawRoute(route: Route, top: number, bottom: number) {
  if (!ctx) return

  ctx.strokeStyle = route.colour
  ctx.lineWidth = TRACK
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()

  let drawing = false
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1]
    const b = route.points[i]
    if (!a || !b) continue
    if (Math.max(a.y, b.y) < top || Math.min(a.y, b.y) > bottom) {
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

function drawStations(route: Route, top: number, bottom: number) {
  if (!ctx) return

  ctx.lineCap = 'butt'
  for (const station of route.stations) {
    if (station.y < top || station.y > bottom) continue

    if (station.change) {
      ctx.beginPath()
      ctx.arc(station.x, station.y, TRACK * 0.78, 0, Math.PI * 2)
      ctx.fillStyle = changeFill
      ctx.fill()
      ctx.lineWidth = 2.4
      ctx.strokeStyle = changeRing
      ctx.stroke()
      continue
    }

    // One dash across the track, in the line's own colour.
    const reach = TRACK * 1.05
    ctx.beginPath()
    ctx.moveTo(
      station.x - Math.cos(station.angle) * reach,
      station.y - Math.sin(station.angle) * reach,
    )
    ctx.lineTo(
      station.x + Math.cos(station.angle) * reach,
      station.y + Math.sin(station.angle) * reach,
    )
    ctx.strokeStyle = route.colour
    ctx.lineWidth = TICK * 2
    ctx.stroke()
  }
}

/**
 * The carriage is a short sub-polyline rather than a straight capsule, so a
 * train rounds a corner instead of cutting it.
 */
function drawTrain(route: Route, train: Train, top: number, bottom: number) {
  if (!ctx) return

  const steps = 6
  const path: Point[] = []
  for (let s = 0; s <= steps; s++) {
    const along = train.pos - (train.length * s) / steps
    const arc = route.direction === 1 ? along : route.length - along
    const point = pointAt(route, arc)
    if (point) path.push(point)
  }

  const [head, ...tail] = path
  if (!head || tail.length < 1) return
  if (head.y < top - 200 || head.y > bottom + 200) return

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Cut the train out of its own line in the ground colour first, so it slides
  // along as a detached bead rather than disappearing into a same-coloured track.
  ctx.beginPath()
  ctx.moveTo(head.x, head.y)
  for (const point of tail) ctx.lineTo(point.x, point.y)
  ctx.strokeStyle = ground
  ctx.lineWidth = TRACK + 9
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(head.x, head.y)
  for (const point of tail) ctx.lineTo(point.x, point.y)
  ctx.strokeStyle = route.colour
  ctx.lineWidth = TRACK
  ctx.stroke()
}

function advance(delta: number) {
  for (const route of routes) {
    const queue = route.trains

    for (let i = 0; i < queue.length; i++) {
      const train = queue[i]
      if (!train) continue

      train.pos += train.speed * delta

      // Never pass the one in front: close up to a headway behind it instead.
      const ahead = queue[i - 1]
      if (ahead) train.pos = Math.min(train.pos, ahead.pos - HEADWAY)
    }

    // Front train off the far end: send it back to join the rear of the queue,
    // which keeps the array ordered and the invariant intact.
    const front = queue[0]
    const back = queue[queue.length - 1]
    if (front && back && front.pos - front.length > route.length) {
      queue.shift()
      front.pos = Math.min(-front.length, back.pos - HEADWAY - random(200, 1400))
      front.speed = random(55, 130)
      queue.push(front)
    }
  }
}

function draw() {
  if (!ctx) return

  const camY = window.scrollY
  const top = camY - MARGIN
  const bottom = camY + height + MARGIN

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.translate(panX, -camY)

  for (const route of routes) drawRoute(route, top, bottom)
  for (const route of routes) drawStations(route, top, bottom)
  for (const route of routes) {
    for (const train of route.trains) drawTrain(route, train, top, bottom)
  }

  ctx.restore()
}

/** Keeps the spine under the same point on screen as the page scrolls past. */
function trackSpine(follow: boolean) {
  panTarget = anchorX - spineXAt(window.scrollY + height * 0.5)
  panX = follow ? panX + (panTarget - panX) * 0.08 : panTarget
}

function render(time: number) {
  frame = requestAnimationFrame(render)

  const delta = Math.min((time - lastTime) / 1000, 0.05)
  lastTime = time

  trackSpine(true)
  advance(delta)
  draw()
}

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function start() {
  stop()
  if (reduced.value || document.hidden) {
    trackSpine(false)
    draw()
    return
  }
  lastTime = performance.now()
  frame = requestAnimationFrame(render)
}

function readPalette() {
  ground = cssColour('--bg', '#12161d')
  changeFill = cssColour('--interchange-fill', '#ffffff')
  changeRing = cssColour('--interchange-ring', '#10141a')

  const spineRoute = routes[0]
  if (spineRoute) spineRoute.colour = cssColour(`--tube-${spine}`, '#0098d4')
  NEIGHBOURS.forEach((key, index) => {
    const route = routes[index + 1]
    if (route) route.colour = cssColour(`--tube-${key}`, '#888')
  })
}

function build() {
  const canvas = canvasRef.value
  if (!canvas) return

  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  pageHeight = Math.max(document.documentElement.scrollHeight, height)

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  readPalette()
  buildNetwork()
  trackSpine(false)
  start()
}

/**
 * Mobile browsers fire resize as the URL bar collapses; rebuilding on a pure
 * height change would reshuffle the map mid-scroll, so only width counts.
 */
let lastWidth = 0
function onResize() {
  if (window.innerWidth === lastWidth) return
  lastWidth = window.innerWidth
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(build, 180)
}

/** Under reduced motion nothing animates, so the map only moves on scroll. */
function onScroll() {
  if (!reduced.value) return
  trackSpine(false)
  draw()
}

function onVisibility() {
  if (document.hidden) stop()
  else start()
}

watch(reduced, start)

watch(theme, () => {
  readPalette()
  if (reduced.value || document.hidden) draw()
})

let pageObserver: ResizeObserver | null = null

onMounted(() => {
  lastWidth = window.innerWidth
  build()

  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  // The pinned Work section makes the document several viewports tall, and it
  // isn't measurable until layout settles — regenerate if the page grows.
  pageObserver = new ResizeObserver(() => {
    const measured = Math.max(document.documentElement.scrollHeight, height)
    if (Math.abs(measured - pageHeight) < height * 0.5) return
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(build, 120)
  })
  pageObserver.observe(document.body)
})

onUnmounted(() => {
  stop()
  window.clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  pageObserver?.disconnect()
})
</script>

<style scoped>
/*
 * Two masks, on two elements: stacking them on one only works with
 * mask-composite, which Vue's scoped rewriter and Safari between them make
 * unreliable. The frame fades the map out under the nav; the canvas thins it
 * where the text column sits.
 */
.tube-map {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: var(--map-opacity);
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 7rem);
  mask-image: linear-gradient(180deg, transparent, #000 7rem);
}

.tube-map__canvas {
  display: block;
  -webkit-mask-image: linear-gradient(
    90deg,
    #000 0%,
    rgba(0, 0, 0, 0.32) 26%,
    rgba(0, 0, 0, 0.32) 74%,
    #000 100%
  );
  mask-image: linear-gradient(
    90deg,
    #000 0%,
    rgba(0, 0, 0, 0.32) 26%,
    rgba(0, 0, 0, 0.32) 74%,
    #000 100%
  );
}
</style>
