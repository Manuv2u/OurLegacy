/**
 * Deliberate PDF page sizing.
 *
 * 1. Prefer a single page: the smallest of A4 / A3 / A2 on which the tree stays
 *    readable (scale >= MIN_SINGLE_PAGE_SCALE), never enlarged beyond 1:1.
 * 2. Otherwise produce an overview page (whole tree on one A3 sheet) followed by
 *    A3 detail pages cut from the tree at a comfortable reading scale, so names
 *    stay legible however big the tree gets.
 */
export type PageName = 'a4' | 'a3' | 'a2';

export const PAGE_MM: Record<PageName, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
  a2: { w: 420, h: 594 },
};

export const MM_PER_PX = 25.4 / 96;
export const PAGE_MARGIN_MM = 10;
export const MIN_SINGLE_PAGE_SCALE = 0.6;
export const TILE_SCALE = 0.8;

export type Orientation = 'landscape' | 'portrait';

export interface SinglePagePlan {
  mode: 'single';
  page: PageName;
  orientation: Orientation;
  pageW: number;
  pageH: number;
  /** mm per content px, i.e. placement scale. */
  scale: number;
}

export interface TiledPlan {
  mode: 'tiled';
  page: 'a3';
  orientation: Orientation;
  pageW: number;
  pageH: number;
  scale: number;
  cols: number;
  rows: number;
  /** Tile size in content px. */
  tileW: number;
  tileH: number;
  /** overview + tiles */
  pageCount: number;
  overviewScale: number;
}

export type PdfPlan = SinglePagePlan | TiledPlan;

const dims = (page: PageName, orientation: Orientation) => {
  const { w, h } = PAGE_MM[page];
  return orientation === 'landscape' ? { pageW: h, pageH: w } : { pageW: w, pageH: h };
};

export function planPdf(contentW: number, contentH: number): PdfPlan {
  const wmm = Math.max(contentW, 1) * MM_PER_PX;
  const hmm = Math.max(contentH, 1) * MM_PER_PX;
  const orientation: Orientation = contentW >= contentH ? 'landscape' : 'portrait';

  for (const page of ['a4', 'a3', 'a2'] as const) {
    const { pageW, pageH } = dims(page, orientation);
    const fit = Math.min((pageW - 2 * PAGE_MARGIN_MM) / wmm, (pageH - 2 * PAGE_MARGIN_MM) / hmm);
    if (fit >= MIN_SINGLE_PAGE_SCALE) {
      return { mode: 'single', page, orientation, pageW, pageH, scale: Math.min(fit, 1) };
    }
  }

  const { pageW, pageH } = dims('a3', orientation);
  const availW = pageW - 2 * PAGE_MARGIN_MM;
  const availH = pageH - 2 * PAGE_MARGIN_MM;
  const tileW = availW / (TILE_SCALE * MM_PER_PX);
  const tileH = availH / (TILE_SCALE * MM_PER_PX);
  const cols = Math.max(1, Math.ceil(contentW / tileW));
  const rows = Math.max(1, Math.ceil(contentH / tileH));
  const overviewScale = Math.min(availW / wmm, availH / hmm);
  return { mode: 'tiled', page: 'a3', orientation, pageW, pageH, scale: TILE_SCALE, cols, rows, tileW, tileH, pageCount: 1 + cols * rows, overviewScale };
}

/** Image pixels per content px so the printed result is ~200 dpi at the planned scale. */
export function pdfPixelRatio(plan: PdfPlan): number {
  const s = plan.mode === 'single' ? plan.scale : plan.scale;
  return Math.min(3, Math.max(1, 2.1 * s));
}
