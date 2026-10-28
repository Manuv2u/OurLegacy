import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileUp, FolderTree, HelpCircle, Menu, Plus, Settings, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, ConfirmDialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Sheet, SheetBody } from '@/features/family-tree/mobileSheet';
import { ImportDialog } from '@/features/import/ImportDialog';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { HelpDialog } from '@/features/settings/HelpDialog';
import { exportAllTreesJson, exportTreeJsonById } from '@/features/export/jsonExport';
import { useI18n } from '@/i18n/useI18n';
import { useSettingsStore } from '@/stores/settingsStore';
import { treeRepository } from '@/services/local-storage/treeRepository';
import { createEmptyTree, duplicateTree } from '@/lib/trees';
import { forgetOpened } from '@/lib/settings';
import { StorageError } from '@/services/local-storage/errors';
import type { FamilyTree } from '@/types/family';
import { cn } from '@/lib/utils';
import { TreeCard } from './TreeCard';
import { useTreeLibrary } from './useTreeLibrary';

type Modal = null | { kind: 'new' } | { kind: 'rename'; tree: FamilyTree } | { kind: 'delete'; tree: FamilyTree } | { kind: 'import' } | { kind: 'settings' } | { kind: 'help' };

function NavButton({ icon, children, onClick, active, testId, asLink }: { icon: React.ReactNode; children: React.ReactNode; onClick?: () => void; active?: boolean; testId?: string; asLink?: string }) {
  const cls = cn('flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors [&_svg]:size-4', active ? 'bg-sage text-forest-800' : 'text-ink hover:bg-sage/70');
  return asLink ? (
    <Link to={asLink} className={cls} data-testid={testId}>
      {icon}
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} data-testid={testId}>
      {icon}
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { trees, status, reload } = useTreeLibrary();
  const defaultLayout = useSettingsStore((s) => s.defaultLayout);
  const backupNoticeDismissed = useSettingsStore((s) => s.backupNoticeDismissed);
  const lastBackupAt = useSettingsStore((s) => s.lastBackupAt);
  const update = useSettingsStore((s) => s.update);
  const [modal, setModal] = useState<Modal>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');

  const open = (m: Exclude<Modal, null>) => {
    setMenuOpen(false);
    if (m.kind === 'new') setName(t('dash.new.nameDefault'));
    if (m.kind === 'rename') setName(m.tree.name);
    setModal(m);
  };

  // Landing page "Create" links arrive as /app?create=1.
  useEffect(() => {
    if (params.get('create')) {
      setName(t('dash.new.nameDefault'));
      setModal({ kind: 'new' });
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const storageMessage = (e: unknown) => (e instanceof StorageError ? t(e.code === 'quota' ? 'storage.quota' : e.code === 'unavailable' ? 'storage.unavailable' : 'storage.writeFailed') : t('storage.writeFailed'));

  const createTree = async () => {
    try {
      const tree = createEmptyTree(name.trim() || t('dash.new.nameDefault'), defaultLayout);
      await treeRepository.save(tree);
      setModal(null);
      navigate(`/app/tree/${tree.id}`, { state: { fresh: true } });
    } catch (e) {
      toast.error(storageMessage(e));
    }
  };

  const renameTree = async (tree: FamilyTree) => {
    const next = name.trim();
    if (!next) return;
    try {
      const current = await treeRepository.get(tree.id);
      if (current) await treeRepository.save({ ...current, name: next, updatedAt: new Date().toISOString() });
      setModal(null);
      await reload();
    } catch (e) {
      toast.error(storageMessage(e));
    }
  };

  const duplicate = async (tree: FamilyTree) => {
    try {
      await treeRepository.save(duplicateTree(tree, `${tree.name} ${t('dash.tree.copySuffix')}`));
      toast.success(t('dash.duplicated'));
      await reload();
    } catch (e) {
      toast.error(storageMessage(e));
    }
  };

  const remove = async (tree: FamilyTree) => {
    try {
      await treeRepository.remove(tree.id);
      forgetOpened(tree.id);
      setModal(null);
      toast.success(t('dash.deleted'));
      await reload();
    } catch (e) {
      toast.error(storageMessage(e));
    }
  };

  const nav = (
    <nav className="flex flex-col gap-1" aria-label={t('nav.mainNav')}>
      <NavButton asLink="/app" icon={<FolderTree />} active testId="nav-my-trees">
        {t('dash.nav.myTrees')}
      </NavButton>
      <NavButton icon={<Plus />} onClick={() => open({ kind: 'new' })} testId="nav-new-tree">
        {t('dash.nav.newTree')}
      </NavButton>
      <NavButton icon={<FileUp />} onClick={() => open({ kind: 'import' })} testId="nav-import">
        {t('dash.nav.import')}
      </NavButton>
      <NavButton asLink="/sample" icon={<Sparkles />} testId="nav-sample">
        {t('dash.nav.sample')}
      </NavButton>
      <div className="my-2 h-px bg-line" />
      <NavButton icon={<Settings />} onClick={() => open({ kind: 'settings' })} testId="nav-settings">
        {t('dash.nav.settings')}
      </NavButton>
      <NavButton icon={<HelpCircle />} onClick={() => open({ kind: 'help' })} testId="nav-help">
        {t('dash.nav.help')}
      </NavButton>
    </nav>
  );

  const showBackupNotice = status === 'ready' && trees.length > 0 && !backupNoticeDismissed && !lastBackupAt;

  return (
    <div className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[16rem_1fr]" data-testid="dashboard">
      <aside className="hidden border-e border-line bg-white/70 p-4 lg:flex lg:flex-col">
        <Logo to="/" className="mb-6 px-2" />
        {nav}
        <div className="mt-auto flex items-center justify-between pt-6">
          <LanguageSwitcher />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-ivory/90 px-4 backdrop-blur lg:hidden">
        <Logo to="/" />
        <div className="ms-auto flex items-center gap-1">
          <LanguageSwitcher compact />
          <Button variant="ghost" size="icon" aria-label={t('a11y.openMenu')} onClick={() => setMenuOpen(true)} data-testid="dashboard-menu">
            <Menu />
          </Button>
        </div>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen} side="right">
        <DialogTitle className="sr-only">{t('nav.mainNav')}</DialogTitle>
        <DialogDescription className="sr-only">{t('nav.mainNav')}</DialogDescription>
        <SheetBody className="p-4 pt-12">{nav}</SheetBody>
      </Sheet>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12" id="main">
        <div className="ol-rise">
          <h1 className="serif text-3xl font-semibold text-forest-800 sm:text-4xl">{t('dash.welcome')}</h1>
          <p className="mt-2 text-muted">{t('dash.welcome.sub')}</p>
        </div>

        {showBackupNotice && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 sm:flex-row sm:items-center" role="note" data-testid="backup-notice">
            <ShieldCheck className="size-5 shrink-0 text-gold-700" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-ink">{t('dash.backupNotice.title')}</p>
              <p className="text-ink/75">{t('dash.backupNotice.body')}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void exportAllTreesJson().then(() => toast.success(t('export.done')))}>
                {t('dash.backupNotice.export')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => update({ backupNoticeDismissed: true })}>
                {t('dash.backupNotice.dismiss')}
              </Button>
            </div>
          </div>
        )}

        <section className="card ol-rise mt-8 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: '60ms' }}>
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-forest text-white">
              <Plus className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="serif text-xl font-semibold">{t('dash.create.title')}</h2>
              <p className="mt-1 text-sm text-muted">{t('dash.create.body')}</p>
            </div>
          </div>
          <Button size="lg" onClick={() => open({ kind: 'new' })} data-testid="create-tree">
            <Plus /> {t('dash.create.cta')}
          </Button>
        </section>

        <section className="mt-10" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="serif mb-4 text-xl font-semibold">
            {t('dash.recent')}
          </h2>
          {status === 'loading' && <p className="text-muted" role="status">{t('app.loading')}</p>}
          {status === 'error' && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-50 p-4 text-sm text-danger">
              <TriangleAlert className="size-5 shrink-0" aria-hidden />
              <span className="flex-1">{t('dash.loadFailed')} {t('storage.unavailable')}</span>
              <Button size="sm" variant="outline" onClick={() => void reload()}>
                {t('dash.retry')}
              </Button>
            </div>
          )}
          {status === 'ready' && trees.length === 0 && (
            <div className="card flex flex-col items-center px-6 py-14 text-center" data-testid="dashboard-empty">
              <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-sage text-forest">
                <FolderTree className="size-7" aria-hidden />
              </span>
              <h3 className="serif text-xl font-semibold">{t('dash.empty.title')}</h3>
              <p className="mt-1 max-w-md text-sm text-muted">{t('dash.empty.body')}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button onClick={() => open({ kind: 'new' })}>
                  <Plus /> {t('dash.create.cta')}
                </Button>
                <Button variant="outline" onClick={() => open({ kind: 'import' })}>
                  <FileUp /> {t('dash.nav.import')}
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/sample">{t('dash.nav.sample')}</Link>
                </Button>
              </div>
            </div>
          )}
          {status === 'ready' && trees.length > 0 && (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="tree-list">
              {trees.map((tree) => (
                <li key={tree.id} className="contents">
                  <TreeCard
                    tree={tree}
                    onRename={() => open({ kind: 'rename', tree })}
                    onDuplicate={() => void duplicate(tree)}
                    onDelete={() => open({ kind: 'delete', tree })}
                    onExport={() => void exportTreeJsonById(tree.id).then((ok) => ok && toast.success(t('export.done')))}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="mt-10 text-center text-xs text-muted">{t('notice.privacy')}</p>
      </main>

      <Dialog open={modal?.kind === 'new' || modal?.kind === 'rename'} onOpenChange={(o) => !o && setModal(null)}>
        {(modal?.kind === 'new' || modal?.kind === 'rename') && (
          <DialogContent size="sm" data-testid="tree-name-dialog">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.kind === 'new') void createTree();
                else void renameTree(modal.tree);
              }}
            >
              <DialogHeader>
                <DialogTitle>{modal.kind === 'new' ? t('dash.new.title') : t('dash.rename.title')}</DialogTitle>
                <DialogDescription className="sr-only">{t('dash.new.nameLabel')}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Field label={t('dash.new.nameLabel')} htmlFor="tree-name-field">
                  <Input id="tree-name-field" autoFocus maxLength={120} value={name} placeholder={t('dash.new.namePlaceholder')} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.currentTarget.select()} data-testid="tree-name-field" />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModal(null)}>
                  {t('app.cancel')}
                </Button>
                <Button type="submit" disabled={!name.trim()} data-testid="tree-name-submit">
                  {modal.kind === 'new' ? t('dash.new.create') : t('app.save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={modal?.kind === 'delete'}
        onOpenChange={(o) => !o && setModal(null)}
        title={modal?.kind === 'delete' ? t('dash.delete.title', { name: modal.tree.name }) : ''}
        description={modal?.kind === 'delete' ? t('dash.delete.body', { count: modal.tree.people.length }) : ''}
        confirmLabel={t('dash.delete.confirm')}
        onConfirm={() => modal?.kind === 'delete' && void remove(modal.tree)}
      />
      <ImportDialog
        open={modal?.kind === 'import'}
        onOpenChange={(o) => !o && setModal(null)}
        onImported={(imported) => {
          if (imported.length === 1) navigate(`/app/tree/${imported[0].id}`);
          else void reload();
        }}
      />
      <SettingsDialog open={modal?.kind === 'settings'} onOpenChange={(o) => !o && setModal(null)} />
      <HelpDialog open={modal?.kind === 'help'} onOpenChange={(o) => !o && setModal(null)} />
    </div>
  );
}
