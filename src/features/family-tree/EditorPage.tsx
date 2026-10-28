import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, CircleAlert, Download, FlaskConical, Maximize, Plus, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { treeRepository } from '@/services/local-storage/treeRepository';
import { getActiveAutosave, startAutosave } from '@/services/local-storage/autosave';
import { markOpened } from '@/lib/settings';
import { createSampleTree } from './sampleTree';
import { duplicateTree } from '@/lib/trees';
import { TreeCanvas } from './TreeCanvas';
import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar } from './EditorSidebar';
import { EditorDialogs } from './EditorDialogs';
import { MobileBar } from './MobileBar';
import { Sheet, SheetBody } from './mobileSheet';
import { ProfilePanelBody } from '@/features/people/ProfilePanel';
import { useIsDesktop, useIsTablet } from '@/hooks/useMediaQuery';
import { SEARCH_INPUT_ID } from './SearchBox';
import { exportJson } from '@/features/export/jsonExport';
import { isDeceased } from '@/utils/status';
import { AgeGroupContext } from './ageGroupContext';
import { inferAgeGroups } from './ageGroups';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export default function EditorPage({ sample = false }: { sample?: boolean }) {
  const { id } = useParams();
  const location = useLocation();
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    let auto: ReturnType<typeof startAutosave> | null = null;
    setState('loading');
    (async () => {
      try {
        const tree = sample ? createSampleTree() : await treeRepository.get(id ?? '');
        if (cancelled) return;
        if (!tree) return setState('missing');
        if (!sample) markOpened(tree.id);
        useEditorStore.getState().load(tree, { sample });
        if (!sample) auto = startAutosave(treeRepository);
        useUiStore.getState().set({ sidebarCollapsed: window.innerWidth < 1024, profileOpen: false, focusBranch: false, highlighted: [] });
        setState('ready');
        if ((location.state as { fresh?: boolean } | null)?.fresh && tree.people.length === 0) {
          useUiStore.getState().openDialog({ kind: 'person', mode: 'first' });
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
      const a = auto;
      const treeId = id;
      void (a ? a.flush() : Promise.resolve()).finally(() => {
        a?.stop();
        const st = useEditorStore.getState();
        if (st.tree && (sample || st.tree.id === treeId)) st.unload();
      });
      useUiStore.setState({ dialog: null, profileOpen: false, actionsOpen: false, highlighted: [], focusBranch: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sample]);

  if (state === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center text-muted" role="status">
        {t('app.loading')}
      </div>
    );
  }
  if (state === 'missing' || state === 'error') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="serif text-2xl font-semibold">{state === 'missing' ? t('app.notFound.title') : t('dash.loadFailed')}</h1>
        <p className="max-w-md text-muted">{t('app.notFound.body')}</p>
        <Button asChild>
          <Link to="/app">{t('app.notFound.cta')}</Link>
        </Button>
      </div>
    );
  }
  return <EditorShell sample={sample} />;
}

function useEditorLifecycle() {
  const { t } = useI18n();
  const openDialog = useUiStore((s) => s.openDialog);

  // Keep unsaved work safe: flush when the tab is hidden and warn before leaving mid-save.
  useEffect(() => {
    const flush = () => void getActiveAutosave()?.flush();
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const { saveStatus, isSample } = useEditorStore.getState();
      if (!isSample && (saveStatus === 'saving' || saveStatus === 'failed')) {
        flush();
        e.preventDefault();
        e.returnValue = t('beforeUnload.warn');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [t]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      // The dialog may already be unmounted when Escape reaches us, so also check where the key came from.
      const modal = !!document.querySelector('[role="dialog"], [role="alertdialog"]') || !!target?.closest('[role="dialog"], [role="alertdialog"]');
      const mod = e.metaKey || e.ctrlKey;
      const st = useEditorStore.getState();
      if (mod && !e.altKey && e.key.toLowerCase() === 'z') {
        if (typing || modal) return;
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && !e.altKey && e.key.toLowerCase() === 'y') {
        if (typing || modal) return;
        e.preventDefault();
        st.redo();
        return;
      }
      if (typing || modal || mod || e.altKey) return;
      switch (e.key) {
        case '/':
          e.preventDefault();
          document.getElementById(SEARCH_INPUT_ID)?.focus();
          break;
        case 'f':
        case 'F':
          st.requestView({ kind: 'fit' });
          break;
        case '+':
        case '=':
          st.requestView({ kind: 'zoomIn' });
          break;
        case '-':
        case '_':
          st.requestView({ kind: 'zoomOut' });
          break;
        case 'e':
        case 'E':
          if (st.selectedId) openDialog({ kind: 'person', mode: 'edit', personId: st.selectedId });
          break;
        case 'p':
        case 'P':
        case 'c':
        case 'C':
        case 's':
        case 'S':
        case 'm':
        case 'M': {
          if (!st.selectedId) break;
          const relation = ({ p: 'parent', c: 'child', s: 'sibling', m: 'partner' } as const)[e.key.toLowerCase() as 'p' | 'c' | 's' | 'm'];
          const rels = st.tree?.relationships ?? [];
          if (relation === 'sibling' && !rels.some((r) => r.type === 'parent-child' && r.targetId === st.selectedId)) break;
          e.preventDefault();
          openDialog({ kind: 'person', mode: 'add', relation, anchorId: st.selectedId });
          break;
        }
        case 'Delete':
        case 'Backspace':
          if (st.selectedId) openDialog({ kind: 'deletePerson', personId: st.selectedId });
          break;
        case 'Escape':
          st.select(null);
          useUiStore.getState().set({ profileOpen: false });
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialog]);
}

function EditorShell({ sample }: { sample: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const isTablet = useIsTablet();
  const selectedId = useEditorStore((s) => s.selectedId);
  const hasPeople = useEditorStore((s) => (s.tree?.people.length ?? 0) > 0);
  const anyDeceased = useEditorStore((s) => !!s.tree?.people.some(isDeceased));
  const people = useEditorStore((s) => s.tree?.people);
  const relationships = useEditorStore((s) => s.tree?.relationships);
  const ageGroups = useMemo(() => inferAgeGroups({ people: people ?? [], relationships: relationships ?? [] }), [people, relationships]);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const saveError = useEditorStore((s) => s.saveError);
  const profileOpen = useUiStore((s) => s.profileOpen);
  const profileCollapsed = useUiStore((s) => s.profileCollapsed);
  const set = useUiStore((s) => s.set);
  const openDialog = useUiStore((s) => s.openDialog);
  useEditorLifecycle();

  const saveCopy = useCallback(async () => {
    const tree = useEditorStore.getState().tree;
    if (!tree) return;
    try {
      const copy = duplicateTree(tree, tree.name.replace(/\s*\(sample\)\s*$/i, ''));
      await treeRepository.save(copy);
      navigate(`/app/tree/${copy.id}`, { replace: true });
    } catch {
      toast.error(t('storage.writeFailed'));
    }
  }, [navigate, t]);

  const retrySave = async () => {
    await getActiveAutosave()?.flush();
  };

  return (
    <AgeGroupContext.Provider value={ageGroups}>
    <div className="flex h-dvh flex-col overflow-hidden bg-ivory" data-testid="editor">
      <EditorToolbar />

      {sample && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/40 bg-gold/15 px-4 py-2 text-sm" data-testid="sample-banner">
          <p className="flex items-center gap-2 text-gold-700">
            <FlaskConical className="size-4 shrink-0" aria-hidden />
            <span>
              <strong>{t('notice.sample.title')}.</strong> {t('notice.sample.body')}
            </span>
          </p>
          <Button size="sm" onClick={() => void saveCopy()} data-testid="save-sample-copy">
            {t('notice.sample.cta')}
          </Button>
        </div>
      )}
      {!sample && saveStatus === 'failed' && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-danger/30 bg-danger-50 px-4 py-2 text-sm text-danger" data-testid="save-failed-banner">
          <p className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            <span>
              {saveError === 'quota' ? t('storage.quota') : saveError === 'unavailable' ? t('storage.unavailable') : t('editor.save.failedHelp')}
            </span>
          </p>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void retrySave()} data-testid="retry-save">
              {t('editor.save.retry')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                const tree = useEditorStore.getState().tree;
                if (tree) void exportJson(tree, false);
              }}
            >
              <Download /> {t('side.exportJson')}
            </Button>
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {isTablet && <EditorSidebar />}

        <main className="relative min-w-0 flex-1" id="main">
          <TreeCanvas />

          {anyDeceased && (
            <ul aria-label={t('canvas.legend')} data-testid="status-legend" className="pointer-events-none absolute start-3 top-3 flex items-center gap-3 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-medium shadow-card backdrop-blur">
              <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full bg-[#3f8f5f]" />{t('person.status.living')}</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-full bg-[#7a847c]" />{t('person.status.deceased')}</li>
            </ul>
          )}

          {!hasPeople && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="card ol-rise max-w-sm p-8 text-center" data-testid="canvas-empty">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-sage text-forest">
                  <Plus className="size-6" aria-hidden />
                </div>
                <h2 className="serif text-xl font-semibold">{t('canvas.empty.title')}</h2>
                <p className="mt-2 text-sm text-muted">{t('canvas.empty.body')}</p>
                <Button className="mt-5" onClick={() => openDialog({ kind: 'person', mode: 'first' })} data-testid="empty-add-first">
                  <Plus /> {t('side.addFirst')}
                </Button>
              </div>
            </div>
          )}

          {!isTablet && hasPeople && (
            <div className="absolute bottom-3 start-3 flex flex-col gap-1.5" role="group" aria-label={t('a11y.zoomControls')}>
              {[
                { icon: <ZoomIn />, label: t('side.zoomIn'), run: () => useEditorStore.getState().requestView({ kind: 'zoomIn' }) },
                { icon: <ZoomOut />, label: t('side.zoomOut'), run: () => useEditorStore.getState().requestView({ kind: 'zoomOut' }) },
                { icon: <Maximize />, label: t('side.fit'), run: () => useEditorStore.getState().requestView({ kind: 'fit' }) },
              ].map((c) => (
                <Button key={c.label} variant="outline" size="icon" aria-label={c.label} onClick={c.run} className="bg-white/95 shadow-card">
                  {c.icon}
                </Button>
              ))}
            </div>
          )}
        </main>

        {isDesktop && (
          <aside
            aria-label={t('profile.title')}
            data-testid="profile-panel"
            className={`shrink-0 overflow-y-auto border-s border-line bg-white transition-[width] duration-200 ${profileCollapsed ? 'w-12' : 'w-[22rem]'}`}
          >
            <div className={`sticky top-0 z-10 flex items-center border-b border-line bg-white/95 px-3 py-2 backdrop-blur ${profileCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!profileCollapsed && <h2 className="text-sm font-semibold">{t('profile.title')}</h2>}
              <Button variant="ghost" size="icon-sm" aria-label={profileCollapsed ? t('profile.openPanel') : t('profile.closePanel')} onClick={() => set({ profileCollapsed: !profileCollapsed })}>
                {profileCollapsed ? <ChevronsLeft /> : <ChevronsRight />}
              </Button>
            </div>
            {!profileCollapsed && <ProfilePanelBody />}
          </aside>
        )}
      </div>

      {!isTablet && <MobileBar />}

      {!isDesktop && (
        <Sheet open={profileOpen && !!selectedId} onOpenChange={(o) => set({ profileOpen: o })} side={isTablet ? 'right' : 'bottom'} testId="profile-sheet">
          <DialogTitle className="px-5 pb-1 pt-3 text-base">{t('profile.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('profile.title')}</DialogDescription>
          <SheetBody>
            <ProfilePanelBody />
          </SheetBody>
        </Sheet>
      )}

      <EditorDialogs />
    </div>
    </AgeGroupContext.Provider>
  );
}
