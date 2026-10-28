import type { jsPDF as JsPdfType } from 'jspdf';
import type { FamilyTree } from '@/types/family';
import { downloadBlob, safeFilename } from '@/lib/download';
import { canvasToBlob, prepareExport, renderPreparedToCanvas } from './renderTree';
import { MM_PER_PX, PAGE_MARGIN_MM, pdfPixelRatio, planPdf, type PdfPlan } from './pdfPlan';
import type { ExportScope } from './scope';

export type PngBackground = 'ivory' | 'white' | 'transparent';
const BG: Record<PngBackground, string | null> = { ivory: '#f8f8f5', white: '#ffffff', transparent: null };

export class EmptyExportError extends Error {}

export interface ImageExportInput {
  tree: FamilyTree;
  scope: ExportScope;
  selectedId: string | null;
  includeTitle: boolean;
}

export async function exportPng(input: ImageExportInput & { resolution: 1 | 2 | 3; background: PngBackground }) {
  if (!input.tree.people.length) throw new EmptyExportError();
  const prep = prepareExport(input.tree, input.scope, input.selectedId, input.includeTitle);
  const { canvas, pixelRatio, reduced } = await renderPreparedToCanvas(prep, {
    includeTitle: input.includeTitle,
    background: BG[input.background],
    pixelRatio: input.resolution,
  });
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, safeFilename(input.tree.name, 'png'));
  return { width: canvas.width, height: canvas.height, pixelRatio, reduced, bytes: blob.size };
}

/** Build the PDF document (without downloading) so it can be inspected in tests. */
export async function buildPdf(input: ImageExportInput): Promise<{ pdf: JsPdfType; plan: PdfPlan }> {
  if (!input.tree.people.length) throw new EmptyExportError();
  const prep = prepareExport(input.tree, input.scope, input.selectedId, input.includeTitle);
  const plan = planPdf(prep.width, prep.height);
  const { canvas, pixelRatio } = await renderPreparedToCanvas(prep, { includeTitle: input.includeTitle, background: '#ffffff', pixelRatio: pdfPixelRatio(plan) });
  const orientation = plan.orientation === 'landscape' ? 'l' : 'p';
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation, unit: 'mm', format: plan.page, compress: true });
  // PDF metadata is Latin-1 only; keep it ASCII-safe so Kannada titles never corrupt the file.
  const asciiTitle = /^[\x20-\x7e]*$/.test(input.tree.name) ? input.tree.name : 'OurLegacy family tree';
  pdf.setProperties({ title: asciiTitle, creator: 'OurLegacy', subject: 'Family tree' });

  const place = (c: HTMLCanvasElement, x: number, y: number, w: number, h: number) => pdf.addImage(c.toDataURL('image/png'), 'PNG', x, y, w, h, undefined, 'FAST');

  if (plan.mode === 'single') {
    const w = prep.width * MM_PER_PX * plan.scale;
    const h = prep.height * MM_PER_PX * plan.scale;
    place(canvas, (plan.pageW - w) / 2, (plan.pageH - h) / 2, w, h);
  } else {
    // Page 1: overview of the whole tree.
    const ow = prep.width * MM_PER_PX * plan.overviewScale;
    const oh = prep.height * MM_PER_PX * plan.overviewScale;
    place(canvas, (plan.pageW - ow) / 2, (plan.pageH - oh) / 2, ow, oh);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    let page = 1;
    for (let r = 0; r < plan.rows; r++) {
      for (let c = 0; c < plan.cols; c++) {
        page++;
        pdf.addPage(plan.page, orientation);
        const sx = Math.round(c * plan.tileW * pixelRatio);
        const sy = Math.round(r * plan.tileH * pixelRatio);
        const sw = Math.min(Math.round(plan.tileW * pixelRatio), canvas.width - sx);
        const sh = Math.min(Math.round(plan.tileH * pixelRatio), canvas.height - sy);
        if (sw <= 0 || sh <= 0) continue;
        const tile = document.createElement('canvas');
        tile.width = sw;
        tile.height = sh;
        const ctx = tile.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sw, sh);
        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
        place(tile, PAGE_MARGIN_MM, PAGE_MARGIN_MM, (sw / pixelRatio) * MM_PER_PX * plan.scale, (sh / pixelRatio) * MM_PER_PX * plan.scale);
        pdf.text(`${page} / ${plan.pageCount}  ·  R${r + 1} C${c + 1}`, plan.pageW / 2, plan.pageH - 5, { align: 'center' });
      }
    }
  }
  return { pdf, plan };
}

export async function exportPdf(input: ImageExportInput) {
  const { pdf, plan } = await buildPdf(input);
  const blob = pdf.output('blob');
  downloadBlob(blob, safeFilename(input.tree.name, 'pdf'));
  return { plan, bytes: blob.size };
}

