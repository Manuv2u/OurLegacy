import type { FamilyTree, Relationship } from '@/types/family';
import { buildIndex, parentIds } from './graph';

export type RelationshipErrorCode =
  | 'self'
  | 'missingPerson'
  | 'duplicate'
  | 'cycle'
  | 'tooManyParents'
  | 'partnerConflict';

export type RelationshipCheck = { ok: true } | { ok: false; code: RelationshipErrorCode };

const ok: RelationshipCheck = { ok: true };
const fail = (code: RelationshipErrorCode): RelationshipCheck => ({ ok: false, code });

type Candidate = Pick<Relationship, 'type' | 'sourceId' | 'targetId'> & { kind?: Relationship['kind'] };

/**
 * Union-find over partner links. Each partner-connected component is one
 * "cluster"; the cluster graph (parent cluster -> child cluster) must stay a DAG
 * so every person can be placed in a consistent generation row.
 */
export function clusterGraphIsAcyclic(tree: Pick<FamilyTree, 'people' | 'relationships'>): boolean {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  for (const p of tree.people) parent.set(p.id, p.id);
  for (const r of tree.relationships) {
    if (r.type !== 'partner') continue;
    if (!parent.has(r.sourceId) || !parent.has(r.targetId)) continue;
    parent.set(find(r.sourceId), find(r.targetId));
  }
  const edges = new Map<string, Set<string>>();
  for (const r of tree.relationships) {
    if (r.type !== 'parent-child') continue;
    if (!parent.has(r.sourceId) || !parent.has(r.targetId)) continue;
    const a = find(r.sourceId);
    const b = find(r.targetId);
    if (a === b) return false; // parent and child (or their partners) in one cluster
    if (!edges.has(a)) edges.set(a, new Set());
    edges.get(a)!.add(b);
  }
  // Kahn's algorithm
  const indeg = new Map<string, number>();
  for (const [, tos] of edges) for (const t of tos) indeg.set(t, (indeg.get(t) ?? 0) + 1);
  const queue: string[] = [...edges.keys()].filter((k) => !indeg.has(k));
  let visited = 0;
  const nodes = new Set<string>([...edges.keys(), ...indeg.keys()]);
  while (queue.length) {
    const n = queue.pop()!;
    visited++;
    for (const t of edges.get(n) ?? []) {
      const d = (indeg.get(t) ?? 0) - 1;
      indeg.set(t, d);
      if (d === 0) queue.push(t);
    }
  }
  return visited === nodes.size;
}

/** Validate adding `candidate` to `tree`. Pure; never mutates. */
export function checkRelationship(tree: Pick<FamilyTree, 'people' | 'relationships'>, candidate: Candidate): RelationshipCheck {
  const { sourceId, targetId, type } = candidate;
  if (sourceId === targetId) return fail('self');
  const ids = new Set(tree.people.map((p) => p.id));
  if (!ids.has(sourceId) || !ids.has(targetId)) return fail('missingPerson');

  for (const r of tree.relationships) {
    if (type === 'partner' && r.type === 'partner') {
      if ((r.sourceId === sourceId && r.targetId === targetId) || (r.sourceId === targetId && r.targetId === sourceId)) {
        return fail('duplicate');
      }
    }
    if (type === 'parent-child' && r.type === 'parent-child' && r.sourceId === sourceId && r.targetId === targetId) {
      return fail('duplicate');
    }
  }

  if (type === 'parent-child') {
    const ix = buildIndex(tree);
    // The reverse link would be an immediate cycle.
    if (parentIds(ix, sourceId).includes(targetId)) return fail('cycle');
    const kind = candidate.kind ?? 'biological';
    if (kind === 'biological') {
      const bio = (ix.parentRels.get(targetId) ?? []).filter((r) => (r.kind ?? 'biological') === 'biological');
      if (bio.length >= 2) return fail('tooManyParents');
    }
  }

  const next = { people: tree.people, relationships: [...tree.relationships, { id: '__candidate__', ...candidate } as Relationship] };
  if (!clusterGraphIsAcyclic(next)) return fail(type === 'partner' ? 'partnerConflict' : 'cycle');
  return ok;
}

export interface IntegrityIssue {
  code: 'missingPerson' | 'self' | 'duplicate' | 'cycle' | 'duplicatePerson' | 'tooManyParents';
  detail: string;
}

/** Whole-tree validation used for imported data. */
export function findIntegrityIssues(tree: Pick<FamilyTree, 'people' | 'relationships'>): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const ids = new Set<string>();
  for (const p of tree.people) {
    if (ids.has(p.id)) issues.push({ code: 'duplicatePerson', detail: p.id });
    ids.add(p.id);
  }
  const seen = new Set<string>();
  const bioParents = new Map<string, number>();
  for (const r of tree.relationships) {
    if (r.sourceId === r.targetId) issues.push({ code: 'self', detail: r.id });
    if (!ids.has(r.sourceId) || !ids.has(r.targetId)) issues.push({ code: 'missingPerson', detail: r.id });
    const key =
      r.type === 'partner' ? `p:${[r.sourceId, r.targetId].sort().join('|')}` : `c:${r.sourceId}>${r.targetId}`;
    if (seen.has(key)) issues.push({ code: 'duplicate', detail: r.id });
    seen.add(key);
    if (r.type === 'parent-child' && (r.kind ?? 'biological') === 'biological') {
      const n = (bioParents.get(r.targetId) ?? 0) + 1;
      bioParents.set(r.targetId, n);
      if (n === 3) issues.push({ code: 'tooManyParents', detail: r.targetId });
    }
  }
  if (!issues.some((i) => i.code === 'missingPerson' || i.code === 'self') && !clusterGraphIsAcyclic(tree)) {
    issues.push({ code: 'cycle', detail: 'parent-child cycle' });
  }
  return issues;
}
