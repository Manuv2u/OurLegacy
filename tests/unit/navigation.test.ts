import { describe, expect, it } from 'vitest';
import { DEFAULT_CARD, layoutTree } from '@/features/family-tree/layout';
import { navigate } from '@/features/family-tree/keyboardNav';
import { buildIndex } from '@/features/relationships/graph';
import { createSampleTree } from '@/features/family-tree/sampleTree';

describe('keyboard navigation between cards', () => {
  const tree = createSampleTree();
  const ix = buildIndex(tree);
  const layout = layoutTree(tree, { direction: 'vertical', cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height });
  const id = (n: string) => tree.people.find((p) => p.firstName === n)!.id;
  const name = (pid: string | null) => tree.people.find((p) => p.id === pid)?.firstName;

  it('up goes to a parent, down to a child', () => {
    expect(['Venkatesh', 'Lakshmi', 'Arthur', 'Margaret']).toContain(name(navigate(layout, ix, id('Suresh'), 'up')));
    expect(['Arjun', 'Maya']).toContain(name(navigate(layout, ix, id('Suresh'), 'down')));
  });

  it('left/right move to a partner or sibling on the same row', () => {
    expect(name(navigate(layout, ix, id('Venkatesh'), 'right'))).toBe('Lakshmi');
    expect(name(navigate(layout, ix, id('Lakshmi'), 'left'))).toBe('Venkatesh');
  });

  it('every person is reachable from the first one using arrows only', () => {
    const seen = new Set<string>([tree.people[0].id]);
    const queue = [tree.people[0].id];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const d of ['up', 'down', 'left', 'right'] as const) {
        const n = navigate(layout, ix, cur, d);
        if (n && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(tree.people.length);
  });

  it('returns null when nothing lies in that direction', () => {
    expect(navigate(layout, ix, id('Aarav'), 'down')).toBeNull();
  });
});

describe('connector routing', () => {
  type Seg = { family: string; y: number; lo: number; hi: number };
  const horizontalRuns = (layout: ReturnType<typeof layoutTree>): Seg[] =>
    layout.edges
      .filter((e) => e.kind === 'parent-child' && e.points.length === 4)
      .map((e) => ({ family: e.personIds.slice(1).sort().join('+'), y: e.points[1].y, lo: Math.min(e.points[1].x, e.points[2].x), hi: Math.max(e.points[1].x, e.points[2].x) }));

  const noMergedFamilies = (segs: Seg[]) => {
    for (const a of segs) for (const b of segs) {
      if (a.family === b.family || a.y !== b.y) continue;
      expect(a.hi < b.lo || b.hi < a.lo, `families ${a.family} and ${b.family} overlap on one line`).toBe(true);
    }
  };

  it('never draws two different families on the same line over the same stretch', () => {
    const layout = layoutTree(createSampleTree(), { direction: 'vertical', cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height });
    noMergedFamilies(horizontalRuns(layout));
  });

  it('siblings from one family share a single bus line', () => {
    const tree = createSampleTree();
    const layout = layoutTree(tree, { direction: 'vertical', cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height });
    const byFamily = new Map<string, Set<number>>();
    for (const r of horizontalRuns(layout)) byFamily.set(r.family, (byFamily.get(r.family) ?? new Set()).add(r.y));
    for (const ys of byFamily.values()) expect(ys.size).toBe(1);
  });

  // Regression: two families joined by a marriage used to be drawn with one very long connector across the diagram.
  describe('families joined by a marriage', () => {
    const now = '2020-01-01T00:00:00.000Z';
    const names = ['Basavaraju', 'jayamma', 'Shivanna', 'mahadevamma', 'Virupaksah', 'Survana', 'shanmukka', 'shodha', 'gaganamma', 'shashikala', 'malikekarjun', 'dhanajaya', 'yashodha', 'Manu', 'Murali', 'babau', 'laskshmi'];
    const people = names.map((n) => ({ id: n, firstName: n, createdAt: now, updatedAt: now }));
    let n = 0;
    const partner = (a: string, b: string) => ({ id: `r${n++}`, type: 'partner' as const, sourceId: a, targetId: b });
    const kids = (parents: string[], children: string[]) => parents.flatMap((p) => children.map((c) => ({ id: `r${n++}`, type: 'parent-child' as const, sourceId: p, targetId: c, kind: 'biological' as const })));
    const relationships = [
      partner('Basavaraju', 'jayamma'), partner('Shivanna', 'mahadevamma'), partner('Virupaksah', 'Survana'), partner('shanmukka', 'shodha'),
      ...kids(['Basavaraju', 'jayamma'], ['shanmukka', 'gaganamma', 'shashikala']),
      ...kids(['Basavaraju'], ['Virupaksah']),
      ...kids(['Shivanna'], ['Survana']),
      ...kids(['Shivanna', 'mahadevamma'], ['malikekarjun', 'dhanajaya', 'yashodha']),
      ...kids(['Virupaksah', 'Survana'], ['Manu', 'Murali']),
      ...kids(['shanmukka', 'shodha'], ['babau', 'laskshmi']),
    ];
    const tree = { people, relationships };
    const opts = { direction: 'vertical' as const, cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height };
    const layout = layoutTree(tree, opts);

    it('keeps every connector short and families unmerged', () => {
      const longest = Math.max(...layout.edges.filter((e) => e.kind === 'parent-child').map((e) => Math.abs(e.points[0].x - e.points[e.points.length - 1].x)));
      // Before the fix the Shivanna → Survana connector spanned ~700px; now the families are neighbours.
      expect(longest).toBeLessThan(5 * (DEFAULT_CARD.width + 44));
      noMergedFamilies(horizontalRuns(layout));
    });

    it('places the marrying partner on the side facing her own family', () => {
      const x = (id: string) => layout.positions.get(id)!.x;
      expect(x('Survana')).toBeGreaterThan(x('Virupaksah'));
      expect(Math.abs(x('Survana') - x('Shivanna'))).toBeLessThan(Math.abs(x('Virupaksah') - x('Shivanna')));
    });

    it('does not overlap cards', () => {
      const pts = [...layout.positions.values()];
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.abs(pts[i].x - pts[j].x) < DEFAULT_CARD.width && Math.abs(pts[i].y - pts[j].y) < DEFAULT_CARD.height).toBe(false);
    });
  });
});
