import { useCallback, useEffect, useState } from 'react';
import type { FamilyTree } from '@/types/family';
import { treeRepository } from '@/services/local-storage/treeRepository';
import { readLastOpened } from '@/lib/settings';

export type LibraryStatus = 'loading' | 'ready' | 'error';

export function useTreeLibrary() {
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [status, setStatus] = useState<LibraryStatus>('loading');

  const reload = useCallback(async () => {
    try {
      const list = await treeRepository.list();
      const opened = readLastOpened();
      // Most recently opened first, falling back to last modified.
      list.sort((a, b) => (opened[b.id] ?? b.updatedAt).localeCompare(opened[a.id] ?? a.updatedAt));
      setTrees(list);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { trees, status, reload };
}
