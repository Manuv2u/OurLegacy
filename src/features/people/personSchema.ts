import { z } from 'zod';
import type { TFunction } from '@/i18n';
import { deathBeforeBirth, isValidPartialDate } from '@/utils/dates';

export const GENDERS = ['', 'female', 'male', 'other', 'unknown'] as const;

export function makePersonSchema(t: TFunction) {
  const date = z
    .string()
    .trim()
    .refine((v) => !v || isValidPartialDate(v), t('person.err.date'));
  const name = z.string().trim().max(120, t('person.err.tooLong'));
  return z
    .object({
      firstName: name,
      middleName: name,
      lastName: name,
      gender: z.enum(GENDERS),
      status: z.enum(['living', 'deceased']),
      knFirst: name,
      knMiddle: name,
      knLast: name,
      enFirst: name,
      enMiddle: name,
      enLast: name,
      birthDate: date,
      deathDate: date,
      biography: z.string().max(50_000, t('person.err.tooLong')),
      notes: z.string().max(20_000, t('person.err.tooLong')),
    })
    .superRefine((v, ctx) => {
      if (!v.firstName && !v.middleName && !v.lastName) {
        ctx.addIssue({ code: 'custom', path: ['firstName'], message: t('person.err.name') });
      }
      if (v.status === 'deceased' && deathBeforeBirth(v.birthDate, v.deathDate)) {
        ctx.addIssue({ code: 'custom', path: ['deathDate'], message: t('person.err.deathBeforeBirth') });
      }
    });
}

export type PersonFormValues = z.infer<ReturnType<typeof makePersonSchema>>;

export const emptyPersonValues: PersonFormValues = {
  firstName: '',
  middleName: '',
  lastName: '',
  gender: '',
  status: 'living',
  knFirst: '',
  knMiddle: '',
  knLast: '',
  enFirst: '',
  enMiddle: '',
  enLast: '',
  birthDate: '',
  deathDate: '',
  biography: '',
  notes: '',
};

const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined);

/** Per-language spellings: only the parts the user actually filled in are stored. */
function namesFromValues(v: PersonFormValues) {
  const parts = (f: string, m: string, l: string) => {
    const p = { firstName: opt(f), middleName: opt(m), lastName: opt(l) };
    return Object.values(p).some(Boolean) ? p : undefined;
  };
  const kn = parts(v.knFirst, v.knMiddle, v.knLast);
  const en = parts(v.enFirst, v.enMiddle, v.enLast);
  return kn || en ? { ...(kn ? { kn } : {}), ...(en ? { en } : {}) } : undefined;
}

/** Form values -> person fields. Empty optional strings become `undefined` so JSON stays tidy. */
export function valuesToDraft(v: PersonFormValues, photo: string | undefined) {
  return {
    firstName: v.firstName.trim(),
    middleName: opt(v.middleName),
    lastName: opt(v.lastName),
    gender: v.gender || undefined,
    birthDate: opt(v.birthDate),
    // A living person has no death date; keep the two fields consistent.
    deathDate: v.status === 'deceased' ? opt(v.deathDate) : undefined,
    isDeceased: v.status === 'deceased' ? true : undefined,
    names: namesFromValues(v),
    photo,
    biography: v.biography.trim() ? v.biography : undefined,
    notes: v.notes.trim() ? v.notes : undefined,
  };
}
