import { en, type MessageKey } from './en';
import { kn } from './kn';

export type Locale = 'en' | 'kn';
export type { MessageKey };
/** Base keys that have `.one` / `.other` variants. */
export type PluralKey = MessageKey extends infer K ? (K extends `${infer B}.one` ? B : never) : never;
export type TranslationKey = MessageKey | PluralKey;

export const LOCALES: { code: Locale; label: string; native: string; intl: string }[] = [
  { code: 'en', label: 'English', native: 'English', intl: 'en-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', intl: 'kn-IN' },
];

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, kn };

export type TParams = Record<string, string | number>;

export function intlLocale(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.intl ?? 'en-IN';
}

/** Translate a key. A `count` param selects the `.one` / `.other` variant when present. */
export function translate(locale: Locale, key: TranslationKey, params?: TParams): string {
  const dict = dictionaries[locale] ?? en;
  let resolved: string | undefined;
  if (params && typeof params.count === 'number') {
    const variant = `${key}.${params.count === 1 ? 'one' : 'other'}` as MessageKey;
    resolved = dict[variant];
  }
  resolved ??= dict[key as MessageKey] ?? en[key as MessageKey] ?? key;
  if (!params) return resolved;
  return resolved.replace(/\{(\w+)\}/g, (_, name: string) => (name in params ? String(params[name]) : `{${name}}`));
}

export type TFunction = (key: TranslationKey, params?: TParams) => string;

export const makeT = (locale: Locale): TFunction => (key, params) => translate(locale, key, params);

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'kn';
}

export function detectLocale(): Locale {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() : '';
    if (nav?.startsWith('kn')) return 'kn';
  } catch {
    /* ignore */
  }
  return 'en';
}
