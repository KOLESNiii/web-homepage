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

import { computed, ref, shallowRef } from 'vue'
import { sections } from '../data/portfolio'
import { buildNetwork, pointAt, type Network, type Point } from './network'

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
  /** Distance between two platforms, along the line. */
  spacing: number
  /** Where the track sits on screen while you are reading. */
  anchorX: number
  anchorY: number
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

interface Flight {
  from: Camera
  to: Camera
  started: number
  duration: number
}

const FLIGHT_MS = 1700
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
const railHeight = ref(0)

const camera: Camera = { x: 0, y: 0, zoom: 1, ax: 0, ay: 0 }

let segments: Segment[] = []
let journey = 0
let flight: Flight | null = null
let plane: HTMLElement | null = null
let reduced = false

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
  const reach = narrow
    ? Math.max(920, Math.min(vh * 1.24, 1240))
    : Math.max(600, Math.min(vh * 0.88, 830))

  return {
    vw,
    vh,
    spacing: Math.round(reach),
    anchorX,
    anchorY: vh * 0.5,
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

function platformPoint(index: number, stop: 'first' | 'last'): Point {
  const platforms = network.value?.sections[index]?.platforms ?? []
  const station = stop === 'first' ? platforms[0] : platforms[platforms.length - 1]
  return { x: station?.x ?? 0, y: station?.y ?? 0 }
}

/**
 * Pull back until the whole map is on screen, cross to the other line, drop
 * back in. Shared by the scroll bands and by the legend, so a flight looks the
 * same however it was started.
 */
function flightAt(from: Point, to: Point, t: number, into: Camera): Camera {
  const { anchorX, anchorY, fitZoom, vw, vh } = metrics.value

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
  into.ay = mix(anchorY, vh * 0.5, lift)
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
      into.ay = metrics.value.anchorY
      return into
    }
    return flightAt(from, to, t, into)
  }

  const entry = map.sections[segment.index]
  const platforms = entry?.platforms ?? []
  const first = platforms[0]
  const last = platforms[platforms.length - 1]
  if (!entry || !first || !last) return into

  const point = pointAt(entry.route, mix(first.at, last.at, t))
  into.x = point.x
  into.y = point.y
  into.zoom = 1
  into.ax = metrics.value.anchorX
  into.ay = metrics.value.anchorY
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

/** Called once per frame by the renderer, which owns the animation loop. */
function tick(now: number): Camera {
  if (flight) {
    const t = clamp01((now - flight.started) / flight.duration)
    flightAt(flight.from, flight.to, t, camera)
    travelling.value = t < 0.86
    if (t >= 1) {
      flight = null
      travelling.value = false
    }
  } else {
    const scroll = window.scrollY
    cameraForScroll(scroll, camera)
    activeIndex.value = sectionForScroll(scroll)
    travelling.value = camera.zoom < 0.985
  }

  platformIndex.value = nearestPlatform(activeIndex.value, camera)

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
function goTo(index: number, stop = 0) {
  const target = scrollForPlatform(index, stop)
  const from: Camera = { ...camera }

  jumpTo(target)
  activeIndex.value = index

  if (reduced) {
    flight = null
    cameraForScroll(target, camera)
    writePlane()
    return
  }

  const to = cameraForScroll(target, { ...camera })
  flight = { from, to, started: performance.now(), duration: FLIGHT_MS }
  travelling.value = true
}

/** A user's own scroll always wins: end the flight where it stands. */
function cancelFlight() {
  if (!flight) return
  flight = null
  travelling.value = false
}

function rebuild() {
  const previous = network.value ? activeIndex.value : 0

  metrics.value = measure()
  gain = gainFor(metrics.value.vw <= 760)
  const map = buildNetwork(metrics.value.spacing)
  network.value = map
  metrics.value = measure(map.bounds)

  layOutJourney()
  jumpTo(scrollFor(previous))
  cameraForScroll(window.scrollY, camera)
  writePlane()
}

export function useMap() {
  return {
    network,
    metrics,
    activeIndex,
    platformIndex,
    travelling,
    railHeight,
    camera,
    activeSection: computed(() => sections[activeIndex.value] ?? sections[0]),
    platform: (index: number, stop: number) =>
      network.value?.sections[index]?.platforms[stop] ?? null,
    indexOf: (id: string) => sections.findIndex((section) => section.id === id),
    tick,
    goTo,
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
