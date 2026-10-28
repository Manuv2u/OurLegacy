# Export & import

## Image exports (PNG / PDF)
The export never screenshots the viewport. `prepareExport()` lays out the chosen people, and the tree is rendered **off-screen at natural size** (`ExportSurface`) after web fonts finish loading, then rasterised with `html-to-image`.

**Scope:** entire tree, *branch* (selected person + descendants + their partners) or *ancestors* of the selected person.

**PNG:** resolution 1× / 2× / 3×, ivory / white / transparent background, optional title block. Canvas limits are respected (≤ 16 384 px a side, ≤ 16 M pixels — safe for Safari/iOS); when a tree is too large the pixel ratio is reduced automatically and the user is told.

**PDF** (`pdfPlan.ts`) — deliberate page sizing:
1. If the tree stays readable (scale ≥ 0.6, never enlarged past 1:1) on **A4**, **A3** or **A2** (trying in that order, landscape/portrait chosen from the tree's aspect), it is one centred page.
2. Otherwise: an **overview page** of the whole tree on A3, followed by **A3 detail tiles** cut at 0.8 scale so names stay legible, labelled `page / total · R# C#`.
The plan is shown in the dialog before exporting. Raster density targets ≈ 200 dpi.

Text is part of the raster image, so **Kannada and other scripts always render correctly** (the cost is that PDF text is not selectable). PDF metadata is kept ASCII-safe.

## JSON backup
```json
{ "app": "OurLegacy", "format": "ourlegacy-backup", "schemaVersion": 1, "exportedAt": "…", "trees": [ … ] }
```
Export one tree or all trees. JSON contains everything: names, dates, photos (inline) and stories, in plain text — store it privately.

## Import
1. Parse and validate with Zod (field limits, real dates, enums) and semantic integrity checks (missing references, duplicates, self links, cycles, parent counts). Invalid trees are rejected individually with a reason; valid ones can still be imported.
2. Newer schema versions are refused with an upgrade message. Files > 100 MB are refused.
3. **Photos may only be inline `data:image/…` URLs**, so an imported file can never cause a network request.
4. If a tree id already exists the user chooses *Keep both* (import as copy) or *Replace* (shows a destructive warning). Pending edits are flushed first; if the open tree is replaced the editor reloads it.
