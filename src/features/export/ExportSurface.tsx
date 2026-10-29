import type { LayoutDirection, Person, Relationship } from '@/types/family';
import { StaticTree } from '@/features/family-tree/StaticTree';
import type { TreeLayout } from '@/features/family-tree/layout';
import type { AgeGroup } from '@/features/family-tree/ageGroups';
import { useI18n } from '@/i18n/useI18n';

export const EXPORT_PADDING = 56;
export const EXPORT_HEADER = 84;
export const EXPORT_FOOTER = 44;
export const EXPORT_MIN_WIDTH = 560;

export interface SurfaceMetrics {
  width: number;
  height: number;
  treeX: number;
  treeY: number;
}

export function surfaceMetrics(layout: TreeLayout, includeTitle: boolean): SurfaceMetrics {
  const treeW = Math.ceil(layout.bounds.width);
  const treeH = Math.ceil(layout.bounds.height);
  const width = Math.max(treeW, includeTitle ? EXPORT_MIN_WIDTH : 0) + EXPORT_PADDING * 2;
  const header = includeTitle ? EXPORT_HEADER : 0;
  const height = treeH + EXPORT_PADDING * 2 + header + (includeTitle ? EXPORT_FOOTER : 0);
  return { width, height, treeX: EXPORT_PADDING + Math.max(0, (width - EXPORT_PADDING * 2 - treeW) / 2), treeY: EXPORT_PADDING + header };
}

interface Props {
  name: string;
  people: Person[];
  relationships: Relationship[];
  direction: LayoutDirection;
  layout: TreeLayout;
  includeTitle: boolean;
  background: string | null;
  ageGroups?: ReadonlyMap<string, AgeGroup>;
}

/**
 * The exact DOM that is rasterised for PNG/PDF. It is laid out at natural size
 * (1 CSS px = 1 layout unit) and is independent of the on-screen viewport, so
 * exports always contain the whole selected tree.
 */
export function ExportSurface({ name, people, relationships, direction, layout, includeTitle, background, ageGroups }: Props) {
  const { t, formatDateTime } = useI18n();
  const m = surfaceMetrics(layout, includeTitle);
  return (
    <div id="export-surface" style={{ width: m.width, height: m.height, background: background ?? 'transparent', position: 'relative', color: '#202820', fontFamily: 'var(--font-sans)' }}>
      {includeTitle && (
        <div style={{ position: 'absolute', left: EXPORT_PADDING, top: EXPORT_PADDING - 8, right: EXPORT_PADDING }}>
          <div className="serif" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.5, color: '#1d3a2c' }}>
            {name}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#566259' }}>
            {t('export.people', { count: people.length })} · {formatDateTime(new Date().toISOString())}
          </div>
          <div style={{ height: 2, width: 56, background: '#c8a96b', marginTop: 6, borderRadius: 2 }} />
        </div>
      )}
      <div style={{ position: 'absolute', left: m.treeX, top: m.treeY }}>
        <StaticTree tree={{ people, relationships }} direction={direction} layout={layout} ageGroups={ageGroups} />
      </div>
      {includeTitle && (
        <div style={{ position: 'absolute', left: EXPORT_PADDING, right: EXPORT_PADDING, bottom: 14, fontSize: 12, lineHeight: 1.6, color: '#566259', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo-mark.png" alt="" width={22} height={22} style={{ width: 22, height: 22, objectFit: 'contain' }} />
            {t('export.footer')}
          </span>
        </div>
      )}
    </div>
  );
}
