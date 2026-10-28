# Architecture

```
src/
  app/                    router, error boundary, providers
  components/ui/          shadcn-style primitives (Radix + Tailwind)
  components/layout/      logo, language switcher, scaling helper
  features/
    landing/ dashboard/   marketing + library screens
    family-tree/          canvas, cards, edges, layout engine, editor shell
    people/               person form/dialog, profile panel
    relationships/        graph queries, validation, pure operations  (no UI)
    stories/              biography editor + stories dialog
    export/               PNG/PDF/JSON exporters, PDF planning
    import/               import dialog
    settings/             settings + help
  i18n/                   typed en/kn dictionaries, useI18n
  lib/                    backup format (zod), settings, images, downloads
  services/local-storage/ Dexie db, TreeRepository, autosave
  stores/                 zustand: editor (tree + history), ui, settings
  types/                  family data model
  utils/                  dates, names, ids
```

## Layers and boundaries
- **Domain** (`types/`, `features/relationships`, `features/family-tree/layout.ts`) is pure TypeScript with no React, React Flow or storage imports. It is unit-tested in isolation.
- **Rendering** consumes the layout result. `layoutTree()` returns card positions and routed edge polylines; React Flow only displays them (custom node + edge types, invisible handles). The same layout drives `StaticTree`, used by the landing preview, dashboard thumbnails and exports.
- **Persistence** is behind `TreeRepository` (`services/local-storage/treeRepository.ts`). The UI never imports Dexie. A future cloud implementation can satisfy the same interface.
- **State**: one Zustand editor store owns the open tree and its undo/redo history. Every change goes through `commit(updater)`; autosave subscribes to the store.

## Layout engine
1. People joined by partner links form *clusters* (couples, or a person with several partners).
2. Clusters are layered by longest path over the cluster DAG (partners always share a row).
3. Each cluster hangs under one *anchor* parent cluster (the nearest generation); other parent links are drawn as longer connectors.
4. Subtrees are packed left-to-right, parents centred over children, siblings ordered by the child's own birth date.
5. Families joined by a marriage (a couple whose members have parents in two different family trees) are ordered **side by side**; the marrying couple is placed on the side facing its other family so the connecting line stays short.
6. Parent→child connectors are grouped per family (a partner pair or lone parent). Each family gets its own lane (greedy interval packing, so non-overlapping families can share a lane) and the gap between generations grows with the number of lanes it must hold, so lines never sit a few pixels apart.
7. Work happens in abstract (breadth, depth) coordinates, so top-to-bottom and left-to-right share one algorithm.

## Undo / redo
Snapshot history (`name`, `people`, `relationships`, `layout`) with structural sharing, capped at 100 entries. Edits tagged with a `coalesceKey` (typing a story) within 1.5 s collapse into one step. Pointer movement (pan/zoom) is never recorded.

## Dependency notes
- TypeScript is pinned to 6.x because `typescript-eslint` does not yet support 7.
- `.npmrc` sets `legacy-peer-deps=true`: npm 10's resolver crashes (`Cannot read properties of null (reading 'edgesOut')`) on this dependency set otherwise.
- The editor route and export libraries are code-split; `jsPDF` is loaded only when a PDF is exported.

## Kinship labels
`features/relationships/kinship.ts` answers "who is X to the selected person?" purely from parent-child and partner links plus gender (father, mother, grandfather, great-grandfather, son, sibling / half-sibling, uncle/aunt, nephew/niece, nth cousin n times removed, step-parent, in-laws, adoptive parent/child). `kinshipLabels.ts` words each relation in English and Kannada (e.g. ತಂದೆ, ಅಜ್ಜ, ಮುತ್ತಜ್ಜ, ಮೊಮ್ಮಗ; elder/younger siblings ಅಣ್ಣ/ತಮ್ಮ/ಅಕ್ಕ/ತಂಗಿ and paternal/maternal uncles from birth dates). When gender is not recorded neutral wording is used ("Parent"). Labels appear on cards for the selected person (toggle: *Relationship labels*) and next to each relative in the profile.
