import { memo } from 'react';
import type { Edge, EdgeProps } from '@xyflow/react';
import { roundedPath, type LayoutEdge } from './layout';
import { useCanvasHighlight } from './canvasContext';
import { EDGE_COLORS } from './edges';

export type RelationEdgeType = Edge<{ edge: LayoutEdge }, 'relation'>;

function RelationEdgeImpl({ data }: EdgeProps<RelationEdgeType>) {
  const { selectedId, dimmed } = useCanvasHighlight();
  if (!data) return null;
  const e = data.edge;
  const active = !!selectedId && e.personIds.includes(selectedId);
  const faded = e.personIds.some((id) => dimmed.has(id));
  const color = e.kind === 'partner' ? (active ? EDGE_COLORS.partnerActive : EDGE_COLORS.partner) : active ? EDGE_COLORS.familyActive : EDGE_COLORS.family;
  return (
    <g opacity={faded ? 0.25 : 1} data-edge-kind={e.kind}>
      <path d={roundedPath(e.points, 14)} fill="none" stroke={color} strokeWidth={active ? 2.75 : 2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={e.adoptive ? '6 5' : undefined} />
      {e.kind === 'partner' && e.junction && <circle cx={e.junction.x} cy={e.junction.y} r={4.5} fill={color} />}
    </g>
  );
}

export const RelationEdge = memo(RelationEdgeImpl);
