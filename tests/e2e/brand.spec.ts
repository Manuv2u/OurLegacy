import { expect, test, type Page } from '@playwright/test';
import { createTree, fillPerson } from './helpers';

const imageLoaded = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0);

test.describe('brand: the tree emblem is the application logo', () => {
  test('landing: header mark, hero emblem and footer mark load; the logo link keeps its accessible name', async ({ page }) => {
    const failed: string[] = [];
    page.on('response', (r) => r.status() >= 400 && failed.push(r.url()));
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'OurLegacy' }).first()).toBeVisible();
    await expect(page.getByTestId('hero-emblem')).toBeVisible();
    expect(await imageLoaded(page, '[data-testid=hero-emblem]')).toBe(true);
    expect(await imageLoaded(page, 'header img[src="/logo-mark.png"]')).toBe(true);
    expect(await imageLoaded(page, 'footer img[src="/logo-mark.png"]')).toBe(true);
    expect(failed).toEqual([]);
  });

  test('favicon and app icons are served and declared', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="icon"][href="/favicon-32.png"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]')).toHaveCount(1);
    for (const path of ['/favicon-32.png', '/favicon.ico', '/apple-touch-icon.png', '/logo-emblem.png', '/logo-mark.png']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()['content-type'], path).toMatch(/image\//);
    }
  });

  test('dashboard and editor show the emblem; exports carry it in the footer without breaking', async ({ page }) => {
    await createTree(page, 'Brand');
    await fillPerson(page, 'Asha', 'Rao');
    expect(await imageLoaded(page, '[data-testid=editor-toolbar] img[src="/logo-mark.png"]')).toBe(true);
    await page.getByTestId('open-export').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-run').click()]);
    expect(dl.suggestedFilename()).toBe('Brand.png');
    await page.getByTestId('back-to-dashboard').click();
    expect(await imageLoaded(page, '[data-testid=dashboard] aside img[src="/logo-mark.png"]')).toBe(true);
  });
});
