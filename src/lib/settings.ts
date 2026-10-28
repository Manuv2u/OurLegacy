import type { LayoutDirection, NameOrder } from '@/types/family';
import { detectLocale, isLocale, type Locale } from '@/i18n';

/** Small per-browser preferences. Tree data lives in IndexedDB; these live in localStorage. */
export interface Settings {
  locale: Locale;
  defaultLayout: LayoutDirection;
  nameOrder: NameOrder;
  backupNoticeDismissed: boolean;
  lastBackupAt: string | null;
}

const KEY = 'ourlegacy.settings.v1';
const LAST_OPENED_KEY = 'ourlegacy.lastOpened.v1';

export function defaultSettings(): Settings {
  return { locale: detectLocale(), defaultLayout: 'vertical', nameOrder: 'given-first', backupNoticeDismissed: false, lastBackupAt: null };
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      locale: isLocale(p.locale) ? p.locale : base.locale,
      defaultLayout: p.defaultLayout === 'horizontal' ? 'horizontal' : 'vertical',
      nameOrder: p.nameOrder === 'family-first' ? 'family-first' : 'given-first',
      backupNoticeDismissed: p.backupNoticeDismissed === true,
      lastBackupAt: typeof p.lastBackupAt === 'string' ? p.lastBackupAt : null,
    };
  } catch {
    return base;
  }
}

export function persistSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* preferences are best-effort; trees are what matter */
  }
}

export function readLastOpened(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LAST_OPENED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function markOpened(id: string): void {
  try {
    const map = readLastOpened();
    map[id] = new Date().toISOString();
    localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function forgetOpened(id: string): void {
  try {
    const map = readLastOpened();
    delete map[id];
    localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function clearAllLocalPreferences(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LAST_OPENED_KEY);
  } catch {
    /* ignore */
  }
}
