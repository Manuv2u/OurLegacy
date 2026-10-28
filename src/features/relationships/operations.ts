import type { FamilyTree, ParentKind, Person, Relationship } from '@/types/family';
import { newId, nowIso } from '@/utils/id';
import { buildIndex, childIds, parentIds, partnerIds } from './graph';
import { checkRelationship, type RelationshipCheck } from './validation';

/** Pure tree operations: every function returns a new tree and never mutates its input. */

export type PersonDraft = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>;

export function createPerson(draft: PersonDraft): Person {
  const now = nowIso();
  return { ...draft, id: newId('p'), createdAt: now, updatedAt: now };
}

export function touch(tree: FamilyTree): FamilyTree {
  return { ...tree, updatedAt: nowIso() };
}

export function addPerson(tree: FamilyTree, person: Person): FamilyTree {
  return touch({ ...tree, people: [...tree.people, person] });
}

/** Merge `patch` into a person; fields not in the patch are preserved. */
export function updatePerson(tree: FamilyTree, id: string, patch: Partial<Omit<Person, 'id' | 'createdAt'>>): FamilyTree {
  if (!tree.people.some((p) => p.id === id)) return tree;
  return touch({
    ...tree,
    people: tree.people.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)),
  });
}

/** Removes a person and every relationship that references them. */
export function removePerson(tree: FamilyTree, id: string): FamilyTree {
  return touch({
    ...tree,
    people: tree.people.filter((p) => p.id !== id),
    relationships: tree.relationships.filter((r) => r.sourceId !== id && r.targetId !== id),
  });
}

export type AddRelationshipResult = { tree: FamilyTree; relationship: Relationship } | { error: Exclude<RelationshipCheck, { ok: true }> };

export function addRelationship(
  tree: FamilyTree,
  input: { type: Relationship['type']; sourceId: string; targetId: string; kind?: ParentKind },
): AddRelationshipResult {
  const check = checkRelationship(tree, input);
  if (!check.ok) return { error: check };
  const relationship: Relationship = {
    id: newId('r'),
    type: input.type,
    sourceId: input.sourceId,
    targetId: input.targetId,
    ...(input.type === 'parent-child' ? { kind: input.kind ?? 'biological' } : {}),
  };
  return { tree: touch({ ...tree, relationships: [...tree.relationships, relationship] }), relationship };
}

export function removeRelationship(tree: FamilyTree, relationshipId: string): FamilyTree {
  if (!tree.relationships.some((r) => r.id === relationshipId)) return tree;
  return touch({ ...tree, relationships: tree.relationships.filter((r) => r.id !== relationshipId) });
}

export function setRelationshipKind(tree: FamilyTree, relationshipId: string, kind: ParentKind): FamilyTree {
  return touch({
    ...tree,
    relationships: tree.relationships.map((r) => (r.id === relationshipId && r.type === 'parent-child' ? { ...r, kind } : r)),
  });
}

export type RelativeKind = 'parent' | 'partner' | 'child' | 'sibling';

export interface AddRelativeOptions {
  /** Child: the co-parent (must be a partner or other existing person). Parent: existing partner of the new parent. */
  otherPersonId?: string | null;
  kind?: ParentKind;
  /** Parent: also record the new parent as partner of the person's existing parent. */
  partnerWithExistingParent?: boolean;
}

export type AddRelativeResult = { tree: FamilyTree; personId: string } | { error: Exclude<RelationshipCheck, { ok: true }> };

/**
 * Add a relative of `anchorId`. `existingPersonId` links someone already in the
 * tree instead of creating a new person. All-or-nothing: if any relationship is
 * invalid the original tree is untouched and the error is returned.
 */
export function addRelative(
  tree: FamilyTree,
  anchorId: string,
  relation: RelativeKind,
  target: { draft: PersonDraft } | { existingPersonId: string },
  options: AddRelativeOptions = {},
): AddRelativeResult {
  let working = tree;
  let personId: string;
  if ('draft' in target) {
    const person = createPerson(target.draft);
    working = addPerson(working, person);
    personId = person.id;
  } else {
    personId = target.existingPersonId;
  }
  const kind = options.kind ?? 'biological';

  const link = (type: Relationship['type'], sourceId: string, targetId: string, k?: ParentKind): { error: Exclude<RelationshipCheck, { ok: true }> } | null => {
    const res = addRelationship(working, { type, sourceId, targetId, kind: k });
    if ('error' in res) return res;
    working = res.tree;
    return null;
  };

  let err: ReturnType<typeof link> = null;
  switch (relation) {
    case 'parent': {
      const ix = buildIndex(tree);
      const existingParents = parentIds(ix, anchorId);
      err = link('parent-child', personId, anchorId, kind);
      if (!err && options.partnerWithExistingParent && existingParents.length === 1 && existingParents[0] !== personId) {
        if (!partnerIds(ix, existingParents[0]).includes(personId)) err = link('partner', personId, existingParents[0]);
      }
      break;
    }
    case 'partner':
      err = link('partner', anchorId, personId);
      break;
    case 'child': {
      err = link('parent-child', anchorId, personId, kind);
      if (!err && options.otherPersonId) err = link('parent-child', options.otherPersonId, personId, kind);
      break;
    }
    case 'sibling': {
      const ix = buildIndex(tree);
      const parents = parentIds(ix, anchorId);
      if (parents.length === 0) return { error: { ok: false, code: 'missingPerson' } };
      for (const parentId of parents) {
        err = link('parent-child', parentId, personId, kind);
        if (err) break;
      }
      break;
    }
  }
  if (err) return err;
  return { tree: working, personId };
}

/** Quick summaries used by profile panels. */
export function relativesOf(tree: FamilyTree, id: string) {
  const ix = buildIndex(tree);
  return { parents: parentIds(ix, id), partners: partnerIds(ix, id), children: childIds(ix, id) };
}
