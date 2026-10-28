import { Maximize, Menu, Plus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetBody } from './mobileSheet';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { EditorSidebar } from './EditorSidebar';
import { useEditorActions } from './useEditorActions';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** Mobile bottom action bar. Everything else lives in the "Actions" sheet. */
export function MobileBar() {
  const { t } = useI18n();
  const a = useEditorActions();
  const actionsOpen = useUiStore((s) => s.actionsOpen);
  const set = useUiStore((s) => s.set);
  const hasPeople = useEditorStore((s) => (s.tree?.people.length ?? 0) > 0);
  const selected = useEditorStore((s) => s.selectedId);

  return (
    <>
      <div className="safe-bottom z-20 flex shrink-0 items-center justify-around gap-1 border-t border-line bg-white px-2 pt-2" data-testid="mobile-bar">
        <Button variant="ghost" className="h-12 flex-1 flex-col gap-0.5 text-[11px]" onClick={() => set({ actionsOpen: true })} data-testid="mobile-actions">
          <Menu /> {t('side.actionsMenu')}
        </Button>
        <Button variant="primary" className="h-12 flex-[1.3] flex-col gap-0.5 text-[11px]" onClick={() => (hasPeople ? set({ actionsOpen: true }) : a.addFirst())} data-testid="mobile-add">
          <Plus /> {t('side.add')}
        </Button>
        <Button variant="ghost" className="h-12 flex-1 flex-col gap-0.5 text-[11px]" onClick={a.fit} data-testid="mobile-fit">
          <Maximize /> {t('side.fit')}
        </Button>
        <Button variant="ghost" className="h-12 flex-1 flex-col gap-0.5 text-[11px]" disabled={!selected} onClick={() => set({ profileOpen: true })} data-testid="mobile-profile">
          <UserRound /> {t('profile.title')}
        </Button>
      </div>
      <Sheet open={actionsOpen} onOpenChange={(o) => set({ actionsOpen: o })}>
        <DialogTitle className="px-5 pb-1 pt-3 text-base">{t('side.actions')}</DialogTitle>
        <DialogDescription className="sr-only">{t('side.actions')}</DialogDescription>
        <SheetBody onClickCapture={(e) => {
          const btn = (e.target as HTMLElement).closest('button');
          if (btn && !btn.disabled) window.setTimeout(() => useUiStore.getState().set({ actionsOpen: false }), 0);
        }}>
          <EditorSidebar sheet />
        </SheetBody>
      </Sheet>
    </>
  );
}
