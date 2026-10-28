import { useCallback, useEffect, useMemo } from 'react';
import { intlLocale, makeT, type Locale, type TFunction } from './index';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatPartialDate, yearOf } from '@/utils/dates';
import { fullName, localizedParts } from '@/utils/names';
import { isDeceased } from '@/utils/status';
import type { Person } from '@/types/family';

export interface I18n {
  locale: Locale;
  intl: string;
  t: TFunction;
  setLocale: (l: Locale) => void;
  formatDate: (value: string | undefined) => string;
  /** Localised "1950 – 2020" / "b. 1950" / "d. 2020" text for cards. */
  lifespan: (p: Pick<Person, 'birthDate' | 'deathDate' | 'isDeceased'>) => string;
  displayName: (p: Pick<Person, 'firstName' | 'middleName' | 'lastName' | 'names'>) => string;
  /** Name parts in the current language (transliterated when no explicit spelling exists). */
  localParts: (p: Pick<Person, 'firstName' | 'middleName' | 'lastName' | 'names'>) => ReturnType<typeof localizedParts>;
  formatDateTime: (iso: string) => string;
}

export function useI18n(): I18n {
  const locale = useSettingsStore((s) => s.locale);
  const nameOrder = useSettingsStore((s) => s.nameOrder);
  const update = useSettingsStore((s) => s.update);

  const t = useMemo(() => makeT(locale), [locale]);
  const intl = intlLocale(locale);

  const setLocale = useCallback((l: Locale) => update({ locale: l }), [update]);
  const formatDate = useCallback((v: string | undefined) => formatPartialDate(v, intl), [intl]);
  const lifespan = useCallback(
    (p: Pick<Person, 'birthDate' | 'deathDate' | 'isDeceased'>) => {
      const b = yearOf(p.birthDate);
      const d = yearOf(p.deathDate);
      if (b && d) return `${b} – ${d}`;
      if (d) return t('card.died', { year: d });
      // Marked deceased without a death date: say so instead of showing an open-ended "b. 1950".
      if (isDeceased(p)) return b ? `${b} – ?` : t('person.status.deceased');
      if (b) return t('card.born', { year: b });
      return '';
    },
    [t],
  );
  const displayName = useCallback(
    (p: Pick<Person, 'firstName' | 'middleName' | 'lastName' | 'names'>) => fullName(localizedParts(p, locale), nameOrder) || t('app.unnamed'),
    [nameOrder, t, locale],
  );
  const localParts = useCallback((p: Pick<Person, 'firstName' | 'middleName' | 'lastName' | 'names'>) => localizedParts(p, locale), [locale]);
  const formatDateTime = useCallback(
    (iso: string) => {
      try {
        return new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [intl],
  );
  return { locale, intl, t, setLocale, formatDate, lifespan, displayName, localParts, formatDateTime };
}

/** Keeps <html lang> in sync so screen readers and Kannada font selection behave. */
export function useDocumentLanguage(): void {
  const locale = useSettingsStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
