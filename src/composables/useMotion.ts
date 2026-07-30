import { onUnmounted, ref } from 'vue'

/** Tracks `prefers-reduced-motion` and stays live if the user flips it mid-session. */
export function useReducedMotion() {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = ref(query.matches)

  const onChange = (event: MediaQueryListEvent) => {
    reduced.value = event.matches
  }
  query.addEventListener('change', onChange)
  onUnmounted(() => query.removeEventListener('change', onChange))

  return reduced
}

/**
 * Coalesces high-frequency events (scroll, resize) into one callback per frame.
 * Returns the listener to register plus a cancel for teardown.
 */
export function rafThrottle<T extends (...args: never[]) => void>(fn: T) {
  let frame = 0
  const wrapped = (...args: Parameters<T>) => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      fn(...args)
    })
  }
  wrapped.cancel = () => {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
  return wrapped
}
