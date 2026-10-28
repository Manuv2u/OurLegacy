import { useEditorStore } from '@/stores/editorStore';
import type { TreeRepository } from './treeRepository';
import { toStorageError } from './errors';

export interface Autosave {
  /** Write any pending change right now. Resolves once storage has settled. */
  flush(): Promise<void>;
  stop(): void;
}

/**
 * Debounced autosave of the tree open in the editor. The save indicator is
 * driven only by real outcomes: `saving` while a change is unsaved, `saved`
 * once IndexedDB confirmed the write, `failed` if it threw. Failures keep the
 * change pending so the next edit (or a manual retry) writes it.
 */
let active: Autosave | null = null;

/** The autosave for the tree currently open in the editor, if any (used by retry/flush actions). */
export const getActiveAutosave = (): Autosave | null => active;

export function startAutosave(repo: TreeRepository, debounceMs = 500): Autosave {
  const store = useEditorStore;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> | null = null;
  let dirty = false;
  let lastRevision = store.getState().revision;

  const write = async (): Promise<void> => {
    if (writing) {
      await writing;
      if (!dirty) return;
    }
    const run = async () => {
      while (dirty) {
        const { tree, isSample } = store.getState();
        if (!tree || isSample) {
          dirty = false;
          return;
        }
        dirty = false;
        try {
          await repo.save(tree);
          if (!dirty && store.getState().tree?.id === tree.id) store.getState().setSaveStatus('saved');
        } catch (e) {
          dirty = true;
          store.getState().setSaveStatus('failed', toStorageError(e).code);
          return;
        }
      }
    };
    writing = run().finally(() => {
      writing = null;
    });
    await writing;
  };

  const schedule = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void write();
    }, debounceMs);
  };

  const unsubscribe = store.subscribe((state) => {
    if (state.revision !== lastRevision) {
      lastRevision = state.revision;
      if (!state.isSample && state.tree) schedule();
    }
  });

  const api: Autosave = {
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (store.getState().saveStatus === 'failed') dirty = true;
      if (dirty || writing) await write();
    },
    stop() {
      if (timer) clearTimeout(timer);
      timer = null;
      unsubscribe();
      if (active === api) active = null;
    },
  };
  active = api;
  return api;
}
