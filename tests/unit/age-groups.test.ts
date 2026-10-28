import { describe, expect, it } from 'vitest';
import { groupFromDates, inferAgeGroups } from '@/features/family-tree/ageGroups';

const now = 2026;
const person = (id: string, birthDate?: string, deathDate?: string) => ({ id, firstName: id, birthDate, deathDate, createdAt: '', updatedAt: '' });
let n = 0;
const partner = (a: string, b: string) => ({ id: `r${n++}`, type: 'partner' as const, sourceId: a, targetId: b });
const kids = (parents: string[], children: string[]) => parents.flatMap((p) => children.map((c) => ({ id: `r${n++}`, type: 'parent-child' as const, sourceId: p, targetId: c, kind: 'biological' as const })));

describe('groupFromDates', () => {
  it('uses age: under 18 child, 60+ elder (age at death for the deceased)', () => {
    expect(groupFromDates('2015', undefined, now)).toBe('child');
    expect(groupFromDates('1990', undefined, now)).toBe('adult');
    expect(groupFromDates('1950', undefined, now)).toBe('elder');
    expect(groupFromDates('1930', '1950', now)).toBe('adult'); // died at 20
    expect(groupFromDates(undefined, '2000', now)).toBeNull();
  });
});

describe('inferAgeGroups without birth dates', () => {
  // grandparents -> parents -> grandchildren, as in a typical family
  const people = ['Basava', 'Jaya', 'Viru', 'Surv', 'Gagani', 'Manu', 'Preethi', 'Murali'].map((id) => person(id));
  const relationships = [
    partner('Basava', 'Jaya'), partner('Viru', 'Surv'), partner('Manu', 'Preethi'),
    ...kids(['Basava', 'Jaya'], ['Viru', 'Gagani']),
    ...kids(['Viru', 'Surv'], ['Manu', 'Murali']),
  ];
  const g = inferAgeGroups({ people, relationships }, now);

  it('people with grandchildren are elders, and so are their partners', () => {
    expect(g.get('Basava')).toBe('elder');
    expect(g.get('Jaya')).toBe('elder');
  });
  it('people with children or a partner are adults', () => {
    expect(g.get('Viru')).toBe('adult');
    expect(g.get('Surv')).toBe('adult');
    expect(g.get('Manu')).toBe('adult');
    expect(g.get('Preethi')).toBe('adult');
  });
  it('an unmarried person without children in the youngest generation is a child; an older single sibling is not', () => {
    expect(g.get('Murali')).toBe('child');
    expect(g.get('Gagani')).toBe('adult');
  });
  it('a birth year always wins over structure', () => {
    const withDates = inferAgeGroups({ people: [...people.filter((p) => p.id !== 'Murali'), person('Murali', '1985')], relationships }, now);
    expect(withDates.get('Murali')).toBe('adult');
  });
});
