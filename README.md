# web-homepage

Personal portfolio — Vue 3 + Vite + TypeScript, no UI framework.

## Theme

The whole site is a London Underground map, and it holds itself to the map's
own rules:

- **A line is one colour along its whole length.** Nothing draws a single track
  in two colours — where the content needed two identities the diagram grows a
  second line instead (the Path section runs Central and Victoria side by side).
- **Two station symbols, and only two.** A station on one line is a single dash
  across the track in that line's colour; an interchange is a white circle
  ringed in black. Both live in `style.css` as `.stop` and `.stop--change`, so
  every diagram on the page uses the same two marks.
- **Flat.** No glows, no drop shadows. Beck's diagram is line art.
- No roundels anywhere.

The site itself runs on one line — the `spine` in `src/data/portfolio.ts`, which
is Victoria. The nav, the hero's calls-at strip and the spine of the background
map are all that line; each section's own line is set as `--accent` at the top
of that component's scoped styles.

### Two grounds

Light is the printed pocket map on paper; dark is the Night Tube map on
charcoal. It follows the OS until the visitor picks one with the nav toggle,
after which the choice is remembered (`composables/useTheme.ts`, with a matching
inline script in `index.html` so the first paint is never the wrong map).

Official line colours (`--tube-<key>`) are identical on both grounds, because a
line's colour does not depend on the paper. Small text uses `--tube-<key>-ink`,
which does change: #003688 is unreadable on charcoal and #FFD300 is unreadable
on paper.

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
  data/portfolio.ts          all content, plus the line palette and the spine
  style.css                  design tokens, both grounds, the two station marks
  composables/
    reveal.ts                v-reveal directive (IntersectionObserver, one shared observer)
    useMotion.ts             prefers-reduced-motion + rAF throttle
    useTheme.ts              paper/night ground, OS default, remembered choice
  components/
    TubeMap.vue              the journey: canvas network the page travels along
    SiteNav.vue              sections as stations on the spine
    HeroSection.vue          service-status row and a "this line calls at" strip
    AboutSection.vue
    TimelineSection.vue      Work and Education as two parallel lines, plus the results board
    SkillsSection.vue        one line per skill group, one station per item
    ProjectsSection.vue      panning line ≥1024px, vertical route below
    ContactSection.vue
    SiteFooter.vue
```

`TubeMap` lays the network out in document coordinates, not viewport ones. The
spine runs the full height of the page and the camera pans sideways to keep it
in the same place on screen, so scrolling reads as riding it; the other lines
run alongside and every place two of them cross becomes an interchange. Routes
only ever run vertically or at 45°, which is what makes the diagram read as Beck
rather than as a road atlas.

Each line holds its trains in an array ordered by position, and every update
clamps a train to at least a headway behind the one in front of it. That is the
whole no-overtaking rule: a faster train closes up behind a slower one rather
than passing it. When the front train runs off the end it is recycled onto the
back of the queue, which keeps the array ordered and the invariant intact.

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
