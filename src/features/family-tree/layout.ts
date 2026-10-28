import type { FamilyTree, LayoutDirection, Person } from '@/types/family';
import { dateSortValue } from '@/utils/dates';
import { buildIndex, parentIds, partnerIds, type TreeIndex } from '@/features/relationships/graph';

/**
 * Deterministic genealogy layout. Pure: depends only on family data and sizing,
 * never on the rendering library.
 *
 * Model: people joined by partner links form a *cluster* (a couple, or a person
 * with several partners). Clusters are layered by generation, each cluster is
 * hung beneath one "anchor" parent cluster, and subtrees are packed left to right.
 * Work happens in abstract coordinates (u = breadth, v = depth) and is mapped to
 * x/y at the end, which is how vertical and horizontal layouts share one algorithm.
 */

export interface LayoutOptions {
  direction: LayoutDirection;
  cardWidth: number;
  cardHeight: number;
  /** Space between partners in the same cluster (hosts the child drop line). */
  partnerGap?: number;
  /** Space between sibling subtrees. */
  siblingGap?: number;
  /** Space between generation rows. */
  levelGap?: number;
}

export const DEFAULT_CARD = { width: 216, height: 92 };

export interface Point {
  x: number;
  y: number;
}

export interface LayoutEdge {
  id: string;
  kind: 'partner' | 'parent-child';
  adoptive: boolean;
  points: Point[];
  /** Ids of the people the edge connects (for highlighting). */
  personIds: string[];
  /** Where a partner union "knot" should be drawn. */
  junction?: Point;
}

export interface TreeLayout {
  positions: Map<string, Point>;
  edges: LayoutEdge[];
  /** Generation row for each person (0 = top / left-most). */
  rows: Map<string, number>;
  bounds: { x: number; y: number; width: number; height: number };
  cardWidth: number;
  cardHeight: number;
}

interface Cluster {
  id: number;
  members: string[]; // ordered
  rank: number;
  anchor: number | null;
  children: number[];
  subW: number;
  left: number;
}

const bySortedStable = <T,>(arr: T[], cmp: (a: T, b: T) => number): T[] =>
  arr.map((v, i) => ({ v, i })).sort((a, b) => cmp(a.v, b.v) || a.i - b.i).map((x) => x.v);

function orderCluster(ids: string[], ix: TreeIndex): string[] {
  if (ids.length <= 2) return ids;
  const set = new Set(ids);
  const adj = (id: string) => partnerIds(ix, id).filter((x) => set.has(x));
  // Star (one person partnered with all others): put them in the middle.
  const hub = ids.find((id) => adj(id).length === ids.length - 1);
  if (hub && ids.every((id) => id === hub || adj(id).length === 1)) {
    const others = ids.filter((id) => id !== hub);
    const half = Math.ceil(others.length / 2);
    return [...others.slice(0, half), hub, ...others.slice(half)];
  }
  // Otherwise walk the chain starting from a least-connected member.
  const start = bySortedStable(ids, (a, b) => adj(a).length - adj(b).length)[0];
  const seen = new Set<string>();
  const out: string[] = [];
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(id);
    for (const n of adj(id)) visit(n);
  };
  visit(start);
  return out;
}

export function layoutTree(tree: Pick<FamilyTree, 'people' | 'relationships'>, opts: LayoutOptions): TreeLayout {
  const vertical = opts.direction === 'vertical';
  const cardU = vertical ? opts.cardWidth : opts.cardHeight;
  const cardV = vertical ? opts.cardHeight : opts.cardWidth;
  const partnerGap = opts.partnerGap ?? (vertical ? 44 : 28);
  const siblingGap = opts.siblingGap ?? (vertical ? 32 : 22);
  const levelGap = opts.levelGap ?? (vertical ? 84 : 96);

  const ix = buildIndex(tree);
  const personOrder = new Map(tree.people.map((p, i) => [p.id, i]));

  // 1. Clusters = connected components of partner links.
  const clusterOf = new Map<string, number>();
  const clusters: Cluster[] = [];
  for (const p of tree.people) {
    if (clusterOf.has(p.id)) continue;
    const comp: string[] = [];
    const stack = [p.id];
    clusterOf.set(p.id, clusters.length);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const n of partnerIds(ix, cur)) {
        if (ix.people.has(n) && !clusterOf.has(n)) {
          clusterOf.set(n, clusters.length);
          stack.push(n);
        }
      }
    }
    comp.sort((a, b) => personOrder.get(a)! - personOrder.get(b)!);
    clusters.push({ id: clusters.length, members: orderCluster(comp, ix), rank: 0, anchor: null, children: [], subW: 0, left: 0 });
  }

  // 2. Rank by longest path over the cluster DAG.
  const parentClusters: Set<number>[] = clusters.map(() => new Set());
  const childClusters: Set<number>[] = clusters.map(() => new Set());
  for (const r of tree.relationships) {
    if (r.type !== 'parent-child') continue;
    const a = clusterOf.get(r.sourceId);
    const b = clusterOf.get(r.targetId);
    if (a === undefined || b === undefined || a === b) continue;
    parentClusters[b].add(a);
    childClusters[a].add(b);
  }
  const indeg = parentClusters.map((s) => s.size);
  const queue = clusters.filter((c) => indeg[c.id] === 0).map((c) => c.id);
  while (queue.length) {
    const c = queue.shift()!;
    for (const ch of childClusters[c]) {
      clusters[ch].rank = Math.max(clusters[ch].rank, clusters[c].rank + 1);
      if (--indeg[ch] === 0) queue.push(ch);
    }
  }

  // 3. Anchor each cluster beneath its closest (highest-rank) parent cluster.
  for (const c of clusters) {
    const candidates = [...parentClusters[c.id]];
    if (!candidates.length) continue;
    c.anchor = bySortedStable(candidates, (a, b) => clusters[b].rank - clusters[a].rank)[0];
  }
  // Order siblings by the birth date of the member who is actually the child here, not the in-law partner.
  const firstBirth = (c: Cluster, parent: Cluster) => {
    const blood = c.members.filter((m) => parentIds(ix, m).some((pid) => parent.members.includes(pid)));
    return Math.min(...(blood.length ? blood : c.members).map((m) => dateSortValue(ix.people.get(m)?.birthDate)));
  };
  const familyPos = (child: Cluster, parent: Cluster) => {
    const positions: number[] = [];
    for (const m of child.members) {
      for (const pid of parentIds(ix, m)) {
        const i = parent.members.indexOf(pid);
        if (i >= 0) positions.push(i);
      }
    }
    return positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;
  };
  // 3b. Families linked by a marriage (a cluster with parents in two different family trees) are kept side by side,
  // and the marrying couple sits on the side facing its other family, so the connecting line stays short.
  const rootOf = (id: number): number => {
    let c = id;
    while (clusters[c].anchor !== null) c = clusters[c].anchor!;
    return c;
  };
  const externalRoots = (c: Cluster): number[] => {
    const mine = rootOf(c.id);
    return [...parentClusters[c.id]].map(rootOf).filter((r) => r !== mine);
  };
  const links = new Map<number, Map<number, number>>();
  const addLink = (a: number, b: number) => {
    const m = links.get(a) ?? new Map<number, number>();
    m.set(b, (m.get(b) ?? 0) + 1);
    links.set(a, m);
  };
  for (const c of clusters) {
    for (const r of externalRoots(c)) {
      addLink(rootOf(c.id), r);
      addLink(r, rootOf(c.id));
    }
  }
  const rootOrder: number[] = [];
  const seenRoots = new Set<number>();
  const visitRoot = (r: number) => {
    if (seenRoots.has(r)) return;
    seenRoots.add(r);
    rootOrder.push(r);
    for (const [n] of [...(links.get(r)?.entries() ?? [])].sort((x, y) => y[1] - x[1])) visitRoot(n);
  };
  for (const c of clusters) if (c.anchor === null) visitRoot(c.id);
  const rootIndex = new Map(rootOrder.map((r, i) => [r, i]));
  const rootPos = (r: number) => rootIndex.get(r) ?? 0;

  // Which way (-1 left, +1 right) a person's other family lies relative to the family they are drawn under.
  const pull = (m: string, c: Cluster): number => {
    const mine = rootOf(c.id);
    const dirs = parentIds(ix, m)
      .map((pid) => rootOf(clusterOf.get(pid)!))
      .filter((r) => r !== mine)
      .map((r) => Math.sign(rootPos(r) - rootPos(mine)));
    return dirs.length ? dirs.reduce((a, b) => a + b, 0) / dirs.length : 0;
  };
  for (const c of clusters) {
    if (c.members.length === 2 && pull(c.members[0], c) > pull(c.members[1], c)) c.members.reverse();
  }
  const side = (child: Cluster, parent: Cluster): number => {
    const ext = externalRoots(child);
    if (!ext.length) return 0;
    const d = ext.reduce((a, r) => a + rootPos(r), 0) / ext.length - rootPos(rootOf(parent.id));
    return d > 0 ? 1 : d < 0 ? -1 : 0;
  };

  for (const c of clusters) {
    if (c.anchor !== null) clusters[c.anchor].children.push(c.id);
  }
  for (const c of clusters) {
    c.children = bySortedStable(c.children, (a, b) => {
      const A = clusters[a];
      const B = clusters[b];
      return side(A, c) - side(B, c) || familyPos(A, c) - familyPos(B, c) || firstBirth(A, c) - firstBirth(B, c);
    });
  }

  // 4. Subtree widths and placement.
  const clusterWidth = (c: Cluster) => c.members.length * cardU + (c.members.length - 1) * partnerGap;
  const measure = (c: Cluster): number => {
    const kids = c.children.map((k) => measure(clusters[k]));
    const kidsW = kids.length ? kids.reduce((a, b) => a + b, 0) + siblingGap * (kids.length - 1) : 0;
    c.subW = Math.max(clusterWidth(c), kidsW);
    return c.subW;
  };
  const place = (c: Cluster, left: number): void => {
    const own = clusterWidth(c);
    if (!c.children.length) {
      c.left = left + (c.subW - own) / 2;
      return;
    }
    const kidsW = c.children.reduce((a, k) => a + clusters[k].subW, 0) + siblingGap * (c.children.length - 1);
    let cursor = left + (c.subW - kidsW) / 2;
    for (const k of c.children) {
      place(clusters[k], cursor);
      cursor += clusters[k].subW + siblingGap;
    }
    const first = clusters[c.children[0]];
    const last = clusters[c.children[c.children.length - 1]];
    const mid = (first.left + clusterWidth(first) / 2 + last.left + clusterWidth(last) / 2) / 2;
    c.left = Math.min(Math.max(mid - own / 2, left), left + c.subW - own);
  };
  let cursor = 0;
  for (const rid of rootOrder) {
    const r = clusters[rid];
    measure(r);
    place(r, cursor);
    cursor += r.subW + siblingGap * 2;
  }

  // 5. Breadth positions first. They do not depend on depth, which lets us size each generation gap from the
  // number of connector lanes it needs before depth positions are fixed.
  const uOf = new Map<string, number>();
  const rows = new Map<string, number>();
  for (const c of clusters) {
    c.members.forEach((m, i) => {
      uOf.set(m, c.left + i * (cardU + partnerGap));
      rows.set(m, c.rank);
    });
  }
  const centerU = (id: string) => uOf.get(id)! + cardU / 2;
  const pairKey = (a: string, b: string) => [a, b].sort().join('|');

  // Parent -> child edges are grouped per "family" (a partner pair, or a lone parent) so siblings share one bus
  // line. Each family gets its own lane so unrelated families never merge visually.
  interface FamilyGroup {
    startU: number;
    ids: string[];
    childRank: number;
    targets: { child: string; adoptive: boolean; u: number }[];
    lane: number;
  }
  const groups = new Map<string, FamilyGroup>();
  const childIds = [...new Set(tree.relationships.filter((r) => r.type === 'parent-child').map((r) => r.targetId))];
  for (const child of childIds) {
    if (!uOf.has(child)) continue;
    const rels = tree.relationships.filter((r) => r.type === 'parent-child' && r.targetId === child && uOf.has(r.sourceId));
    const parents = rels.map((r) => r.sourceId);
    const used = new Set<string>();
    for (const p of parents) {
      if (used.has(p)) continue;
      const mate = parents.find((q) => q !== p && !used.has(q) && partnerIds(ix, p).includes(q));
      const ids = mate ? [p, mate] : [p];
      ids.forEach((i) => used.add(i));
      const adoptive = ids.every((i) => rels.find((r) => r.sourceId === i)?.kind === 'adoptive');
      const childRank = rows.get(child)!;
      const key = `${childRank}|${ids.slice().sort().join('+')}`;
      let group = groups.get(key);
      if (!group) {
        group = { startU: ids.length === 2 ? (centerU(ids[0]) + centerU(ids[1])) / 2 : centerU(ids[0]), ids, childRank, targets: [], lane: 0 };
        groups.set(key, group);
      }
      group.targets.push({ child, adoptive, u: centerU(child) });
    }
  }
  const LANE_STEP = 14;
  const byRank = new Map<number, FamilyGroup[]>();
  for (const g of groups.values()) byRank.set(g.childRank, [...(byRank.get(g.childRank) ?? []), g]);
  const laneCounts = new Map<number, number>();
  const span = (g: FamilyGroup) => [Math.min(g.startU, ...g.targets.map((t) => t.u)), Math.max(g.startU, ...g.targets.map((t) => t.u))] as const;
  for (const [rank, list] of byRank) {
    const sorted = bySortedStable(list, (a, b) => span(a)[0] - span(b)[0]);
    const laneEnds: number[] = [];
    for (const g of sorted) {
      const [lo, hi] = span(g);
      let lane = laneEnds.findIndex((end) => end + 12 < lo);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(hi);
      } else laneEnds[lane] = hi;
      g.lane = lane;
    }
    laneCounts.set(rank, laneEnds.length);
  }

  // Depth positions: a generation gap grows with the number of lanes it has to hold.
  const maxRank = Math.max(0, ...clusters.map((c) => c.rank));
  const vOfRank: number[] = [0];
  for (let r = 1; r <= maxRank; r++) {
    const lanes = laneCounts.get(r) ?? 1;
    const gap = Math.max(levelGap, 22 + (lanes - 1) * LANE_STEP + 28);
    vOfRank[r] = vOfRank[r - 1] + cardV + gap;
  }
  const uv = new Map<string, { u: number; v: number }>();
  for (const [id, u] of uOf) uv.set(id, { u, v: vOfRank[rows.get(id)!] });
  const toXY = (u: number, v: number): Point => (vertical ? { x: u, y: v } : { x: v, y: u });

  const positions = new Map<string, Point>();
  for (const [id, { u, v }] of uv) positions.set(id, toXY(u, v));

  // 6. Edges (abstract points mapped at the end).
  const edges: LayoutEdge[] = [];
  const junctionOfPair = new Map<string, { u: number; v: number }>();
  const adjacentInCluster = (a: string, b: string) => {
    const c = clusters[clusterOf.get(a)!];
    return Math.abs(c.members.indexOf(a) - c.members.indexOf(b)) === 1;
  };

  for (const r of tree.relationships) {
    if (r.type !== 'partner') continue;
    const a = uv.get(r.sourceId);
    const b = uv.get(r.targetId);
    if (!a || !b) continue;
    const [first, second] = a.u <= b.u ? [a, b] : [b, a];
    const vMid = a.v + cardV / 2;
    let pts: { u: number; v: number }[];
    let junction: { u: number; v: number };
    if (adjacentInCluster(r.sourceId, r.targetId)) {
      pts = [{ u: first.u + cardU, v: vMid }, { u: second.u, v: vMid }];
      junction = { u: (first.u + cardU + second.u) / 2, v: vMid };
    } else {
      // Non-adjacent partners: loop underneath the cards between them.
      const dip = a.v + cardV + 16;
      pts = [
        { u: first.u + cardU / 2, v: a.v + cardV },
        { u: first.u + cardU / 2, v: dip },
        { u: second.u + cardU / 2, v: dip },
        { u: second.u + cardU / 2, v: b.v + cardV },
      ];
      junction = { u: (first.u + second.u + cardU) / 2, v: dip };
    }
    junctionOfPair.set(pairKey(r.sourceId, r.targetId), junction);
    edges.push({
      id: `partner:${r.id}`,
      kind: 'partner',
      adoptive: false,
      points: pts.map((p) => toXY(p.u, p.v)),
      personIds: [r.sourceId, r.targetId],
      junction: toXY(junction.u, junction.v),
    });
  }

  for (const g of groups.values()) {
    const childTop = vOfRank[g.childRank];
    let start: { u: number; v: number };
    if (g.ids.length === 2) {
      start = junctionOfPair.get(pairKey(g.ids[0], g.ids[1])) ?? { u: g.startU, v: uv.get(g.ids[0])!.v + cardV };
    } else {
      const pp = uv.get(g.ids[0])!;
      start = { u: g.startU, v: pp.v + cardV };
    }
    const busV = Math.max(childTop - 22 - g.lane * LANE_STEP, start.v + 8);
    for (const tgt of g.targets) {
      const target = { u: tgt.u, v: childTop };
      const pts = Math.abs(start.u - target.u) < 0.5 ? [start, target] : [start, { u: start.u, v: busV }, { u: target.u, v: busV }, target];
      edges.push({
        id: `family:${tgt.child}:${g.ids.slice().sort().join('+')}`,
        kind: 'parent-child',
        adoptive: tgt.adoptive,
        points: pts.map((p) => toXY(p.u, p.v)),
        personIds: [tgt.child, ...g.ids],
      });
    }
  }

  // 7. Bounds.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + opts.cardWidth);
    maxY = Math.max(maxY, p.y + opts.cardHeight);
  }
  for (const e of edges) {
    for (const p of e.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!positions.size) {
    minX = minY = 0;
    maxX = maxY = 0;
  }
  return {
    positions,
    edges,
    rows,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    cardWidth: opts.cardWidth,
    cardHeight: opts.cardHeight,
  };
}

/** Rounded-corner SVG path through a polyline. */
export function roundedPath(points: Point[], radius = 12): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const l1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const l2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L ${cur.x} ${cur.y}`;
      continue;
    }
    const a = { x: cur.x - ((cur.x - prev.x) / l1) * r, y: cur.y - ((cur.y - prev.y) / l1) * r };
    const b = { x: cur.x + ((next.x - cur.x) / l2) * r, y: cur.y + ((next.y - cur.y) / l2) * r };
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export type { Person };
