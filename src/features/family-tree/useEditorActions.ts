import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { useI18n } from '@/i18n/useI18n';
import { buildIndex, parentIds, relativesAtGeneration } from '@/features/relationships/graph';
import { DEFAULT_CARD, layoutTree } from './layout';
import type { LayoutDirection } from '@/types/family';
import type { RelativeKind } from '@/features/relationships/operations';
import { exportJson } from '@/features/export/jsonExport';

export type Generation = 'grandparents' | 'parents' | 'current' | 'children' | 'grandchildren';

/** All editor commands in one place so the sidebar, mobile bar and shortcuts share behaviour. */
export function useEditorActions() {
  const { t } = useI18n();
  const openDialog = useUiStore((s) => s.openDialog);
  const setUi = useUiStore((s) => s.set);
  const requestView = useEditorStore((s) => s.requestView);
  const commit = useEditorStore((s) => s.commit);

  const selectedId = useEditorStore((s) => s.selectedId);
  const tree = useEditorStore((s) => s.tree);
  const canAddSibling = useMemo(() => !!tree && !!selectedId && parentIds(buildIndex(tree), selectedId).length > 0, [tree, selectedId]);

  const addFirst = useCallback(() => openDialog({ kind: 'person', mode: 'first' }), [openDialog]);

  const addRelative = useCallback(
    (relation: RelativeKind) => {
      const { selectedId: id } = useEditorStore.getState();
      if (!id) return toast.info(t('side.selectHint'));
      openDialog({ kind: 'person', mode: 'add', relation, anchorId: id });
    },
    [openDialog, t],
  );

  const linkExisting = useCallback(() => {
    const { selectedId: id } = useEditorStore.getState();
    if (!id) return toast.info(t('side.selectHint'));
    openDialog({ kind: 'person', mode: 'link', anchorId: id });
  }, [openDialog, t]);

  const setDirection = useCallback(
    (direction: LayoutDirection) => commit((tr) => (tr.layout?.direction === direction ? tr : { ...tr, layout: { ...tr.layout, direction }, updatedAt: new Date().toISOString() })),
    [commit],
  );

  const goToGeneration = useCallback(
    (gen: Generation) => {
      const { tree: tr, selectedId: id } = useEditorStore.getState();
      if (!tr || !id) return toast.info(t('side.gen.needsSelection'));
      const ix = buildIndex(tr);
      let ids: string[];
      if (gen === 'current') {
        const layout = layoutTree(tr, { direction: tr.layout?.direction ?? 'vertical', cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height });
        const row = layout.rows.get(id);
        ids = tr.people.filter((p) => layout.rows.get(p.id) === row).map((p) => p.id);
      } else {
        const depth = { grandparents: 2, parents: 1, children: -1, grandchildren: -2 }[gen];
        ids = relativesAtGeneration(ix, id, depth);
      }
      if (!ids.length) return toast.info(t('side.gen.none'));
      setUi({ highlighted: ids });
      requestView({ kind: 'focus', ids });
      window.setTimeout(() => useUiStore.getState().set({ highlighted: [] }), 2800);
    },
    [requestView, setUi, t],
  );

  const centerSelected = useCallback(() => {
    const { selectedId: id } = useEditorStore.getState();
    if (id) requestView({ kind: 'focus', ids: [id] });
  }, [requestView]);

  const exportTreeJson = useCallback(async () => {
    const { tree: tr } = useEditorStore.getState();
    if (!tr) return;
    await exportJson(tr, false);
    toast.success(t('export.done'));
  }, [t]);

  return {
    addFirst,
    addRelative,
    linkExisting,
    setDirection,
    goToGeneration,
    centerSelected,
    exportTreeJson,
    fit: () => requestView({ kind: 'fit' }),
    zoomIn: () => requestView({ kind: 'zoomIn' }),
    zoomOut: () => requestView({ kind: 'zoomOut' }),
    canAddSibling,
    hasSelection: !!selectedId,
  };
}
