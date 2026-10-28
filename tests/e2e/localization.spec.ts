import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addRelative, card, cards, createTree, downloadFile, fillPerson, pngSize, waitSaved } from './helpers';

const tmp = (name: string) => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ourlegacy-')), name);

test('Kannada: UI, names, dates and exports', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('language-switcher').click();
  await page.getByTestId('lang-kn').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ನಿಮ್ಮ ಕುಟುಂಬ. ನಿಮ್ಮ ಕಥೆ. ನಿಮ್ಮ ಪರಂಪರೆ.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'kn');
  await page.reload(); // preference persists
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ನಿಮ್ಮ ಕುಟುಂಬ');

  await createTree(page, 'ರಾವ್ ಕುಟುಂಬ');
  await expect(page.getByTestId('person-dialog')).toContainText('ಮೊದಲ ಹೆಸರು');
  await fillPerson(page, 'ಸುರೇಶ್', 'ರಾವ್', { birthDate: '1958-03-09', biography: 'ಮೈಸೂರಿನ ಬಳಿ ಬೆಳೆದರು.' });
  await addRelative(page, 'partner', 'ಲಕ್ಷ್ಮೀ', 'ರಾವ್');
  await card(page, 'ಸುರೇಶ್').click();
  await page.getByTestId('side-add-child').click();
  await fillPerson(page, 'ಅರ್ಜುನ್', 'ರಾವ್');
  await expect(cards(page)).toHaveCount(3);
  await waitSaved(page);

  // locale-aware date + Kannada profile labels
  await card(page, 'ಸುರೇಶ್').click();
  await expect(page.getByTestId('profile-content')).toContainText('ಜನನ');
  await expect(page.getByTestId('profile-content')).not.toContainText('March 9, 1958');

  // search works with Kannada text
  await page.getByTestId('search-input').fill('ಅರ್ಜು');
  await expect(page.getByTestId('search-results')).toContainText('ಅರ್ಜುನ್ ರಾವ್');
  await page.keyboard.press('Escape');

  // PNG export keeps the whole tree + Kannada (visual check is in the manual review; here we verify the file)
  await page.getByTestId('open-export').click();
  const png = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('kn.png'));
  expect(png.name).toBe('ರಾವ್-ಕುಟುಂಬ.png');
  const { width, height } = pngSize(png.path);
  expect(width).toBeGreaterThan(900);
  expect(height).toBeGreaterThan(600);

  await page.getByTestId('open-export').click();
  await page.getByTestId('export-format-pdf').click();
  await expect(page.getByTestId('pdf-plan')).toContainText('ಒಂದು A4');
  const pdf = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('kn.pdf'));
  const head = fs.readFileSync(pdf.path).subarray(0, 5).toString();
  expect(head).toBe('%PDF-');
  expect(pdf.size).toBeGreaterThan(5_000);

  // JSON round-trips Kannada
  await page.getByTestId('open-export').click();
  await page.getByTestId('export-format-json').click();
  const json = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('kn.json'));
  const data = JSON.parse(fs.readFileSync(json.path, 'utf8'));
  expect(data.trees[0].people.map((p: { firstName: string }) => p.firstName)).toContain('ಸುರೇಶ್');
});
