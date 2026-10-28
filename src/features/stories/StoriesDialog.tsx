import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/features/family-tree/PersonCardView';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { searchKey } from '@/utils/names';

export function StoriesDialog() {
  const { t, displayName, lifespan } = useI18n();
  const open = useUiStore((s) => s.dialog?.kind === 'stories');
  const close = useUiStore((s) => s.closeDialog);
  const set = useUiStore((s) => s.set);
  const tree = useEditorStore((s) => s.tree);
  const select = useEditorStore((s) => s.select);
  const requestView = useEditorStore((s) => s.requestView);
  const [q, setQ] = useState('');

  const stories = useMemo(() => {
    const key = searchKey(q.trim());
    return (tree?.people ?? [])
      .filter((p) => p.biography?.trim())
      .filter((p) => !key || searchKey(`${displayName(p)} ${p.biography}`).includes(key));
  }, [tree?.people, q, displayName]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      {open && (
        <DialogContent size="lg" data-testid="stories-dialog">
          <DialogHeader>
            <DialogTitle>{t('stories.title')}</DialogTitle>
            <DialogDescription>{t('stories.subtitle')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('stories.search')} aria-label={t('stories.search')} className="ps-9" />
            </div>
            {stories.length === 0 ? (
              <div className="rounded-2xl bg-sage/50 px-6 py-10 text-center text-sm text-muted">
                <BookOpen className="mx-auto mb-2 size-6 text-gold-700" aria-hidden />
                {t('stories.empty')}
              </div>
            ) : (
              <ul className="space-y-3">
                {stories.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-line p-4">
                    <div className="flex items-center gap-3">
                      <Avatar person={p} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="serif truncate font-semibold">{displayName(p)}</p>
                        {lifespan(p) && <p className="text-xs text-muted">{lifespan(p)}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          select(p.id);
                          requestView({ kind: 'focus', ids: [p.id] });
                          set({ profileOpen: true });
                          close();
                        }}
                      >
                        {t('stories.open')}
                      </Button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{p.biography}</p>
                  </li>
                ))}
              </ul>
            )}
          </DialogBody>
        </DialogContent>
      )}
    </Dialog>
  );
}
