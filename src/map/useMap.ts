/**
 * The camera, and the one journey it makes.
 *
 * Scrolling does not move the page — the page is fixed. Scrolling moves the
 * camera along the line you are on, and the panels, which are pinned to
 * stations in map coordinates, come past you as you go.
 *
 * The scroll range is one continuous journey: a run along each section's line,
 * with a band of scroll between two lines during which the camera pulls back
 * to the whole map, crosses to the next line and drops back in. Clicking a
 * line in the legend makes the same flight on a clock instead of on scroll.
 */

import { computed, reactive, ref, shallowRef } from 'vue'
import { sections } from '../data/portfolio'
import { buildNetwork, pointAt, type Layout, type Network, type Point, type Route } from './network'

export interface Camera {
  /** The world point sitting under the anchor. */
  x: number
  y: number
  zoom: number
  /** Where on screen that point sits, in px. */
  ax: number
  ay: number
}

export interface Metrics {
  vw: number
  vh: number
  /** How wide and how spread out to draw the diagram at this size. */
  layout: Layout
  /** Where the track sits on screen while you are reading. */
  anchorX: number
  anchorY: number
  /** The same, where the line is running across the map instead of down it. */
  flatY: number
  /** Clear space between the track and the panel beside it. */
  panelGap: number
  panelWidth: number
  /** The zoom at which the whole map is on screen. */
  fitZoom: number
  /** Scroll length of one flight between lines. */
  band: number
}

interface Segment {
  kind: 'line' | 'band'
  /** Section index — the one you are on, or the one you are leaving. */
  index: number
  start: number
  length: number
}

/** One end of a flight: a place on the map, and where on screen it sat. */
interface Waypoint {
  x: number
  y: number
  ay: number
}

interface Flight {
  from: Waypoint
  to: Waypoint
  started: number
  duration: number
}

const FLIGHT_MS = 1700
const SCROLL_SPRING = 0.16
const SCROLL_DAMPING = 0.78
/**
 * World px travelled per px scrolled. Above 1 because a station's worth of
 * track is more than a screen of map, and one flick should be about one
 * station rather than a fraction of one. Narrow screens are flicked harder,
 * and their platforms are further apart, so they travel faster still.
 */
const gainFor = (narrow: boolean) => (narrow ? 1.9 : 1.5)
let gain = 1.5

const network = shallowRef<Network | null>(null)
const metrics = ref<Metrics>(measure())
const activeIndex = ref(0)
/** Which platform on that line you are nearest to. */
const platformIndex = ref(0)
/** True while the camera is off the ground: panels are hidden, the map is not. */
const travelling = ref(false)
/** True while the visitor is handling the map directly instead of riding the scroll journey. */
const exploring = ref(true)
const railHeight = ref(0)

const camera = reactive<Camera>({ x: 0, y: 0, zoom: 1, ax: 0, ay: 0 })

let segments: Segment[] = []
let journey = 0
let flight: Flight | null = null
let plane: HTMLElement | null = null
let reduced = false
let scrollPosition = 0
let scrollVelocity = 0
let scrollInitialised = false

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0 || 1))
  return t * t * (3 - 2 * t)
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/* -------------------------------------------------------------------------
   Measurements
   ------------------------------------------------------------------------- */

function measure(bounds?: { minX: number; minY: number; maxX: number; maxY: number }): Metrics {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const narrow = vw <= 760

  const anchorX = narrow ? 28 : Math.min(vw * 0.26, 430)
  const panelGap = narrow ? 30 : 76
  const panelWidth = narrow
    ? Math.max(240, vw - anchorX - panelGap - 18)
    : Math.min(620, vw - anchorX - panelGap - 48)

  const width = bounds ? bounds.maxX - bounds.minX : vw
  const height = bounds ? bounds.maxY - bounds.minY : vh

  // Platforms have to sit further apart than a panel is tall, or the next
  // panel along leans into the one you are reading. Narrow panels are much
  // taller than wide ones for the same words, so they need much more room.
  const spacing = narrow
    ? Math.max(920, Math.min(vh * 1.24, 1240))
    : Math.max(600, Math.min(vh * 0.88, 830))

  // A name needs a line of room rather than a screen of it, so a line of names
  // calls at about five a screen on any size of screen.
  const close = Math.round(Math.max(140, Math.min(vh * 0.2, 210)))

  // Sideways, the gap between two platforms has to clear a whole panel width
  // rather than a panel height, or the next one along sits on this one.
  const across = Math.round(panelWidth + panelGap + 140)

  // A phone sees roughly a third of the world a desktop does, so the diagram
  // is drawn to a third of the width — and it has no room either side of the
  // track, so the lines you read along stay on runs down the map. Only the
  // lines carrying nothing turn and run across it.
  const layout: Layout = narrow
    ? {
        spacing: Math.round(spacing),
        across,
        close,
        closeAcross: Math.round(close * 1.9),
        pitch: 720,
        band: 120,
        jog: 150,
        sideways: false,
      }
    : {
        spacing: Math.round(spacing),
        across,
        close,
        closeAcross: Math.round(close * 1.9),
        pitch: 1300,
        band: 200,
        jog: 260,
        sideways: false,
      }

  return {
    vw,
    vh,
    layout,
    anchorX,
    anchorY: vh * 0.5,
    // Riding a sideways run, the panel hangs below the track rather than
    // beside it, so the track has to sit high enough to leave room under it.
    flatY: vh * 0.3,
    panelGap,
    panelWidth,
    fitZoom: Math.min(vw / width, vh / height) * 0.84,
    band: Math.round(vh * 0.95),
  }
}

/** The middle of the diagram, which is what the pulled-back view centres on. */
function mapCentre(): Point {
  const bounds = network.value?.bounds
  if (!bounds) return { x: 0, y: 0 }
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
}

/** Keep enough diagram under the viewport that a drag can never lose the map altogether. */
function constrainCamera() {
  const bounds = network.value?.bounds
  if (!bounds) return

  const { vw, vh } = metrics.value
  const halfWidth = vw / camera.zoom / 2
  const halfHeight = vh / camera.zoom / 2
  const edge = 72 / camera.zoom

  const minX = bounds.minX - edge + halfWidth
  const maxX = bounds.maxX + edge - halfWidth
  const minY = bounds.minY - edge + halfHeight
  const maxY = bounds.maxY + edge - halfHeight

  camera.x = minX > maxX ? (bounds.minX + bounds.maxX) / 2 : Math.max(minX, Math.min(maxX, camera.x))
  camera.y = minY > maxY ? (bounds.minY + bounds.maxY) / 2 : Math.max(minY, Math.min(maxY, camera.y))
}

/** Put the whole network on the glass, as a real map menu should. */
function fitOverview() {
  const centre = mapCentre()
  camera.x = centre.x
  camera.y = centre.y
  camera.zoom = metrics.value.fitZoom
  camera.ax = metrics.value.vw * 0.5
  camera.ay = metrics.value.vh * 0.5
  constrainCamera()
  writePlane()
}

/** Hand the camera to the visitor without making the picture jump. */
function enterExplore(fit = false) {
  cancelFlight()
  exploring.value = true
  travelling.value = false

  if (fit) {
    fitOverview()
    return
  }

  const { vw, vh } = metrics.value
  camera.x += (vw * 0.5 - camera.ax) / camera.zoom
  camera.y += (vh * 0.5 - camera.ay) / camera.zoom
  camera.ax = vw * 0.5
  camera.ay = vh * 0.5
  constrainCamera()
  writePlane()
}

function panBy(dx: number, dy: number) {
  if (!exploring.value) return
  camera.x -= dx / camera.zoom
  camera.y -= dy / camera.zoom
  constrainCamera()
  writePlane()
}

/** Zoom around the cursor (or the viewport centre for buttons and keyboard). */
function zoomBy(factor: number, screenX = metrics.value.vw * 0.5, screenY = metrics.value.vh * 0.5) {
  if (!exploring.value) return

  const beforeX = camera.x + (screenX - camera.ax) / camera.zoom
  const beforeY = camera.y + (screenY - camera.ay) / camera.zoom
  const minimum = Math.max(0.055, metrics.value.fitZoom * 0.92)
  const next = Math.max(minimum, Math.min(2.4, camera.zoom * factor))

  camera.x = beforeX - (screenX - camera.ax) / next
  camera.y = beforeY - (screenY - camera.ay) / next
  camera.zoom = next
  constrainCamera()
  writePlane()
}

/** Open map mode at a station closely enough that its attached content is readable. */
function focusPlatform(index: number, stop: number, zoom = 0.9) {
  const platforms = network.value?.sections[index]?.platforms ?? []
  const station = platforms[stop]
  if (!station) return

  exploring.value = true
  activeIndex.value = index
  platformIndex.value = stop
  travelling.value = false
  camera.x = station.x
  camera.y = station.y
  camera.zoom = Math.max(metrics.value.fitZoom, zoom)
  camera.ax = metrics.value.anchorX
  camera.ay = station.sideways ? metrics.value.flatY : metrics.value.anchorY
  writePlane()
}

/** Arc length between a section's first and last platform. */
function travelOf(index: number): number {
  const entry = network.value?.sections[index]
  const first = entry?.platforms[0]
  const last = entry?.platforms[(entry?.platforms.length ?? 1) - 1]
  if (!first || !last) return 1
  return Math.max(last.at - first.at, 1)
}

function layOutJourney() {
  const band = metrics.value.band
  segments = []
  let at = 0

  sections.forEach((_, index) => {
    const length = travelOf(index) / gain
    segments.push({ kind: 'line', index, start: at, length })
    at += length
    if (index < sections.length - 1) {
      segments.push({ kind: 'band', index, start: at, length: band })
      at += band
    }
  })

  journey = at
  railHeight.value = Math.round(at + metrics.value.vh)
}

/* -------------------------------------------------------------------------
   Where the camera is
   ------------------------------------------------------------------------- */

/** One end of a flight, using the anchor appropriate to that platform's direction. */
function platformPoint(index: number, stop: 'first' | 'last'): Waypoint {
  const platforms = network.value?.sections[index]?.platforms ?? []
  const station = stop === 'first' ? platforms[0] : platforms[platforms.length - 1]
  return {
    x: station?.x ?? 0,
    y: station?.y ?? 0,
    ay: station?.sideways ? metrics.value.flatY : metrics.value.anchorY,
  }
}

/**
 * How sideways the track is here: 0 running down the map, 1 straight across
 * it. Sampled over a stretch rather than at a point, so the anchor eases
 * across the diagonal into a turn instead of snapping at the corner.
 */
function flatness(route: Route, at: number): number {
  const back = pointAt(route, at - 70)
  const on = pointAt(route, at + 70)
  const dx = Math.abs(on.x - back.x)
  const dy = Math.abs(on.y - back.y)
  if (dx + dy < 1) return 0
  // A 45° diagonal only counts for a little of the lift; a level run for all.
  return clamp01((dx / (dx + dy) - 0.3) / 0.7)
}

/**
 * Pull back until the whole map is on screen, cross to the other line, drop
 * back in. Shared by the scroll bands and by the legend, so a flight looks the
 * same however it was started.
 */
function flightAt(from: Waypoint, to: Waypoint, t: number, into: Camera): Camera {
  const { anchorX, fitZoom, vw, vh } = metrics.value

  // Up on the way out, down on the way back — one bell over the whole flight.
  const lift = t < 0.5 ? smoothstep(0, 0.44, t) : smoothstep(1, 0.56, t)
  const across = easeInOut(clamp01((t - 0.18) / 0.64))
  const centre = mapCentre()

  // Pulled back, the view settles on the middle of the diagram — but not all
  // the way, so the crossing to the other line is still a crossing you watch.
  into.x = mix(mix(from.x, to.x, across), centre.x, lift * 0.86)
  into.y = mix(mix(from.y, to.y, across), centre.y, lift * 0.86)
  into.zoom = mix(1, fitZoom, lift)
  into.ax = mix(anchorX, vw * 0.5, lift)
  into.ay = mix(mix(from.ay, to.ay, across), vh * 0.5, lift)
  return into
}

function segmentAt(scroll: number): Segment | null {
  for (const segment of segments) {
    if (scroll < segment.start + segment.length) return segment
  }
  return segments[segments.length - 1] ?? null
}

/** The camera the scroll position asks for, ignoring any flight in progress. */
function cameraForScroll(scroll: number, into: Camera): Camera {
  const map = network.value
  const segment = segmentAt(Math.max(0, Math.min(scroll, journey)))
  if (!map || !segment) return into

  const t = clamp01((scroll - segment.start) / segment.length)

  if (segment.kind === 'band') {
    const from = platformPoint(segment.index, 'last')
    const to = platformPoint(segment.index + 1, 'first')
    if (reduced) {
      const at = t < 0.5 ? from : to
      into.x = at.x
      into.y = at.y
      into.zoom = 1
      into.ax = metrics.value.anchorX
      into.ay = at.ay
      return into
    }
    return flightAt(from, to, t, into)
  }

  const entry = map.sections[segment.index]
  const platforms = entry?.platforms ?? []
  const first = platforms[0]
  const last = platforms[platforms.length - 1]
  if (!entry || !first || !last) return into

  const at = mix(first.at, last.at, t)
  const point = pointAt(entry.route, at)
  const { anchorX, anchorY, flatY } = metrics.value
  into.x = point.x
  into.y = point.y
  into.zoom = 1
  into.ax = anchorX
  // Beside the track down the map, above it across — the panel needs the room
  // on whichever side of the line it is hanging off.
  into.ay = mix(anchorY, flatY, flatness(entry.route, at))
  return into
}

function sectionForScroll(scroll: number): number {
  const segment = segmentAt(Math.max(0, Math.min(scroll, journey)))
  if (!segment) return 0
  // Halfway through a flight you already belong to the line you are joining.
  if (segment.kind === 'band') {
    return scroll - segment.start > segment.length * 0.5 ? segment.index + 1 : segment.index
  }
  return segment.index
}

/* -------------------------------------------------------------------------
   Driving it
   ------------------------------------------------------------------------- */

/** The platform the camera is closest to on the line it is riding. */
function nearestPlatform(index: number, at: Camera): number {
  const platforms = network.value?.sections[index]?.platforms ?? []
  let best = 0
  let distance = Infinity
  platforms.forEach((platform, stop) => {
    const gap = Math.hypot(platform.x - at.x, platform.y - at.y)
    if (gap < distance) {
      distance = gap
      best = stop
    }
  })
  return best
}

function writePlane() {
  if (!plane) return
  const { zoom, x, y, ax, ay } = camera
  // At reading zoom the translation is rounded, so text lands on whole pixels.
  const tx = ax - x * zoom
  const ty = ay - y * zoom
  const rx = zoom === 1 ? Math.round(tx) : tx
  const ry = zoom === 1 ? Math.round(ty) : ty
  plane.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${zoom})`
}

/** Ease the camera towards the browser's scroll position for a little carry. */
function inertialScroll(target: number): number {
  if (reduced) {
    scrollPosition = target
    scrollVelocity = 0
    scrollInitialised = true
    return target
  }

  if (!scrollInitialised) {
    scrollPosition = target
    scrollInitialised = true
    return target
  }

  scrollVelocity += (target - scrollPosition) * SCROLL_SPRING
  scrollVelocity *= SCROLL_DAMPING
  scrollPosition += scrollVelocity

  if (Math.abs(target - scrollPosition) < 0.5 && Math.abs(scrollVelocity) < 0.5) {
    scrollPosition = target
    scrollVelocity = 0
  }

  return Math.max(0, Math.min(scrollPosition, journey))
}

function syncScrollPosition() {
  scrollPosition = window.scrollY
  scrollVelocity = 0
  scrollInitialised = true
}

/** Called once per frame by the renderer, which owns the animation loop. */
function tick(now: number): Camera {
  if (exploring.value) {
    travelling.value = false
  } else if (flight) {
    const t = clamp01((now - flight.started) / flight.duration)
    flightAt(flight.from, flight.to, t, camera)
    travelling.value = t < 0.86
    if (t >= 1) {
      flight = null
      travelling.value = false
      syncScrollPosition()
    }
  } else {
    const scroll = inertialScroll(window.scrollY)
    cameraForScroll(scroll, camera)
    activeIndex.value = sectionForScroll(scroll)
    travelling.value = camera.zoom < 0.985
  }

  // Free panning should not silently move the visitor's return ticket. When
  // they resume, take them back to the platform where they left the journey.
  if (!exploring.value) platformIndex.value = nearestPlatform(activeIndex.value, camera)

  writePlane()
  return camera
}

/** Scroll offset at which a section's line begins. */
function scrollFor(index: number): number {
  return segments.find((segment) => segment.kind === 'line' && segment.index === index)?.start ?? 0
}

/** Scroll offset that parks the camera at one particular platform. */
function scrollForPlatform(index: number, stop: number): number {
  const platforms = network.value?.sections[index]?.platforms ?? []
  const first = platforms[0]
  const target = platforms[stop]
  if (!first || !target) return scrollFor(index)
  // Arc length into scroll length — the same conversion the segment uses.
  return scrollFor(index) + (target.at - first.at) / gain
}

function jumpTo(scroll: number) {
  window.scrollTo(0, Math.round(scroll))
}

/** Fly to a line: pull back, cross the map, drop in at its first platform. */
function goTo(index: number, stop = 0, animate = true) {
  exploring.value = false
  const target = scrollForPlatform(index, stop)
  // Where the camera stands now, however sideways the line under it was.
  const from: Waypoint = { x: camera.x, y: camera.y, ay: camera.ay }

  jumpTo(target)
  activeIndex.value = index

  if (reduced || !animate) {
    flight = null
    syncScrollPosition()
    cameraForScroll(target, camera)
    writePlane()
    return
  }

  const landing = cameraForScroll(target, { ...camera })
  const to: Waypoint = { x: landing.x, y: landing.y, ay: landing.ay }
  flight = { from, to, started: performance.now(), duration: FLIGHT_MS }
  travelling.value = true
}

/** A user's own scroll always wins: end the flight where it stands. */
function cancelFlight() {
  if (!flight) return
  flight = null
  travelling.value = false
  syncScrollPosition()
}

function rebuild() {
  const previous = network.value ? activeIndex.value : 0

  metrics.value = measure()
  gain = gainFor(metrics.value.vw <= 760)
  const map = buildNetwork(metrics.value.layout)
  network.value = map
  metrics.value = measure(map.bounds)

  layOutJourney()
  if (exploring.value) {
    fitOverview()
  } else {
    jumpTo(scrollFor(previous))
    syncScrollPosition()
    cameraForScroll(window.scrollY, camera)
  }
  writePlane()
}

export function useMap() {
  return {
    network,
    metrics,
    activeIndex,
    platformIndex,
    travelling,
    exploring,
    railHeight,
    camera,
    activeSection: computed(() => sections[activeIndex.value] ?? sections[0]),
    platform: (index: number, stop: number) =>
      network.value?.sections[index]?.platforms[stop] ?? null,
    indexOf: (id: string) => {
      const current = id === 'home' ? 'about' : id === 'stack' ? 'skills' : id
      return sections.findIndex((section) => section.id === current)
    },
    tick,
    goTo,
    enterExplore,
    fitOverview,
    focusPlatform,
    panBy,
    zoomBy,
    cancelFlight,
    rebuild,
    scrollForPlatform,
    setPlane(element: HTMLElement | null) {
      plane = element
      writePlane()
    },
    setReducedMotion(value: boolean) {
      reduced = value
    },
  }
}
