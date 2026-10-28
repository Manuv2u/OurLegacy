import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addRelative, card, cards, createTree, downloadFile, fillPerson, waitSaved } from './helpers';

const tmp = (name: string) => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ourlegacy-')), name);

test.describe('full product journey', () => {
  test('landing → create tree → add people → relationships → refresh → export → delete → import → verify', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Landing page
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your family. Your story. Your legacy.');
    await expect(page.getByTestId('landing-privacy-notice')).toHaveText('Your family tree is saved in this browser. Export a backup to keep a copy safe.');
    await expect(page.getByTestId('hero-preview')).toBeVisible();
    await page.getByTestId('hero-create').click();

    // Create tree
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByTestId('tree-name-dialog')).toBeVisible();
    await page.getByTestId('tree-name-field').fill('Journey Tree');
    await page.getByTestId('tree-name-submit').click();
    await expect(page.getByTestId('person-dialog')).toBeVisible();

    // First person, with a story
    await fillPerson(page, 'Suresh', 'Rao', { birthDate: '1958-03-09', biography: 'An architect who loved old houses.' });
    await expect(cards(page)).toHaveCount(1);
    await waitSaved(page);

    // Partner, then a child with both parents
    await addRelative(page, 'partner', 'Eleanor', 'Hartwell');
    await expect(cards(page)).toHaveCount(2);
    await card(page, 'Suresh').click();
    await page.getByTestId('side-add-child').click();
    await expect(page.locator('#other-parent')).toHaveText(/Eleanor Hartwell/); // defaults to the single partner
    await fillPerson(page, 'Arjun', 'Rao');
    await expect(cards(page)).toHaveCount(3);

    // New person is selected; both parents are listed in the profile
    await expect(page.getByTestId('profile-name')).toHaveText('Arjun Rao');
    const profile = page.getByTestId('profile-content');
    await expect(profile).toContainText('Suresh Rao');
    await expect(profile).toContainText('Eleanor Hartwell');
    await expect(page.getByTestId('relative-chip')).toHaveCount(2);

    // Sibling shares both parents
    await addRelative(page, 'sibling', 'Maya', 'Rao');
    await expect(cards(page)).toHaveCount(4);
    await card(page, 'Arjun').click();
    await expect(page.getByTestId('profile-content')).toContainText('Maya Rao');
    await expect(page.getByTestId('relative-chip')).toHaveCount(3); // 2 parents + 1 sibling

    // The parents' profile lists partner and both children
    await card(page, 'Suresh').click();
    await expect(page.getByTestId('profile-content')).toContainText('Eleanor Hartwell');
    await expect(page.getByTestId('relative-chip')).toHaveCount(3); // partner + 2 children
    await expect(page.getByTestId('story-text')).toHaveText('An architect who loved old houses.');

    // Saved, then refresh and verify recovery
    await waitSaved(page);
    await page.reload();
    await expect(cards(page)).toHaveCount(4);
    for (const n of ['Suresh Rao', 'Eleanor Hartwell', 'Arjun Rao', 'Maya Rao']) await expect(card(page, n)).toBeVisible();
    await expect(page.getByTestId('tree-name')).toHaveValue('Journey Tree');
    await card(page, 'Suresh').click();
    await expect(page.getByTestId('story-text')).toHaveText('An architect who loved old houses.');

    // Export JSON
    await page.getByTestId('open-export').click();
    await page.getByTestId('export-format-json').click();
    const json = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('backup.json'));
    expect(json.name).toBe('Journey-Tree.ourlegacy.json');
    const backup = JSON.parse(fs.readFileSync(json.path, 'utf8'));
    expect(backup.format).toBe('ourlegacy-backup');
    expect(backup.trees[0].people).toHaveLength(4);
    expect(backup.trees[0].relationships.filter((r: { type: string }) => r.type === 'parent-child')).toHaveLength(4);
    expect(backup.trees[0].relationships.filter((r: { type: string }) => r.type === 'partner')).toHaveLength(1);

    // Delete the tree from the dashboard
    await page.getByTestId('back-to-dashboard').click();
    await expect(page.getByTestId('tree-card')).toHaveCount(1);
    await page.getByTestId('tree-actions').click();
    await page.getByTestId('action-delete').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete tree' }).click();
    await expect(page.getByTestId('dashboard-empty')).toBeVisible();

    // Import it back
    await page.getByTestId('nav-import').click();
    await page.getByTestId('import-file').setInputFiles(json.path);
    await expect(page.getByTestId('import-summary')).toContainText('Journey Tree');
    await page.getByTestId('import-run').click();
    await expect(page).toHaveURL(/\/app\/tree\//);
    await expect(cards(page)).toHaveCount(4);
    await card(page, 'Arjun').click();
    await expect(page.getByTestId('profile-content')).toContainText('Suresh Rao');
    await card(page, 'Suresh').click();
    await expect(page.getByTestId('story-text')).toHaveText('An architect who loved old houses.');
    expect(errors).toEqual([]);
  });

  test('relationship validation: ancestors/descendants cannot be linked into a cycle', async ({ page }) => {
    await createTree(page, 'Cycles');
    await fillPerson(page, 'Grand', 'Parent');
    await addRelative(page, 'child', 'Middle', 'Parent');
    await addRelative(page, 'child', 'Little', 'Parent');
    await card(page, 'Grand').click();
    await page.getByTestId('side-link-existing').click();
    await page.locator('#rel-type').selectOption('parent'); // who could be Grand's parent?
    const options = await page.getByTestId('existing-person-select').locator('option').allTextContents();
    expect(options.join('|')).not.toContain('Middle');
    expect(options.join('|')).not.toContain('Little');
    // Nobody valid is left: Middle and Little are descendants
    await expect(page.getByTestId('no-candidates')).toBeVisible();
  });

  test('a third biological parent is rejected with a clear message; adoptive is allowed', async ({ page }) => {
    await createTree(page, 'Parents');
    await fillPerson(page, 'Kid');
    await addRelative(page, 'parent', 'Mum');
    await card(page, 'Kid').click();
    await addRelative(page, 'parent', 'Dad');
    await card(page, 'Kid').click();
    await page.getByTestId('side-add-parent').click();
    await page.locator('#firstName').fill('Extra');
    await page.getByTestId('person-submit').click();
    await expect(page.getByTestId('form-error')).toContainText('at most two biological parents');
    await expect(cards(page)).toHaveCount(3); // nothing was created
    await page.locator('#rel-kind').selectOption('adoptive');
    await page.getByTestId('person-submit').click();
    await expect(page.getByTestId('person-dialog')).toBeHidden();
    await expect(cards(page)).toHaveCount(4);
  });

  test('form validation, undo/redo, delete with undo, and search', async ({ page }) => {
    await createTree(page, 'Editing');
    // validation
    await page.getByTestId('person-submit').click();
    await expect(page.getByRole('alert').first()).toHaveText('Enter at least a first or last name.');
    await page.locator('#firstName').fill('Ravi');
    await page.locator('#birthDate').fill('1950-13-40');
    await page.getByTestId('person-submit').click();
    await expect(page.locator('#birthDate-error')).toBeVisible();
    await page.locator('#birthDate').fill('1950');
    await expect(page.locator('#deathDate')).toHaveCount(0); // hidden for living people
    await page.getByRole('radio', { name: 'Deceased' }).click();
    await page.locator('#deathDate').fill('1940');
    await page.getByTestId('person-submit').click();
    await expect(page.locator('#deathDate-error')).toContainText('before the birth date');
    await page.locator('#deathDate').fill('2010');
    await page.getByTestId('person-submit').click();
    await expect(cards(page)).toHaveCount(1);
    await expect(card(page, 'Ravi')).toContainText('1950 – 2010');

    // edit keeps existing data
    await card(page, 'Ravi').click();
    await page.getByTestId('edit-person').click();
    await expect(page.locator('#birthDate')).toHaveValue('1950');
    await page.locator('#lastName').fill('Kumar');
    await page.getByTestId('person-submit').click();
    await expect(card(page, 'Ravi Kumar')).toContainText('1950 – 2010');

    // undo / redo
    await addRelative(page, 'child', 'Sita', 'Kumar');
    await expect(cards(page)).toHaveCount(2);
    await page.getByTestId('undo').click();
    await expect(cards(page)).toHaveCount(1);
    await page.getByTestId('redo').click();
    await expect(cards(page)).toHaveCount(2);
    await page.keyboard.press('Control+z');
    await expect(cards(page)).toHaveCount(1);
    await page.keyboard.press('Control+Shift+z');
    await expect(cards(page)).toHaveCount(2);

    // search
    await page.getByTestId('search-input').fill('sit');
    await expect(page.getByTestId('search-results')).toContainText('Sita Kumar');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('profile-name')).toHaveText('Sita Kumar');
    await page.getByTestId('search-input').fill('zzz');
    await expect(page.getByTestId('search-results')).toContainText('No one matches');

    // delete → confirm → undo
    await card(page, 'Sita').click();
    await page.getByTestId('delete-person').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete person' }).click();
    await expect(cards(page)).toHaveCount(1);
    await page.getByTestId('undo').click();
    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByTestId('tree-canvas')).toBeVisible();
  });

  test('keyboard: arrow keys move between relatives, Enter keeps selection, shortcuts work', async ({ page }) => {
    await createTree(page, 'Keys');
    await fillPerson(page, 'Parent');
    await addRelative(page, 'child', 'Child');
    await card(page, 'Parent').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('profile-name')).toHaveText('Parent');
    await page.keyboard.press('ArrowDown');
    await expect(card(page, 'Child')).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 'Child')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(card(page, 'Parent')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(card(page, 'Parent')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('/');
    await expect(page.getByTestId('search-input')).toBeFocused();
  });

  test('stories: write inline, see them in the stories dialog, survive reload', async ({ page }) => {
    await createTree(page, 'Stories');
    await fillPerson(page, 'Lakshmi', 'Rao');
    await card(page, 'Lakshmi').click();
    await page.getByTestId('write-story').click();
    await page.getByTestId('story-textarea').fill('Grew up near Mysuru.\nTaught every grandchild one lullaby.');
    await waitSaved(page);
    await page.getByTestId('open-stories').click();
    await expect(page.getByTestId('stories-dialog')).toContainText('Taught every grandchild one lullaby.');
    await page.keyboard.press('Escape');
    await page.reload();
    await card(page, 'Lakshmi').click();
    await expect(page.getByTestId('story-text')).toContainText('Grew up near Mysuru.');
  });

  test('layout direction is saved with the tree and restored', async ({ page }) => {
    await createTree(page, 'Direction');
    await fillPerson(page, 'A');
    await addRelative(page, 'child', 'B');
    const pos = async (n: string) => (await card(page, n).boundingBox())!;
    await page.getByTestId('layout-horizontal').click();
    await page.waitForTimeout(700);
    let a = await pos('A'), b = await pos('B');
    expect(b.x).toBeGreaterThan(a.x + 100);
    await waitSaved(page);
    await page.reload();
    await page.waitForTimeout(700);
    a = await pos('A'); b = await pos('B');
    expect(b.x).toBeGreaterThan(a.x + 100);
  });

  test('explore the sample tree without saving; make a copy to keep it', async ({ page }) => {
    await page.goto('/sample');
    await expect(page.getByTestId('sample-banner')).toBeVisible();
    await expect(cards(page)).toHaveCount(20);
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'sample');
    await page.getByTestId('save-sample-copy').click();
    await expect(page).toHaveURL(/\/app\/tree\//);
    await expect(cards(page)).toHaveCount(20);
    await expect(page.getByTestId('tree-name')).toHaveValue('The Rao–Hartwell Family');
  });

  test('generation shortcuts and branch highlight', async ({ page }) => {
    await page.goto('/sample');
    await card(page, 'Arjun').click();
    await page.getByTestId('gen-grandparents').click();
    await page.waitForTimeout(600);
    // grandparents highlighted: Venkatesh, Lakshmi, Arthur, Margaret are in view
    for (const n of ['Venkatesh', 'Lakshmi', 'Arthur', 'Margaret']) await expect(card(page, n)).toBeInViewport();
    await page.getByTestId('focus-branch').click();
    // Nisha is outside Arjun's ancestors/descendants, so her card is dimmed; Arjun's own is not.
    await expect(card(page, 'Nisha').locator('div[style*="width"]')).toHaveClass(/opacity-35/);
    await expect(card(page, 'Arjun').locator('div[style*="width"]')).not.toHaveClass(/opacity-35/);
  });

  test('storage failure is reported honestly and recovers on retry (no silent data loss)', async ({ page }) => {
    await createTree(page, 'Failing');
    await fillPerson(page, 'First');
    await waitSaved(page);
    await page.evaluate(() => {
      const w = window as unknown as { __failWrites: boolean };
      w.__failWrites = true;
      for (const m of ['put', 'add'] as const) {
        const orig = IDBObjectStore.prototype[m];
        IDBObjectStore.prototype[m] = function (this: IDBObjectStore, ...args: Parameters<typeof orig>) {
          if (w.__failWrites) throw new DOMException('quota', 'QuotaExceededError');
          return orig.apply(this, args);
        } as typeof orig;
      }
    });
    await card(page, 'First').click();
    await addRelative(page, 'child', 'Second');
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'failed');
    await expect(page.getByTestId('save-failed-banner')).toBeVisible();
    await expect(card(page, 'Second')).toBeVisible(); // still on screen, not discarded
    await page.evaluate(() => ((window as unknown as { __failWrites: boolean }).__failWrites = false));
    await page.getByTestId('retry-save').click();
    await waitSaved(page);
    await page.reload();
    await expect(cards(page)).toHaveCount(2);
  });

  test('dashboard: rename, duplicate and invalid import handling', async ({ page }) => {
    await createTree(page, 'Original');
    await fillPerson(page, 'Solo');
    await waitSaved(page);
    await page.getByTestId('back-to-dashboard').click();
    await page.getByTestId('tree-actions').click();
    await page.getByTestId('action-rename').click();
    await page.getByTestId('tree-name-field').fill('Renamed');
    await page.getByTestId('tree-name-submit').click();
    await expect(page.getByTestId('tree-card')).toContainText('Renamed');
    await page.getByTestId('tree-actions').click();
    await page.getByTestId('action-duplicate').click();
    await expect(page.getByTestId('tree-card')).toHaveCount(2);
    await expect(page.getByTestId('tree-list')).toContainText('Renamed (copy)');
    await expect(page.getByTestId('tree-card').first()).toContainText('1 person');

    await page.getByTestId('nav-import').click();
    const bad = tmp('bad.json');
    fs.writeFileSync(bad, '{"not":"a backup"}');
    await page.getByTestId('import-file').setInputFiles(bad);
    await expect(page.getByTestId('import-error')).toContainText("doesn’t look like an OurLegacy backup");
    fs.writeFileSync(bad, '{broken');
    await page.getByTestId('import-file').setInputFiles(bad);
    await expect(page.getByTestId('import-error')).toContainText('isn’t valid JSON');
    await expect(page.getByTestId('import-run')).toBeDisabled();
  });

  test('importing an existing tree asks how to handle the conflict; replace warns first', async ({ page }) => {
    await createTree(page, 'Conflict');
    await fillPerson(page, 'Original');
    await waitSaved(page);
    await page.getByTestId('open-export').click();
    await page.getByTestId('export-format-json').click();
    const file = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('c.json'));
    await card(page, 'Original').click();
    await page.getByTestId('edit-person').click();
    await page.locator('#firstName').fill('Changed');
    await page.getByTestId('person-submit').click();
    await waitSaved(page);

    await page.getByTestId('side-import-json').click();
    await page.getByTestId('import-file').setInputFiles(file.path);
    await expect(page.getByTestId('import-summary')).toContainText('Already in this browser');
    await page.getByTestId('import-mode-replace').check();
    await expect(page.getByTestId('replace-warning')).toBeVisible();
    await page.getByTestId('import-run').click();
    await expect(card(page, 'Original')).toBeVisible(); // restored, and editor reloaded
    await expect(card(page, 'Changed')).toHaveCount(0);
    await page.reload();
    await expect(card(page, 'Original')).toBeVisible();
  });

  test('settings: language persists, clear-all requires typing DELETE', async ({ page }) => {
    await createTree(page, 'To clear');
    await fillPerson(page, 'Someone');
    await waitSaved(page);
    await page.getByTestId('open-settings').click();
    await page.getByTestId('settings-language').selectOption('kn');
    await expect(page.getByTestId('settings-dialog')).toContainText('ಸೆಟ್ಟಿಂಗ್‌ಗಳು');
    await page.getByTestId('settings-language').selectOption('en');
    await page.getByTestId('settings-clear').click();
    const confirm = page.getByRole('alertdialog').getByRole('button', { name: 'Clear everything' });
    await expect(confirm).toBeDisabled();
    await page.getByTestId('clear-confirm-input').fill('DELETE');
    await confirm.click();
    await expect(page.getByTestId('dashboard-empty')).toBeVisible({ timeout: 10_000 });
  });

  test('quick-add buttons and P/C/S/M shortcuts add relatives straight from the canvas', async ({ page }) => {
    await createTree(page, 'Quick');
    await fillPerson(page, 'Virupaksah');
    // Selected card shows parent / child / partner buttons (no sibling: no parents yet)
    await card(page, 'Virupaksah').click();
    await expect(page.getByTestId('quick-add-sibling')).toHaveCount(0);
    await page.getByTestId('quick-add-partner').click();
    await fillPerson(page, 'Gowri');
    await expect(cards(page)).toHaveCount(2);

    // keyboard: select Virupaksah, press C → add child dialog
    await card(page, 'Virupaksah').click();
    await page.keyboard.press('c');
    await expect(page.getByTestId('person-dialog')).toContainText('Add a child of Virupaksah');
    await fillPerson(page, 'Kumar');
    await expect(cards(page)).toHaveCount(3);

    // the new child has parents, so a sibling button appears and S works
    await expect(page.getByTestId('quick-add-sibling')).toBeVisible();
    await page.keyboard.press('s');
    await expect(page.getByTestId('person-dialog')).toContainText('Add a sibling of Kumar');
    await fillPerson(page, 'Devi');
    await expect(cards(page)).toHaveCount(4);
    await page.getByTestId('quick-add-parent').count();
  });

  test('relationship labels name everyone from the selected person (father, grandmother, son…), in English and Kannada', async ({ page }) => {
    await page.goto('/sample');
    await card(page, 'Arjun').click();
    const label = (name: string) => card(page, name).locator('..').getByTestId('kin-label');
    await expect(label('Suresh')).toHaveText('Father');
    await expect(label('Eleanor')).toHaveText('Mother');
    await expect(label('Venkatesh')).toHaveText('Grandfather');
    await expect(label('Lakshmi')).toHaveText('Grandmother');
    await expect(label('Maya')).toHaveText('Sister');
    await expect(label('Priya')).toHaveText('Wife');
    await expect(label('Aarav')).toHaveText('Son');
    await expect(label('Anaya')).toHaveText('Daughter');
    await expect(label('Geetha')).toHaveText('Aunt');
    await expect(label('Nisha')).toHaveText('1st cousin');
    await expect(label('Arjun')).toHaveText('Husband'); // own role tag; relatives get labels relative to Arjun

    // viewed from a grandchild, the same grandparents are great-grandparents
    await card(page, 'Aarav').click();
    await expect(label('Suresh')).toHaveText('Grandfather');
    await expect(label('Venkatesh')).toHaveText('Great-grandfather');

    // profile chips use the specific terms
    await card(page, 'Arjun').click();
    await expect(page.getByTestId('profile-content').getByTestId('chip-kin').first()).toHaveText('Father');

    // toggle off, then Kannada
    await page.getByTestId('toggle-kinship').click();
    await expect(page.getByTestId('kin-label')).toHaveCount(0);
    await page.getByTestId('toggle-kinship').click();
    // names are transliterated in Kannada, so find the cards by id captured while still in English
    const ids = Object.fromEntries(await Promise.all(['Suresh', 'Venkatesh', 'Aarav'].map(async (n) => [n, await card(page, n).getAttribute('data-person-id')])));
    const byId = (n: string) => page.locator(`[data-person-id="${ids[n]}"]`).locator('..').getByTestId('kin-label');
    await page.getByTestId('language-switcher').click();
    await page.getByTestId('lang-kn').click();
    await expect(byId('Suresh')).toHaveText('ತಂದೆ');
    await expect(byId('Venkatesh')).toHaveText('ಅಜ್ಜ');
    await expect(byId('Aarav')).toHaveText('ಮಗ');
  });

  test('living / deceased status: set while adding, colour-coded cards, legend, profile badge, edit and backup', async ({ page }) => {
    await createTree(page, 'Status');
    // living by default; no death date field until "Deceased" is chosen
    await expect(page.getByRole('radio', { name: 'Living' })).toHaveAttribute('aria-checked', 'true');
    await fillPerson(page, 'Asha', 'Rao', { birthDate: '1990' });
    await expect(card(page, 'Asha').locator('[data-status]')).toHaveAttribute('data-status', 'living');
    await expect(page.getByTestId('status-legend')).toHaveCount(0); // nobody deceased yet

    // deceased without a death date
    await card(page, 'Asha').click();
    await page.getByTestId('side-add-parent').click();
    await page.getByRole('radio', { name: 'Deceased' }).click();
    await page.locator('#firstName').fill('Gopal');
    await page.locator('#birthDate').fill('1950');
    await page.getByTestId('person-submit').click();
    await expect(page.getByTestId('person-dialog')).toBeHidden();
    await expect(card(page, 'Gopal').locator('[data-status]')).toHaveAttribute('data-status', 'deceased');
    await expect(card(page, 'Gopal')).toContainText('1950 – ?');
    await expect(page.getByTestId('status-legend')).toBeVisible();
    await expect(page.getByTestId('profile-status')).toHaveText('Deceased');

    // with a death date
    await card(page, 'Asha').click();
    await page.getByTestId('side-add-parent').click();
    await page.getByRole('radio', { name: 'Deceased' }).click();
    await page.locator('#firstName').fill('Sita');
    await page.locator('#deathDate').fill('2015');
    await page.getByTestId('person-submit').click();
    await expect(card(page, 'Sita')).toContainText('d. 2015');
    await expect(card(page, 'Sita').locator('[data-status]')).toHaveAttribute('data-status', 'deceased');

    // switching back to living clears the death date; edit keeps status consistent
    await page.getByTestId('edit-person').click();
    await expect(page.getByRole('radio', { name: 'Deceased' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#deathDate')).toHaveValue('2015');
    await page.getByRole('radio', { name: 'Living' }).click();
    await page.getByTestId('person-submit').click();
    await expect(card(page, 'Sita').locator('[data-status]')).toHaveAttribute('data-status', 'living');
    await expect(card(page, 'Sita')).not.toContainText('2015');

    // persists across reload and appears in the JSON backup
    await waitSaved(page);
    await page.reload();
    await expect(card(page, 'Gopal').locator('[data-status]')).toHaveAttribute('data-status', 'deceased');
    await page.getByTestId('open-export').click();
    await page.getByTestId('export-format-json').click();
    const file = await downloadFile(page, () => page.getByTestId('export-run').click(), tmp('status.json'));
    const people = JSON.parse(fs.readFileSync(file.path, 'utf8')).trees[0].people;
    expect(people.find((p: { firstName: string }) => p.firstName === 'Gopal').isDeceased).toBe(true);
    expect(people.find((p: { firstName: string }) => p.firstName === 'Asha').isDeceased).toBeUndefined();
  });

  test('a child with only one recorded parent is a half-sibling until the partner is linked (one-click fix)', async ({ page }) => {
    await createTree(page, 'Half');
    await fillPerson(page, 'Dad');
    await addRelative(page, 'partner', 'Mum');
    await card(page, 'Dad').click();
    await page.getByTestId('side-add-child').click();
    await page.locator('#other-parent').selectOption(''); // "None / not recorded"
    await fillPerson(page, 'One');
    await card(page, 'Dad').click();
    await addRelative(page, 'child', 'Two'); // other parent defaults to Mum

    await card(page, 'One').click();
    await expect(page.getByTestId('profile-content')).toContainText('Half-sibling');
    await expect(page.getByTestId('link-missing-parent')).toHaveText('Also link Mum as a parent');
    await page.getByTestId('link-missing-parent').click();
    await expect(page.getByTestId('link-missing-parent')).toHaveCount(0);
    await expect(page.getByTestId('profile-content')).not.toContainText('Half-sibling');
    await expect(page.getByTestId('profile-content')).toContainText('Mum');
  });

  test('gender icon on cards and permanent Husband / Wife tags, updated after editing', async ({ page }) => {
    await createTree(page, 'Roles');
    await page.locator('#gender').selectOption('male');
    await fillPerson(page, 'Basava');
    await card(page, 'Basava').click();
    await page.getByTestId('side-add-partner').click();
    await page.locator('#gender').selectOption('female');
    await fillPerson(page, 'Jayamma');

    const tag = (name: string) => card(page, name).locator('..').getByTestId('kin-label');
    // nothing selected: the role tags are still there, and the gender icon identifies each card
    await page.keyboard.press('Escape');
    await expect(card(page, 'Basava')).toHaveAttribute('aria-pressed', 'false');
    await expect(tag('Basava')).toHaveText('Husband');
    await expect(tag('Jayamma')).toHaveText('Wife');
    await expect(card(page, 'Basava').locator('[data-gender]')).toHaveAttribute('data-gender', 'male');
    await expect(card(page, 'Jayamma').locator('[data-gender]')).toHaveAttribute('data-gender', 'female');

    // selecting someone keeps both tags (their own role + the other's role)
    await card(page, 'Basava').click();
    await expect(tag('Basava')).toHaveText('Husband');
    await expect(tag('Jayamma')).toHaveText('Wife');

    // editing the gender updates the tag straight away
    await card(page, 'Jayamma').click();
    await page.getByTestId('edit-person').click();
    await page.locator('#gender').selectOption('male');
    await page.getByTestId('person-submit').click();
    await expect(tag('Jayamma')).toHaveText('Husband');
    await expect(card(page, 'Jayamma').locator('[data-gender]')).toHaveAttribute('data-gender', 'male');

    // no gender -> no icon and no role tag
    await page.getByTestId('edit-person').click();
    await page.locator('#gender').selectOption('');
    await page.getByTestId('person-submit').click();
    await expect(card(page, 'Jayamma').locator('[data-gender]')).toHaveCount(0);
    await expect(tag('Jayamma')).toHaveCount(0);
  });

  test('names follow the app language: transliterated automatically, overridable per profile, searchable in either script', async ({ page }) => {
    await createTree(page, 'Names');
    await fillPerson(page, 'Basavarajappa', 'Rao');
    await addRelative(page, 'partner', 'Jayamma');
    const cardText = (n: string) => card(page, n);

    // switch to Kannada: names on the chart change script too
    await page.getByTestId('language-switcher').click();
    await page.getByTestId('lang-kn').click();
    await expect(page.getByTestId('person-card').filter({ hasText: 'ಜಯಮ್ಮ' })).toBeVisible();
    await expect(page.getByTestId('person-card').filter({ hasText: 'ರಾವ್' })).toBeVisible();
    await expect(page.getByTestId('profile-name')).toHaveText('ಜಯಮ್ಮ');

    // search works with either script
    await page.getByTestId('search-input').fill('jaya');
    await expect(page.getByTestId('search-results')).toContainText('ಜಯಮ್ಮ');
    await page.getByTestId('search-input').fill('ಬಸವ');
    await expect(page.getByTestId('search-results')).toContainText('ರಾವ್');
    await page.keyboard.press('Escape');

    // set an exact Kannada spelling for one person: it wins over the automatic one
    await page.getByTestId('person-card').filter({ hasText: 'ರಾವ್' }).click();
    await page.getByTestId('edit-person').click();
    await expect(page.getByTestId('other-names')).toBeVisible();
    await page.getByTestId('other-names').locator('summary').click();
    await page.getByTestId('name-knFirst').fill('ಬಸವರಾಜಪ್ಪ');
    await page.getByTestId('person-submit').click();
    await expect(page.getByTestId('person-card').filter({ hasText: 'ಬಸವರಾಜಪ್ಪ' })).toBeVisible();
    await waitSaved(page);

    // back to English: the stored (typed) names show again
    await page.getByTestId('language-switcher').click();
    await page.getByTestId('lang-en').click();
    await expect(cardText('Basavarajappa')).toBeVisible();
    await expect(cardText('Jayamma')).toBeVisible();
    await page.reload();
    await expect(cardText('Basavarajappa')).toBeVisible();

    // a person typed in Kannada reads in English via romanisation
    await card(page, 'Jayamma').click();
    await page.getByTestId('side-add-child').click();
    await fillPerson(page, 'ಸುರೇಶ್');
    await expect(page.getByTestId('person-card').filter({ hasText: 'Suresh' })).toBeVisible();
  });
});
