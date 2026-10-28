import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cards, downloadFile, pngSize } from './helpers';

const tmp = (name: string) => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ourlegacy-')), name);

/** A wide tree: one couple with `kids` children — far larger than any viewport or single page. */
function wideTree(kids: number) {
  const now = new Date().toISOString();
  const people = [
    { id: 'a', firstName: 'Root', lastName: 'One', createdAt: now, updatedAt: now },
    { id: 'b', firstName: 'Root', lastName: 'Two', createdAt: now, updatedAt: now },
    ...Array.from({ length: kids }, (_, i) => ({ id: `k${i}`, firstName: `Kid${i}`, lastName: 'Wide', birthDate: String(1950 + i), createdAt: now, updatedAt: now })),
  ];
  const relationships = [
    { id: 'p', type: 'partner', sourceId: 'a', targetId: 'b' },
    ...Array.from({ length: kids }, (_, i) => [
      { id: `ra${i}`, type: 'parent-child', sourceId: 'a', targetId: `k${i}`, kind: 'biological' },
      { id: `rb${i}`, type: 'parent-child', sourceId: 'b', targetId: `k${i}`, kind: 'biological' },
    ]).flat(),
  ];
  return { app: 'OurLegacy', format: 'ourlegacy-backup', schemaVersion: 1, exportedAt: now, trees: [{ id: 'wide', name: 'Wide tree', schemaVersion: 1, createdAt: now, updatedAt: now, people, relationships, layout: { direction: 'vertical' } }] };
}

test('full-tree and branch exports are not limited to the viewport; large trees get a deliberate PDF plan', async ({ page }) => {
  const file = tmp('wide.json');
  fs.writeFileSync(file, JSON.stringify(wideTree(40)));
  await page.goto('/app');
  await page.getByTestId('nav-import').click();
  await page.getByTestId('import-file').setInputFiles(file);
  await page.getByTestId('import-run').click();
  await expect(cards(page)).toHaveCount(42);

  // Zoom way in so only a few cards are visible, then export the whole tree.
  await page.locator('[data-person-id="k3"]').click();
  for (let i = 0; i < 4; i++) await page.getByTestId('zoom-in').click();
  await page.waitForTimeout(400);

  await page.getByTestId('open-export').click();
  const png = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('wide.png'));
  const { width } = pngSize(png.path);
  // 40 cards × (216 + gap) ≈ 9.9k css px wide; the viewport is ~1100px. Anything wider than the viewport proves full-tree export.
  expect(width).toBeGreaterThan(5000);
  expect(width).toBeLessThanOrEqual(16384);

  // Branch export of one child is much smaller than the full tree.
  await page.locator('[data-person-id="k3"]').click();
  await page.getByTestId('open-export').click();
  await page.getByTestId('scope-ancestors').check();
  const branch = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('branch.png'));
  const b = pngSize(branch.path);
  expect(b.width).toBeLessThan(width / 2);

  // PDF: too big for one readable page -> overview + tiled pages
  await page.getByTestId('open-export').click();
  await page.getByTestId('export-format-pdf').click();
  await expect(page.getByTestId('pdf-plan')).toContainText('overview page plus');
  const pdf = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('wide.pdf'));
  const text = fs.readFileSync(pdf.path).toString('latin1');
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBeGreaterThan(3);
});
