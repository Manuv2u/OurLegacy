import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/dialog';
import { PersonDialog } from '@/features/people/PersonDialog';
import { ExportDialog } from '@/features/export/ExportDialog';
import { ImportDialog } from '@/features/import/ImportDialog';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { HelpDialog } from '@/features/settings/HelpDialog';
import { StoriesDialog } from '@/features/stories/StoriesDialog';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { removePerson } from '@/features/relationships/operations';

export function EditorDialogs() {
  const { t, displayName } = useI18n();
  const navigate = useNavigate();
  const dialog = useUiStore((s) => s.dialog);
  const close = useUiStore((s) => s.closeDialog);
  const tree = useEditorStore((s) => s.tree);
  const commit = useEditorStore((s) => s.commit);
  const undo = useEditorStore((s) => s.undo);
  const isSample = useEditorStore((s) => s.isSample);

  const deleting = dialog?.kind === 'deletePerson' ? tree?.people.find((p) => p.id === dialog.personId) : undefined;

  return (
    <>
      <PersonDialog />
      <ExportDialog />
      <StoriesDialog />
      <SettingsDialog open={dialog?.kind === 'settings'} onOpenChange={(o) => !o && close()} />
      <HelpDialog open={dialog?.kind === 'help'} onOpenChange={(o) => !o && close()} />
      <ImportDialog
        open={dialog?.kind === 'import'}
        onOpenChange={(o) => !o && close()}
        onImported={(trees) => {
          const current = useEditorStore.getState().tree;
          if (!isSample && current && trees.some((x) => x.id === current.id)) {
            // The open tree was replaced on disk: reload it so the editor shows (and autosaves) the imported data.
            useEditorStore.getState().load(trees.find((x) => x.id === current.id)!);
          } else if (trees.length === 1) {
            navigate(`/app/tree/${trees[0].id}`);
          } else {
            navigate('/app');
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && close()}
        title={deleting ? t('person.delete.title', { name: displayName(deleting) }) : ''}
        description={t('person.delete.body')}
        confirmLabel={t('person.delete.confirm')}
        onConfirm={() => {
          if (!deleting) return;
          const name = displayName(deleting);
          commit((tr) => removePerson(tr, deleting.id));
          close();
          toast(t('person.deleted', { name }), { action: { label: t('editor.undo'), onClick: undo } });
        }}
      />
    </>
  );
}
