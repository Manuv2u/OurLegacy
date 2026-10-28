import type { FamilyTree } from '@/types/family';
import { yearOf } from '@/utils/dates';
import { buildIndex, descendantsWithDepth, parentIds, partnerIds } from '@/features/relationships/graph';

export type AgeGroup = 'child' | 'adult' | 'elder';

/** Age group from dates alone, or null when there is no birth year. */
export function groupFromDates(birthDate?: string, deathDate?: string, now = new Date().getFullYear()): AgeGroup | null {
  const born = yearOf(birthDate);
  if (!born) return null;
  const age = (yearOf(deathDate) ?? now) - born;
  return age < 18 ? 'child' : age >= 60 ? 'elder' : 'adult';
}

/**
 * Who is a child, adult or elder? A birth year decides. Without one, the family structure does: someone with
 * grandchildren is an elder, with children an adult, and an unmarried person without children in the youngest
 * generation is a child. A partner of an elder is an elder.
 */
export function inferAgeGroups(tree: Pick<FamilyTree, 'people' | 'relationships'>, now = new Date().getFullYear()): Map<string, AgeGroup> {
  const ix = buildIndex(tree);
  const depthMemo = new Map<string, number>();
  const depth = (id: string, seen = new Set<string>()): number => {
    const cached = depthMemo.get(id);
    if (cached !== undefined) return cached;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parentIds(ix, id);
    const d = ps.length ? 1 + Math.max(...ps.map((p) => depth(p, seen))) : 0;
    depthMemo.set(id, d);
    return d;
  };
  const maxDepth = Math.max(0, ...tree.people.map((p) => depth(p.id)));

  const result = new Map<string, AgeGroup>();
  const fromStructure = new Set<string>();
  for (const p of tree.people) {
    const byDate = groupFromDates(p.birthDate, p.deathDate, now);
    if (byDate) {
      result.set(p.id, byDate);
      continue;
    }
    fromStructure.add(p.id);
    const desc = descendantsWithDepth(ix, p.id);
    if ([...desc.values()].some((d) => d >= 2)) result.set(p.id, 'elder');
    else if (desc.size > 0 || partnerIds(ix, p.id).length > 0) result.set(p.id, 'adult');
    else if (parentIds(ix, p.id).length > 0 && depth(p.id) === maxDepth) result.set(p.id, 'child');
    else result.set(p.id, 'adult');
  }
  for (const id of fromStructure) {
    if (result.get(id) === 'adult' && partnerIds(ix, id).some((q) => result.get(q) === 'elder')) result.set(id, 'elder');
  }
  return result;
}
