import type { FamilyTree } from '@/types/family';
import { branchOf, buildIndex } from '@/features/relationships/graph';

export type ExportScope = 'full' | 'descendants' | 'ancestors';

/** Which people to include: the whole tree, or a branch around the selected person. */
export function scopeIds(tree: FamilyTree, scope: ExportScope, selectedId: string | null): Set<string> {
  if (scope === 'full' || !selectedId || !tree.people.some((p) => p.id === selectedId)) {
    return new Set(tree.people.map((p) => p.id));
  }
  return branchOf(buildIndex(tree), selectedId, scope);
}
