# Family data model

`src/types/family.ts` — independent of any rendering or storage library. `SCHEMA_VERSION = 1`.

```ts
FamilyTree  { id, name, schemaVersion, createdAt, updatedAt, people: Person[], relationships: Relationship[], layout?: { direction } }
Person      { id, firstName, middleName?, lastName?, gender?, birthDate?, deathDate?, photo?, biography?, notes?, createdAt, updatedAt }
Relationship{ id, type: 'parent-child' | 'partner', sourceId, targetId, kind?: 'biological' | 'adoptive' }
```

- People and relationships are stored separately. For `parent-child`, `sourceId` is the parent and `targetId` the child. Partner order is meaningless.
- **Siblings are derived** from shared parents (full vs half). They are never stored.
- **Names**: any combination of first / middle / last (at least one is required). A display *name order* setting supports family-name-first conventions.
- **Names in other languages**: `names?: { kn?, en? }` holds optional per-language spellings (first/middle/last). The stored `firstName`/`lastName` stay exactly as typed. For display, `localizedParts()` picks an explicit spelling when there is one, otherwise transliterates by script (Latin ↔ Kannada, `utils/transliterate.ts`, rule-based and offline), so names on the chart, in the profile, in search and in exports follow the app language. Transliteration is a phonetic approximation (e.g. long vowels typed as `a`); set the exact spelling in the profile's *Name in other languages* section.
- **Living / deceased**: `isDeceased?` (a death date also implies deceased).
- **Dates** are partial ISO strings: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, validated for real calendar dates; formatted per locale in UTC (no time-zone drift).
- **Photos** are downscaled JPEG data URLs stored inline.

## Invariants (enforced by `features/relationships/validation.ts`)
| Rule | Error code |
| --- | --- |
| No self relationships | `self` |
| Both people exist | `missingPerson` |
| No duplicate parent→child or partner links (either direction) | `duplicate` |
| No ancestry cycles — including cycles that only appear through partnerships | `cycle` / `partnerConflict` |
| At most two *biological* parents (extra parents must be adoptive) | `tooManyParents` |

The cycle check contracts partner-connected people into clusters and requires the parent→child graph over clusters to be acyclic. That also guarantees every person can be placed in a consistent generation row.

`findIntegrityIssues()` applies the same rules to whole trees (used on import). `addRelative()` is all-or-nothing: if any link is invalid the original tree is returned untouched with the error.

## Migrations
`parseBackup()` routes each tree through `migrateTree()`; today it only stamps the current version. Newer-than-supported versions are rejected with a clear message.
