/**
 * The map itself.
 *
 * Every top-level section of the site is a line on one shared diagram, laid
 * out in world coordinates that nothing else on the page shares. The section
 * lines run down their own bands; the rest of the network runs across and
 * between them, so wherever you are there are other lines nearby and the
 * crossings are real crossings rather than decoration.
 *
 * The layout is generated, but from a fixed seed: the map is the same map on
 * every visit and on every rebuild, which is the only way it can be a place
 * you learn your way around.
 *
 * Beck's two rules hold throughout — a run is vertical, horizontal or at 45°,
 * and a line is one colour from end to end.
 */

import type { LineKey } from '../data/portfolio'
import { sections } from '../data/portfolio'

export interface Point {
  x: number
  y: number
}

export interface Station {
  /** Distance along the polyline. */
  at: number
  x: number
  y: number
  /** Perpendicular to the track, so the dash sits across it. */
  angle: number
  /** White circle ringed in black, rather than a single dash. */
  change: boolean
}

export interface Train {
  /** Distance covered, in this route's own direction of travel. */
  pos: number
  speed: number
  length: number
  /** Index into `stops` — the next platform this train calls at. */
  next: number
  /** Seconds left standing at a platform. */
  dwell: number
  /** Cruising speed once it is clear of everything, in world px per second. */
  cruise: number
}

export interface Route {
  key: LineKey
  points: Point[]
  /** Cumulative arc length at each point; the last entry is the total. */
  cumulative: number[]
  length: number
  /** 1 travels with the polyline, -1 against it. */
  direction: 1 | -1
  stations: Station[]
  /** Platform positions in travel space, ascending. */
  stops: number[]
  /** Ordered front of the queue first — the invariant that stops overtaking. */
  trains: Train[]
  /** Resolved from `--tube-<key>` by the renderer, and again on a ground change. */
  colour: string
}

export interface SectionRoute {
  id: string
  label: string
  line: LineKey
  route: Route
  /** The stations this section's panels hang off, in the order you meet them. */
  platforms: Station[]
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface Network {
  routes: Route[]
  sections: SectionRoute[]
  bounds: Bounds
  spacing: number
}

/** How far each line runs past its first and last platform before leaving the map. */
const LEAD = 620
/** Distance between the bands the section lines run down. */
const PITCH = 780
/** How far a line may wander either side of its own band. */
const BAND = 230
/** Lines that run across the map rather than down it. */
const CROSSTOWN: LineKey[] = ['circle', 'metropolitan', 'dlr', 'overground']
/**
 * Lines threaded between and beyond the section bands, in band pitches, so no
 * band is ever the last thing on the map with open country beside it.
 */
const INTERLEAVED: { key: LineKey; at: number }[] = [
  { key: 'jubilee', at: 0.6 },
  { key: 'hammersmith', at: 2.4 },
  { key: 'waterloo', at: 5.5 },
]

/* -------------------------------------------------------------------------
   Deterministic randomness
   ------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Random = () => number

const pick = <T>(rand: Random, options: readonly T[], fallback: T): T =>
  options[Math.floor(rand() * options.length)] ?? fallback

/* -------------------------------------------------------------------------
   Polylines
   ------------------------------------------------------------------------- */

/**
 * A line down its band: vertical runs with a platform in each, joined by 45°
 * jogs. Platforms only ever sit on the vertical runs, so travelling between
 * two of them is a swing sideways and reading at one of them is not.
 */
function runDown(rand: Random, centreX: number, stops: number, spacing: number) {
  const points: Point[] = []
  const platforms: number[] = []

  let x = centreX
  let y = 0

  points.push({ x, y: y - LEAD })

  for (let i = 0; i < stops; i++) {
    platforms.push(points.length)
    points.push({ x, y })
    if (i === stops - 1) break

    let shift = pick(rand, [-220, -140, 0, 0, 140, 220], 0)
    if (Math.abs(x + shift - centreX) > BAND) shift = -shift
    if (Math.abs(x + shift - centreX) > BAND) shift = 0

    // Split the gap either side of the jog, so the platform lands on straight track.
    const run = Math.max(110, (spacing - Math.abs(shift) * Math.SQRT2) / 2)

    y += run
    if (shift !== 0) {
      points.push({ x, y })
      x += shift
      y += Math.abs(shift) // 45°, by construction
      points.push({ x, y })
    }
    y += run
  }

  points.push({ x, y: y + LEAD })
  return { points, platforms }
}

/** A line across the map: horizontal runs joined by 45° jogs. */
function runAcross(rand: Random, centreY: number, from: number, to: number): Point[] {
  const points: Point[] = [{ x: from, y: centreY }]

  let x = from
  let y = centreY

  while (x < to) {
    x += 300 + rand() * 460
    points.push({ x, y })

    let lift = pick(rand, [-200, -120, 0, 120, 200], 0)
    if (Math.abs(y + lift - centreY) > 280) lift = -lift
    if (Math.abs(y + lift - centreY) > 280) continue

    if (lift !== 0) {
      x += Math.abs(lift)
      y += lift
      points.push({ x, y })
    }
  }

  return points
}

function measure(points: Point[]) {
  const cumulative: number[] = [0]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    total += Math.hypot(b.x - a.x, b.y - a.y)
    cumulative.push(total)
  }
  return { cumulative, length: total }
}

/** Perpendicular to the track at a vertex, so a dash sits across it. */
function crossAngle(points: Point[], index: number): number {
  const a = points[Math.max(0, index - 1)]
  const b = points[Math.min(points.length - 1, index + 1)]
  if (!a || !b) return 0
  return Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
}

function toRoute(key: LineKey, points: Point[], direction: 1 | -1): Route {
  const { cumulative, length } = measure(points)
  return {
    key,
    points,
    cumulative,
    length,
    direction,
    stations: [],
    stops: [],
    trains: [],
    colour: '#888',
  }
}

/* -------------------------------------------------------------------------
   Geometry
   ------------------------------------------------------------------------- */

/** Walks a route's polyline and returns the point at `distance` along it. */
export function pointAt(route: Route, distance: number): Point {
  const clamped = Math.max(0, Math.min(distance, route.length))

  let i = 1
  while (i < route.cumulative.length - 1 && (route.cumulative[i] ?? 0) < clamped) i++

  const previous = route.cumulative[i - 1] ?? 0
  const next = route.cumulative[i] ?? previous
  const a = route.points[i - 1]
  const b = route.points[i]
  if (!a || !b) return { x: 0, y: 0 }

  const ratio = (clamped - previous) / (next - previous || 1)
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio }
}

/** Where two segments cross, or null. Every crossing becomes an interchange. */
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

function addStation(route: Route, point: Point, arc: number, angle: number, change: boolean) {
  route.stations.push({ at: arc, x: point.x, y: point.y, angle, change })
}

/** Arc length of a point known to lie on segment `index` of the route. */
function arcOnSegment(route: Route, index: number, point: Point): number {
  const a = route.points[index - 1]
  const base = route.cumulative[index - 1] ?? 0
  if (!a) return base
  return base + Math.hypot(point.x - a.x, point.y - a.y)
}

function placeInterchanges(routes: Route[]) {
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const one = routes[i]
      const two = routes[j]
      if (!one || !two) continue

      for (let a = 1; a < one.points.length; a++) {
        const a1 = one.points[a - 1]
        const a2 = one.points[a]
        if (!a1 || !a2) continue
        const top = Math.min(a1.y, a2.y)
        const bottom = Math.max(a1.y, a2.y)

        for (let b = 1; b < two.points.length; b++) {
          const b1 = two.points[b - 1]
          const b2 = two.points[b]
          if (!b1 || !b2) continue
          // Cheap reject: segments that share no band of the map cannot meet.
          if (Math.max(b1.y, b2.y) < top || Math.min(b1.y, b2.y) > bottom) continue

          const hit = crossing(a1, a2, b1, b2)
          if (!hit) continue

          const angleOne = Math.atan2(a2.y - a1.y, a2.x - a1.x) + Math.PI / 2
          const angleTwo = Math.atan2(b2.y - b1.y, b2.x - b1.x) + Math.PI / 2
          addStation(one, hit, arcOnSegment(one, a, hit), angleOne, true)
          addStation(two, hit, arcOnSegment(two, b, hit), angleTwo, true)
        }
      }
    }
  }
}

/** Plain stations along the lines that carry no panels of their own. */
function placeStations(route: Route, rand: Random, spacing: number) {
  const changes = route.stations.filter((station) => station.change)

  for (let at = spacing * 0.4; at < route.length; at += spacing * (0.55 + rand() * 0.5)) {
    const here = pointAt(route, at)
    const ahead = pointAt(route, Math.min(at + 6, route.length))

    // A dash immediately beside an interchange reads as a smudge, not a station.
    const crowded = changes.some((change) => Math.hypot(change.x - here.x, change.y - here.y) < 110)
    if (crowded) continue

    addStation(route, here, at, Math.atan2(ahead.y - here.y, ahead.x - here.x) + Math.PI / 2, false)
  }
}

/* -------------------------------------------------------------------------
   Trains
   ------------------------------------------------------------------------- */

/** Bumper to bumper minimum. A following train closes up rather than passes. */
export const HEADWAY = 210

function seedTrains(route: Route, rand: Random) {
  // Every station on the line is a platform, in the order this route runs.
  const arcs = route.stations.map((station) => station.at).sort((a, b) => a - b)
  route.stops =
    route.direction === 1 ? arcs : arcs.map((arc) => route.length - arc).sort((a, b) => a - b)

  const count = Math.max(2, Math.min(Math.round(route.length / 2600), 6))
  route.trains = []

  // Laid down front first, each at least a headway behind the last, so the
  // queue starts in the order the no-overtaking rule needs it to stay in.
  let pos = rand() * route.length
  for (let i = 0; i < count; i++) {
    const cruise = 78 + rand() * 66
    route.trains.push({
      pos,
      speed: cruise,
      cruise,
      length: 54 + rand() * 34,
      next: 0,
      dwell: 0,
    })
    pos -= HEADWAY + 260 + rand() * 1100
  }

  for (const train of route.trains) syncNextStop(route, train)
}

/** First platform still ahead of the train. */
export function syncNextStop(route: Route, train: Train) {
  let index = 0
  while (index < route.stops.length && (route.stops[index] ?? Infinity) <= train.pos + 1) index++
  train.next = index
}

/* -------------------------------------------------------------------------
   Building the map
   ------------------------------------------------------------------------- */

export function buildNetwork(spacing: number): Network {
  const routes: Route[] = []
  const sectionRoutes: SectionRoute[] = []

  // Each section's line, built at y = 0 first and shifted into place after,
  // once we know how tall the tallest of them is.
  const drafts = sections.map((section, index) => {
    const rand = mulberry32(0x5eed + index * 977)
    return { section, ...runDown(rand, index * PITCH, section.stops, spacing) }
  })

  const spans = drafts.map((draft) => {
    const first = draft.points[draft.platforms[0] ?? 0]
    const last = draft.points[draft.platforms[draft.platforms.length - 1] ?? 0]
    return (last?.y ?? 0) - (first?.y ?? 0)
  })
  const tallest = Math.max(...spans, spacing)
  const mapHeight = tallest + LEAD * 2

  drafts.forEach((draft, index) => {
    // Centre every line on the same horizon, so the map is a rectangle and not
    // a staircase, and the flight between two lines is a level one.
    const first = draft.points[draft.platforms[0] ?? 0]
    const shift = (mapHeight - (spans[index] ?? 0)) / 2 - (first?.y ?? 0)
    for (const point of draft.points) point.y += shift

    const route = toRoute(draft.section.line, draft.points, 1)
    routes.push(route)
    sectionRoutes.push({
      id: draft.section.id,
      label: draft.section.label,
      line: draft.section.line,
      route,
      platforms: [],
    })
  })

  const left = -PITCH * 1.1
  const right = (sections.length - 1) * PITCH + PITCH * 1.4

  INTERLEAVED.forEach(({ key, at }, index) => {
    const rand = mulberry32(0xbeef + index * 613)
    const draft = runDown(rand, at * PITCH, Math.round(mapHeight / spacing), spacing)
    const first = draft.points[draft.platforms[0] ?? 0]
    const span = spans[0] ?? mapHeight
    for (const point of draft.points) point.y += (mapHeight - span) / 2 - (first?.y ?? 0)
    routes.push(toRoute(key, draft.points, index % 2 === 0 ? 1 : -1))
  })

  CROSSTOWN.forEach((key, index) => {
    const rand = mulberry32(0xc0ffee + index * 421)
    const y = mapHeight * (0.14 + index * 0.24)
    routes.push(toRoute(key, runAcross(rand, y, left, right), index % 2 === 0 ? 1 : -1))
  })

  placeInterchanges(routes)

  // The section lines' own stations are the panels; everything else gets the
  // ordinary spacing of a line running through territory we do not stop in.
  drafts.forEach((draft, index) => {
    const entry = sectionRoutes[index]
    const route = routes[index]
    if (!entry || !route) return

    for (const at of draft.platforms) {
      const point = route.points[at]
      const arc = route.cumulative[at]
      if (!point || arc === undefined) continue

      // A panel station that happens to land on a crossing is an interchange.
      const change = route.stations.some(
        (station) => station.change && Math.hypot(station.x - point.x, station.y - point.y) < 26,
      )
      const platform: Station = {
        at: arc,
        x: point.x,
        y: point.y,
        angle: crossAngle(route.points, at),
        change,
      }
      entry.platforms.push(platform)
      if (!change) route.stations.push(platform)
    }
  })

  for (let index = sections.length; index < routes.length; index++) {
    const route = routes[index]
    if (!route) continue
    placeStations(route, mulberry32(0xfade + index * 149), spacing)
  }

  routes.forEach((route, index) => {
    route.stations.sort((a, b) => a.at - b.at)
    seedTrains(route, mulberry32(0xa11ce + index * 331))
  })

  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }
  for (const route of routes) {
    for (const point of route.points) {
      bounds.minX = Math.min(bounds.minX, point.x)
      bounds.minY = Math.min(bounds.minY, point.y)
      bounds.maxX = Math.max(bounds.maxX, point.x)
      bounds.maxY = Math.max(bounds.maxY, point.y)
    }
  }

  return { routes, sections: sectionRoutes, bounds, spacing }
}
