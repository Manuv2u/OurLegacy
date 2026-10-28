import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, ConfirmDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { LOCALES } from '@/i18n';
import { useI18n } from '@/i18n/useI18n';
import { useSettingsStore } from '@/stores/settingsStore';
import { useEditorStore } from '@/stores/editorStore';
import { treeRepository } from '@/services/local-storage/treeRepository';
import { getActiveAutosave } from '@/services/local-storage/autosave';
import { clearAllLocalPreferences } from '@/lib/settings';
import { exportAllTreesJson } from '@/features/export/jsonExport';
import type { Locale } from '@/i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <SettingsContent onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function SettingsContent({ onClose }: { onClose: () => void }) {
  const { t, locale, setLocale, formatDateTime } = useI18n();
  const navigate = useNavigate();
  const { defaultLayout, nameOrder, lastBackupAt, update } = useSettingsStore();
  const [count, setCount] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let alive = true;
    treeRepository.count().then((n) => alive && setCount(n)).catch(() => alive && setCount(null));
    navigator.storage?.persisted?.().then((p) => alive && setPersisted(p)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const clearAll = async () => {
    try {
      getActiveAutosave()?.stop();
      await treeRepository.clearAll();
      clearAllLocalPreferences();
      useEditorStore.getState().unload();
      useSettingsStore.getState().reset();
      setConfirmClear(false);
      onClose();
      toast.success(t('settings.data.cleared'));
      navigate('/app', { replace: true });
      setTimeout(() => window.location.reload(), 150);
    } catch {
      toast.error(t('storage.writeFailed'));
    }
  };

  return (
    <DialogContent size="md" data-testid="settings-dialog">
      <DialogHeader>
        <DialogTitle>{t('settings.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('settings.title')}</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-6 pb-6">
        <Field label={t('settings.language')} htmlFor="settings-language" hint={t('settings.language.help')}>
          <Select id="settings-language" value={locale} onChange={(e) => setLocale(e.target.value as Locale)} data-testid="settings-language">
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium">{t('settings.layout')}</p>
          <Segmented
            label={t('settings.layout')}
            value={defaultLayout}
            onChange={(v) => update({ defaultLayout: v })}
            options={[
              { value: 'vertical', label: t('side.layout.vertical') },
              { value: 'horizontal', label: t('side.layout.horizontal') },
            ]}
          />
        </div>

        <Field label={t('settings.nameOrder')} htmlFor="settings-name-order">
          <Select id="settings-name-order" value={nameOrder} onChange={(e) => update({ nameOrder: e.target.value as 'given-first' | 'family-first' })}>
            <option value="given-first">{t('settings.nameOrder.given')}</option>
            <option value="family-first">{t('settings.nameOrder.family')}</option>
          </Select>
        </Field>

        <section className="rounded-2xl border border-line p-4">
          <h3 className="serif mb-2 text-base font-semibold">{t('settings.data')}</h3>
          <ul className="space-y-1 text-sm text-muted">
            {count !== null && <li>{t('settings.data.trees', { count })}</li>}
            <li>{lastBackupAt ? t('settings.data.lastBackup', { date: formatDateTime(lastBackupAt) }) : t('settings.data.neverBackedUp')}</li>
            {persisted !== null && <li>{t(persisted ? 'settings.storage.persisted' : 'settings.storage.notPersisted')}</li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void exportAllTreesJson().then(() => toast.success(t('export.done')))} data-testid="settings-export-all">
              <Download /> {t('settings.data.exportAll')}
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => { setTyped(''); setConfirmClear(true); }} data-testid="settings-clear">
              <Trash2 /> {t('settings.data.clear')}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl bg-sage/60 p-4">
          <h3 className="serif mb-1.5 flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="size-4 text-forest" aria-hidden /> {t('settings.privacy')}
          </h3>
          <p className="text-sm leading-relaxed text-ink/80">{t('settings.privacy.body')}</p>
        </section>

        <p className="text-center text-xs text-muted">OurLegacy · {t('settings.version', { version: __APP_VERSION__ })}</p>
      </DialogBody>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('settings.data.clear.title')}
        description={t('settings.data.clear.body')}
        confirmLabel={t('settings.data.clear.confirm')}
        confirmDisabled={typed !== 'DELETE'}
        onConfirm={() => void clearAll()}
      >
        <Input className="mt-4" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('settings.data.clear.type')} aria-label={t('settings.data.clear.type')} data-testid="clear-confirm-input" autoComplete="off" />
      </ConfirmDialog>
    </DialogContent>
  );
}
