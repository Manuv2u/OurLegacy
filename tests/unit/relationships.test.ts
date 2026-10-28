import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type FamilyTree } from '@/types/family';
import {
  addPerson,
  addRelationship,
  addRelative,
  createPerson,
  removePerson,
  removeRelationship,
  updatePerson,
} from '@/features/relationships/operations';
import { checkRelationship, findIntegrityIssues } from '@/features/relationships/validation';
import { branchOf, buildIndex, relativesAtGeneration, siblingsOf } from '@/features/relationships/graph';
import { createSampleTree } from '@/features/family-tree/sampleTree';

const empty = (): FamilyTree => ({
  id: 't1',
  name: 'T',
  schemaVersion: SCHEMA_VERSION,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
  people: [],
  relationships: [],
});

function withPeople(...names: string[]) {
  let tree = empty();
  const ids: Record<string, string> = {};
  for (const n of names) {
    const p = createPerson({ firstName: n });
    ids[n] = p.id;
    tree = addPerson(tree, p);
  }
  return { tree, ids };
}

const link = (tree: FamilyTree, type: 'parent-child' | 'partner', a: string, b: string, kind?: 'adoptive' | 'biological') => {
  const res = addRelationship(tree, { type, sourceId: a, targetId: b, kind });
  if ('error' in res) throw new Error(`unexpected ${res.error.code}`);
  return res.tree;
};

describe('relationship validation', () => {
  it('rejects self relationships', () => {
    const { tree, ids } = withPeople('A');
    expect(checkRelationship(tree, { type: 'partner', sourceId: ids.A, targetId: ids.A })).toEqual({ ok: false, code: 'self' });
    expect(checkRelationship(tree, { type: 'parent-child', sourceId: ids.A, targetId: ids.A })).toEqual({ ok: false, code: 'self' });
  });

  it('rejects missing references', () => {
    const { tree, ids } = withPeople('A');
    expect(checkRelationship(tree, { type: 'partner', sourceId: ids.A, targetId: 'nope' })).toEqual({ ok: false, code: 'missingPerson' });
  });

  it('rejects duplicate parent-child and duplicate partner links in either direction', () => {
    const { tree, ids } = withPeople('A', 'B');
    const t1 = link(tree, 'parent-child', ids.A, ids.B);
    expect(checkRelationship(t1, { type: 'parent-child', sourceId: ids.A, targetId: ids.B })).toEqual({ ok: false, code: 'duplicate' });
    const t2 = link(tree, 'partner', ids.A, ids.B);
    expect(checkRelationship(t2, { type: 'partner', sourceId: ids.B, targetId: ids.A })).toEqual({ ok: false, code: 'duplicate' });
  });

  it('rejects direct and indirect parent-child cycles', () => {
    const { tree, ids } = withPeople('A', 'B', 'C');
    let t = link(tree, 'parent-child', ids.A, ids.B);
    t = link(t, 'parent-child', ids.B, ids.C);
    expect(checkRelationship(t, { type: 'parent-child', sourceId: ids.B, targetId: ids.A })).toEqual({ ok: false, code: 'cycle' });
    expect(checkRelationship(t, { type: 'parent-child', sourceId: ids.C, targetId: ids.A })).toEqual({ ok: false, code: 'cycle' });
  });

  it('rejects cycles that only appear through partner links', () => {
    const { tree, ids } = withPeople('A', 'B', 'C');
    // A is the parent of B; B partnered with C; C as parent of A would loop generations.
    let t = link(tree, 'parent-child', ids.A, ids.B);
    t = link(t, 'partner', ids.B, ids.C);
    expect(checkRelationship(t, { type: 'parent-child', sourceId: ids.C, targetId: ids.A })).toEqual({ ok: false, code: 'cycle' });
  });

  it('rejects making a parent and a child partners', () => {
    const { tree, ids } = withPeople('A', 'B');
    const t = link(tree, 'parent-child', ids.A, ids.B);
    expect(checkRelationship(t, { type: 'partner', sourceId: ids.A, targetId: ids.B }).ok).toBe(false);
  });

  it('limits biological parents to two but allows adoptive extras', () => {
    const { tree, ids } = withPeople('P1', 'P2', 'P3', 'C');
    let t = link(tree, 'parent-child', ids.P1, ids.C);
    t = link(t, 'parent-child', ids.P2, ids.C);
    expect(checkRelationship(t, { type: 'parent-child', sourceId: ids.P3, targetId: ids.C })).toEqual({ ok: false, code: 'tooManyParents' });
    expect(checkRelationship(t, { type: 'parent-child', sourceId: ids.P3, targetId: ids.C, kind: 'adoptive' }).ok).toBe(true);
  });

  it('supports multiple partners', () => {
    const { tree, ids } = withPeople('A', 'B', 'C');
    let t = link(tree, 'partner', ids.A, ids.B);
    t = link(t, 'partner', ids.A, ids.C);
    expect([...(buildIndex(t).partners.get(ids.A) ?? [])].sort()).toEqual([ids.B, ids.C].sort());
  });
});

describe('integrity checks', () => {
  it('accepts the sample tree', () => {
    expect(findIntegrityIssues(createSampleTree())).toEqual([]);
  });

  it('flags missing references, duplicates, self links and cycles', () => {
    const { tree, ids } = withPeople('A', 'B');
    const bad: FamilyTree = {
      ...tree,
      relationships: [
        { id: 'r1', type: 'partner', sourceId: ids.A, targetId: 'ghost' },
        { id: 'r2', type: 'partner', sourceId: ids.A, targetId: ids.A },
        { id: 'r3', type: 'partner', sourceId: ids.A, targetId: ids.B },
        { id: 'r4', type: 'partner', sourceId: ids.B, targetId: ids.A },
      ],
    };
    const codes = findIntegrityIssues(bad).map((i) => i.code);
    expect(codes).toContain('missingPerson');
    expect(codes).toContain('self');
    expect(codes).toContain('duplicate');
    const cyc: FamilyTree = {
      ...tree,
      relationships: [
        { id: 'a', type: 'parent-child', sourceId: ids.A, targetId: ids.B },
        { id: 'b', type: 'parent-child', sourceId: ids.B, targetId: ids.A },
      ],
    };
    expect(findIntegrityIssues(cyc).map((i) => i.code)).toContain('cycle');
  });
});

describe('operations', () => {
  it('updatePerson preserves untouched fields and does not mutate', () => {
    const { tree, ids } = withPeople('A');
    const withBio = updatePerson(tree, ids.A, { biography: 'story', lastName: 'Rao' });
    const renamed = updatePerson(withBio, ids.A, { firstName: 'Ann' });
    expect(renamed.people[0]).toMatchObject({ firstName: 'Ann', lastName: 'Rao', biography: 'story' });
    expect(tree.people[0].biography).toBeUndefined();
  });

  it('removePerson cascades relationships', () => {
    const { tree, ids } = withPeople('A', 'B', 'C');
    let t = link(tree, 'parent-child', ids.A, ids.B);
    t = link(t, 'partner', ids.A, ids.C);
    const after = removePerson(t, ids.A);
    expect(after.people.map((p) => p.firstName)).toEqual(['B', 'C']);
    expect(after.relationships).toEqual([]);
    expect(findIntegrityIssues(after)).toEqual([]);
  });

  it('removeRelationship removes only that link', () => {
    const { tree, ids } = withPeople('A', 'B');
    const res = addRelationship(tree, { type: 'partner', sourceId: ids.A, targetId: ids.B });
    if ('error' in res) throw new Error('x');
    expect(removeRelationship(res.tree, res.relationship.id).relationships).toEqual([]);
  });

  it('addRelative: child with a co-parent links both parents', () => {
    const { tree, ids } = withPeople('A', 'B');
    const t = link(tree, 'partner', ids.A, ids.B);
    const res = addRelative(t, ids.A, 'child', { draft: { firstName: 'Kid' } }, { otherPersonId: ids.B });
    if ('error' in res) throw new Error('x');
    const ix = buildIndex(res.tree);
    expect((ix.parentRels.get(res.personId) ?? []).map((r) => r.sourceId).sort()).toEqual([ids.A, ids.B].sort());
  });

  it('addRelative: sibling shares every parent and siblings are derived', () => {
    const { tree, ids } = withPeople('P1', 'P2', 'S1');
    let t = link(tree, 'parent-child', ids.P1, ids.S1);
    t = link(t, 'parent-child', ids.P2, ids.S1);
    const res = addRelative(t, ids.S1, 'sibling', { draft: { firstName: 'S2' } });
    if ('error' in res) throw new Error('x');
    const ix = buildIndex(res.tree);
    expect(siblingsOf(ix, ids.S1).full).toEqual([res.personId]);
    expect(siblingsOf(ix, res.personId).full).toEqual([ids.S1]);
  });

  it('addRelative: half siblings are reported separately', () => {
    const { tree, ids } = withPeople('P1', 'P2', 'S1');
    let t = link(tree, 'parent-child', ids.P1, ids.S1);
    t = link(t, 'parent-child', ids.P2, ids.S1);
    const res = addRelative(t, ids.P1, 'child', { draft: { firstName: 'Half' } });
    if ('error' in res) throw new Error('x');
    const ix = buildIndex(res.tree);
    expect(siblingsOf(ix, ids.S1)).toEqual({ full: [], half: [res.personId] });
  });

  it('addRelative is all-or-nothing and returns the error', () => {
    const { tree, ids } = withPeople('A');
    const res = addRelative(tree, ids.A, 'sibling', { draft: { firstName: 'S' } });
    expect('error' in res).toBe(true);
    expect(tree.people).toHaveLength(1);
  });

  it('addRelative parent can also partner the existing parent', () => {
    const { tree, ids } = withPeople('Mum', 'Kid');
    const t = link(tree, 'parent-child', ids.Mum, ids.Kid);
    const res = addRelative(t, ids.Kid, 'parent', { draft: { firstName: 'Dad' } }, { partnerWithExistingParent: true });
    if ('error' in res) throw new Error('x');
    expect(res.tree.relationships.filter((r) => r.type === 'partner')).toHaveLength(1);
  });
});

describe('graph navigation', () => {
  const sample = createSampleTree();
  const ix = buildIndex(sample);
  const id = (first: string) => sample.people.find((p) => p.firstName === first)!.id;

  it('finds grandparents and grandchildren', () => {
    expect(relativesAtGeneration(ix, id('Arjun'), 2).sort()).toEqual(
      ['Venkatesh', 'Lakshmi', 'Arthur', 'Margaret'].map(id).sort(),
    );
    expect(relativesAtGeneration(ix, id('Suresh'), -2).sort()).toEqual(['Aarav', 'Anaya', 'Leo'].map(id).sort());
  });

  it('branch of a person includes descendants and their partners', () => {
    const branch = branchOf(ix, id('Suresh'), 'descendants');
    for (const n of ['Suresh', 'Eleanor', 'Arjun', 'Priya', 'Maya', 'Tom', 'Aarav', 'Leo']) expect(branch.has(id(n))).toBe(true);
    expect(branch.has(id('Geetha'))).toBe(false);
  });
});
