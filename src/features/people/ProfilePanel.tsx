import { useMemo } from 'react';
import { Crosshair, Pencil, Trash2, X, Plus, Baby, Heart, Users, UserPlus } from 'lucide-react';
import type { Person } from '@/types/family';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { Avatar } from '@/features/family-tree/PersonCardView';
import { StoryEditor } from '@/features/stories/StoryEditor';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { buildIndex, siblingsOf, parentIds } from '@/features/relationships/graph';
import { addRelationship, removeRelationship, setRelationshipKind } from '@/features/relationships/operations';
import { partnerIds } from '@/features/relationships/graph';
import { toast } from 'sonner';
import { yearOf } from '@/utils/dates';
import { isDeceased } from '@/utils/status';
import { kinContext, kinOf } from '@/features/relationships/kinship';
import { kinLabel } from '@/features/relationships/kinshipLabels';
import { cn } from '@/lib/utils';

function PersonChip({
  person,
  onOpen,
  onRemove,
  removeLabel,
  adoptive,
  onToggleKind,
  toggleLabel,
  kin,
}: {
  person: Person;
  /** Specific relationship to the profile's person, e.g. "Father". */
  kin?: string;
  onOpen: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  adoptive?: boolean;
  onToggleKind?: () => void;
  toggleLabel?: string;
}) {
  const { displayName, lifespan, t } = useI18n();
  return (
    <li className="flex items-center gap-1" data-testid="relative-chip">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-start transition-colors hover:bg-sage/70">
        <Avatar person={person} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{displayName(person)}</span>
          {(kin || lifespan(person)) && (
            <span className="block truncate text-xs text-muted">
              {kin && <span className="font-semibold text-forest-800" data-testid="chip-kin">{kin}</span>}
              {kin && lifespan(person) && ' · '}
              {lifespan(person)}
            </span>
          )}
        </span>
      </button>
      {onToggleKind && (
        <Tip label={toggleLabel ?? ''} side="left">
          <button
            type="button"
            onClick={onToggleKind}
            aria-label={toggleLabel}
            className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', adoptive ? 'border-gold bg-gold/15 text-gold-700' : 'border-transparent text-muted opacity-0 hover:opacity-100 focus-visible:opacity-100')}
          >
            {t('profile.adoptive')}
          </button>
        </Tip>
      )}
      {onRemove && (
        <Tip label={removeLabel ?? ''} side="left">
          <Button size="icon-sm" variant="ghost" aria-label={removeLabel} onClick={onRemove} className="text-muted">
            <X />
          </Button>
        </Tip>
      )}
    </li>
  );
}

function Group({ title, children, empty }: { title: string; children?: React.ReactNode; empty: boolean }) {
  const { t } = useI18n();
  return (
    <section className="mt-4 first:mt-0">
      <h4 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {empty ? <p className="px-2 text-sm text-muted">{t('profile.none')}</p> : <ul className="space-y-0.5">{children}</ul>}
    </section>
  );
}

export function ProfileContent({ person }: { person: Person }) {
  const { t, displayName, lifespan, formatDate, locale } = useI18n();
  const tree = useEditorStore((s) => s.tree)!;
  const commit = useEditorStore((s) => s.commit);
  const select = useEditorStore((s) => s.select);
  const requestView = useEditorStore((s) => s.requestView);
  const openDialog = useUiStore((s) => s.openDialog);
  const index = useMemo(() => buildIndex(tree), [tree]);

  const parentRels = index.parentRels.get(person.id) ?? [];
  const childRels = index.childRels.get(person.id) ?? [];
  const partnerRels = tree.relationships.filter((r) => r.type === 'partner' && (r.sourceId === person.id || r.targetId === person.id));
  const sibs = siblingsOf(index, person.id);

  const go = (id: string) => {
    select(id);
    requestView({ kind: 'focus', ids: [id] });
  };
  const years = (() => {
    const b = yearOf(person.birthDate);
    const d = yearOf(person.deathDate);
    return b && d && d >= b ? d - b : null;
  })();
  const get = (id: string) => index.people.get(id);

  // A person with one recorded parent whose partner is not yet a parent usually just needs that second link;
  // without it siblings are treated (and drawn) as half-siblings.
  const missingParents = useMemo(() => {
    if (parentRels.length !== 1) return [];
    const only = parentRels[0];
    return partnerIds(index, only.sourceId)
      .filter((pid) => pid !== person.id && !parentRels.some((r) => r.sourceId === pid))
      .map((pid) => ({ id: pid, kind: only.kind ?? ('biological' as const) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, person.id, parentRels.length]);
  const linkMissingParent = (parentId: string, kind: 'biological' | 'adoptive') => {
    const res = addRelationship(useEditorStore.getState().tree!, { type: 'parent-child', sourceId: parentId, targetId: person.id, kind });
    if ('error' in res) toast.error(t(`rel.err.${res.error.code}` as 'rel.err.self'));
    else commit(() => res.tree);
  };
  const kinCtx = useMemo(() => kinContext(index, person.id), [index, person.id]);
  const kinText = (id: string) => {
    const k = kinOf(kinCtx, id);
    return k ? kinLabel(k, locale) : undefined;
  };

  return (
    <div className="flex flex-col" data-testid="profile-content">
      <div className="flex items-start gap-4">
        <Avatar person={person} size={72} />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="serif break-words text-xl font-semibold leading-snug" data-testid="profile-name">
            {displayName(person)}
          </h3>
          {lifespan(person) && <p className="text-sm text-muted">{lifespan(person)}</p>}
          <span
            data-testid="profile-status"
            className={cn('mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', isDeceased(person) ? 'bg-[#e4e6e0] text-[#3f4842]' : 'bg-sage text-forest-800')}
          >
            <span aria-hidden className={cn('size-2 rounded-full', isDeceased(person) ? 'bg-[#7a847c]' : 'bg-[#3f8f5f]')} />
            {t(isDeceased(person) ? 'person.status.deceased' : 'person.status.living')}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDialog({ kind: 'person', mode: 'edit', personId: person.id })} data-testid="edit-person">
          <Pencil /> {t('profile.edit')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => requestView({ kind: 'focus', ids: [person.id] })}>
          <Crosshair /> {t('profile.center')}
        </Button>
        <Tip label={t('app.delete')} side="bottom">
          <Button size="icon-sm" variant="danger-ghost" onClick={() => openDialog({ kind: 'deletePerson', personId: person.id })} data-testid="delete-person" aria-label={t('app.delete')}>
            <Trash2 />
          </Button>
        </Tip>
      </div>

      {(person.birthDate || person.deathDate) && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {person.birthDate && (
            <>
              <dt className="text-muted">{t('profile.born')}</dt>
              <dd className="font-medium">{formatDate(person.birthDate)}</dd>
            </>
          )}
          {person.deathDate && (
            <>
              <dt className="text-muted">{t('profile.died')}</dt>
              <dd className="font-medium">{formatDate(person.deathDate)}</dd>
            </>
          )}
          {years !== null && (
            <>
              <dt className="sr-only">{t('profile.age', { years })}</dt>
              <dd className="col-span-2 text-muted">{t('profile.age', { years })}</dd>
            </>
          )}
        </dl>
      )}

      <section className="mt-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('profile.story')}</h4>
        <StoryEditor key={person.id} person={person} />
      </section>

      {person.notes && (
        <section className="mt-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('profile.notes')}</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{person.notes}</p>
        </section>
      )}

      <section className="mt-6 border-t border-line pt-5">
        <h4 className="serif mb-3 text-base font-semibold">{t('profile.family')}</h4>
        <Group title={t('profile.parents')} empty={!parentRels.length}>
          {parentRels.map((r) => {
            const p = get(r.sourceId);
            return (
              p && (
                <PersonChip
                  key={r.id}
                  person={p}
                  kin={kinText(p.id)}
                  onOpen={() => go(p.id)}
                  removeLabel={t('profile.removeLink', { name: displayName(p) })}
                  onRemove={() => {
                    commit((tr) => removeRelationship(tr, r.id));
                  }}
                  adoptive={r.kind === 'adoptive'}
                  toggleLabel={t('profile.toggleKind')}
                  onToggleKind={() => commit((tr) => setRelationshipKind(tr, r.id, r.kind === 'adoptive' ? 'biological' : 'adoptive'))}
                />
              )
            );
          })}
        </Group>
        {missingParents.map((m) => {
          const other = get(m.id);
          return (
            other && (
              <Button
                key={m.id}
                size="sm"
                variant="secondary"
                className="mb-1 mt-2 h-auto min-h-8 w-full justify-start whitespace-normal py-1.5 text-start"
                onClick={() => linkMissingParent(m.id, m.kind)}
                data-testid="link-missing-parent"
              >
                <UserPlus /> {t('profile.suggestParent', { name: displayName(other) })}
              </Button>
            )
          );
        })}
        <Group title={t('profile.partners')} empty={!partnerRels.length}>
          {partnerRels.map((r) => {
            const p = get(r.sourceId === person.id ? r.targetId : r.sourceId);
            return p && <PersonChip key={r.id} person={p} kin={kinText(p.id)} onOpen={() => go(p.id)} removeLabel={t('profile.removeLink', { name: displayName(p) })} onRemove={() => commit((tr) => removeRelationship(tr, r.id))} />;
          })}
        </Group>
        <Group title={t('profile.children')} empty={!childRels.length}>
          {childRels.map((r) => {
            const p = get(r.targetId);
            return (
              p && (
                <PersonChip
                  key={r.id}
                  person={p}
                  kin={kinText(p.id)}
                  onOpen={() => go(p.id)}
                  removeLabel={t('profile.removeLink', { name: displayName(p) })}
                  onRemove={() => commit((tr) => removeRelationship(tr, r.id))}
                  adoptive={r.kind === 'adoptive'}
                  toggleLabel={t('profile.toggleKind')}
                  onToggleKind={() => commit((tr) => setRelationshipKind(tr, r.id, r.kind === 'adoptive' ? 'biological' : 'adoptive'))}
                />
              )
            );
          })}
        </Group>
        <Group title={t('profile.siblings')} empty={!sibs.full.length}>
          {sibs.full.map((id) => get(id) && <PersonChip key={id} person={get(id)!} kin={kinText(id)} onOpen={() => go(id)} />)}
        </Group>
        {sibs.half.length > 0 && (
          <Group title={t('profile.halfSiblings')} empty={false}>
            {sibs.half.map((id) => get(id) && <PersonChip key={id} person={get(id)!} kin={kinText(id)} onOpen={() => go(id)} />)}
          </Group>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => openDialog({ kind: 'person', mode: 'add', relation: 'parent', anchorId: person.id })}>
            <UserPlus /> {t('rel.type.parent')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDialog({ kind: 'person', mode: 'add', relation: 'partner', anchorId: person.id })}>
            <Heart /> {t('rel.type.partner')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openDialog({ kind: 'person', mode: 'add', relation: 'child', anchorId: person.id })}>
            <Baby /> {t('rel.type.child')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={parentIds(index, person.id).length === 0}
            title={parentIds(index, person.id).length === 0 ? t('side.noParentsForSibling') : undefined}
            onClick={() => openDialog({ kind: 'person', mode: 'add', relation: 'sibling', anchorId: person.id })}
          >
            <Users /> {t('rel.type.sibling')}
          </Button>
          <Button size="sm" variant="ghost" className="col-span-2" onClick={() => openDialog({ kind: 'person', mode: 'link', anchorId: person.id })}>
            <Plus /> {t('side.addRelative')}
          </Button>
        </div>
      </section>
    </div>
  );
}

/** Right-hand details panel content for the current selection. */
export function ProfilePanelBody() {
  const { t } = useI18n();
  const selectedId = useEditorStore((s) => s.selectedId);
  const person = useEditorStore((s) => s.tree?.people.find((p) => p.id === s.selectedId));
  if (!selectedId || !person) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-sage text-forest">
          <Users className="size-5" aria-hidden />
        </div>
        <p className="font-medium">{t('profile.empty.title')}</p>
        <p className="mt-1 text-sm text-muted">{t('profile.empty.body')}</p>
      </div>
    );
  }
  return (
    <div className="px-5 py-5">
      <ProfileContent person={person} />
    </div>
  );
}
