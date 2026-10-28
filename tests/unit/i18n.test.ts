import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { kn } from '@/i18n/kn';
import { translate } from '@/i18n';

describe('i18n', () => {
  it('has a Kannada translation for every English key and no extras', () => {
    expect(Object.keys(kn).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty strings', () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(kn)]) expect(v.trim(), k).not.toBe('');
  });

  it('keeps interpolation placeholders consistent between languages', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(vars(kn[key]), key).toEqual(vars(en[key]));
  });

  it('interpolates and pluralises', () => {
    expect(translate('en', 'dash.tree.people', { count: 1 })).toBe('1 person');
    expect(translate('en', 'dash.tree.people', { count: 4 })).toBe('4 people');
    expect(translate('kn', 'dash.tree.people', { count: 4 })).toBe('4 ಜನರು');
    expect(translate('en', 'person.added', { name: 'Ann' })).toBe('Ann added');
  });

  it('uses the exact privacy copy from the product plan', () => {
    expect(en['notice.privacy']).toBe('Your family tree is saved in this browser. Export a backup to keep a copy safe.');
    expect(en['app.tagline']).toBe('Your family. Your story. Your legacy.');
  });
});
