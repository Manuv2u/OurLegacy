import type { TreeLayout } from './layout';
import { childIds, parentIds, partnerIds, siblingsOf, type TreeIndex } from '@/features/relationships/graph';

export type NavDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Pick the person to move to for an arrow key. Relatives (parents, children,
 * partners, siblings) win over strangers, so arrows follow the family; if no
 * relative lies in that direction we fall back to the nearest person on screen
 * so every card stays reachable by keyboard.
 */
export function navigate(layout: TreeLayout, ix: TreeIndex, fromId: string, dir: NavDirection): string | null {
  const from = layout.positions.get(fromId);
  if (!from) return null;
  const centre = (id: string) => {
    const p = layout.positions.get(id)!;
    return { x: p.x + layout.cardWidth / 2, y: p.y + layout.cardHeight / 2 };
  };
  const c0 = centre(fromId);

  const delta = (id: string) => {
    const c = centre(id);
    const dx = c.x - c0.x;
    const dy = c.y - c0.y;
    const [primary, secondary] = dir === 'up' ? [-dy, dx] : dir === 'down' ? [dy, dx] : dir === 'left' ? [-dx, dy] : [dx, dy];
    return { primary, secondary };
  };

  const pick = (ids: Iterable<string>): string | null => {
    let best: string | null = null;
    let bestScore = Infinity;
    for (const id of ids) {
      if (id === fromId || !layout.positions.has(id)) continue;
      const { primary, secondary } = delta(id);
      if (primary <= 1) continue;
      const score = primary + Math.abs(secondary) * 2;
      if (score < bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  };

  const sibs = siblingsOf(ix, fromId);
  const relatives = new Set([...parentIds(ix, fromId), ...childIds(ix, fromId), ...partnerIds(ix, fromId), ...sibs.full, ...sibs.half]);
  return pick(relatives) ?? pick(layout.positions.keys());
}
