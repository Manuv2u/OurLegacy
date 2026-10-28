import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { card, createTree, fillPerson } from './helpers';

async function audit(page: Page, label: string) {
  await page.waitForTimeout(700); // let entrance animations finish so contrast is measured at full opacity
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(summary, `${label} accessibility violations`).toEqual([]);
}

test.describe('accessibility (axe, WCAG 2.1 AA)', () => {
  test('landing page in English and Kannada', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('hero-preview')).toBeVisible();
    await audit(page, 'landing');
    await page.getByTestId('language-switcher').click();
    await page.getByTestId('lang-kn').click();
    await audit(page, 'landing (kn)');
  });

  test('dashboard, editor, profile and dialogs', async ({ page }) => {
    await createTree(page, 'A11y');
    await audit(page, 'person dialog');
    await fillPerson(page, 'Suresh', 'Rao', { birthDate: '1958' });
    await card(page, 'Suresh').click();
    await audit(page, 'editor + profile');
    await page.getByTestId('open-export').click();
    await audit(page, 'export dialog');
    await page.keyboard.press('Escape');
    await page.getByTestId('open-settings').click();
    await audit(page, 'settings dialog');
    await page.keyboard.press('Escape');
    await page.getByTestId('back-to-dashboard').click();
    await expect(page.getByTestId('tree-card')).toBeVisible();
    await audit(page, 'dashboard');
  });
});
