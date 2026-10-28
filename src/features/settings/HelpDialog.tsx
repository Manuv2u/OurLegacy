import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/i18n/useI18n';
import type { MessageKey } from '@/i18n';

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

const SHORTCUTS: { keys: string[]; label: MessageKey }[] = [
  { keys: [MOD, 'Z'], label: 'help.key.undo' },
  { keys: [MOD, 'Shift', 'Z'], label: 'help.key.redo' },
  { keys: ['/'], label: 'help.key.search' },
  { keys: ['↑', '↓', '←', '→'], label: 'help.key.arrows' },
  { keys: ['Enter'], label: 'help.key.enter' },
  { keys: ['P', 'C', 'S', 'M'], label: 'help.key.add' },
  { keys: ['E'], label: 'help.key.edit' },
  { keys: ['F'], label: 'help.key.fit' },
  { keys: ['+', '−'], label: 'help.key.zoom' },
  { keys: ['Delete'], label: 'help.key.delete' },
  { keys: ['Esc'], label: 'help.key.escape' },
];

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent size="md" data-testid="help-dialog">
          <DialogHeader>
            <DialogTitle>{t('help.title')}</DialogTitle>
            <DialogDescription>{t('help.basics.body')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5 pb-6">
            <section>
              <h3 className="serif mb-2 text-base font-semibold">{t('help.shortcuts')}</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {SHORTCUTS.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm">
                    <span>{t(s.label)}</span>
                    <span className="flex shrink-0 gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="rounded-md border border-line bg-ivory px-1.5 py-0.5 font-sans text-xs font-medium text-muted shadow-[0_1px_0_var(--color-line)]">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl bg-sage/60 p-4">
              <h3 className="serif mb-1 text-base font-semibold">{t('help.limits.title')}</h3>
              <p className="text-sm leading-relaxed text-ink/80">{t('help.limits.body')}</p>
            </section>
          </DialogBody>
        </DialogContent>
      )}
    </Dialog>
  );
}
