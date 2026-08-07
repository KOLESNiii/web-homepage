# Graph Report - web-homepage  (2026-08-07)

## Corpus Check
- 31 files · ~17,179 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 239 nodes · 319 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `93c8252a`
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
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `cameraForScroll()` - 11 edges
2. `rebuild()` - 10 edges
3. `tick()` - 9 edges
4. `scripts` - 8 edges
5. `flightAt()` - 8 edges
6. `compilerOptions` - 6 edges
7. `clamp01()` - 6 edges
8. `goTo()` - 6 edges
9. `buildNetwork()` - 6 edges
10. `syncScrollPosition()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `rebuild()` --calls--> `buildNetwork()`  [EXTRACTED]
  src/map/useMap.ts → src/map/network.ts
- `Route` --references--> `LineKey`  [EXTRACTED]
  src/map/network.ts → src/data/portfolio.ts
- `SectionRoute` --references--> `LineKey`  [EXTRACTED]
  src/map/network.ts → src/data/portfolio.ts
- `Metrics` --references--> `Layout`  [EXTRACTED]
  src/map/useMap.ts → src/map/network.ts
- `flatness()` --calls--> `pointAt()`  [EXTRACTED]
  src/map/useMap.ts → src/map/network.ts

## Communities (21 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (34): LineKey, addStation(), arcOnSegment(), Bounds, buildNetwork(), chanceIn(), crossing(), CROSSTOWN (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (38): Layout, pointAt(), activeIndex, Camera, cameraForScroll(), cancelFlight(), clamp01(), easeInOut() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (27): current, map, open, { theme, toggle }, GROUND, stored, systemLight, Theme (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): dependencies, autoprefixer, postcss, vue, vue-router, engines, node, name (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, eslint-plugin-vue, jiti, npm-run-all2, prettier, tailwindcss, @tsconfig/node24 (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (15): draw(), drawInterchanges(), drawRoute(), drawSmoothRoute(), drawStops(), drawTrain(), gauge(), onScreen() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (5): useMap(), router, landing, map, app

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

## Knowledge Gaps
- **105 isolated node(s):** `name`, `version`, `private`, `type`, `node` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Route` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08819345661450925 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10128205128205128 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05689900426742532 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._