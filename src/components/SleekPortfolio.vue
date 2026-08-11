<template>
  <div class="sleek-shell">
    <a class="sleek-skip" href="#content">Skip to content</a>
    <header class="sleek-header">
      <div class="sleek-header__inner">
        <RouterLink class="sleek-mark" to="/" aria-label="Timofey Kolesnichenko home">
          <span class="sleek-mark__dot" aria-hidden="true"></span>
          <span>TK</span>
        </RouterLink>

        <nav class="sleek-nav" aria-label="Primary navigation">
          <a v-for="item in navItems" :key="item.id" :href="`/#${item.id}`">{{ item.label }}</a>
        </nav>

        <div class="sleek-tools">
          <a class="sleek-experimental" href="/?view=tube" aria-label="Open Experimental tube map">
            <MapPinned :size="15" aria-hidden="true" />
            <span>Experimental</span>
          </a>
          <button class="icon-button" type="button" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggle">
            <Sun v-if="theme === 'dark'" :size="17" aria-hidden="true" />
            <Moon v-else :size="17" aria-hidden="true" />
          </button>
          <a class="sleek-cv" :href="profile.cv" download>
            <span>CV</span>
            <Download :size="15" aria-hidden="true" />
          </a>
          <button class="icon-button sleek-menu-button" type="button" :aria-expanded="menuOpen" :aria-label="menuOpen ? 'Close menu' : 'Open menu'" @click="menuOpen = !menuOpen">
            <Menu v-if="!menuOpen" :size="19" aria-hidden="true" />
            <X v-else :size="19" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-if="menuOpen" class="sleek-mobile-menu">
        <a v-for="item in navItems" :key="item.id" :href="`/#${item.id}`" @click="menuOpen = false">{{ item.label }}</a>
        <a href="/?view=tube" @click="menuOpen = false"><MapPinned :size="15" aria-hidden="true" /> Experimental tube map</a>
        <a :href="profile.cv" download @click="menuOpen = false"><Download :size="15" aria-hidden="true" /> Download CV</a>
      </div>
    </header>

    <main id="content" :key="route.fullPath">
      <template v-if="detail.kind === 'project'">
        <ProjectDetail :project="detail.project!" />
      </template>
      <template v-else-if="detail.kind === 'academics'">
        <AcademicDetail :results="detail.results!" />
      </template>
      <template v-else>
        <section class="sleek-hero" aria-labelledby="hero-title">
          <div class="sleek-hero__copy">
            <p class="eyebrow">{{ profile.role }} · {{ profile.place }}</p>
            <h1 id="hero-title">Timofey<br /><em>Kolesnichenko</em></h1>
            <p class="hero-tagline">{{ profile.tagline }}</p>
            <div class="hero-actions">
              <a class="button button--solid" href="#work">See the work <ArrowUpRight :size="16" aria-hidden="true" /></a>
              <a class="button button--outline" href="#contact">Get in touch</a>
            </div>
          </div>
          <div class="hero-note"><span class="status-dot"></span>{{ contact.status }} · open to graduate roles</div>
        </section>

        <section id="work" class="content-section selected-work" aria-labelledby="work-title">
          <div class="section-heading"><p class="eyebrow">Selected work</p><h2 id="work-title">Things built to hold up.</h2></div>
          <div class="feature-grid">
            <article v-for="project in featuredProjects" :key="project.title" class="feature-project">
              <RouterLink :to="`/projects/${slug(project.title)}`" class="feature-project__media">
                <img v-if="mediaFor(project.title)" :src="mediaFor(project.title)" :alt="`${project.title} project capture`" loading="lazy" />
                <div v-else class="technical-visual" :class="`technical-visual--${slug(project.title)}`" aria-hidden="true"><span>{{ project.tech[0] }}</span><span>{{ project.tech[1] }}</span><span>{{ project.tech[2] }}</span></div>
                <span class="media-arrow"><ArrowUpRight :size="18" aria-hidden="true" /></span>
              </RouterLink>
              <div class="feature-project__copy"><p class="project-meta"><span>{{ project.year }}</span><span>{{ project.tech.slice(0, 3).join(' · ') }}</span></p><h3><RouterLink :to="`/projects/${slug(project.title)}`">{{ project.title }}</RouterLink></h3><p>{{ project.blurb }}</p></div>
            </article>
          </div>
        </section>

        <section class="all-work content-section" aria-labelledby="all-work-title">
          <div class="section-heading section-heading--row"><div><p class="eyebrow">The full line</p><h2 id="all-work-title">All work</h2></div><span class="section-count">{{ projects.length }} projects</span></div>
          <div class="work-list"><RouterLink v-for="project in projects" :key="project.title" class="work-row" :to="`/projects/${slug(project.title)}`"><span class="work-row__year">{{ project.year }}</span><span class="work-row__title">{{ project.title }}<small>{{ project.blurb }}</small></span><span class="work-row__tech">{{ project.tech.join(' · ') }}</span><ArrowUpRight :size="18" aria-hidden="true" /></RouterLink></div>
        </section>

        <section id="path" class="path-section content-section" aria-labelledby="path-title"><div class="section-heading"><p class="eyebrow">Path</p><h2 id="path-title">The route so far.</h2></div><div class="timeline-list"><article v-for="entry in timeline" :key="entry.title" class="timeline-row"><p class="timeline-row__period">{{ entry.period }}</p><div><h3>{{ entry.title }}</h3><p class="timeline-row__org">{{ entry.org }}</p><p>{{ entry.detail }}</p></div></article></div></section>

        <section id="academics" class="academic-band content-section" aria-labelledby="academic-title"><div class="section-heading"><p class="eyebrow">Academic record</p><h2 id="academic-title">The numbers on the board.</h2></div><div class="academic-grid"><RouterLink v-for="record in academicRecords" :key="record.year" :to="`/academics/${record.year.toLowerCase().replace(' ', '-')}`" class="academic-record"><span class="academic-record__year">{{ record.year }}</span><strong>{{ record.average.toFixed(2) }}%</strong><span>{{ record.classification }} · {{ record.recognition }}</span><span class="text-link">View modules <ArrowUpRight :size="15" aria-hidden="true" /></span></RouterLink></div></section>

        <section id="skills" class="skills-section content-section" aria-labelledby="skills-title"><div class="section-heading"><p class="eyebrow">Skills</p><h2 id="skills-title">A practical toolkit.</h2></div><div class="skills-grid"><div v-for="group in skills" :key="group.label" class="skills-group"><h3>{{ group.label }}</h3><ul><li v-for="item in group.items" :key="item">{{ item }}</li></ul></div></div></section>

        <section id="about" class="about-section content-section" aria-labelledby="about-title"><div class="about-section__heading"><p class="eyebrow">About</p><h2 id="about-title">Built low,<br /><em>finished high.</em></h2></div><div class="about-section__copy"><p v-for="paragraph in about" :key="paragraph">{{ paragraph }}</p></div></section>

        <section id="contact" class="contact-section content-section" aria-labelledby="contact-title"><div><p class="eyebrow">Contact</p><h2 id="contact-title">{{ contact.heading }}</h2><p class="contact-status"><span class="status-dot"></span>{{ contact.status }}</p><p class="contact-note">{{ contact.note }}</p></div><div class="contact-actions"><a class="button button--solid" :href="`mailto:${profile.email}`">{{ profile.email }} <ArrowUpRight :size="16" aria-hidden="true" /></a><a class="button button--outline" :href="profile.cv" download>Download CV <Download :size="16" aria-hidden="true" /></a><a class="contact-link" :href="profile.github" target="_blank" rel="noopener">GitHub <ExternalLink :size="15" aria-hidden="true" /></a><a class="contact-link" :href="profile.linkedin" target="_blank" rel="noopener">LinkedIn <ExternalLink :size="15" aria-hidden="true" /></a></div></section>
      </template>
    </main>
    <footer class="sleek-footer"><span>© {{ year }} {{ profile.name }} · built with Vue</span><button type="button" @click="scrollTop">Back to the start <ArrowUp :size="15" aria-hidden="true" /></button></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowUp, ArrowUpRight, Download, ExternalLink, MapPinned, Menu, Moon, Sun, X } from 'lucide-vue-next'
import { about, academics, contact, firstYearAcademics, profile, projects, skills, timeline } from '../data/portfolio'
import { useTheme } from '../composables/useTheme'
import { capture } from '../analytics'

const route = useRoute()
const { theme, toggle } = useTheme()
const menuOpen = ref(false)
const year = new Date().getFullYear()
const navItems = [{ id: 'work', label: 'Work' }, { id: 'path', label: 'Path' }, { id: 'skills', label: 'Skills' }, { id: 'about', label: 'About' }, { id: 'contact', label: 'Contact' }]
const featuredTitles = new Set(['Fed Up', 'Roomie', 'DemocraTune'])
const featuredProjects = projects.filter((project) => featuredTitles.has(project.title))
const academicRecords = [academics, firstYearAcademics]
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const media: Record<string, string> = {
  'Fed Up': 'https://raw.githubusercontent.com/KOLESNiii/Fed-Up/master/docs/readme-assets/meal-plan.png',
  Roomie: 'https://raw.githubusercontent.com/dorianturner/Roomie/master/app/src/main/res/drawable/roomie_name_logo.png',
  DemocraTune: 'https://raw.githubusercontent.com/KOLESNiii/DemocraTune/develop/src/app/opengraph-image.png',
}
const mediaFor = (title: string) => media[title]
let sectionObserver: IntersectionObserver | null = null
const detail = computed(() => {
  if (route.name === 'project') {
    const project = projects.find((item) => slug(item.title) === route.params.slug)
    if (project) return { kind: 'project' as const, project }
  }
  if (route.name === 'academics') {
    const results = academicRecords.find((record) => record.year.toLowerCase().replace(' ', '-') === route.params.year)
    if (results) return { kind: 'academics' as const, results }
  }
  return { kind: 'home' as const }
})

function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
function updateMeta() {
  const project = detail.value.project
  const title = project ? `${project.title} — Timofey Kolesnichenko` : detail.value.results ? `${detail.value.results.year} results — Timofey Kolesnichenko` : 'Timofey Kolesnichenko — Software Engineer'
  const description = project?.description ?? 'Computing student at Imperial College London building compilers, kernels and interfaces.'
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${window.location.origin}${route.fullPath}`)
  if (detail.value.kind !== 'home') capture('portfolio_detail_viewed', { view_mode: 'sleek', route: route.fullPath, detail_type: detail.value.kind, detail_label: project?.title ?? detail.value.results?.year })
}
watch(() => route.fullPath, updateMeta, { immediate: true })
onMounted(() => {
  if (detail.value.kind !== 'home') return
  sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) capture('portfolio_section_viewed', { view_mode: 'sleek', section_id: (entry.target as HTMLElement).id })
    }
  }, { threshold: 0.55 })
  document.querySelectorAll<HTMLElement>('.sleek-shell main section[id]').forEach((section) => sectionObserver?.observe(section))
})
onUnmounted(() => sectionObserver?.disconnect())
</script>

<script lang="ts">
import { defineComponent, h, ref as vueRef } from 'vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import type { AcademicResults, Project } from '../data/portfolio'

const ProjectDetail = defineComponent({
  props: { project: { type: Object as () => Project, required: true } },
  setup(props) {
    const stages = ['Source', 'Parser + type checker', 'Three-address IR', 'AArch64 / x86-64', 'Garbage collection']
    const active = vueRef(0)
    return () => h('article', { class: 'detail-page' }, [
      h('div', { class: 'detail-page__top' }, [h('a', { href: '/', class: 'text-link' }, [h(ArrowLeft, { size: 15 }), ' All work'])]),
      h('header', { class: 'detail-hero' }, [h('p', { class: 'eyebrow' }, `${props.project.year} · project detail`), h('h1', props.project.title), h('p', { class: 'detail-hero__blurb' }, props.project.blurb)]),
      props.project.title === 'WACC Compiler' ? h('div', { class: 'wacc-pipeline', role: 'tablist', 'aria-label': 'Compiler stages' }, stages.map((stage, index) => h('button', { class: ['pipeline-stage', { 'is-active': active.value === index }], role: 'tab', 'aria-selected': active.value === index, onClick: () => { active.value = index } }, [h('span', String(index + 1).padStart(2, '0')), stage]))) : null,
      props.project.title === 'WACC Compiler' ? h('div', { class: 'wacc-output', 'aria-live': 'polite' }, `Stage ${active.value + 1}: ${stages[active.value]}. Trace the compiler from source through optimisation and runtime memory management.`) : h('div', { class: ['detail-visual', `detail-visual--${props.project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`] }, props.project.tech.join('  /  ')),
      h('div', { class: 'detail-grid' }, [h('div', { class: 'detail-copy' }, [h('p', props.project.description)]), h('aside', { class: 'detail-facts' }, [h('p', { class: 'eyebrow' }, 'Built with'), h('ul', props.project.tech.map((item) => h('li', item))), props.project.repo ? h('a', { class: 'text-link', href: props.project.repo, target: '_blank', rel: 'noopener' }, [h(ExternalLink, { size: 15 }), ' Source']) : h('p', { class: 'detail-request' }, 'Source available upon request.')])]),
      h('nav', { class: 'detail-next' }, [h('a', { href: '/projects/fed-up', class: 'text-link' }, [h(ArrowLeft, { size: 15 }), ' Previous']), h('a', { href: '/projects/guitar-scar', class: 'text-link' }, ['Next ', h(ArrowRight, { size: 15 })])]),
    ])
  },
})

const AcademicDetail = defineComponent({
  props: { results: { type: Object as () => AcademicResults, required: true } },
  setup(props) {
    return () => h('article', { class: 'detail-page academic-detail' }, [h('div', { class: 'detail-page__top' }, [h('a', { href: '/', class: 'text-link' }, [h(ArrowLeft, { size: 15 }), ' Back home'])]), h('header', { class: 'detail-hero' }, [h('p', { class: 'eyebrow' }, 'Academic record'), h('h1', props.results.year), h('p', { class: 'academic-detail__score' }, `${props.results.average.toFixed(2)}% · ${props.results.classification}`), h('p', props.results.recognition)]), h('div', { class: 'results-table-wrap' }, [h('table', [h('caption', `${props.results.year} modules`), h('thead', [h('tr', [h('th', 'Code'), h('th', 'Module'), h('th', 'Mark')])]), h('tbody', props.results.modules.map((module) => h('tr', [h('td', module.code ?? '—'), h('td', [module.title, module.registrationStatus ? h('small', module.registrationStatus) : null]), h('td', String(module.mark))])))])]), h('a', { href: '/', class: 'button button--outline' }, 'Back to the portfolio')])
  },
})

export default { components: { ProjectDetail, AcademicDetail } }
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap');

:root { --sleek-bg: #f7f8f6; --sleek-surface: #fff; --sleek-text: #171a18; --sleek-muted: #66706b; --sleek-rule: #d8ded9; --sleek-accent: #145cff; --sleek-green: #3f7d64; --sleek-coral: #b84d3a; }
:root[data-theme='dark'] { --sleek-bg: #0e1110; --sleek-surface: #151a17; --sleek-text: #f1f4f0; --sleek-muted: #a6b0a9; --sleek-rule: #2b342f; --sleek-accent: #7ea7ff; --sleek-green: #78b997; --sleek-coral: #f08a73; }
.sleek-shell { min-height: 100vh; background: var(--sleek-bg); color: var(--sleek-text); font-family: Manrope, system-ui, sans-serif; font-size: 16px; line-height: 1.6; }
.sleek-header { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid color-mix(in srgb, var(--sleek-rule) 80%, transparent); background: color-mix(in srgb, var(--sleek-bg) 92%, transparent); backdrop-filter: blur(14px); }
.sleek-header__inner { max-width: 80rem; height: 72px; margin: auto; padding: 0 clamp(20px, 4vw, 64px); display: flex; align-items: center; gap: 32px; }
.sleek-mark, .sleek-nav a, .sleek-experimental, .sleek-cv, .sleek-mobile-menu a { color: inherit; text-decoration: none; }
.sleek-mark { display: inline-flex; align-items: center; gap: 9px; font: 500 13px/1 JetBrains Mono, monospace; letter-spacing: .08em; }
.sleek-mark__dot, .status-dot { width: 9px; height: 9px; border: 2px solid var(--sleek-text); border-radius: 50%; display: inline-block; }
.sleek-mark:hover .sleek-mark__dot, .sleek-mark:focus-visible .sleek-mark__dot { border-color: var(--sleek-accent); background: var(--sleek-accent); }
.sleek-nav { display: flex; gap: 24px; margin-left: auto; }
.sleek-nav a, .sleek-experimental, .sleek-cv { font-size: 12px; color: var(--sleek-muted); }
.sleek-nav a:hover, .sleek-experimental:hover, .sleek-cv:hover, .contact-link:hover, .text-link:hover { color: var(--sleek-accent); }
.sleek-tools { display: flex; align-items: center; gap: 8px; }
.sleek-experimental, .sleek-cv { display: inline-flex; align-items: center; gap: 7px; }
.sleek-experimental { color: var(--sleek-accent); }
.sleek-cv { padding-left: 16px; border-left: 1px solid var(--sleek-rule); }
.icon-button { width: 38px; height: 38px; display: inline-grid; place-items: center; border: 1px solid var(--sleek-rule); border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.icon-button:hover { border-color: var(--sleek-accent); color: var(--sleek-accent); }
.sleek-menu-button, .sleek-mobile-menu { display: none; }
.sleek-skip { position: fixed; z-index: 40; top: 12px; left: 12px; padding: 8px 12px; background: var(--sleek-surface); color: var(--sleek-text); transform: translateY(-150%); }
.sleek-skip:focus { transform: none; }
.sleek-hero { max-width: 80rem; min-height: min(64svh, 620px); margin: auto; padding: clamp(60px, 10vw, 110px) clamp(20px, 8vw, 128px) 36px; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid var(--sleek-rule); }
.sleek-hero__copy { max-width: 920px; }
.eyebrow, .project-meta, .section-count, .timeline-row__period, .academic-record__year { font: 500 11px/1.3 JetBrains Mono, monospace; letter-spacing: .09em; text-transform: uppercase; color: var(--sleek-muted); }
.sleek-hero h1, .section-heading h2, .about-section h2, .contact-section h2, .detail-hero h1 { margin: 18px 0 0; font: 400 clamp(58px, 8vw, 132px)/.9 'Instrument Serif', Georgia, serif; letter-spacing: 0; }
.sleek-hero h1 em, .about-section h2 em { color: var(--sleek-accent); font-style: italic; }
.hero-tagline { max-width: 480px; margin-top: 30px; color: var(--sleek-muted); font-size: 18px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 34px; }
.button { display: inline-flex; align-items: center; gap: 9px; min-height: 44px; padding: 10px 16px; border: 1px solid var(--sleek-text); color: inherit; text-decoration: none; font-size: 13px; transition: transform .2s ease, background-color .2s ease, color .2s ease; }
.button:hover { transform: translateY(-2px); }
.button--solid { background: var(--sleek-text); color: var(--sleek-bg); }
.button--solid:hover { background: var(--sleek-accent); border-color: var(--sleek-accent); color: white; }
.button--outline { border-color: var(--sleek-rule); }
.button--outline:hover { border-color: var(--sleek-accent); color: var(--sleek-accent); }
.hero-note { display: flex; align-items: center; gap: 9px; margin-top: auto; align-self: flex-end; color: var(--sleek-muted); font-size: 12px; }
.hero-note .status-dot, .contact-status .status-dot { border-color: var(--sleek-green); background: var(--sleek-green); }
.content-section { max-width: 80rem; margin: auto; padding: clamp(76px, 10vw, 148px) clamp(20px, 6vw, 96px); }
.selected-work { padding-top: 56px; }
.selected-work .section-heading { margin-bottom: 26px; }
.section-heading { margin-bottom: 46px; }
.section-heading--row { display: flex; justify-content: space-between; align-items: flex-end; }
.section-heading h2, .contact-section h2 { font-size: clamp(45px, 6vw, 88px); color: var(--sleek-text); }
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(20px, 3vw, 48px); }
.feature-project__media { position: relative; display: block; aspect-ratio: 1.2; overflow: hidden; background: var(--sleek-surface); }
.feature-project__media img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.feature-project__media:hover img { transform: scale(1.03); }
.media-arrow { position: absolute; right: 14px; bottom: 14px; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; background: var(--sleek-surface); color: var(--sleek-text); }
.feature-project__copy { padding-top: 17px; }
.project-meta { display: flex; justify-content: space-between; gap: 10px; }
.feature-project h3 { margin-top: 12px; font: 500 28px/1.1 Manrope, sans-serif; }
.feature-project h3 a { color: inherit; text-decoration: none; }
.feature-project h3 a:hover { color: var(--sleek-accent); }
.feature-project__copy > p:last-child { margin-top: 8px; color: var(--sleek-muted); font-size: 14px; }
.technical-visual { height: 100%; padding: 28px; display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; background: var(--sleek-surface); border: 1px solid var(--sleek-rule); font: 500 13px JetBrains Mono, monospace; color: var(--sleek-accent); }
.technical-visual span { border-bottom: 1px solid var(--sleek-rule); padding-bottom: 7px; }
.all-work { border-top: 1px solid var(--sleek-rule); }
.section-count { white-space: nowrap; }
.work-list { border-top: 1px solid var(--sleek-rule); }
.work-row { display: grid; grid-template-columns: 80px minmax(0, 1.2fr) minmax(220px, 1fr) 20px; align-items: center; gap: 20px; padding: 22px 0; border-bottom: 1px solid var(--sleek-rule); color: inherit; text-decoration: none; }
.work-row:hover { color: var(--sleek-accent); }
.work-row__title { font-size: 18px; font-weight: 600; color: var(--sleek-text); }
.work-row:hover .work-row__title { color: var(--sleek-accent); }
.work-row__title small { display: block; margin-top: 4px; color: var(--sleek-muted); font-size: 12px; font-weight: 400; }
.work-row__tech { color: var(--sleek-muted); font-size: 12px; }
.path-section, .contact-section { max-width: none; background: var(--sleek-surface); }
.path-section > *, .contact-section > *, .academic-band > *, .skills-section > *, .about-section > * { max-width: 80rem; margin-left: auto; margin-right: auto; }
.timeline-list { border-top: 1px solid var(--sleek-rule); }
.timeline-row { display: grid; grid-template-columns: 220px minmax(0, 650px); gap: 40px; padding: 28px 0; border-bottom: 1px solid var(--sleek-rule); }
.timeline-row h3 { font-size: 20px; font-weight: 600; }
.timeline-row__org { margin-top: 4px; color: var(--sleek-accent); font-size: 13px; }
.timeline-row div > p:last-child { margin-top: 12px; color: var(--sleek-muted); font-size: 14px; }
.academic-grid { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid var(--sleek-rule); }
.academic-record { display: flex; flex-direction: column; gap: 8px; padding: 28px 30px 30px 0; border-bottom: 1px solid var(--sleek-rule); color: inherit; text-decoration: none; }
.academic-record + .academic-record { padding-left: 30px; border-left: 1px solid var(--sleek-rule); }
.academic-record strong { font: 400 62px/1 'Instrument Serif', Georgia, serif; }
.academic-record > span:not(.academic-record__year):not(.text-link) { color: var(--sleek-muted); font-size: 13px; }
.text-link { display: inline-flex; align-items: center; gap: 7px; color: var(--sleek-accent); text-decoration: none; font-size: 13px; }
.academic-record .text-link { margin-top: 16px; }
.skills-section { border-top: 1px solid var(--sleek-rule); }
.skills-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--sleek-rule); }
.skills-group { padding: 22px 20px 0 0; }
.skills-group + .skills-group { padding-left: 20px; border-left: 1px solid var(--sleek-rule); }
.skills-group h3 { font-size: 15px; font-weight: 600; }
.skills-group ul { margin-top: 14px; padding: 0; list-style: none; color: var(--sleek-muted); font-size: 14px; }
.skills-group li + li { margin-top: 5px; }
.about-section { display: grid; grid-template-columns: 1fr 1fr; gap: 8vw; border-top: 1px solid var(--sleek-rule); }
.about-section h2 { margin-top: 18px; font-size: clamp(48px, 6vw, 84px); }
.about-section__copy { max-width: 560px; color: var(--sleek-muted); font-size: 16px; }
.about-section__copy p + p { margin-top: 24px; }
.contact-section { display: grid; grid-template-columns: 1.2fr .8fr; gap: 8vw; }
.contact-section h2 { margin-top: 15px; max-width: 620px; }
.contact-status { display: flex; align-items: center; gap: 9px; margin-top: 25px; color: var(--sleek-green); font: 500 12px JetBrains Mono, monospace; text-transform: uppercase; letter-spacing: .08em; }
.contact-note { max-width: 610px; margin-top: 22px; color: var(--sleek-muted); }
.contact-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; justify-content: flex-end; }
.contact-link { display: inline-flex; align-items: center; gap: 7px; margin-top: 6px; color: inherit; text-decoration: none; font-size: 14px; }
.sleek-footer { max-width: 80rem; margin: auto; padding: 22px clamp(20px, 6vw, 96px) 30px; display: flex; justify-content: space-between; gap: 18px; color: var(--sleek-muted); font: 11px JetBrains Mono, monospace; }
.sleek-footer button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.sleek-footer button:hover { color: var(--sleek-accent); }
.detail-page { max-width: 80rem; margin: auto; padding: 46px clamp(20px, 6vw, 96px) 100px; animation: detail-in .35s ease both; }
@keyframes detail-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.detail-page__top { margin-bottom: 70px; }
.detail-hero { max-width: 780px; padding-bottom: 58px; }
.detail-hero h1 { font-size: clamp(60px, 9vw, 132px); }
.detail-hero__blurb { max-width: 540px; margin-top: 24px; color: var(--sleek-muted); font-size: 20px; }
.detail-visual { min-height: 300px; display: grid; place-items: center; margin-bottom: 60px; padding: 30px; background: var(--sleek-surface); border: 1px solid var(--sleek-rule); color: var(--sleek-accent); font: 14px JetBrains Mono, monospace; text-align: center; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(220px, .6fr); gap: 8vw; border-top: 1px solid var(--sleek-rule); padding-top: 32px; }
.detail-copy { max-width: 680px; font-size: 18px; line-height: 1.75; }
.detail-facts { border-left: 1px solid var(--sleek-rule); padding-left: 24px; }
.detail-facts ul { margin: 15px 0 25px; padding: 0; list-style: none; color: var(--sleek-muted); font-size: 13px; }
.detail-facts li + li { margin-top: 6px; }
.detail-request { color: var(--sleek-muted); font-size: 13px; }
.detail-next { display: flex; justify-content: space-between; margin-top: 80px; padding-top: 22px; border-top: 1px solid var(--sleek-rule); }
.wacc-pipeline { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--sleek-rule); border-bottom: 1px solid var(--sleek-rule); }
.pipeline-stage { min-height: 92px; padding: 14px; border: 0; border-right: 1px solid var(--sleek-rule); background: transparent; color: var(--sleek-muted); text-align: left; cursor: pointer; font-size: 12px; }
.pipeline-stage span { display: block; margin-bottom: 18px; font: 11px JetBrains Mono, monospace; color: var(--sleek-accent); }
.pipeline-stage.is-active, .pipeline-stage:hover { background: var(--sleek-surface); color: var(--sleek-text); }
.wacc-output { margin: 0 0 60px; padding: 18px 20px; background: var(--sleek-surface); color: var(--sleek-muted); font: 13px/1.6 JetBrains Mono, monospace; }
.academic-detail__score { margin-top: 22px; font: 28px 'Instrument Serif', Georgia, serif; color: var(--sleek-accent); }
.results-table-wrap { overflow-x: auto; border-top: 1px solid var(--sleek-rule); }
.results-table-wrap table { width: 100%; border-collapse: collapse; text-align: left; }
.results-table-wrap caption { padding: 18px 0; text-align: left; font: 500 12px JetBrains Mono, monospace; text-transform: uppercase; color: var(--sleek-muted); }
.results-table-wrap th, .results-table-wrap td { padding: 15px 12px 15px 0; border-bottom: 1px solid var(--sleek-rule); vertical-align: top; }
.results-table-wrap th { font: 500 11px JetBrains Mono, monospace; text-transform: uppercase; color: var(--sleek-muted); }
.results-table-wrap td:last-child { font: 500 14px JetBrains Mono, monospace; color: var(--sleek-accent); }
.results-table-wrap small { display: block; margin-top: 5px; color: var(--sleek-muted); font-size: 11px; }
.academic-detail > .button { margin-top: 40px; }

@media (max-width: 900px) { .sleek-nav { display: none; } .sleek-tools { margin-left: auto; } .sleek-menu-button { display: inline-grid; } .sleek-experimental { display: none; } .sleek-mobile-menu { display: grid; gap: 14px; padding: 18px 20px 24px; border-top: 1px solid var(--sleek-rule); } .sleek-mobile-menu a { display: flex; align-items: center; gap: 8px; font-size: 14px; } .feature-grid { grid-template-columns: 1fr; gap: 54px; } .feature-project__media { aspect-ratio: 1.55; } .skills-grid { grid-template-columns: repeat(2, 1fr); } .skills-group:nth-child(3) { border-left: 0; padding-left: 0; } .skills-group:nth-child(n+3) { border-top: 1px solid var(--sleek-rule); padding-top: 22px; } .about-section, .contact-section { grid-template-columns: 1fr; gap: 40px; } .contact-actions { justify-content: start; } }
@media (max-width: 620px) { .sleek-header__inner { height: 62px; padding: 0 16px; } .sleek-cv { display: none; } .sleek-hero { min-height: 60svh; padding: 58px 20px 24px; } .sleek-hero h1 { font-size: 60px; } .hero-tagline { font-size: 16px; } .hero-note { align-self: start; margin-top: 42px; } .content-section { padding: 72px 20px; } .section-heading h2, .contact-section h2 { font-size: 50px; } .work-row { grid-template-columns: 48px minmax(0, 1fr) 18px; gap: 10px; } .work-row__tech { display: none; } .timeline-row { grid-template-columns: 1fr; gap: 8px; } .academic-grid, .skills-grid { grid-template-columns: 1fr; } .academic-record, .academic-record + .academic-record { padding: 22px 0; border-left: 0; } .skills-group, .skills-group + .skills-group { padding-left: 0; border-left: 0; } .skills-group + .skills-group { border-top: 1px solid var(--sleek-rule); padding-top: 22px; } .sleek-footer { flex-direction: column; padding: 22px 20px 28px; } .detail-page { padding: 34px 20px 70px; } .detail-page__top { margin-bottom: 55px; } .detail-hero h1 { font-size: 62px; } .detail-grid { grid-template-columns: 1fr; gap: 36px; } .detail-facts { border-left: 0; border-top: 1px solid var(--sleek-rule); padding: 24px 0 0; } .wacc-pipeline { grid-template-columns: 1fr 1fr; } .pipeline-stage { border-bottom: 1px solid var(--sleek-rule); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
</style>
