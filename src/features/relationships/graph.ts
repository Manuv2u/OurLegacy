import type { FamilyTree, Person, Relationship } from '@/types/family';

/** Read-only adjacency index derived from a tree. Rebuild whenever the tree changes. */
export interface TreeIndex {
  people: Map<string, Person>;
  /** child id -> parent relationships */
  parentRels: Map<string, Relationship[]>;
  /** parent id -> child relationships */
  childRels: Map<string, Relationship[]>;
  /** person id -> partner ids */
  partners: Map<string, string[]>;
}

export function buildIndex(tree: Pick<FamilyTree, 'people' | 'relationships'>): TreeIndex {
  const people = new Map(tree.people.map((p) => [p.id, p]));
  const parentRels = new Map<string, Relationship[]>();
  const childRels = new Map<string, Relationship[]>();
  const partners = new Map<string, string[]>();
  const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
    const list = m.get(k);
    if (list) list.push(v);
    else m.set(k, [v]);
  };
  for (const r of tree.relationships) {
    if (r.type === 'parent-child') {
      push(parentRels, r.targetId, r);
      push(childRels, r.sourceId, r);
    } else {
      push(partners, r.sourceId, r.targetId);
      push(partners, r.targetId, r.sourceId);
    }
  }
  return { people, parentRels, childRels, partners };
}

export const parentIds = (ix: TreeIndex, id: string): string[] => (ix.parentRels.get(id) ?? []).map((r) => r.sourceId);
export const childIds = (ix: TreeIndex, id: string): string[] => (ix.childRels.get(id) ?? []).map((r) => r.targetId);
export const partnerIds = (ix: TreeIndex, id: string): string[] => ix.partners.get(id) ?? [];

export interface Siblings {
  full: string[];
  half: string[];
}

/** Siblings are derived from shared parents — never stored. */
export function siblingsOf(ix: TreeIndex, id: string): Siblings {
  const mine = new Set(parentIds(ix, id));
  const candidates = new Set<string>();
  for (const parent of mine) for (const child of childIds(ix, parent)) if (child !== id) candidates.add(child);
  const full: string[] = [];
  const half: string[] = [];
  for (const sib of candidates) {
    const theirs = new Set(parentIds(ix, sib));
    const same = theirs.size === mine.size && [...theirs].every((p) => mine.has(p));
    (same ? full : half).push(sib);
  }
  return { full, half };
}

/** All ancestors reachable through parent links, mapped to their distance (parents = 1). */
export function ancestorsWithDepth(ix: TreeIndex, id: string): Map<string, number> {
  const out = new Map<string, number>();
  let frontier = [id];
  let depth = 0;
  while (frontier.length) {
    depth++;
    const next: string[] = [];
    for (const f of frontier) {
      for (const p of parentIds(ix, f)) {
        if (!out.has(p) && p !== id) {
          out.set(p, depth);
          next.push(p);
        }
      }
    }
    frontier = next;
  }
  return out;
}

export function descendantsWithDepth(ix: TreeIndex, id: string): Map<string, number> {
  const out = new Map<string, number>();
  let frontier = [id];
  let depth = 0;
  while (frontier.length) {
    depth++;
    const next: string[] = [];
    for (const f of frontier) {
      for (const c of childIds(ix, f)) {
        if (!out.has(c) && c !== id) {
          out.set(c, depth);
          next.push(c);
        }
      }
    }
    frontier = next;
  }
  return out;
}

/** People exactly `depth` generations above (`depth` > 0) or below (`depth` < 0) a person. */
export function relativesAtGeneration(ix: TreeIndex, id: string, depth: number): string[] {
  if (depth === 0) return [id];
  const map = depth > 0 ? ancestorsWithDepth(ix, id) : descendantsWithDepth(ix, id);
  return [...map].filter(([, d]) => d === Math.abs(depth)).map(([pid]) => pid);
}

export type BranchMode = 'descendants' | 'ancestors';

/**
 * The people making up a "branch" of a person: the person plus all descendants
 * (or ancestors) and their partners so that couples stay together.
 */
export function branchOf(ix: TreeIndex, id: string, mode: BranchMode): Set<string> {
  const core = new Set<string>([id]);
  const related = mode === 'descendants' ? descendantsWithDepth(ix, id) : ancestorsWithDepth(ix, id);
  for (const k of related.keys()) core.add(k);
  const withPartners = new Set(core);
  for (const pid of core) for (const partner of partnerIds(ix, pid)) withPartners.add(partner);
  return withPartners;
}

/** A tree containing only the given people and the relationships between them. */
export function subTree<T extends Pick<FamilyTree, 'people' | 'relationships'>>(tree: T, ids: Set<string>): T {
  return {
    ...tree,
    people: tree.people.filter((p) => ids.has(p.id)),
    relationships: tree.relationships.filter((r) => ids.has(r.sourceId) && ids.has(r.targetId)),
  };
}
