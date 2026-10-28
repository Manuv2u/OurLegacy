import { describe, expect, it } from 'vitest';
import { layoutTree, roundedPath, DEFAULT_CARD } from '@/features/family-tree/layout';
import { createSampleTree } from '@/features/family-tree/sampleTree';
import { subTree, buildIndex, branchOf } from '@/features/relationships/graph';

const opts = (direction: 'vertical' | 'horizontal') => ({ direction, cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height });

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number) {
  return Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < h;
}

describe('layoutTree', () => {
  const tree = createSampleTree();
  const id = (first: string) => tree.people.find((p) => p.firstName === first)!.id;

  for (const direction of ['vertical', 'horizontal'] as const) {
    it(`never overlaps cards (${direction})`, () => {
      const l = layoutTree(tree, opts(direction));
      const pts = [...l.positions.entries()];
      expect(pts).toHaveLength(tree.people.length);
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++)
          expect(overlaps(pts[i][1], pts[j][1], DEFAULT_CARD.width, DEFAULT_CARD.height)).toBe(false);
    });
  }

  it('places generations in increasing rows, partners on the same row', () => {
    const l = layoutTree(tree, opts('vertical'));
    const y = (n: string) => l.positions.get(id(n))!.y;
    expect(y('Venkatesh')).toBeLessThan(y('Suresh'));
    expect(y('Suresh')).toBeLessThan(y('Arjun'));
    expect(y('Arjun')).toBeLessThan(y('Aarav'));
    expect(y('Suresh')).toBe(y('Eleanor'));
    expect(y('Arjun')).toBe(y('Priya'));
  });

  it('horizontal layout flows left to right', () => {
    const l = layoutTree(tree, opts('horizontal'));
    const x = (n: string) => l.positions.get(id(n))!.x;
    expect(x('Venkatesh')).toBeLessThan(x('Suresh'));
    expect(x('Suresh')).toBeLessThan(x('Arjun'));
  });

  it('draws one partner edge per partnership and an edge per child family', () => {
    const l = layoutTree(tree, opts('vertical'));
    expect(l.edges.filter((e) => e.kind === 'partner')).toHaveLength(7);
    // Aarav has two parents who are partners -> a single family edge.
    expect(l.edges.filter((e) => e.kind === 'parent-child' && e.personIds[0] === id('Aarav'))).toHaveLength(1);
    expect(l.edges.some((e) => e.adoptive)).toBe(true);
  });

  it('bounds contain every card', () => {
    const l = layoutTree(tree, opts('vertical'));
    for (const p of l.positions.values()) {
      expect(p.x).toBeGreaterThanOrEqual(l.bounds.x);
      expect(p.x + DEFAULT_CARD.width).toBeLessThanOrEqual(l.bounds.x + l.bounds.width + 0.001);
    }
  });

  it('handles empty trees, single people and disconnected people', () => {
    expect(layoutTree({ people: [], relationships: [] }, opts('vertical')).positions.size).toBe(0);
    const single = subTree(tree, new Set([id('Leo')]));
    expect(layoutTree(single, opts('vertical')).positions.size).toBe(1);
    const two = subTree(tree, new Set([id('Leo'), id('Venkatesh')]));
    const l = layoutTree(two, opts('vertical'));
    const [a, b] = [...l.positions.values()];
    expect(overlaps(a, b, DEFAULT_CARD.width, DEFAULT_CARD.height)).toBe(false);
  });

  it('lays out a sub-branch on its own', () => {
    const branch = subTree(tree, branchOf(buildIndex(tree), id('Suresh'), 'descendants'));
    const l = layoutTree(branch, opts('vertical'));
    expect(l.positions.size).toBe(branch.people.length);
  });

  it('handles a person with several partners', () => {
    const t = createSampleTree();
    const extra = { ...t.people[0], id: 'extra', firstName: 'Extra' };
    t.people.push(extra);
    t.relationships.push({ id: 'rx', type: 'partner', sourceId: t.people.find((p) => p.firstName === 'Venkatesh')!.id, targetId: 'extra' });
    const l = layoutTree(t, opts('vertical'));
    const v = l.positions.get(t.people.find((p) => p.firstName === 'Venkatesh')!.id)!;
    const x = l.positions.get('extra')!;
    const lk = l.positions.get(t.people.find((p) => p.firstName === 'Lakshmi')!.id)!;
    expect(v.y).toBe(x.y);
    expect(v.y).toBe(lk.y);
    // hub sits between its two partners
    expect(Math.min(lk.x, x.x)).toBeLessThan(v.x);
    expect(Math.max(lk.x, x.x)).toBeGreaterThan(v.x);
  });

  it('is deterministic', () => {
    const a = layoutTree(tree, opts('vertical'));
    const b = layoutTree(tree, opts('vertical'));
    expect([...a.positions]).toEqual([...b.positions]);
  });
});

describe('roundedPath', () => {
  it('builds a path through all points', () => {
    const d = roundedPath([{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }], 10);
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d).toContain('Q 0 40');
    expect(d.endsWith('L 40 40')).toBe(true);
  });
});
