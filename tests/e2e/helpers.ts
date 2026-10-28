import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';

export const cards = (page: Page) => page.getByTestId('person-card');
export const card = (page: Page, name: string) => cards(page).filter({ hasText: name });

export async function createTree(page: Page, name: string) {
  await page.goto('/app');
  await page.getByTestId('create-tree').click();
  await page.getByTestId('tree-name-field').fill(name);
  await page.getByTestId('tree-name-submit').click();
  await expect(page.getByTestId('person-dialog')).toBeVisible();
}

export async function fillPerson(page: Page, first: string, last = '', extra: Record<string, string> = {}) {
  await page.locator('#firstName').fill(first);
  if (last) await page.locator('#lastName').fill(last);
  for (const [id, value] of Object.entries(extra)) await page.locator(`#${id}`).fill(value);
  await page.getByTestId('person-submit').click();
  await expect(page.getByTestId('person-dialog')).toBeHidden();
}

/** Open the add dialog from the sidebar for the currently selected person. */
export async function addRelative(page: Page, kind: 'parent' | 'partner' | 'child' | 'sibling', first: string, last = '') {
  await page.getByTestId(`side-add-${kind}`).click();
  await fillPerson(page, first, last);
}

export async function downloadFile(page: Page, trigger: () => Promise<void>, to: string) {
  const [dl] = await Promise.all([page.waitForEvent('download'), trigger()]);
  await dl.saveAs(to);
  return { path: to, name: dl.suggestedFilename(), size: fs.statSync(to).size };
}

export function pngSize(file: string) {
  const b = fs.readFileSync(file);
  expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

export async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
}

export async function noHorizontalOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw, 'horizontal overflow').toBeLessThanOrEqual(iw);
}
