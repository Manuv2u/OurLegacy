import { create } from 'zustand';
import type { RelativeKind } from '@/features/relationships/operations';

export type DialogState =
  | null
  | { kind: 'person'; mode: 'first' }
  | { kind: 'person'; mode: 'edit'; personId: string }
  | { kind: 'person'; mode: 'add'; relation: RelativeKind; anchorId: string; existing?: boolean }
  | { kind: 'person'; mode: 'link'; anchorId: string }
  | { kind: 'deletePerson'; personId: string }
  | { kind: 'export' }
  | { kind: 'import' }
  | { kind: 'settings' }
  | { kind: 'help' }
  | { kind: 'stories' };

interface UiState {
  dialog: DialogState;
  /** Profile drawer (tablet/mobile). Desktop shows the panel inline. */
  profileOpen: boolean;
  actionsOpen: boolean;
  sidebarCollapsed: boolean;
  profileCollapsed: boolean;
  focusBranch: boolean;
  showKinship: boolean;
  highlighted: string[];
  openDialog: (d: Exclude<DialogState, null>) => void;
  closeDialog: () => void;
  set: (patch: Partial<Omit<UiState, 'set' | 'openDialog' | 'closeDialog'>>) => void;
}

export const useUiStore = create<UiState>((set) => ({
  dialog: null,
  profileOpen: false,
  actionsOpen: false,
  sidebarCollapsed: false,
  profileCollapsed: false,
  focusBranch: false,
  showKinship: true,
  highlighted: [],
  openDialog: (d) => set({ dialog: d, actionsOpen: false }),
  closeDialog: () => set({ dialog: null }),
  set: (patch) => set(patch),
}));
