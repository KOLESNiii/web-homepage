# web-homepage

## Analytics

PostHog is initialized when `VITE_POSTHOG_KEY` is set. Copy
`.env.example` to `.env.local` for local testing, then replace the token and
host with the values from the PostHog project settings. Set the same variables
in the deployment environment.

In addition to PostHog pageviews, page leaves, autocapture, heatmaps, and
session replay, the site records these portfolio-specific events:

- `portfolio_section_viewed` and `portfolio_stop_viewed` show which parts of
  the journey visitors reached. Every stop event includes stable pane metadata:
  `pane_id`, `pane_type`, `pane_label`, `pane_index`, and the containing section.
- `portfolio_section_time` and `portfolio_stop_time` include an exact integer
  `duration_ms` property (plus `duration_seconds` for convenience). Summing
  `duration_ms` grouped by `pane_id` gives the total engaged time for each
  project, timeline entry, skill, results board, or contact pane. Background-tab
  time and camera-travel time are excluded; map mode uses actual viewport
  intersection to time every readable pane on screen.

Session replay masks all input values.

Personal portfolio — Vue 3 + Vite + TypeScript, no UI framework.

## Theme

The site is not a page with a map behind it. It **is** a map, and you travel it.

Every top-level section is a line of its own, in one official TfL colour from
end to end, and its content is the stations along that line. Scrolling rides
the line you are on. Scrolling off the end of one line — or picking another out
of the legend — pulls the camera back until the whole network is on screen,
crosses to the new line, and drops back in.

The map's own rules hold throughout:

- **A line is one colour along its whole length.** Nothing draws a single track
  in two colours, anywhere.
- **A run is vertical, horizontal or at 45°.** That, more than anything, is
  what makes a diagram read as Beck's rather than as a road atlas. Every line
  uses all three: a section line runs down its band, swings across a long
  diagonal between two stations, and every so often turns and strikes out
  sideways for a stop or two before heading down again.
- **Two station symbols, and only two.** A stop on one line is a single dash
  across the track in that line's colour — where the dash carries a panel it is
  simply drawn long enough to reach it. An interchange, where two lines
  actually cross, is a white circle ringed in black, drawn last and at full
  strength: on the real map it is solid however faint the lines through it are.
- **Flat.** No glows, no drop shadows. Beck's diagram is line art.
- No roundels anywhere.

Trains run on every line. Each one brakes into every platform on its route,
stands there a moment and pulls away again — and it brakes for the train in
front on exactly the same curve, so a fast train catching a slow one closes up
behind it instead of passing.

### The lines

| Section | Line       |
| ------- | ---------- |
| About   | Victoria   |
| Path    | Central    |
| Skills  | District   |
| Work    | Elizabeth  |
| Contact | Bakerloo   |

The other eight official lines make up the rest of the network: Jubilee,
Hammersmith & City, Piccadilly, Metropolitan and Waterloo & City thread between
and beyond the section bands, and Circle, DLR and Overground run across them.
Those carry no content, so they wander freely — level runs, climbs, dips and
the occasional plunge straight down. Every place two lines cross becomes an interchange,
geometrically — interchanges are not placed by hand.

A stop's content sits where a station name sits on the real map: beside the
track on a run down, and below it on a run across, where beside would mean on
top of the line. The camera lifts to leave the room when it is riding one of
those. A phone has room on neither side, so there the lines you read along stay
on runs down the map and only the ones carrying nothing turn.

### Two grounds

Light is the printed pocket map on paper; dark is the Night Tube map on
charcoal. It follows the OS until the visitor picks one with the legend's
toggle, after which the choice is remembered (`composables/useTheme.ts`, with a
matching inline script in `index.html` so the first paint is never the wrong
map).

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

`sections[].stops` is derived from the content, so adding a project grows the
Elizabeth line a station for it, and adding a skill grows the District line
one, with no layout to update either way. A section marked `close: true` is one
whose stops are boxed names rather than panels — it calls at about five a
screen instead of one. The About stats (project count, average, classification) are
derived too, so they can't drift out of sync.

## Structure

```
src/
  data/portfolio.ts          all content, the line palette, and each section's line
  style.css                  design tokens, both grounds, the two station marks
  map/
    network.ts               builds the diagram: lines, stations, interchanges
    trains.ts                braking, dwelling, and the no-overtaking rule
    useMap.ts                the camera, the journey, and scroll
  composables/
    useMotion.ts             prefers-reduced-motion + rAF throttle
    useTheme.ts              paper/night ground, OS default, remembered choice
  components/
    TubeMap.vue              the diagram, drawn, and the animation loop
    MapLine.vue              one section's line: its id, and whether you're on it
    MapPanel.vue             one panel, pinned to one platform
    SiteNav.vue              the legend, and the "where you are" readout
    JourneyMenu.vue          optional route chooser
    MapControls.vue          pan, zoom, fit, and journey controls
    AboutSection.vue         Victoria line: landing, introduction, bio, and stats
    TimelineSection.vue      Central line, ending at the results board
    SkillsSection.vue        District line, one stop per skill, a name each
    ProjectsSection.vue      Elizabeth line, one station per project
    ContactSection.vue       Bakerloo line, ending at the terminus and the footer
```

### How the travelling works

Nothing on the page scrolls. `.rail` is an empty div as tall as the journey and
the only thing in normal flow; everything you see is in a fixed layer. Scroll
position is read as a distance along the map, and the camera in `map/useMap.ts`
turns that into a transform on one element — the plane holding every panel —
while `TubeMap.vue` draws the diagram underneath with the same camera.

The scroll range is laid out as a journey: a run along each line, and a band of
scroll between two lines during which the camera pulls back, crosses and drops
in. Picking a line from the legend makes the identical flight on a clock
instead of on scroll, so the two never read as different mechanisms.

`#work` and the like still work as entry points. The fragment is spent on
arrival — taken out of the URL — because a section is `display: contents` and
has no box, so the browser's own attempt to scroll to it lands at the top.

Because the page does not scroll, focus cannot scroll either — so a panel
brings the camera to itself when focus lands inside it. Panels of lines you are
not riding are faded out and take no clicks, but they stay in the document and
in the tab order, so a keyboard or screen reader user travels the whole journey
rather than one line of it.

Each line holds its trains in an array ordered by position, and every update
clamps a train to at least a headway behind the one in front. That is the whole
no-overtaking rule; the braking curve makes it look like driving rather than
like a clamp. When the front train runs off the end it is recycled onto the back
of the queue, which keeps the array ordered and the invariant intact.

The layout is generated but seeded, so the map is the same map on every visit
and every rebuild — it has to be somewhere you can learn your way around.

## Setup

```sh
bun install
bun dev          # dev server
bun run build    # type-check + production build
bun lint
bun run format
```
