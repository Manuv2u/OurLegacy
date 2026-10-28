import { useMemo, useState } from 'react';
import { FileImage, FileJson, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { EmptyExportError, exportPdf, exportPng, type PngBackground } from './exporters';
import { exportJson } from './jsonExport';
import { prepareExport } from './renderTree';
import { planPdf } from './pdfPlan';
import type { ExportScope } from './scope';

type Format = 'png' | 'pdf' | 'json';

const FORMATS: { id: Format; icon: typeof FileImage; label: 'export.format.png' | 'export.format.pdf' | 'export.format.json'; desc: 'export.format.png.desc' | 'export.format.pdf.desc' | 'export.format.json.desc' }[] = [
  { id: 'png', icon: FileImage, label: 'export.format.png', desc: 'export.format.png.desc' },
  { id: 'pdf', icon: FileText, label: 'export.format.pdf', desc: 'export.format.pdf.desc' },
  { id: 'json', icon: FileJson, label: 'export.format.json', desc: 'export.format.json.desc' },
];

export function ExportDialog() {
  const open = useUiStore((s) => s.dialog?.kind === 'export');
  const close = useUiStore((s) => s.closeDialog);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      {open && <ExportContent />}
    </Dialog>
  );
}

function ExportContent() {
  const { t, displayName } = useI18n();
  const tree = useEditorStore((s) => s.tree)!;
  const selectedId = useEditorStore((s) => s.selectedId);
  const selected = tree.people.find((p) => p.id === selectedId);
  const close = useUiStore((s) => s.closeDialog);
  const [format, setFormat] = useState<Format>('png');
  const [scope, setScope] = useState<ExportScope>('full');
  const [includeTitle, setIncludeTitle] = useState(true);
  const [resolution, setResolution] = useState<1 | 2 | 3>(2);
  const [background, setBackground] = useState<PngBackground>('ivory');
  const [jsonAll, setJsonAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const imageFormat = format !== 'json';
  const effectiveScope: ExportScope = selected ? scope : 'full';
  const empty = tree.people.length === 0;

  const pdfPlanText = useMemo(() => {
    if (format !== 'pdf' || empty) return null;
    const prep = prepareExport(tree, effectiveScope, selectedId, includeTitle);
    const plan = planPdf(prep.width, prep.height);
    const orientation = t(plan.orientation === 'landscape' ? 'export.pdf.landscape' : 'export.pdf.portrait');
    const size = plan.page.toUpperCase();
    return plan.mode === 'single' ? t('export.pdf.plan.single', { size, orientation }) : t('export.pdf.plan.tiled', { size, orientation, count: plan.cols * plan.rows });
  }, [format, tree, effectiveScope, selectedId, includeTitle, empty, t]);

  const run = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const base = { tree, scope: effectiveScope, selectedId, includeTitle };
      if (format === 'json') {
        await exportJson(tree, jsonAll);
      } else if (format === 'png') {
        const res = await exportPng({ ...base, resolution, background });
        if (res.reduced) toast.info(t('export.png.downscaled', { scale: res.pixelRatio.toFixed(2) }));
      } else {
        await exportPdf(base);
      }
      toast.success(t('export.done'));
      close();
    } catch (e) {
      const reason = e instanceof EmptyExportError ? t('export.emptyTree') : e instanceof Error ? e.message : String(e);
      setError(t('export.failed', { reason }));
    } finally {
      setBusy(false);
    }
  };

  const selectedName = selected ? displayName(selected) : '';

  return (
    <DialogContent size="md" data-testid="export-dialog">
      <DialogHeader>
        <DialogTitle>{t('export.title')}</DialogTitle>
        <DialogDescription>{t('export.subtitle')}</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('export.format')}</legend>
          <div role="radiogroup" aria-label={t('export.format')} className="grid gap-2 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={format === f.id}
                data-testid={`export-format-${f.id}`}
                onClick={() => setFormat(f.id)}
                className={cn('rounded-xl border p-3 text-start transition-colors', format === f.id ? 'border-forest bg-sage/60 ring-1 ring-forest' : 'border-line hover:bg-sage/40')}
              >
                <f.icon className="mb-1.5 size-5 text-forest" aria-hidden />
                <span className="block text-sm font-semibold">{t(f.label)}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{t(f.desc)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {imageFormat && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('export.scope')}</legend>
              <div className="space-y-2">
                <ScopeRadio checked={effectiveScope === 'full'} onChange={() => setScope('full')} label={t('export.scope.full')} testId="scope-full" />
                <ScopeRadio checked={effectiveScope === 'descendants'} disabled={!selected} onChange={() => setScope('descendants')} label={t('export.scope.descendants', { name: selectedName || '…' })} testId="scope-descendants" />
                <ScopeRadio checked={effectiveScope === 'ancestors'} disabled={!selected} onChange={() => setScope('ancestors')} label={t('export.scope.ancestors', { name: selectedName || '…' })} testId="scope-ancestors" />
                {!selected && <p className="text-xs text-muted">{t('export.scope.needsSelection')}</p>}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {format === 'png' && (
                <>
                  <Field label={t('export.resolution')} htmlFor="resolution">
                    <Select id="resolution" value={resolution} onChange={(e) => setResolution(Number(e.target.value) as 1 | 2 | 3)}>
                      <option value={1}>{t('export.resolution.standard')}</option>
                      <option value={2}>{t('export.resolution.high')}</option>
                      <option value={3}>{t('export.resolution.ultra')}</option>
                    </Select>
                  </Field>
                  <Field label={t('export.background')} htmlFor="background">
                    <Select id="background" value={background} onChange={(e) => setBackground(e.target.value as PngBackground)}>
                      <option value="ivory">{t('export.background.ivory')}</option>
                      <option value="white">{t('export.background.white')}</option>
                      <option value="transparent">{t('export.background.transparent')}</option>
                    </Select>
                  </Field>
                </>
              )}
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="size-4 accent-forest" checked={includeTitle} onChange={(e) => setIncludeTitle(e.target.checked)} />
              {t('export.title.include')}
            </label>
            {pdfPlanText && (
              <div className="rounded-xl bg-sage/60 px-3.5 py-3 text-sm" data-testid="pdf-plan">
                <p className="font-medium text-forest-800">{pdfPlanText}</p>
                <p className="mt-1 text-xs text-muted">{t('export.pdf.note')}</p>
              </div>
            )}
          </>
        )}

        {format === 'json' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('export.scope')}</legend>
            <div className="space-y-2">
              <ScopeRadio checked={!jsonAll} onChange={() => setJsonAll(false)} label={t('export.json.scope')} testId="json-this" />
              <ScopeRadio checked={jsonAll} onChange={() => setJsonAll(true)} label={t('export.json.all')} testId="json-all" />
            </div>
            <p className="mt-3 rounded-xl bg-sage/60 px-3.5 py-3 text-xs leading-relaxed text-muted">{t('export.json.note')}</p>
          </fieldset>
        )}

        {error && (
          <p role="alert" data-testid="export-error" className="rounded-xl bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          {t('app.cancel')}
        </Button>
        <Button onClick={run} disabled={busy || (empty && format !== 'json')} data-testid="export-run">
          {busy ? <Loader2 className="animate-spin" /> : null}
          {busy ? t('export.running') : t('export.run')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ScopeRadio({ checked, onChange, label, disabled, testId }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean; testId?: string }) {
  return (
    <label className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm', checked ? 'border-forest bg-sage/50' : 'border-line', disabled ? 'opacity-50' : 'cursor-pointer hover:bg-sage/30')}>
      <input type="radio" className="size-4 accent-forest" checked={checked} disabled={disabled} onChange={onChange} data-testid={testId} />
      {label}
    </label>
  );
}
