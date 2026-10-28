# Product overview

**Promise:** create a beautiful family tree, preserve the stories behind the names, and keep a backup you control.

## Who it is for
Anyone who wants to record their family history without registering: not tied to one family, culture or naming convention.

## Screens
1. **Landing** (`/`) — hero, three benefits (no account, saved in your browser, PNG/PDF export), a fictional sample tree rendered by the real layout engine, features, how-it-works, privacy explanation, final CTA, footer.
2. **Dashboard** (`/app`) — sidebar (My Trees, Create, Import, Sample, Settings, Help), create card, recently-opened tree cards with preview, people count, last-modified date and Open / Rename / Duplicate / Export / Delete.
3. **Editor** (`/app/tree/:id`, `/sample`) — toolbar, left action sidebar, central canvas, right profile panel.
4. **Dialogs** — add/edit person, link existing person, export, import, settings, help, family stories.

## Signature features
- **Family stories** — every profile has a biography written inline; the *Family stories* dialog lists them all.
- **Generational navigation** — grandparents / parents / current generation / children / grandchildren shortcuts frame those people on the canvas; *Highlight branch* dims everyone outside the selected person's lineage.
- **Privacy-first** — the exact notice "Your family tree is saved in this browser. Export a backup to keep a copy safe." appears in the landing page, dashboard, editor sidebar and settings. There are no fake cloud indicators.
- **English & Kannada** — UI, dialogs, errors, empty states, ARIA labels, dates and exports.

## Out of scope for Version 1
Database, backend API, authentication, cloud storage, subscriptions, real-time collaboration.
