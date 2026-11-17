import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { generateSeoPages } from './scripts/generate-seo-pages'

// Prerender /projects/:slug and /academics/:year so deep links resolve to a
// real file on static hosting, and carry per-page metadata for crawlers.
function seoPages(): Plugin {
  let outDir = 'dist'
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const count = await generateSeoPages(outDir)
      console.log(`Generated ${count} crawlable detail pages with route-specific metadata.`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    seoPages(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
