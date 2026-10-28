import { expect, test } from '@playwright/test';
import { card, cards, createTree, fillPerson, noHorizontalOverflow, waitSaved } from './helpers';

test.describe('mobile (touch)', () => {
  test('landing, dashboard and editor fit the screen; core flow works with touch', async ({ page }) => {
    await page.goto('/');
    await noHorizontalOverflow(page);
    await expect(page.getByTestId('hero-preview')).toBeVisible();
    await page.getByTestId('hero-create').tap();
    await noHorizontalOverflow(page);
    await page.getByTestId('tree-name-submit').tap();
    await expect(page.getByTestId('person-dialog')).toBeVisible();
    await noHorizontalOverflow(page);
    await page.locator('#firstName').fill('Suresh');
    await page.locator('#lastName').fill('Rao');
    await page.getByTestId('person-submit').tap();
    await expect(cards(page)).toHaveCount(1);
    await noHorizontalOverflow(page);

    // bottom bar → add partner
    await card(page, 'Suresh').tap();
    await expect(page.getByTestId('profile-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('mobile-add').tap();
    await page.getByTestId('side-add-partner').tap();
    await page.locator('#firstName').fill('Eleanor');
    await page.getByTestId('person-submit').tap();
    await expect(cards(page)).toHaveCount(2);
    await waitSaved(page);

    // profile bottom sheet shows the relationship
    await card(page, 'Eleanor').tap();
    await expect(page.getByTestId('profile-sheet')).toContainText('Suresh Rao');
    await noHorizontalOverflow(page);
  });

  test('touch pan and pinch-zoom move the canvas', async ({ page }) => {
    await createTree(page, 'Touch');
    await fillPerson(page, 'A');
    // Zoom out with the on-canvas buttons so there is room to pinch in.
    await page.getByRole('button', { name: 'Zoom out' }).tap();
    await page.getByRole('button', { name: 'Zoom out' }).tap();
    await page.waitForTimeout(500);
    const viewport = page.locator('.react-flow__viewport');
    const scaleOf = async () => (await viewport.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a));
    const before = await scaleOf();
    const client = await page.context().newCDPSession(page);
    const box = (await page.getByTestId('tree-canvas').boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', d: number) =>
      client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: cx - d, y: cy, id: 0 }, { x: cx + d, y: cy, id: 1 }],
      });
    await touch('touchStart', 40);
    for (const d of [60, 90, 120, 150]) await touch('touchMove', d);
    await touch('touchEnd', 0);
    await page.waitForTimeout(300);
    const after = await scaleOf();
    expect(after).toBeGreaterThan(before);

    // one-finger drag pans
    const t0 = await viewport.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
    // Start from an empty corner so the drag doesn't land on the (magnified) card or its quick-add buttons.
    const sx = box.x + 30;
    const sy = box.y + 30;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 0 }] });
    for (const dx of [20, 50, 80]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + dx, y: sy, id: 0 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
    const t1 = await viewport.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
    expect(t1).toBeGreaterThan(t0 + 40);
  });

  test('toolbar, search sheet and actions sheet are usable', async ({ page }) => {
    await page.goto('/sample');
    await expect(cards(page)).toHaveCount(20);
    await noHorizontalOverflow(page);
    await page.getByTestId('search-open').tap();
    await page.getByTestId('search-input').fill('Priya');
    await page.getByTestId('search-results').getByRole('option', { name: /Priya Nair/ }).tap();
    await expect(page.getByTestId('profile-sheet')).toContainText('Priya Nair');
    await page.keyboard.press('Escape');
    await page.getByTestId('mobile-actions').tap();
    await page.getByTestId('layout-horizontal').tap();
    await page.waitForTimeout(600);
    await noHorizontalOverflow(page);
    await page.getByTestId('toolbar-more').tap();
    await page.getByTestId('more-export').tap();
    await expect(page.getByTestId('export-dialog')).toBeVisible();
    await noHorizontalOverflow(page);
  });
});
