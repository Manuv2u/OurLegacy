import type { PartialDate } from '@/types/family';

const PARTIAL_DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

export interface ParsedDate {
  year: number;
  month?: number;
  day?: number;
}

export function parsePartialDate(value: string | undefined | null): ParsedDate | null {
  if (!value) return null;
  const m = PARTIAL_DATE.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : undefined;
  const day = m[3] ? Number(m[3]) : undefined;
  if (year < 1) return null;
  if (month !== undefined && (month < 1 || month > 12)) return null;
  if (day !== undefined && month !== undefined) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) return null;
  }
  return { year, month, day };
}

export function isValidPartialDate(value: string | undefined | null): boolean {
  return !value || parsePartialDate(value) !== null;
}

/** Sortable number (days-ish) for comparing partial dates; earliest sensible value for gaps. */
export function dateSortValue(value: string | undefined | null): number {
  const p = parsePartialDate(value);
  if (!p) return Number.POSITIVE_INFINITY;
  return p.year * 372 + ((p.month ?? 1) - 1) * 31 + ((p.day ?? 1) - 1);
}

export function yearOf(value: string | undefined | null): number | null {
  return parsePartialDate(value)?.year ?? null;
}

/** True when both dates exist and `death` is strictly before `birth`. */
export function deathBeforeBirth(birth?: string, death?: string): boolean {
  const b = parsePartialDate(birth);
  const d = parsePartialDate(death);
  if (!b || !d) return false;
  return dateSortValue(death) < dateSortValue(birth);
}

/** Locale-aware display of a partial date. Uses UTC so the day never shifts with the time zone. */
export function formatPartialDate(value: PartialDate | undefined, locale: string): string {
  const p = parsePartialDate(value);
  if (!p) return value ?? '';
  const date = new Date(Date.UTC(p.year, (p.month ?? 1) - 1, p.day ?? 1));
  // Date.UTC maps years 0-99 to 1900-1999; correct that.
  if (p.year < 100) date.setUTCFullYear(p.year);
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };
  if (p.day !== undefined) Object.assign(opts, { year: 'numeric', month: 'long', day: 'numeric' });
  else if (p.month !== undefined) Object.assign(opts, { year: 'numeric', month: 'long' });
  else Object.assign(opts, { year: 'numeric' });
  try {
    return new Intl.DateTimeFormat(locale, opts).format(date);
  } catch {
    return value ?? '';
  }
}
