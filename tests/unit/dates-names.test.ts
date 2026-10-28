import { describe, expect, it } from 'vitest';
import { deathBeforeBirth, formatPartialDate, isValidPartialDate, parsePartialDate, yearOf } from '@/utils/dates';
import { fullName, initials, searchKey } from '@/utils/names';

describe('partial dates', () => {
  it('parses year, month and day precision', () => {
    expect(parsePartialDate('1950')).toEqual({ year: 1950, month: undefined, day: undefined });
    expect(parsePartialDate('1950-03')).toMatchObject({ year: 1950, month: 3 });
    expect(parsePartialDate('1950-03-09')).toMatchObject({ day: 9 });
  });
  it('rejects impossible dates', () => {
    for (const bad of ['abc', '1950-13', '1950-02-30', '1950-00', '0000', '19500']) expect(isValidPartialDate(bad)).toBe(false);
    expect(isValidPartialDate('')).toBe(true);
    expect(isValidPartialDate('2024-02-29')).toBe(true);
    expect(isValidPartialDate('2023-02-29')).toBe(false);
  });
  it('detects death before birth', () => {
    expect(deathBeforeBirth('1950', '1940')).toBe(true);
    expect(deathBeforeBirth('1950-05', '1950-04')).toBe(true);
    expect(deathBeforeBirth('1950', '1950')).toBe(false);
    expect(deathBeforeBirth('1950', undefined)).toBe(false);
  });
  it('formats with the requested locale without time-zone drift', () => {
    expect(formatPartialDate('1950-03-09', 'en-US')).toBe('March 9, 1950');
    expect(formatPartialDate('1950-03', 'en-US')).toBe('March 1950');
    expect(formatPartialDate('1950', 'en-US')).toBe('1950');
    expect(formatPartialDate('1950-03-09', 'kn-IN')).not.toBe('March 9, 1950');
    expect(yearOf('1950-03')).toBe(1950);
  });
});

describe('names', () => {
  it('joins name parts, skipping blanks, honouring name order', () => {
    expect(fullName({ firstName: 'Ann', middleName: '', lastName: 'Lee' })).toBe('Ann Lee');
    expect(fullName({ firstName: 'Ann', middleName: 'M', lastName: 'Lee' }, 'family-first')).toBe('Lee Ann M');
    expect(fullName({ firstName: 'Ravi' })).toBe('Ravi');
  });
  it('builds initials in any script', () => {
    expect(initials({ firstName: 'ann', lastName: 'lee' })).toBe('AL');
    expect(initials({ firstName: 'ಸುರೇಶ್', lastName: 'ರಾವ್' })).toBe('ಸುರಾ');
    expect(initials({ firstName: '', middleName: 'Kumar' })).toBe('K');
  });
  it('search keys ignore case and accents', () => {
    expect(searchKey('José')).toBe(searchKey('jose'));
  });
});

import { isDeceased } from '@/utils/status';
import { valuesToDraft, emptyPersonValues } from '@/features/people/personSchema';

describe('status', () => {
  it('is deceased when marked or when a death date exists', () => {
    expect(isDeceased({})).toBe(false);
    expect(isDeceased({ isDeceased: true })).toBe(true);
    expect(isDeceased({ deathDate: '2001' })).toBe(true);
  });
  it('form values keep status and death date consistent', () => {
    const living = valuesToDraft({ ...emptyPersonValues, firstName: 'A', status: 'living', deathDate: '2001' }, undefined);
    expect(living.deathDate).toBeUndefined();
    expect(living.isDeceased).toBeUndefined();
    const dead = valuesToDraft({ ...emptyPersonValues, firstName: 'A', status: 'deceased', deathDate: '2001' }, undefined);
    expect(dead).toMatchObject({ deathDate: '2001', isDeceased: true });
  });
});

import { allNameForms, localizedParts } from '@/utils/names';
import { serializeBackup, parseBackup } from '@/lib/backup';
import { createSampleTree } from '@/features/family-tree/sampleTree';
import { updatePerson } from '@/features/relationships/operations';

describe('per-language names', () => {
  it('transliterates automatically in both directions', () => {
    expect(localizedParts({ firstName: 'Suresh', lastName: 'Rao' }, 'kn')).toEqual({ firstName: 'ಸುರೇಶ್', middleName: '', lastName: 'ರಾವ್' });
    expect(localizedParts({ firstName: 'ಸುರೇಶ್', lastName: 'ರಾವ್' }, 'en')).toMatchObject({ firstName: 'Suresh' });
    expect(localizedParts({ firstName: 'Suresh' }, 'en').firstName).toBe('Suresh'); // already in the target script
  });
  it('an explicit spelling always wins, part by part', () => {
    const p = { firstName: 'Basavarajappa', lastName: 'Rao', names: { kn: { firstName: 'ಬಸವರಾಜಪ್ಪ' } } };
    const kn = localizedParts(p, 'kn');
    expect(kn.firstName).toBe('ಬಸವರಾಜಪ್ಪ');
    expect(kn.lastName).toBe('ರಾವ್'); // other parts still transliterated
  });
  it('search matches every spelling', () => {
    const forms = allNameForms({ firstName: 'Suresh', lastName: 'Rao' });
    expect(forms).toContain('Suresh');
    expect(forms).toContain('ಸುರೇಶ್');
  });
  it('explicit names survive the JSON backup round trip', () => {
    const t = createSampleTree();
    const edited = updatePerson(t, t.people[0].id, { names: { kn: { firstName: 'ವೆಂಕಟೇಶ', lastName: 'ರಾವ್' }, en: { firstName: 'Venkatesha' } } });
    expect(parseBackup(serializeBackup([edited])).trees[0].people[0].names).toEqual({ kn: { firstName: 'ವೆಂಕಟೇಶ', lastName: 'ರಾವ್' }, en: { firstName: 'Venkatesha' } });
  });
  it('form values only store the spellings that were filled in', () => {
    const draft = valuesToDraft({ ...emptyPersonValues, firstName: 'A', knFirst: ' ಅ ' }, undefined);
    expect(draft.names).toEqual({ kn: { firstName: 'ಅ', middleName: undefined, lastName: undefined } });
    expect(valuesToDraft({ ...emptyPersonValues, firstName: 'A' }, undefined).names).toBeUndefined();
  });
});
