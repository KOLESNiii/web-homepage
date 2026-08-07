/**
 * How the trains run.
 *
 * A train brakes into every platform on its line, stands there for a moment
 * and pulls away again, and it brakes for the train in front on exactly the
 * same curve — so a fast train catching a slow one closes up behind it and
 * waits. Two rules hold the queue together:
 *
 *   1. Each route's `trains` array is ordered, front of the queue first.
 *   2. No train is ever allowed past a headway behind the one in front.
 *
 * (2) is applied as a hard clamp after the physics, so overtaking is not
 * merely unlikely — it cannot be represented.
 */

import type { Route, Train } from './network'
import { HEADWAY, syncNextStop } from './network'

/** World px per second per second. */
const ACCEL = 46
const DECEL = 62
/** Anything slower than this at a platform counts as stopped. */
const CREEP = 5
const DWELL_MIN = 0.5
const DWELL_SPAN = 1.9
/** The gap at which a stop earns a full dwell; closer stops get shorter ones. */
const DWELL_REACH = 520

/** The fastest a train may be going and still be able to stop in `gap`. */
const approachSpeed = (gap: number) => Math.sqrt(2 * DECEL * Math.max(gap, 0))

function step(route: Route, train: Train, ahead: Train | undefined, delta: number) {
  if (train.dwell > 0) {
    train.dwell -= delta
    train.speed = 0
    if (train.dwell > 0) return
    train.next += 1
  }

  const platform = route.stops[train.next]
  let limit = train.cruise

  if (platform !== undefined) limit = Math.min(limit, approachSpeed(platform - train.pos))
  if (ahead) limit = Math.min(limit, approachSpeed(ahead.pos - HEADWAY - train.pos))

  train.speed =
    train.speed < limit
      ? Math.min(limit, train.speed + ACCEL * delta)
      : Math.max(limit, train.speed - DECEL * delta)

  train.pos += train.speed * delta

  if (platform !== undefined && train.pos >= platform - 1.5 && train.speed <= CREEP) {
    train.pos = platform
    train.speed = 0
    // Stations a few hundred px apart get a short stop; a train on a stretch
    // of line with one every so often stands for longer.
    const onward = route.stops[train.next + 1]
    const room = onward === undefined ? DWELL_REACH : Math.min(onward - platform, DWELL_REACH)
    train.dwell = DWELL_MIN + Math.random() * DWELL_SPAN * (room / DWELL_REACH)
  }

  // The invariant, independent of the physics above.
  if (ahead) train.pos = Math.min(train.pos, ahead.pos - HEADWAY)
}

/**
 * Front train clear of the far end: send it round to join the back of the
 * queue, which keeps the array ordered and the invariant intact.
 */
function recycle(route: Route) {
  const queue = route.trains
  const front = queue[0]
  const back = queue[queue.length - 1]
  if (!front || !back || front.pos - front.length <= route.length) return

  queue.shift()
  front.pos = Math.min(-front.length, back.pos - HEADWAY - 300 - Math.random() * 1500)
  front.speed = front.cruise
  front.dwell = 0
  syncNextStop(route, front)
  queue.push(front)
}

export function advanceTrains(routes: Route[], delta: number) {
  for (const route of routes) {
    const queue = route.trains
    for (let i = 0; i < queue.length; i++) {
      const train = queue[i]
      if (!train) continue
      step(route, train, queue[i - 1], delta)
    }
    recycle(route)
  }
}
