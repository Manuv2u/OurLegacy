import { useMemo } from 'react';
import type { FamilyTree, LayoutDirection } from '@/types/family';
import { DEFAULT_CARD, layoutTree, roundedPath, type TreeLayout } from './layout';
import { PersonCardView } from './PersonCardView';
import { EDGE_COLORS } from './edges';
import { isDeceased } from '@/utils/status';
import { AgeGroupContext } from './ageGroupContext';
import { inferAgeGroups, type AgeGroup } from './ageGroups';

interface Props {
  tree: Pick<FamilyTree, 'people' | 'relationships'>;
  direction?: LayoutDirection;
  /** Extra space around the content, in px. */
  padding?: number;
  /** `mini` draws simplified cards for thumbnails. */
  variant?: 'full' | 'mini';
  layout?: TreeLayout;
  highlightId?: string | null;
  /** Age groups from the *whole* tree (so branch exports keep each person's look); inferred from `tree` when omitted. */
  ageGroups?: ReadonlyMap<string, AgeGroup>;
}

export function EdgesSvg({ layout, width, height, ox, oy, strokeWidth = 2 }: { layout: TreeLayout; width: number; height: number; ox: number; oy: number; strokeWidth?: number }) {
  return (
    <svg width={width} height={height} className="pointer-events-none absolute start-0 top-0" aria-hidden>
      <g transform={`translate(${ox} ${oy})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {layout.edges.map((e) => (
          <g key={e.id}>
            <path
              d={roundedPath(e.points, 14)}
              stroke={e.kind === 'partner' ? EDGE_COLORS.partner : EDGE_COLORS.family}
              strokeWidth={strokeWidth}
              strokeDasharray={e.adoptive ? '6 5' : undefined}
            />
            {e.kind === 'partner' && e.junction && <circle cx={e.junction.x} cy={e.junction.y} r={strokeWidth * 2.2} fill={EDGE_COLORS.partner} stroke="none" />}
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Non-interactive tree renderer using the same layout engine and card view as
 * the editor. Used for the landing preview, dashboard thumbnails and exports
 * (which need the whole tree at natural size, independent of any viewport).
 */
export function StaticTree({ tree, direction = 'vertical', padding = 0, variant = 'full', layout: provided, highlightId, ageGroups }: Props) {
  const groups = useMemo(() => ageGroups ?? inferAgeGroups(tree), [ageGroups, tree]);
  const layout = useMemo(
    () => provided ?? layoutTree(tree, { direction, cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height }),
    [provided, tree, direction],
  );
  const { bounds } = layout;
  const width = Math.max(1, Math.ceil(bounds.width + padding * 2));
  const height = Math.max(1, Math.ceil(bounds.height + padding * 2));
  const ox = padding - bounds.x;
  const oy = padding - bounds.y;

  if (variant === 'mini') {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="size-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <g transform={`translate(${ox} ${oy})`}>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {layout.edges.map((e) => (
              <path key={e.id} d={roundedPath(e.points, 14)} stroke={e.kind === 'partner' ? EDGE_COLORS.partner : EDGE_COLORS.family} strokeWidth={6} strokeDasharray={e.adoptive ? '16 12' : undefined} />
            ))}
          </g>
          {tree.people.map((p) => {
            const pos = layout.positions.get(p.id);
            if (!pos) return null;
            return <rect key={p.id} x={pos.x} y={pos.y} width={layout.cardWidth} height={layout.cardHeight} rx={22} fill={p.id === highlightId ? '#315c46' : isDeceased(p) ? '#eeefe9' : '#ffffff'} stroke="#b7c7bb" strokeWidth={5} />;
          })}
          {tree.people.map((p) => {
            const pos = layout.positions.get(p.id);
            if (!pos) return null;
            return <circle key={`a${p.id}`} cx={pos.x + 46} cy={pos.y + layout.cardHeight / 2} r={26} fill={isDeceased(p) ? '#cdd1ca' : '#cfdfd3'} />;
          })}
        </g>
      </svg>
    );
  }

  return (
    <AgeGroupContext.Provider value={groups}>
    <div className="relative" style={{ width, height }}>
      <EdgesSvg layout={layout} width={width} height={height} ox={ox} oy={oy} />
      {tree.people.map((p) => {
        const pos = layout.positions.get(p.id);
        if (!pos) return null;
        return (
          <div key={p.id} className="absolute" style={{ left: pos.x + ox, top: pos.y + oy }} data-person-id={p.id}>
            <PersonCardView person={p} flat />
          </div>
        );
      })}
    </div>
    </AgeGroupContext.Provider>
  );
}
