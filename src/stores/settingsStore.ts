import { create } from 'zustand';
import { loadSettings, persistSettings, type Settings } from '@/lib/settings';

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),
  update: (patch) => {
    set(patch);
    const { update: _u, reset: _r, ...settings } = get();
    persistSettings(settings);
  },
  reset: () => {
    const fresh = loadSettings();
    set(fresh);
  },
}));
