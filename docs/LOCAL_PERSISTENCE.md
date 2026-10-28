# Local persistence

- **Store:** IndexedDB via Dexie, database `ourlegacy`, tables `trees` (whole tree documents, indexed by `id`, `updatedAt`) and `meta`.
- **Preferences** (language, default layout, name order, notice dismissal, last backup time, last-opened times) live in `localStorage` — small and synchronous so the right language renders on first paint.
- **Autosave** (`services/local-storage/autosave.ts`): changes are debounced (500 ms) and written through `TreeRepository.save`. Writes are serialised.
- **Truthful status:** `Saving…` while a change is unsaved, `Saved locally` only after IndexedDB confirmed the write, `Save failed` if it threw. A failure keeps the change pending, shows a banner with *Retry* and *Export JSON*, and the next edit or retry writes it. Data is never silently dropped.
- **Flush points:** tab hidden, `pagehide`, leaving the editor, before import overwrites. A `beforeunload` prompt appears only while saving or after a failure.
- **Recovery:** trees load on startup; refreshing the editor restores the tree.
- **Typed errors:** `quota`, `unavailable` (blocked storage, private modes), `unknown` map to specific user messages.
- **Persistence request:** the app asks the browser for persistent storage (`navigator.storage.persist()`), and Settings reports whether it was granted.
- **Sample tree** is explorable but never written; *Save a copy* writes it as a normal tree.

## Data-loss warnings
Shown on the landing page, dashboard (until a backup is exported), editor sidebar, settings and delete confirmations: clearing browser data, private windows or losing the device can erase trees; export a backup. Nothing implies cloud sync.

## Known limits
- Two tabs editing the same tree: last write wins (no cross-tab locking in v1).
- The dashboard reads full tree documents (photos included) to render previews; fine for typical personal trees.
