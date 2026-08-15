import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SITE_URL, seoPages } from '../src/seo'

const outputDirectory = join(import.meta.dir, '..', 'dist')
const rootHtml = await readFile(join(outputDirectory, 'index.html'), 'utf8')

const escapeAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

function replaceMeta(html: string, attribute: 'name' | 'property', key: string, value: string) {
  const pattern = new RegExp(
    `<meta\\s+${attribute}=["']${key}["']\\s+content=["'][^"']*["']\\s*/?>`,
    'i',
  )
  const tag = `<meta ${attribute}="${key}" content="${escapeAttribute(value)}" />`
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace('</head>', `    ${tag}\n  </head>`)
}

function pageHtml(path: string, title: string, description: string, type: string) {
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`
  let html = rootHtml
    .replace(/<title>.*?<\/title>/is, `<title>${escapeAttribute(title)}</title>`)
    .replace(
      /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/>/i,
      `<link rel="canonical" href="${canonical}" />`,
    )

  html = replaceMeta(html, 'name', 'description', description)
  html = replaceMeta(html, 'name', 'robots', 'index, follow, max-image-preview:large')
  html = replaceMeta(html, 'property', 'og:type', type)
  html = replaceMeta(html, 'property', 'og:title', title)
  html = replaceMeta(html, 'property', 'og:description', description)
  html = replaceMeta(html, 'property', 'og:url', canonical)
  html = replaceMeta(html, 'name', 'twitter:title', title)
  html = replaceMeta(html, 'name', 'twitter:description', description)
  return html
}

for (const page of seoPages.filter(({ path }) => path !== '/')) {
  const directory = join(outputDirectory, page.path.slice(1))
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, 'index.html'),
    pageHtml(page.path, page.title, page.description, page.type),
  )
}

console.log(`Generated ${seoPages.length - 1} crawlable detail pages with route-specific metadata.`)
