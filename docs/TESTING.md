# Testing

```bash
npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
```

## Unit & component (Vitest, Testing Library, fake-indexeddb) — `tests/unit`
| File | Covers |
| --- | --- |
| `relationships.test.ts` | validation (self, duplicate, cycles incl. via partners, parent limits), operations, siblings, generations, branches |
| `layout.test.ts`, `navigation.test.ts` | no card overlap (both directions), generations, multi-partner, determinism, connector lanes, keyboard navigation reachability |
| `persistence.test.ts` | repository CRUD, reload recovery, autosave debounce/failure/retry/sample, undo/redo, coalescing |
| `backup.test.ts` | export→import round trip (incl. Kannada, photos), bad JSON/shape/version, broken or cyclic trees, external photo URLs |
| `export-logic.test.ts` | PDF page planning, canvas limits, branch scopes |
| `i18n.test.ts` | Kannada keys match English exactly, placeholders match, plurals, exact privacy copy |
| `dates-names.test.ts` | partial dates, locale formatting, name order, initials in any script |
| `components.test.tsx` | person card (photo, Kannada, name order), landing, person dialog validation/creation/edit preservation |

## End-to-end (Playwright, Chromium) — `tests/e2e`
- **journey** — landing → create tree → add people → verify relationships → refresh → verify recovery → export JSON → delete → import → verify restored data; cycle prevention in the UI; parent limits; form validation; undo/redo; search; keyboard navigation; stories; layout persistence; sample tree; generation shortcuts; **simulated storage failure and recovery**; rename/duplicate/invalid import; import conflict + replace warning; settings and clear-all.
- **localization** — Kannada UI, names, locale dates, search, and PNG/PDF/JSON exports.
- **export** — a 42-person wide tree: PNG is far wider than the viewport, branch export is smaller, PDF becomes overview + tiles.
- **mobile** (Pixel 7 emulation, real touch) — no horizontal overflow on every screen, tap flows, bottom bar + sheets, **pinch-zoom and one-finger pan via synthesized touch events**.
- **a11y** — axe-core WCAG 2.1 AA on landing (English and Kannada), editor, profile, dialogs and dashboard.

## Manual review checklist (done during development)
Desktop/tablet/mobile screenshots; Kannada rendering in cards, profile, PNG and PDF (viewed); both layout directions; connector clarity for in-law families.
