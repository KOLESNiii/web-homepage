# web-homepage

Personal portfolio — Vue 3 + Vite + TypeScript, no UI framework.

## Theme

The whole site is a London Underground map. Official TfL line colours live in
`lines` at the top of `src/data/portfolio.ts` and everything else references
them by key: sections, timeline entries, skill groups and projects each pick a
line, and the components render the map conventions (tracks, station ticks,
white double-ring interchanges, terminus fades). No roundels anywhere.

Each line colour ships with an `ink` variant — the true Piccadilly navy and
District green are unreadable as 12px text on black, so thick strokes use `hex`
and small text uses `ink`.

## Before publishing

All copy lives in **`src/data/portfolio.ts`**. Nothing is hard-coded in components.

- **`public/cv.pdf` is the October 2025 CV.** It predates the LCP Delta
  internship and the Year 2 results, both of which are already on the page.
  Replace the file when you next update the PDF — the path doesn't change.
  Note it also carries your phone number, which the page itself does not.
- `contact.note` states you're applying through the 2027 cycle — the one `TODO`
  left in the data file.
- `timeline[0].period` says "Summer 2026"; set the actual start month if you'd
  rather be precise.
- `projects[].repo` / `projects[].demo` are optional. Set either and a "Source" /
  "Live" link renders automatically. The university projects live on the Imperial
  GitLab and deliberately carry no link.

Stats in the About section (project count, average, classification) are derived
from the data, so they can't drift out of sync.

## Structure

```
src/
  data/portfolio.ts          all content, plus the line palette
  style.css                  design tokens, base, shared primitives
  composables/
    reveal.ts                v-reveal directive (IntersectionObserver, one shared observer)
    useMotion.ts             prefers-reduced-motion + rAF throttle
  components/
    TubeMap.vue              procedural map backdrop on <canvas>, with trains
    SiteNav.vue              sections as stops on one line; the travelled length fills
    HeroSection.vue          service-status row and a "this line calls at" strip
    AboutSection.vue
    TimelineSection.vue      one station per role, plus the Year 2 results board
    SkillsSection.vue        one line per skill group, one station per item
    ProjectsSection.vue      panning line ≥1024px, vertical route below
    ContactSection.vue
    SiteFooter.vue
```

`TubeMap` bakes the static network into an offscreen canvas once per resize and
only redraws the trains each frame, so per-frame cost is independent of how
dense the map is. It pauses on `visibilitychange` and drops to a static render
under `prefers-reduced-motion`. Routes only turn in 45° steps, biased towards
landing back on an axis — that bias is what makes it read as Beck rather than as
a road atlas.

`ProjectsSection` swaps between the panning line and the vertical route with
`v-if` on a `matchMedia` query rather than CSS `display`, so there's exactly one
`id="work"` for the nav anchor and scroll-spy.

## Setup

```sh
bun install
bun dev          # dev server
bun run build    # type-check + production build
bun lint
bun run format
```
