# Graph Report - web-homepage  (2026-08-07)

## Corpus Check
- 31 files · ~16,832 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 234 nodes · 309 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8a4bac9`
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
2. `rebuild()` - 9 edges
3. `scripts` - 8 edges
4. `flightAt()` - 8 edges
5. `tick()` - 7 edges
6. `compilerOptions` - 6 edges
7. `clamp01()` - 6 edges
8. `buildNetwork()` - 6 edges
9. `goTo()` - 5 edges
10. `runLine()` - 5 edges

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
Nodes (35): Layout, pointAt(), activeIndex, Camera, cameraForScroll(), clamp01(), easeInOut(), flatness() (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (28): current, map, open, { theme, toggle }, GROUND, stored, systemLight, Theme (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (8): scripts, build, build-only, dev, format, lint, preview, type-check

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (28): dependencies, autoprefixer, postcss, vue, vue-router, devDependencies, eslint, eslint-plugin-vue (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (15): draw(), drawInterchanges(), drawRoute(), drawSmoothRoute(), drawStops(), drawTrain(), gauge(), onScreen() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (4): router, landing, map, app

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

- **Why does `scripts` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Route` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08819345661450925 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06031746031746032 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._