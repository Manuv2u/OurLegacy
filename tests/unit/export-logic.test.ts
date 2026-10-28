import { describe, expect, it } from 'vitest';
import { MIN_SINGLE_PAGE_SCALE, MM_PER_PX, pdfPixelRatio, planPdf } from '@/features/export/pdfPlan';
import { fitPixelRatio, MAX_CANVAS_PIXELS, MAX_CANVAS_SIDE } from '@/features/export/renderTree';
import { scopeIds } from '@/features/export/scope';
import { createSampleTree } from '@/features/family-tree/sampleTree';

describe('planPdf', () => {
  it('uses one A4 page for small trees, never enlarging beyond 1:1', () => {
    const plan = planPdf(500, 300);
    expect(plan).toMatchObject({ mode: 'single', page: 'a4', orientation: 'landscape' });
    expect(plan.scale).toBeLessThanOrEqual(1);
  });

  it('picks portrait for tall trees', () => {
    expect(planPdf(400, 900).orientation).toBe('portrait');
  });

  it('moves up to a larger sheet before shrinking text below the readable scale', () => {
    const plan = planPdf(1600, 1000);
    expect(plan.mode).toBe('single');
    expect(plan.scale).toBeGreaterThanOrEqual(MIN_SINGLE_PAGE_SCALE);
    expect(['a4', 'a3', 'a2']).toContain(plan.page);
  });

  it('tiles huge trees onto A3 pages with an overview page', () => {
    const plan = planPdf(10_000, 700);
    if (plan.mode !== 'tiled') throw new Error('expected tiled');
    expect(plan.page).toBe('a3');
    expect(plan.cols).toBeGreaterThan(2);
    expect(plan.pageCount).toBe(1 + plan.cols * plan.rows);
    // tiles together cover the whole content
    expect(plan.cols * plan.tileW).toBeGreaterThanOrEqual(10_000);
    expect(plan.rows * plan.tileH).toBeGreaterThanOrEqual(700);
    // tiles fit on the page at the plan scale
    expect(plan.tileW * MM_PER_PX * plan.scale).toBeLessThanOrEqual(plan.pageW - 20 + 0.001);
  });

  it('chooses a sensible raster density', () => {
    expect(pdfPixelRatio(planPdf(500, 300))).toBeGreaterThanOrEqual(1);
    expect(pdfPixelRatio(planPdf(500, 300))).toBeLessThanOrEqual(3);
  });
});

describe('fitPixelRatio (canvas limits)', () => {
  it('keeps the wanted ratio when the canvas is small enough', () => {
    expect(fitPixelRatio(1000, 800, 2)).toEqual({ ratio: 2, reduced: false });
  });
  it('reduces the ratio so neither side nor area exceeds browser limits', () => {
    const { ratio, reduced } = fitPixelRatio(12_000, 4_000, 3);
    expect(reduced).toBe(true);
    expect(12_000 * ratio).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect(12_000 * ratio * 4_000 * ratio).toBeLessThanOrEqual(MAX_CANVAS_PIXELS * 1.001);
  });
});

describe('scopeIds', () => {
  const tree = createSampleTree();
  const id = (n: string) => tree.people.find((p) => p.firstName === n)!.id;
  it('full tree ignores selection', () => {
    expect(scopeIds(tree, 'full', id('Arjun')).size).toBe(20);
  });
  it('branch scopes need a selection, otherwise fall back to the full tree', () => {
    expect(scopeIds(tree, 'descendants', null).size).toBe(20);
    const desc = scopeIds(tree, 'descendants', id('Arjun'));
    expect([...desc].sort()).toEqual(['Arjun', 'Priya', 'Aarav', 'Anaya'].map(id).sort());
    const anc = scopeIds(tree, 'ancestors', id('Arjun'));
    for (const n of ['Suresh', 'Eleanor', 'Venkatesh', 'Lakshmi', 'Arthur', 'Margaret', 'Priya']) expect(anc.has(id(n))).toBe(true);
    expect(anc.has(id('Aarav'))).toBe(false);
  });
});
