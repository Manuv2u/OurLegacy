import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, CircleAlert, CloudOff, Download, HelpCircle, Languages, Loader2, MoreHorizontal, Redo2, Search, Settings, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { LogoMark } from '@/components/layout/Logo';
import { LOCALES } from '@/i18n';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { useIsDesktop, useIsTablet } from '@/hooks/useMediaQuery';
import { SearchBox } from './SearchBox';
import { cn } from '@/lib/utils';
import { getActiveAutosave } from '@/services/local-storage/autosave';

function TreeNameInput() {
  const { t } = useI18n();
  const name = useEditorStore((s) => s.tree?.name ?? '');
  const commit = useEditorStore((s) => s.commit);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const apply = () => {
    const next = draft.trim();
    if (!next) return setDraft(name);
    if (next !== name) commit((tr) => ({ ...tr, name: next, updatedAt: new Date().toISOString() }));
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
      maxLength={120}
      aria-label={t('editor.treeName')}
      data-testid="tree-name"
      className="serif h-9 w-full min-w-0 max-w-[22rem] truncate rounded-lg border border-transparent bg-transparent px-2 text-base font-semibold text-ink transition-colors hover:border-line focus-visible:border-forest focus-visible:bg-white"
    />
  );
}

export function SaveStatus({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const status = useEditorStore((s) => s.saveStatus);
  const isSample = useEditorStore((s) => s.isSample);
  const cfg = isSample
    ? { icon: <CloudOff className="size-3.5" />, text: t('editor.save.unsaved'), cls: 'text-muted' }
    : status === 'saving'
      ? { icon: <Loader2 className="size-3.5 animate-spin" />, text: t('editor.save.saving'), cls: 'text-muted' }
      : status === 'failed'
        ? { icon: <CircleAlert className="size-3.5" />, text: t('editor.save.failed'), cls: 'text-danger' }
        : { icon: <Check className="size-3.5" />, text: t('editor.save.saved'), cls: 'text-forest' };
  return (
    <span role="status" aria-live="polite" data-testid="save-status" data-status={isSample ? 'sample' : status} className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', cfg.cls)} title={cfg.text}>
      {cfg.icon}
      <span className={cn(compact && 'sr-only')}>{cfg.text}</span>
    </span>
  );
}

export function EditorToolbar() {
  const { t, locale, setLocale } = useI18n();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const openDialog = useUiStore((s) => s.openDialog);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-white/90 px-2 backdrop-blur sm:gap-2 sm:px-3" data-testid="editor-toolbar">
      <Tip label={t('editor.backToDashboard')}>
        <Button asChild variant="ghost" size="icon" aria-label={t('editor.backToDashboard')}>
          <Link to="/app" onClick={() => void getActiveAutosave()?.flush()} data-testid="back-to-dashboard">
            {isTablet ? <LogoMark className="size-7" /> : <ArrowLeft />}
          </Link>
        </Button>
      </Tip>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:basis-[12rem] xl:basis-[20rem]">
        <TreeNameInput />
      </div>
      <SaveStatus compact={!isDesktop} />

      <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
        <Tip label={`${t('editor.undo')} (Ctrl+Z)`}>
          <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label={t('editor.undo')} data-testid="undo">
            <Undo2 />
          </Button>
        </Tip>
        <Tip label={`${t('editor.redo')} (Ctrl+Shift+Z)`}>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label={t('editor.redo')} data-testid="redo">
            <Redo2 />
          </Button>
        </Tip>

        {isTablet ? (
          <SearchBox className="mx-1 w-40 xl:w-64" />
        ) : (
          <>
            <Button variant="ghost" size="icon" aria-label={t('editor.search.label')} onClick={() => setSearchOpen(true)} data-testid="search-open">
              <Search />
            </Button>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogContent hideClose size="sm" className="top-0 rounded-t-none sm:top-[20%]" aria-describedby={undefined} data-testid="search-dialog">
                <DialogTitle className="sr-only">{t('editor.search.label')}</DialogTitle>
                <DialogDescription className="sr-only">{t('editor.search.label')}</DialogDescription>
                <div className="p-3">
                  <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {isTablet && (
          <>
            <Tip label={t('editor.stories')}>
              <Button variant="ghost" size="icon" aria-label={t('editor.stories')} onClick={() => openDialog({ kind: 'stories' })} data-testid="open-stories">
                <BookOpen />
              </Button>
            </Tip>
            <LanguageSwitcher compact />
            <Button variant="secondary" size={isDesktop ? 'md' : 'icon'} aria-label={t('editor.export')} onClick={() => openDialog({ kind: 'export' })} data-testid="open-export" className="ms-1">
              <Download /> {isDesktop && t('editor.export')}
            </Button>
            <Tip label={t('editor.settings')}>
              <Button variant="ghost" size="icon" aria-label={t('editor.settings')} onClick={() => openDialog({ kind: 'settings' })} data-testid="open-settings">
                <Settings />
              </Button>
            </Tip>
            <Tip label={t('editor.help')}>
              <Button variant="ghost" size="icon" aria-label={t('editor.help')} className="hidden xl:inline-flex" onClick={() => openDialog({ kind: 'help' })}>
                <HelpCircle />
              </Button>
            </Tip>
          </>
        )}

        {!isTablet && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('editor.more')} data-testid="toolbar-more">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openDialog({ kind: 'export' })} data-testid="more-export">
                <Download /> {t('editor.export')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog({ kind: 'stories' })}>
                <BookOpen /> {t('editor.stories')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog({ kind: 'settings' })}>
                <Settings /> {t('editor.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog({ kind: 'help' })}>
                <HelpCircle /> {t('editor.help')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                <Languages className="me-1.5 inline size-3.5" aria-hidden />
                {t('editor.language')}
              </DropdownMenuLabel>
              {LOCALES.map((l) => (
                <DropdownMenuItem key={l.code} onSelect={() => setLocale(l.code)} lang={l.code}>
                  <span className="flex-1">{l.native}</span>
                  {l.code === locale && <Check />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
