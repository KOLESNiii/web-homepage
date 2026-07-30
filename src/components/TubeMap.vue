<template>
  <canvas ref="canvasRef" class="tube-map" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { lines } from '../data/portfolio'
import { useReducedMotion } from '../composables/useMotion'

/**
 * The map the whole site sits on: a Beck-style network of TfL-coloured routes
 * with station ticks and interchanges, and trains running along them.
 *
 * The network is baked once into an offscreen canvas and blitted each frame, so
 * only the handful of trains cost anything per frame regardless of how dense the
 * map gets.
 */

interface Point {
  x: number
  y: number
}

interface Route {
  points: Point[]
  /** Cumulative arc length at each point; last entry is the total. */
  cumulative: number[]
  hex: string
  ink: string
}

interface Train {
  route: number
  distance: number
  speed: number
  /** Carriage length in px along the route. */
  length: number
}

const TRACK = 6.5

const canvasRef = ref<HTMLCanvasElement | null>(null)
const reduced = useReducedMotion()

let ctx: CanvasRenderingContext2D | null = null
let baked: HTMLCanvasElement | null = null
let routes: Route[] = []
let trains: Train[] = []
let width = 0
let height = 0
let dpr = 1
let frame = 0
let lastTime = 0
let resizeTimer = 0

const random = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * 8-way movement, so routes only ever run at 0°, 45° and 90° — the one rule
 * that makes a diagram read as a tube map rather than a road atlas.
 * A fixed-length tuple so index 0 is statically known to exist.
 */
type Compass = readonly [Point, Point, Point, Point, Point, Point, Point, Point]

const DIRECTIONS: Compass = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
]

const step = (from: Point, clockwise: boolean): Point => {
  const index = DIRECTIONS.indexOf(from)
  if (index < 0) return from
  return DIRECTIONS[(index + (clockwise ? 1 : 7)) % DIRECTIONS.length] ?? from
}

const isDiagonal = (direction: Point) => direction.x !== 0 && direction.y !== 0

/**
 * Rotates a heading by one or two 45° steps. Two-step turns land back on an
 * axis, and biasing towards them keeps the diagram mostly orthogonal with
 * occasional 45° links — which is what makes it read as Beck rather than as a
 * road atlas.
 */
const turn = (from: Point, clockwise: boolean): Point => {
  const once = step(from, clockwise)
  if (isDiagonal(once) && Math.random() < 0.55) return step(once, clockwise)
  return once
}

const PALETTE = [
  lines.central,
  lines.victoria,
  lines.circle,
  lines.district,
  lines.elizabeth,
  lines.overground,
  lines.dlr,
  lines.metropolitan,
  lines.bakerloo,
  lines.piccadilly,
]

function buildRoutes() {
  const cell = width < 720 ? 74 : 92
  const cols = Math.ceil(width / cell) + 2
  const rows = Math.ceil(height / cell) + 2
  const count = Math.max(5, Math.min(Math.round((width * height) / 190000), 11))

  routes = []

  for (let r = 0; r < count; r++) {
    const swatch = PALETTE[r % PALETTE.length] ?? lines.victoria

    // Start on an edge and head roughly inward, so routes cross the viewport
    // rather than curling up in one corner.
    const fromLeft = Math.random() < 0.5
    let col = fromLeft ? -1 : cols
    let row = Math.floor(random(-1, rows + 1))
    let direction = DIRECTIONS[fromLeft ? 0 : 4] ?? DIRECTIONS[0]

    const points: Point[] = [{ x: col * cell, y: row * cell }]
    const segments = Math.floor(random(6, 13))

    for (let s = 0; s < segments; s++) {
      // Long straight runs with occasional 45° kinks — Beck, not topography.
      if (Math.random() < 0.42) direction = turn(direction, Math.random() < 0.5)

      const run = Math.floor(random(1, 5))
      const nextCol = col + direction.x * run
      const nextRow = row + direction.y * run
      if (nextRow < -2 || nextRow > rows + 1) {
        direction = turn(direction, direction.y > 0)
        continue
      }
      if (nextCol < -2 || nextCol > cols + 1) break

      col = nextCol
      row = nextRow
      points.push({ x: col * cell, y: row * cell })
    }

    // Run the last leg well past the edge — a route that stops in open space
    // reads as unfinished, where one leaving the frame reads as a map.
    const tail = points[points.length - 1]
    if (tail)
      points.push({ x: tail.x + direction.x * cell * 6, y: tail.y + direction.y * cell * 6 })

    const [first, ...rest] = points
    if (!first || rest.length < 2) continue

    const cumulative = [0]
    let total = 0
    let previous = first
    for (const point of rest) {
      total += Math.hypot(point.x - previous.x, point.y - previous.y)
      cumulative.push(total)
      previous = point
    }

    routes.push({ points, cumulative, hex: swatch.hex, ink: swatch.ink })
  }
}

/** Vertices shared by two or more routes get the interchange marker. */
function findInterchanges(): Point[] {
  const seen = new Map<string, { point: Point; routes: Set<number> }>()

  routes.forEach((route, index) => {
    for (const point of route.points) {
      const key = `${Math.round(point.x)},${Math.round(point.y)}`
      const entry = seen.get(key)
      if (entry) entry.routes.add(index)
      else seen.set(key, { point, routes: new Set([index]) })
    }
  })

  return [...seen.values()].filter((entry) => entry.routes.size > 1).map((entry) => entry.point)
}

function bakeStaticLayer() {
  baked = document.createElement('canvas')
  baked.width = Math.floor(width * dpr)
  baked.height = Math.floor(height * dpr)

  const layer = baked.getContext('2d')
  if (!layer) return
  layer.scale(dpr, dpr)
  layer.lineJoin = 'round'
  layer.lineCap = 'round'

  // Tracks.
  for (const route of routes) {
    const [first, ...rest] = route.points
    if (!first) continue

    layer.beginPath()
    layer.moveTo(first.x, first.y)
    for (const point of rest) layer.lineTo(point.x, point.y)
    layer.strokeStyle = route.hex
    layer.globalAlpha = 0.62
    layer.lineWidth = TRACK
    layer.stroke()
    layer.globalAlpha = 1
  }

  // Station ticks: a short bar across the track, perpendicular to it.
  layer.lineCap = 'butt'
  for (const route of routes) {
    for (let i = 1; i < route.points.length; i++) {
      if (Math.random() > 0.55) continue
      const a = route.points[i - 1]
      const b = route.points[i]
      if (!a || !b) continue

      const at = random(0.3, 0.7)
      const x = a.x + (b.x - a.x) * at
      const y = a.y + (b.y - a.y) * at
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
      const reach = TRACK * 0.95

      layer.beginPath()
      layer.moveTo(x - Math.cos(angle) * reach, y - Math.sin(angle) * reach)
      layer.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach)
      layer.strokeStyle = 'rgba(242, 245, 248, 0.28)'
      layer.lineWidth = 2.4
      layer.stroke()
    }
  }

  // Interchanges: white ring, dark centre.
  for (const point of findInterchanges()) {
    layer.beginPath()
    layer.arc(point.x, point.y, TRACK * 0.95, 0, Math.PI * 2)
    layer.fillStyle = 'rgba(242, 245, 248, 0.34)'
    layer.fill()

    layer.beginPath()
    layer.arc(point.x, point.y, TRACK * 0.48, 0, Math.PI * 2)
    layer.fillStyle = '#0a0c10'
    layer.fill()
  }
}

const lengthOf = (route: Route) => route.cumulative[route.cumulative.length - 1] ?? 0

function spawnTrain(): Train {
  return {
    route: Math.floor(Math.random() * routes.length),
    distance: -random(0, 900),
    speed: random(70, 170),
    length: random(34, 62),
  }
}

function seedTrains() {
  if (!routes.length) {
    trains = []
    return
  }
  const count = Math.max(4, Math.min(Math.round((width * height) / 150000), 12))
  trains = Array.from({ length: count }, spawnTrain)
}

/** Walks a route's polyline and returns the point at `distance` along it. */
function pointAt(route: Route, distance: number): Point | null {
  if (distance < 0 || distance > lengthOf(route)) return null

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

/**
 * Draws the carriage as a short sub-polyline rather than a straight capsule, so
 * a train rounds a corner instead of cutting it.
 */
function drawTrain(train: Train, route: Route) {
  if (!ctx) return

  const steps = 7
  const path: Point[] = []
  for (let s = 0; s <= steps; s++) {
    const point = pointAt(route, train.distance - (train.length * s) / steps)
    if (point) path.push(point)
  }

  const [head, ...tail] = path
  if (!head || tail.length < 1) return

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(head.x, head.y)
  for (const point of tail) ctx.lineTo(point.x, point.y)
  ctx.strokeStyle = route.ink
  ctx.lineWidth = TRACK
  ctx.shadowColor = route.ink
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.shadowBlur = 0

  // Headlight.
  ctx.beginPath()
  ctx.arc(head.x, head.y, TRACK * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fill()
}

function render(time: number) {
  frame = requestAnimationFrame(render)
  if (!ctx || !baked) return

  const delta = Math.min((time - lastTime) / 1000, 0.05)
  lastTime = time

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(baked, 0, 0, width, height)

  for (let i = 0; i < trains.length; i++) {
    const train = trains[i]
    if (!train) continue

    const route = routes[train.route]
    if (!route) {
      trains[i] = spawnTrain()
      continue
    }

    train.distance += train.speed * delta

    // Past the terminus, carriage included — turn it round somewhere else.
    if (train.distance - train.length > lengthOf(route)) {
      trains[i] = spawnTrain()
      continue
    }
    drawTrain(train, route)
  }
}

function paintStaticOnly() {
  if (!ctx || !baked) return
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(baked, 0, 0, width, height)
}

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function start() {
  stop()
  if (reduced.value || document.hidden) {
    paintStaticOnly()
    return
  }
  lastTime = performance.now()
  frame = requestAnimationFrame(render)
}

function build() {
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
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  buildRoutes()
  bakeStaticLayer()
  seedTrains()
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

function onVisibility() {
  if (document.hidden) stop()
  else start()
}

watch(reduced, start)

onMounted(() => {
  lastWidth = window.innerWidth
  build()
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
  opacity: 0.8;
  /* Thin the map out behind the middle of the page so body copy stays legible. */
  -webkit-mask-image: radial-gradient(
    115% 80% at 50% 42%,
    rgba(0, 0, 0, 0.28) 0%,
    rgba(0, 0, 0, 0.45) 45%,
    #000 100%
  );
  mask-image: radial-gradient(
    115% 80% at 50% 42%,
    rgba(0, 0, 0, 0.28) 0%,
    rgba(0, 0, 0, 0.45) 45%,
    #000 100%
  );
}
</style>
