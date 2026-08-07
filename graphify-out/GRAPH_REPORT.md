# Graph Report - web-homepage  (2026-08-08)

## Corpus Check
- 33 files · ~21,097 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 295 nodes · 411 edges · 22 communities (20 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a92e01c6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 21|Community 21]]

## God Nodes (most connected - your core abstractions)
1. `cameraForScroll()` - 11 edges
2. `rebuild()` - 11 edges
3. `writePlane()` - 9 edges
4. `tick()` - 9 edges
5. `scripts` - 8 edges
6. `flightAt()` - 8 edges
7. `pointAt()` - 7 edges
8. `compilerOptions` - 6 edges
9. `clamp01()` - 6 edges
10. `fitOverview()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `rebuild()` --calls--> `buildNetwork()`  [EXTRACTED]
  src/map/useMap.ts → src/map/network.ts
- `drawTrain()` --calls--> `pointAt()`  [EXTRACTED]
  src/components/TubeMap.vue → src/map/network.ts
- `render()` --calls--> `advanceTrains()`  [EXTRACTED]
  src/components/TubeMap.vue → src/map/trains.ts
- `Route` --references--> `LineKey`  [EXTRACTED]
  src/map/network.ts → src/data/portfolio.ts
- `SectionRoute` --references--> `LineKey`  [EXTRACTED]
  src/map/network.ts → src/data/portfolio.ts

## Communities (22 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (34): LineKey, addStation(), arcOnSegment(), Bounds, buildNetwork(), chanceIn(), crossing(), CROSSTOWN (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (45): Layout, pointAt(), activeIndex, Camera, cameraForScroll(), cancelFlight(), clamp01(), constrainCamera() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (17): about, AcademicResults, academics, contact, firstYearAcademics, Line, lineColour(), Module (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): dependencies, autoprefixer, postcss, vue, vue-router, engines, node, name (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (11): current, map, open, { theme, toggle }, GROUND, stored, systemLight, Theme (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (28): clamp01(), cssColour(), dragging, draw(), drawInterchanges(), drawRoundedRoute(), drawRoute(), drawSmoothRoute() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (5): router, landing, map, welcome, app

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): Before publishing, code:block1 (src/), code:sh (bun install), How the travelling works, Setup, Structure, The lines, Theme (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (8): compilerOptions, module, moduleResolution, noEmit, tsBuildInfoFile, types, extends, include

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (7): compilerOptions, paths, tsBuildInfoFile, exclude, extends, include, @/*

### Community 10 - "Community 10"
Cohesion: 0.40
Nodes (4): printWidth, $schema, semi, singleQuote

### Community 11 - "Community 11"
Cohesion: 0.40
Nodes (3): platform, sideways, style

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, eslint-plugin-vue, jiti, npm-run-all2, prettier, tailwindcss, @tsconfig/node24 (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (25): about, alternateName, availability, applicationCycle, graduation, heading, note, status (+17 more)

## Knowledge Gaps
- **135 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 12` to `Community 3`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `pointAt()` connect `Community 1` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08819345661450925 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09158186864014801 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._