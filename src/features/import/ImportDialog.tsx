import { useRef, useState } from 'react';
import { FileUp, Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/useI18n';
import { ImportError, MAX_IMPORT_BYTES, parseBackup, type ParsedBackup } from '@/lib/backup';
import { treeRepository } from '@/services/local-storage/treeRepository';
import { getActiveAutosave } from '@/services/local-storage/autosave';
import { StorageError } from '@/services/local-storage/errors';
import { newId, nowIso } from '@/utils/id';
import type { FamilyTree } from '@/types/family';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the trees that were written to storage. */
  onImported?: (trees: FamilyTree[]) => void;
}

type Mode = 'keepBoth' | 'replace';

export function ImportDialog({ open, onOpenChange, onImported }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ImportContent onClose={() => onOpenChange(false)} onImported={onImported} />}
    </Dialog>
  );
}

function ImportContent({ onClose, onImported }: { onClose: () => void; onImported?: (trees: FamilyTree[]) => void }) {
  const { t, locale } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('keepBoth');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    setParsed(null);
    setBusy(true);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new ImportError('tooLarge');
      const text = await file.text().catch(() => {
        throw new ImportError('format', 'read');
      });
      const result = parseBackup(text);
      if (result.trees.length === 0) {
        setError(t('import.err.integrity', { name: result.rejected[0]?.name ?? '?', detail: result.rejected[0]?.reason ?? '' }));
        setParsed(result);
        return;
      }
      const current = await treeRepository.list().catch(() => [] as FamilyTree[]);
      setExisting(new Set(current.map((x) => x.id)));
      setParsed(result);
    } catch (e) {
      if (e instanceof ImportError) {
        setError(
          e.code === 'json' ? t('import.err.json') : e.code === 'version' ? t('import.err.version', { version: e.detail ?? '?' }) : e.code === 'tooLarge' ? t('import.err.tooLarge') : e.detail === 'read' ? t('import.err.read') : t('import.err.format'),
        );
      } else {
        setError(t('import.err.read'));
      }
    } finally {
      setBusy(false);
    }
  };

  const conflicts = parsed?.trees.filter((x) => existing.has(x.id)) ?? [];

  const run = async () => {
    if (!parsed?.trees.length) return;
    setBusy(true);
    try {
      // Make sure the open tree's pending edits are on disk before anything is overwritten.
      await getActiveAutosave()?.flush();
      const now = nowIso();
      const toSave = parsed.trees.map((tree) => {
        if (!existing.has(tree.id)) return tree;
        if (mode === 'replace') return { ...tree, updatedAt: now };
        return { ...tree, id: newId('t'), name: `${tree.name} ${t('import.copySuffix')}`, updatedAt: now };
      });
      await treeRepository.saveMany(toSave);
      toast.success(t('import.done', { count: toSave.length }));
      if (parsed.rejected.length) toast.warning(t('import.skipped', { count: parsed.rejected.length }));
      onImported?.(toSave);
      onClose();
    } catch (e) {
      setError(e instanceof StorageError ? t(e.code === 'quota' ? 'storage.quota' : 'storage.writeFailed') : t('storage.writeFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent size="md" data-testid="import-dialog">
      <DialogHeader>
        <DialogTitle>{t('import.title')}</DialogTitle>
        <DialogDescription>{t('import.subtitle')}</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void readFile(e.dataTransfer.files?.[0]);
          }}
          className={cn('flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors', dragging ? 'border-forest bg-sage/60' : 'border-line bg-ivory')}
        >
          <FileUp className="size-7 text-forest" aria-hidden />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} data-testid="import-choose">
            {t('import.choose')}
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only-file" tabIndex={-1} aria-label={t('import.choose')} data-testid="import-file" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ''; }} />
          <p className="text-xs text-muted">{t('import.drop')}</p>
        </div>

        {busy && !parsed && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> {t('import.reading')}
          </p>
        )}
        {error && (
          <p role="alert" data-testid="import-error" className="flex items-start gap-2 rounded-xl bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}

        {parsed && parsed.trees.length > 0 && (
          <div className="space-y-3" data-testid="import-summary">
            <p className="text-sm font-semibold">{t('import.found', { count: parsed.trees.length })}</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {parsed.trees.map((tree) => (
                <li key={tree.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium">{tree.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                    {t('import.tree.people', { count: tree.people.length })}
                    {existing.has(tree.id) && <span className="rounded-full bg-gold/20 px-2 py-0.5 font-medium text-gold-700">{t('import.conflict')}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {parsed.rejected.map((r, i) => (
              <p key={i} className="text-xs text-danger">
                {t('import.err.integrity', { name: r.name, detail: r.reason })}
              </p>
            ))}
            {conflicts.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('import.conflict.help')}</legend>
                {(['keepBoth', 'replace'] as const).map((m) => (
                  <label key={m} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm', mode === m ? 'border-forest bg-sage/50' : 'border-line')}>
                    <input type="radio" name="import-mode" className="size-4 accent-forest" checked={mode === m} onChange={() => setMode(m)} data-testid={`import-mode-${m}`} />
                    {t(m === 'keepBoth' ? 'import.mode.keepBoth' : 'import.mode.replace')}
                  </label>
                ))}
                {mode === 'replace' && (
                  <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-50 px-3 py-2.5 text-xs font-medium text-danger" data-testid="replace-warning">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t('import.replace.warn')}
                  </p>
                )}
              </fieldset>
            )}
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('app.cancel')}
        </Button>
        <Button onClick={run} disabled={busy || !parsed?.trees.length} variant={mode === 'replace' && conflicts.length ? 'danger' : 'primary'} data-testid="import-run" lang={locale}>
          {busy && parsed ? <Loader2 className="animate-spin" /> : null}
          {t('import.run')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
