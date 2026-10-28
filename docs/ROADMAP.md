# Roadmap & limitations

## Version 1 (this release)
Frontend only: IndexedDB, import/export, English/Kannada.

## Version 2 (not implemented)
Optional accounts, cloud backup, cross-device access, shareable trees. The `TreeRepository` interface is the seam: add a remote implementation and keep the UI.

## Version 3 (not implemented)
Invite relatives, collaboration permissions, change history, shared stories.

## Known limitations
- Trees live in one browser; no sync. Export/import JSON to move them.
- Cards cannot be dragged to custom positions; layout is automatic (top-to-bottom or left-to-right).
- When both partners come from known families, one family's subtree is placed under its own parents and the other is drawn as a separate branch linked by a longer connector.
- PDF text is rasterised (not selectable) to guarantee Kannada rendering.
- PNG of enormous trees is automatically reduced in resolution to stay within browser canvas limits.
- Concurrent edits from two tabs: last write wins.
- Only English and Kannada UI languages; right-to-left languages are not supported yet.
- No GEDCOM import/export yet.
