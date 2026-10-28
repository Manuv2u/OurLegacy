import { SCHEMA_VERSION, type FamilyTree, type LayoutDirection } from '@/types/family';
import { newId, nowIso } from '@/utils/id';

export function createEmptyTree(name: string, direction: LayoutDirection): FamilyTree {
  const now = nowIso();
  return {
    id: newId('t'),
    name: name.trim() || 'Untitled',
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    people: [],
    relationships: [],
    layout: { direction },
  };
}

/** A copy with a new tree id; people and relationship ids are scoped to a tree so they can stay. */
export function duplicateTree(tree: FamilyTree, name: string): FamilyTree {
  const now = nowIso();
  return structuredClone({ ...tree, id: newId('t'), name, createdAt: now, updatedAt: now });
}
