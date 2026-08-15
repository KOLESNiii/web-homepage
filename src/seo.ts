import { academics, firstYearAcademics, projects } from './data/portfolio'

export const SITE_URL = 'https://www.timkolesnichenko.me'

export interface SeoPage {
  path: string
  title: string
  description: string
  type: 'profile' | 'article'
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const summarise = (lead: string, detail: string) => {
  const description = `${lead}. ${detail}`
  if (description.length <= 158) return description

  const shortened = description.slice(0, 155)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastSpace > 110 ? lastSpace : 155)}…`
}

export const seoPages: SeoPage[] = [
  {
    path: '/',
    title: 'Tim Kolesnichenko — Software Engineer',
    description:
      'Computing student at Imperial College London building compilers, operating systems and polished interfaces. Explore projects, experience and academic results.',
    type: 'profile',
  },
  ...projects.map((project) => ({
    path: `/projects/${slugify(project.title)}`,
    title: `${project.title} — Tim Kolesnichenko`,
    description: summarise(project.blurb, project.description),
    type: 'article' as const,
  })),
  ...[academics, firstYearAcademics].map((results) => ({
    path: `/academics/${slugify(results.year)}`,
    title: `${results.year} results — Tim Kolesnichenko`,
    description: `${results.year} MEng Computing results at Imperial College London: ${results.average.toFixed(2)}% average, ${results.classification}, ${results.recognition}.`,
    type: 'article' as const,
  })),
]

export const seoForPath = (path: string) => seoPages.find((page) => page.path === path)
