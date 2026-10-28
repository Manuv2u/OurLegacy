import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar } from './PersonCardView';
import { Input } from '@/components/ui/field';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { allNameForms, searchKey } from '@/utils/names';
import { cn } from '@/lib/utils';

export const SEARCH_INPUT_ID = 'tree-search-input';

/** Combobox that finds people by any part of their name (accent- and case-insensitive; Kannada aware). */
export function SearchBox({ className, autoFocus, onDone }: { className?: string; autoFocus?: boolean; onDone?: () => void }) {
  const { t, displayName, lifespan } = useI18n();
  const people = useEditorStore((s) => s.tree?.people ?? []);
  const select = useEditorStore((s) => s.select);
  const requestView = useEditorStore((s) => s.requestView);
  const setUi = useUiStore((s) => s.set);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const key = searchKey(q.trim());
    if (!key) return [];
    return people
      .filter((p) => searchKey(`${allNameForms(p)} ${displayName(p)}`).includes(key))
      .slice(0, 8);
  }, [q, people, displayName]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (id: string) => {
    select(id);
    requestView({ kind: 'focus', ids: [id] });
    setUi({ profileOpen: true });
    setQ('');
    setOpen(false);
    onDone?.();
  };

  const expanded = open && q.trim().length > 0;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Search aria-hidden className="pointer-events-none absolute start-3 top-3 size-4 text-muted" />
      <Input
        id={SEARCH_INPUT_ID}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] ? `${listId}-${results[active].id}` : undefined}
        aria-label={t('editor.search.label')}
        placeholder={t('editor.search')}
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        data-testid="search-input"
        className="ps-9"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            choose(results[active].id);
          } else if (e.key === 'Escape') {
            setQ('');
            setOpen(false);
            (e.target as HTMLElement).blur();
          }
        }}
      />
      {expanded && (
        <ul id={listId} role="listbox" aria-label={t('editor.search.label')} className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-80 overflow-auto rounded-xl border border-line bg-white p-1 shadow-pop" data-testid="search-results">
          {results.length === 0 ? (
            <li role="option" aria-selected="false" aria-disabled="true" className="px-3 py-3 text-sm text-muted">
              {t('editor.search.none', { query: q })}
            </li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p.id);
                }}
                className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2', i === active && 'bg-sage')}
              >
                <Avatar person={p} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{displayName(p)}</span>
                  {lifespan(p) && <span className="block text-xs text-muted">{lifespan(p)}</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
