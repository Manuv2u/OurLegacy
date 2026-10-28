import { create } from 'zustand';
import type { FamilyTree } from '@/types/family';
import type { StorageErrorCode } from '@/services/local-storage/errors';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

type Snapshot = Pick<FamilyTree, 'name' | 'people' | 'relationships' | 'layout'>;

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1500;

export type ViewCommand =
  | { kind: 'fit'; nonce: number }
  | { kind: 'zoomIn'; nonce: number }
  | { kind: 'zoomOut'; nonce: number }
  | { kind: 'focus'; ids: string[]; nonce: number };

interface EditorState {
  tree: FamilyTree | null;
  /** Sample trees are explorable but never written to storage. */
  isSample: boolean;
  past: Snapshot[];
  future: Snapshot[];
  selectedId: string | null;
  saveStatus: SaveStatus;
  saveError: StorageErrorCode | null;
  lastCoalesce: { key: string; at: number } | null;
  view: ViewCommand | null;
  /** Bumps on every committed change so subscribers can react even for same-length edits. */
  revision: number;

  load: (tree: FamilyTree, opts?: { sample?: boolean }) => void;
  unload: () => void;
  /** Apply a change as one undoable step. Returns false if nothing changed. */
  commit: (fn: (tree: FamilyTree) => FamilyTree, opts?: { coalesceKey?: string }) => boolean;
  undo: () => void;
  redo: () => void;
  select: (id: string | null) => void;
  setSaveStatus: (status: SaveStatus, error?: StorageErrorCode | null) => void;
  requestView: (cmd: { kind: 'fit' | 'zoomIn' | 'zoomOut' } | { kind: 'focus'; ids: string[] }) => void;
}

const snap = (t: FamilyTree): Snapshot => ({ name: t.name, people: t.people, relationships: t.relationships, layout: t.layout });

let nonce = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
  tree: null,
  isSample: false,
  past: [],
  future: [],
  selectedId: null,
  saveStatus: 'idle',
  saveError: null,
  lastCoalesce: null,
  view: null,
  revision: 0,

  load: (tree, opts) =>
    set({
      tree,
      isSample: !!opts?.sample,
      past: [],
      future: [],
      selectedId: null,
      saveStatus: opts?.sample ? 'idle' : 'saved',
      saveError: null,
      lastCoalesce: null,
      view: null,
      revision: 0,
    }),

  unload: () => set({ tree: null, past: [], future: [], selectedId: null, saveStatus: 'idle', saveError: null, isSample: false }),

  commit: (fn, opts) => {
    const { tree, past, lastCoalesce, selectedId, isSample } = get();
    if (!tree) return false;
    const next = fn(tree);
    if (next === tree) return false;
    const now = Date.now();
    const coalesce = !!opts?.coalesceKey && lastCoalesce?.key === opts.coalesceKey && now - lastCoalesce.at < COALESCE_MS;
    const nextPast = coalesce ? past : [...past, snap(tree)].slice(-HISTORY_LIMIT);
    const stillThere = selectedId && next.people.some((p) => p.id === selectedId);
    set((s) => ({
      tree: next,
      past: nextPast,
      future: [],
      selectedId: stillThere ? selectedId : null,
      lastCoalesce: opts?.coalesceKey ? { key: opts.coalesceKey, at: now } : null,
      saveStatus: isSample ? 'idle' : 'saving',
      revision: s.revision + 1,
    }));
    return true;
  },

  undo: () => {
    const { tree, past, future, selectedId, isSample } = get();
    if (!tree || !past.length) return;
    const prev = past[past.length - 1];
    const next = { ...tree, ...prev, updatedAt: new Date().toISOString() };
    set((s) => ({
      tree: next,
      past: past.slice(0, -1),
      future: [snap(tree), ...future].slice(0, HISTORY_LIMIT),
      selectedId: selectedId && next.people.some((p) => p.id === selectedId) ? selectedId : null,
      lastCoalesce: null,
      saveStatus: isSample ? 'idle' : 'saving',
      revision: s.revision + 1,
    }));
  },

  redo: () => {
    const { tree, past, future, selectedId, isSample } = get();
    if (!tree || !future.length) return;
    const [nextSnap, ...rest] = future;
    const next = { ...tree, ...nextSnap, updatedAt: new Date().toISOString() };
    set((s) => ({
      tree: next,
      past: [...past, snap(tree)].slice(-HISTORY_LIMIT),
      future: rest,
      selectedId: selectedId && next.people.some((p) => p.id === selectedId) ? selectedId : null,
      lastCoalesce: null,
      saveStatus: isSample ? 'idle' : 'saving',
      revision: s.revision + 1,
    }));
  },

  select: (id) => set({ selectedId: id }),

  setSaveStatus: (status, error = null) => set({ saveStatus: status, saveError: error }),

  requestView: (cmd) => set({ view: { ...cmd, nonce: ++nonce } as ViewCommand }),
}));
