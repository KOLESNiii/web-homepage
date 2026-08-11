import { ref, watch } from 'vue'

/**
 * Two grounds, both taken from real maps: the printed pocket map on paper, and
 * the Night Tube map on charcoal. Everything else in the palette is derived
 * from whichever is current — see the `[data-theme]` blocks in style.css.
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'portfolio-theme'
const LEGACY_STORAGE_KEY = 'tube-theme'

/** Must match --bg in style.css; used for the browser chrome colour. */
const GROUND: Record<Theme, string> = { light: '#f7f8f6', dark: '#0e1110' }

const read = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
  } catch {
    return null
  }
}

const write = (value: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* Private mode, embedded webview — the theme just won't persist. */
  }
}

const systemLight = window.matchMedia('(prefers-color-scheme: light)')

const stored = read()
/** Module-level, so the canvas and the nav read the same source of truth. */
const theme = ref<Theme>(
  stored === 'light' || stored === 'dark' ? stored : systemLight.matches ? 'light' : 'dark',
)

function apply(value: Theme) {
  document.documentElement.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', GROUND[value])
}

apply(theme.value)

watch(theme, (value) => {
  apply(value)
  write(value)
})

// Follow the OS until the visitor states a preference of their own.
systemLight.addEventListener('change', (event) => {
  if (read()) return
  theme.value = event.matches ? 'light' : 'dark'
})

export function useTheme() {
  return {
    theme,
    toggle() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    },
  }
}
