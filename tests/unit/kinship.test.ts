import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type FamilyTree, type Gender } from '@/types/family';
import { buildIndex } from '@/features/relationships/graph';
import { kinContext, kinOf } from '@/features/relationships/kinship';
import { kinLabelEn, kinLabelKn } from '@/features/relationships/kinshipLabels';

/**
 *            GGF(m) ─ GGM(f)
 *                  │
 *          GF(m) ─ GM(f)         Uncle(m, b.1948)   Aunt(f)
 *             │                      (children of GF + GM)
 *       Dad(m, b.1950) ─ Mum(f)
 *             │
 *   Me(m,1980)  Sis(f,1975)  Bro(m,1985)      HalfSis(f) (Dad's child with Other)
 *      │
 *   Son(m) ─ DIL(f)   Daughter(f)
 *      │
 *   GrandSon(m)
 */
const now = '2020-01-01T00:00:00.000Z';
const P = (id: string, gender?: Gender, birthDate?: string) => ({ id, firstName: id, gender, birthDate, createdAt: now, updatedAt: now });
let n = 0;
const partner = (a: string, b: string) => ({ id: `r${n++}`, type: 'partner' as const, sourceId: a, targetId: b });
const kids = (parents: string[], children: string[], kind: 'biological' | 'adoptive' = 'biological') =>
  parents.flatMap((p) => children.map((c) => ({ id: `r${n++}`, type: 'parent-child' as const, sourceId: p, targetId: c, kind })));

const tree: FamilyTree = {
  id: 't', name: 'T', schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
  people: [
    P('GGF', 'male'), P('GGM', 'female'), P('GF', 'male'), P('GM', 'female'), P('Uncle', 'male', '1948'), P('Aunt', 'female', '1955'),
    P('MGF', 'male'), P('MGM', 'female'), P('MUncle', 'male', '1953'), P('MAunt', 'female', '1957'),
    P('Dad', 'male', '1950'), P('Mum', 'female', '1952'), P('Me', 'male', '1980'), P('Sis', 'female', '1975'), P('Bro', 'male', '1985'),
    P('Other', 'female'), P('HalfSis', 'female'), P('Cousin', 'female'), P('Son', 'male'), P('DIL', 'female'), P('Daughter', 'female'),
    P('GrandSon', 'male'), P('Wife', 'female'), P('WifeDad', 'male'), P('WifeBro', 'male'), P('Step', 'female'), P('Adopted', 'male'),
    P('Nephew', 'male'), P('Neutral'), P('Stranger', 'male'),
  ],
  relationships: [
    partner('GGF', 'GGM'), ...kids(['GGF', 'GGM'], ['GF']),
    partner('GF', 'GM'), ...kids(['GF', 'GM'], ['Dad', 'Uncle', 'Aunt']),
    partner('MGF', 'MGM'), ...kids(['MGF', 'MGM'], ['Mum', 'MUncle', 'MAunt']),
    partner('Dad', 'Mum'), ...kids(['Dad', 'Mum'], ['Me', 'Sis', 'Bro']),
    ...kids(['Dad', 'Other'], ['HalfSis']), partner('Dad', 'Step'),
    ...kids(['Uncle'], ['Cousin']),
    partner('Me', 'Wife'), ...kids(['Me', 'Wife'], ['Son', 'Daughter']), ...kids(['Me'], ['Adopted'], 'adoptive'),
    partner('Son', 'DIL'), ...kids(['Son', 'DIL'], ['GrandSon']),
    ...kids(['WifeDad'], ['Wife', 'WifeBro']), ...kids(['Sis'], ['Nephew']),
  ],
};
const ctx = kinContext(buildIndex(tree), 'Me');
const en = (id: string) => { const k = kinOf(ctx, id); return k ? kinLabelEn(k) : null; };
const kn = (id: string) => { const k = kinOf(ctx, id); return k ? kinLabelKn(k) : null; };

describe('kinship (English)', () => {
  it('names direct ancestors by gender and generation', () => {
    expect(en('Dad')).toBe('Father');
    expect(en('Mum')).toBe('Mother');
    expect(en('GF')).toBe('Grandfather');
    expect(en('GM')).toBe('Grandmother');
    expect(en('GGF')).toBe('Great-grandfather');
    expect(en('GGM')).toBe('Great-grandmother');
  });
  it('names descendants', () => {
    expect(en('Son')).toBe('Son');
    expect(en('Daughter')).toBe('Daughter');
    expect(en('GrandSon')).toBe('Grandson');
  });
  it('names siblings, half siblings, partner, nephews and aunts/uncles', () => {
    expect(en('Sis')).toBe('Sister');
    expect(en('Bro')).toBe('Brother');
    expect(en('HalfSis')).toBe('Half-sister');
    expect(en('Wife')).toBe('Wife');
    expect(en('Nephew')).toBe('Nephew');
    expect(en('Uncle')).toBe('Uncle');
    expect(en('Aunt')).toBe('Aunt');
    expect(en('MUncle')).toBe('Uncle');
  });
  it('names cousins, step-parents, in-laws and adoptive children', () => {
    expect(en('Cousin')).toBe('1st cousin');
    expect(en('Step')).toBe('Stepmother');
    expect(en('WifeDad')).toBe('Father-in-law');
    expect(en('WifeBro')).toBe('Brother-in-law');
    expect(en('DIL')).toBe('Daughter-in-law');
    expect(en('Adopted')).toBe('Adoptive son');
  });
  it('uses neutral wording when gender is unknown and null for unrelated people', () => {
    const t2: FamilyTree = { ...tree, people: tree.people.map((p) => (p.id === 'Dad' ? { ...p, gender: undefined } : p)) };
    const k = kinOf(kinContext(buildIndex(t2), 'Me'), 'Dad')!;
    expect(kinLabelEn(k)).toBe('Parent');
    expect(en('Stranger')).toBeNull();
    expect(en('Me')).toBeNull();
  });
  it('labels deep generations', () => {
    expect(kinLabelEn({ rel: 'ancestor', n: 4, sex: 'male', adoptive: false })).toBe('Great-great-grandfather');
    expect(kinLabelEn({ rel: 'ancestor', n: 9, sex: 'female', adoptive: false })).toBe('7×-great-grandmother');
    expect(kinLabelEn({ rel: 'descendant', n: 3, sex: 'female', adoptive: false })).toBe('Great-granddaughter');
    expect(kinLabelEn({ rel: 'cousin', degree: 2, removed: 1, sex: 'neutral' })).toBe('2nd cousin once removed');
  });
  it('flips the point of view: the same pair reads differently from each side', () => {
    const fromDad = kinContext(buildIndex(tree), 'Dad');
    expect(kinLabelEn(kinOf(fromDad, 'Me')!)).toBe('Son');
    const fromGF = kinContext(buildIndex(tree), 'GF');
    expect(kinLabelEn(kinOf(fromGF, 'Me')!)).toBe('Grandson');
    expect(kinLabelEn(kinOf(fromGF, 'Son')!)).toBe('Great-grandson');
    const fromSon = kinContext(buildIndex(tree), 'Son');
    expect(kinLabelEn(kinOf(fromSon, 'GGF')!)).toBe('Great-great-grandfather');
  });
});

describe('kinship (Kannada)', () => {
  it('uses the Kannada family terms', () => {
    expect(kn('Dad')).toBe('ತಂದೆ');
    expect(kn('Mum')).toBe('ತಾಯಿ');
    expect(kn('GF')).toBe('ಅಜ್ಜ');
    expect(kn('GM')).toBe('ಅಜ್ಜಿ');
    expect(kn('GGF')).toBe('ಮುತ್ತಜ್ಜ');
    expect(kn('Son')).toBe('ಮಗ');
    expect(kn('Daughter')).toBe('ಮಗಳು');
    expect(kn('GrandSon')).toBe('ಮೊಮ್ಮಗ');
    expect(kn('Wife')).toBe('ಹೆಂಡತಿ');
  });
  it('distinguishes elder/younger siblings and paternal/maternal uncles and aunts', () => {
    expect(kn('Sis')).toBe('ಅಕ್ಕ'); // born 1975, older than Me (1980)
    expect(kn('Bro')).toBe('ತಮ್ಮ'); // born 1985
    expect(kn('Uncle')).toBe('ದೊಡ್ಡಪ್ಪ'); // father's elder brother (1948 < 1950)
    expect(kn('Aunt')).toBe('ಅತ್ತೆ'); // father's sister
    expect(kn('MUncle')).toBe('ಮಾವ'); // mother's brother
    expect(kn('MAunt')).toBe('ಚಿಕ್ಕಮ್ಮ'); // mother's younger sister (1957 > 1952)
  });
});
