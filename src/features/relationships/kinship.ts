import type { Gender, Person } from '@/types/family';
import { ancestorsWithDepth, childIds, descendantsWithDepth, parentIds, partnerIds, siblingsOf, type TreeIndex } from './graph';
import { dateSortValue } from '@/utils/dates';

/**
 * How one person is related to another ("who is X to me?"), derived only from parent-child and partner links plus
 * gender. Pure data: wording for each language lives in `kinshipLabels.ts`.
 */
export type Sex = 'male' | 'female' | 'neutral';
export type Side = 'paternal' | 'maternal' | null;

export type Kin =
  | { rel: 'ancestor'; n: number; sex: Sex; adoptive: boolean }
  | { rel: 'descendant'; n: number; sex: Sex; adoptive: boolean }
  | { rel: 'partner'; sex: Sex }
  | { rel: 'sibling'; sex: Sex; half: boolean; elder: boolean | null }
  /** `n` = generation of the ancestor whose sibling this is (1 = parent's sibling). */
  | { rel: 'auntUncle'; n: number; sex: Sex; side: Side; elder: boolean | null }
  | { rel: 'nephewNiece'; n: number; sex: Sex }
  | { rel: 'cousin'; degree: number; removed: number; sex: Sex }
  | { rel: 'inLaw'; of: 'parent' | 'child' | 'sibling'; sex: Sex }
  | { rel: 'step'; sex: Sex };

export const sexOf = (g: Gender | undefined): Sex => (g === 'male' ? 'male' : g === 'female' ? 'female' : 'neutral');

/** Everything about the reference person that is shared by every lookup, computed once. */
export interface KinContext {
  ix: TreeIndex;
  from: string;
  ancestors: Map<string, number>;
  descendants: Map<string, number>;
  siblings: { full: Set<string>; half: Set<string> };
}

export function kinContext(ix: TreeIndex, from: string): KinContext {
  const sibs = siblingsOf(ix, from);
  return { ix, from, ancestors: ancestorsWithDepth(ix, from), descendants: descendantsWithDepth(ix, from), siblings: { full: new Set(sibs.full), half: new Set(sibs.half) } };
}

const person = (ctx: KinContext, id: string): Person | undefined => ctx.ix.people.get(id);
const sex = (ctx: KinContext, id: string): Sex => sexOf(person(ctx, id)?.gender);

/** True when `a` is known to be older than `b`; null when either birth date is unknown. */
function olderThan(ctx: KinContext, a: string, b: string): boolean | null {
  const x = dateSortValue(person(ctx, a)?.birthDate);
  const y = dateSortValue(person(ctx, b)?.birthDate);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === y) return null;
  return x < y;
}

/** The parent of `from` through whom `ancestorId` descends (or who is that ancestor). */
function lineageParent(ctx: KinContext, ancestorId: string): string | null {
  for (const p of parentIds(ctx.ix, ctx.from)) {
    if (p === ancestorId || ancestorsWithDepth(ctx.ix, p).has(ancestorId)) return p;
  }
  return null;
}

const sideOf = (ctx: KinContext, ancestorId: string): Side => {
  const p = lineageParent(ctx, ancestorId);
  if (!p) return null;
  const s = sex(ctx, p);
  return s === 'male' ? 'paternal' : s === 'female' ? 'maternal' : null;
};

function isAdoptiveLink(ctx: KinContext, parent: string, child: string): boolean {
  return (ctx.ix.parentRels.get(child) ?? []).some((r) => r.sourceId === parent && r.kind === 'adoptive');
}

/** How `to` is related to `ctx.from`, or null when there is no (supported) relation. */
export function kinOf(ctx: KinContext, to: string): Kin | null {
  const { ix, from } = ctx;
  if (to === from || !ix.people.has(to)) return null;
  const s = sex(ctx, to);

  if (partnerIds(ix, from).includes(to)) return { rel: 'partner', sex: s };

  const up = ctx.ancestors.get(to);
  if (up) return { rel: 'ancestor', n: up, sex: s, adoptive: up === 1 && isAdoptiveLink(ctx, to, from) };
  const down = ctx.descendants.get(to);
  if (down) return { rel: 'descendant', n: down, sex: s, adoptive: down === 1 && isAdoptiveLink(ctx, from, to) };

  const full = ctx.siblings.full.has(to);
  if (full || ctx.siblings.half.has(to)) return { rel: 'sibling', sex: s, half: !full, elder: olderThan(ctx, to, from) };

  // Aunts and uncles: siblings of an ancestor.
  for (const [anc, n] of ctx.ancestors) {
    const sibs = siblingsOf(ix, anc);
    if (sibs.full.includes(to) || sibs.half.includes(to)) {
      return { rel: 'auntUncle', n, sex: s, side: n === 1 ? sideOf(ctx, anc) : null, elder: olderThan(ctx, to, anc) };
    }
  }
  // Nieces and nephews: descendants of a sibling.
  for (const sib of [...ctx.siblings.full, ...ctx.siblings.half]) {
    const n = descendantsWithDepth(ix, sib).get(to);
    if (n) return { rel: 'nephewNiece', n, sex: s };
  }
  // Cousins: share a common ancestor at least two generations up on both sides; pick the closest one.
  const theirs = ancestorsWithDepth(ix, to);
  let best: { i: number; j: number } | null = null;
  for (const [anc, i] of ctx.ancestors) {
    const j = theirs.get(anc);
    if (j && i >= 2 && j >= 2 && (!best || i + j < best.i + best.j)) best = { i, j };
  }
  if (best) return { rel: 'cousin', degree: Math.min(best.i, best.j) - 1, removed: Math.abs(best.i - best.j), sex: s };

  // Step-parents: partner of a parent who is not themselves a parent.
  for (const p of parentIds(ix, from)) if (partnerIds(ix, p).includes(to)) return { rel: 'step', sex: s };

  // In-laws.
  for (const partner of partnerIds(ix, from)) {
    if (parentIds(ix, partner).includes(to)) return { rel: 'inLaw', of: 'parent', sex: s };
    const ps = siblingsOf(ix, partner);
    if (ps.full.includes(to) || ps.half.includes(to)) return { rel: 'inLaw', of: 'sibling', sex: s };
  }
  for (const child of childIds(ix, from)) if (partnerIds(ix, child).includes(to)) return { rel: 'inLaw', of: 'child', sex: s };
  for (const sib of [...ctx.siblings.full, ...ctx.siblings.half]) if (partnerIds(ix, sib).includes(to)) return { rel: 'inLaw', of: 'sibling', sex: s };
  return null;
}
