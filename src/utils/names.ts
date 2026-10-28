import type { NameOrder, NameParts, Person } from '@/types/family';
import { hasKannada, hasLatin, kannadaToLatin, latinToKannada } from './transliterate';

export function fullName(p: Pick<Person, 'firstName' | 'middleName' | 'lastName'>, order: NameOrder = 'given-first'): string {
  const parts =
    order === 'family-first'
      ? [p.lastName, p.firstName, p.middleName]
      : [p.firstName, p.middleName, p.lastName];
  return parts.map((s) => s?.trim()).filter(Boolean).join(' ');
}

/** Initials from the first letters of (up to) two name parts. Works with any script. */
export function initials(p: Pick<Person, 'firstName' | 'middleName' | 'lastName'>): string {
  const parts = [p.firstName, p.lastName].map((s) => s?.trim()).filter(Boolean) as string[];
  const source = parts.length ? parts : ([p.middleName?.trim()].filter(Boolean) as string[]);
  const letters = source.map((s) => firstGrapheme(s));
  return letters.join('').toUpperCase();
}

function firstGrapheme(s: string): string {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) {
    for (const g of new Seg(undefined, { granularity: 'grapheme' }).segment(s)) return g.segment;
  }
  return Array.from(s)[0] ?? '';
}

/** Lowercase, accent/diacritic-insensitive key for search. Kannada is left intact. */
export function searchKey(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

type Parts = Pick<Person, 'firstName' | 'middleName' | 'lastName'> & Pick<Person, 'names'>;
type Lang = 'en' | 'kn';

/** One name part in the target language: an explicit per-language spelling wins, otherwise transliterate by script. */
function localizePart(text: string | undefined, lang: Lang, override: string | undefined): string | undefined {
  const explicit = override?.trim();
  if (explicit) return explicit;
  if (!text) return text;
  if (lang === 'kn') return text.split(/(\s+)/).map((w) => (hasLatin(w) && !hasKannada(w) ? latinToKannada(w) : w)).join('');
  return hasKannada(text) ? kannadaToLatin(text) : text;
}

/** The person's name parts as they should read in `lang`. */
export function localizedParts(p: Parts, lang: Lang): Required<NameParts> {
  const o = p.names?.[lang];
  return {
    firstName: localizePart(p.firstName, lang, o?.firstName) ?? '',
    middleName: localizePart(p.middleName, lang, o?.middleName) ?? '',
    lastName: localizePart(p.lastName, lang, o?.lastName) ?? '',
  };
}

/** Every spelling of a name (as typed + each language) so search finds people in either script. */
export function allNameForms(p: Parts): string {
  return [fullName(p), fullName(localizedParts(p, 'en')), fullName(localizedParts(p, 'kn'))].join(' ');
}
