import type { Person } from '@/types/family';

/** Deceased when explicitly marked, or when a death date is recorded. Everyone else is treated as living. */
export const isDeceased = (p: Pick<Person, 'isDeceased' | 'deathDate'>): boolean => p.isDeceased === true || !!p.deathDate;
