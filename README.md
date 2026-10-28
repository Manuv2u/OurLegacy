# OurLegacy

> Your family. Your story. Your legacy.

OurLegacy is a public, general-purpose **family tree builder** that runs entirely in the browser. No account, no backend, no database: each person's trees are stored in their own browser (IndexedDB), with high-quality PNG / PDF / JSON export and English + Kannada throughout.

**Version 1 scope:** frontend only. Accounts, cloud backup, sharing and collaboration are future versions (see [docs/ROADMAP.md](docs/ROADMAP.md)).

## Features

- Multiple trees, created in one click — no sign-up
- People with names (first / middle / last, any naming convention), partial dates, gender (optional), photo, biography and notes
- Relationships: parents (biological or adoptive, multiple), partners (multiple), children, siblings (derived from shared parents), unknown parents
- Relationship labels: select anyone and every card shows what they are to that person (Father, Grandmother, Great-grandfather, Son, Aunt, 2nd cousin…), in English and Kannada
- Interactive canvas (React Flow): pan, zoom, minimap, fit-to-screen, top-to-bottom or left-to-right layout, generation shortcuts, branch highlight
- Validation: no self links, duplicates, missing references or parent-child cycles (including cycles that only appear through partnerships)
- Autosave to IndexedDB with truthful status (`Saving…`, `Saved locally`, `Save failed`), refresh recovery, undo/redo
- Export: PNG, PDF (deliberate page sizing, multi-page for large trees) and JSON backup; import with validation and conflict handling
- Full-tree or branch export — never limited to what is on screen
- English and ಕನ್ನಡ (Kannada) UI, locale-aware dates, Kannada rendering in exports; **names follow the language too** (automatic transliteration, with optional exact spellings per person)
- Responsive (desktop / tablet / mobile with bottom bar + sheets), keyboard accessible, reduced-motion support

## Quick start

```bash
npm install        # .npmrc sets legacy-peer-deps (see docs/ARCHITECTURE.md)
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit/component tests |
| `npm run test:e2e` | Playwright end-to-end tests (builds + serves the app itself) |

First time running e2e tests: `npx playwright install chromium`.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn-style components on Radix primitives · Lucide · `@xyflow/react` · Zustand · Dexie (IndexedDB) · React Hook Form + Zod · `html-to-image` + `jsPDF` · Vitest + Testing Library · Playwright (+ axe).

## Privacy

Family data never leaves the browser: no network calls carry tree data, imported JSON may only contain inline images, and fonts are self-hosted. Because there is no cloud copy, **clearing browser data or losing the device can erase trees — export a backup** (the app says so in the dashboard, editor, settings and landing page).

## Documentation

- [Product overview](docs/PRODUCT_OVERVIEW.md)
- [UI / UX guidelines](docs/UI_UX_GUIDELINES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Family data model](docs/FAMILY_DATA_MODEL.md)
- [Local persistence](docs/LOCAL_PERSISTENCE.md)
- [Export & import](docs/EXPORT_IMPORT.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap & known limitations](docs/ROADMAP.md)

## Before launch

"OurLegacy" is a working name: verify name, domain and trademark availability.
