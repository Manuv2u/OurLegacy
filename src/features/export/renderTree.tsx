import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toCanvas } from 'html-to-image';
import type { FamilyTree } from '@/types/family';
import { DEFAULT_CARD, layoutTree, type TreeLayout } from '@/features/family-tree/layout';
import { subTree } from '@/features/relationships/graph';
import { ExportSurface, surfaceMetrics } from './ExportSurface';
import { allNameForms } from '@/utils/names';
import { inferAgeGroups, type AgeGroup } from '@/features/family-tree/ageGroups';
import { scopeIds, type ExportScope } from './scope';

/** Conservative canvas limits that work in Chrome, Firefox and Safari (incl. iOS). */
export const MAX_CANVAS_SIDE = 16384;
export const MAX_CANVAS_PIXELS = 16_000_000;

export interface PreparedExport {
  name: string;
  people: FamilyTree['people'];
  relationships: FamilyTree['relationships'];
  direction: 'vertical' | 'horizontal';
  layout: TreeLayout;
  /** Size of the exported surface in CSS px at 1×. */
  width: number;
  height: number;
  ageGroups: ReadonlyMap<string, AgeGroup>;
}

export function prepareExport(tree: FamilyTree, scope: ExportScope, selectedId: string | null, includeTitle: boolean): PreparedExport {
  const ids = scopeIds(tree, scope, selectedId);
  const sub = subTree(tree, ids);
  const direction = tree.layout?.direction ?? 'vertical';
  const layout = layoutTree(sub, { direction, cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height });
  const m = surfaceMetrics(layout, includeTitle);
  return { name: tree.name, people: sub.people, relationships: sub.relationships, direction, layout, width: m.width, height: m.height, ageGroups: inferAgeGroups(tree) };
}

/** Largest pixel ratio (<= wanted) that keeps the canvas inside browser limits. */
export function fitPixelRatio(width: number, height: number, wanted: number): { ratio: number; reduced: boolean } {
  const bySide = MAX_CANVAS_SIDE / Math.max(width, height);
  const byArea = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
  const ratio = Math.min(wanted, bySide, byArea);
  return { ratio: Math.max(0.1, Math.floor(ratio * 100) / 100), reduced: ratio < wanted - 0.001 };
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export interface RenderOptions {
  includeTitle: boolean;
  /** CSS background colour, or null for transparent. */
  background: string | null;
  pixelRatio: number;
}

export interface RenderedCanvas {
  canvas: HTMLCanvasElement;
  pixelRatio: number;
  reduced: boolean;
}

/**
 * Rasterise the prepared tree. It is rendered into an off-screen DOM node at
 * natural size (never the visible viewport), after web fonts have loaded so
 * Kannada glyphs are embedded correctly.
 */
export async function renderPreparedToCanvas(prep: PreparedExport, opts: RenderOptions): Promise<RenderedCanvas> {
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = `position:fixed;left:-100000px;top:0;width:${prep.width}px;height:${prep.height}px;pointer-events:none;`;
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    flushSync(() =>
      root.render(
        <ExportSurface
          name={prep.name}
          people={prep.people}
          relationships={prep.relationships}
          direction={prep.direction}
          layout={prep.layout}
          includeTitle={opts.includeTitle}
          background={opts.background}
          ageGroups={prep.ageGroups}
        />,
      ),
    );
    await nextFrame();
    // Make sure every face used by the content (including Kannada) is available before capture.
    const sample = [prep.name, ...prep.people.map((p) => allNameForms(p))].join(' ').slice(0, 2000);
    try {
      await Promise.all([
        document.fonts.load('600 14px "Noto Sans Kannada"', sample),
        document.fonts.load('400 12px "Noto Sans Kannada"', sample),
        document.fonts.load('600 14px "Inter Variable"', sample),
        document.fonts.load('600 30px "Noto Serif Kannada"', prep.name),
      ]);
      await document.fonts.ready;
    } catch {
      /* fall back to whatever is loaded */
    }
    await nextFrame();
    const surface = container.querySelector<HTMLElement>('#export-surface')!;
    const { ratio, reduced } = fitPixelRatio(prep.width, prep.height, opts.pixelRatio);
    const canvas = await toCanvas(surface, {
      pixelRatio: ratio,
      width: prep.width,
      height: prep.height,
      backgroundColor: opts.background ?? undefined,
      cacheBust: false,
    });
    return { canvas, pixelRatio: ratio, reduced };
  } finally {
    root.unmount();
    container.remove();
  }
}

export const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), type));
