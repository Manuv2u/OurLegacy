import { useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore, type DialogState } from '@/stores/uiStore';
import { addPerson, addRelative, createPerson, updatePerson, type RelativeKind } from '@/features/relationships/operations';
import { buildIndex, parentIds, partnerIds } from '@/features/relationships/graph';
import { checkRelationship, type RelationshipErrorCode } from '@/features/relationships/validation';
import { Avatar } from '@/features/family-tree/PersonCardView';
import { fileToPhotoDataUrl, PhotoError } from '@/lib/image';
import { isDeceased } from '@/utils/status';
import { localizedParts } from '@/utils/names';
import { emptyPersonValues, makePersonSchema, valuesToDraft, type PersonFormValues } from './personSchema';
import type { ParentKind, Person } from '@/types/family';

type PersonDialogState = Extract<NonNullable<DialogState>, { kind: 'person' }>;

export function PersonDialog() {
  const dialog = useUiStore((s) => s.dialog);
  const close = useUiStore((s) => s.closeDialog);
  const open = dialog?.kind === 'person';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      {open && <PersonDialogContent key={JSON.stringify(dialog)} state={dialog as PersonDialogState} onClose={close} />}
    </Dialog>
  );
}

function PersonDialogContent({ state, onClose }: { state: PersonDialogState; onClose: () => void }) {
  const { t, displayName, lifespan } = useI18n();
  const tree = useEditorStore((s) => s.tree)!;
  const commit = useEditorStore((s) => s.commit);
  const select = useEditorStore((s) => s.select);
  const requestView = useEditorStore((s) => s.requestView);
  const index = useMemo(() => buildIndex(tree), [tree]);

  const editing = state.mode === 'edit' ? tree.people.find((p) => p.id === state.personId) : undefined;
  const anchorId = state.mode === 'add' || state.mode === 'link' ? state.anchorId : undefined;
  const anchor = anchorId ? index.people.get(anchorId) : undefined;
  const [useExisting, setUseExisting] = useState(state.mode === 'link' || (state.mode === 'add' && !!state.existing));
  const [relation, setRelation] = useState<RelativeKind>(state.mode === 'add' ? state.relation : 'child');
  const [kind, setKind] = useState<ParentKind>('biological');

  const anchorPartners = anchorId ? partnerIds(index, anchorId) : [];
  const anchorParents = anchorId ? parentIds(index, anchorId) : [];
  const [otherParentId, setOtherParentId] = useState<string>(anchorPartners.length === 1 ? anchorPartners[0] : '');
  const [partnerWithParent, setPartnerWithParent] = useState(true);
  const [existingId, setExistingId] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(editing?.photo);
  const [photoError, setPhotoError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const schema = useMemo(() => makePersonSchema(t), [t]);
  const form = useForm<PersonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          firstName: editing.firstName,
          middleName: editing.middleName ?? '',
          lastName: editing.lastName ?? '',
          gender: editing.gender ?? '',
          status: isDeceased(editing) ? 'deceased' : 'living',
          knFirst: editing.names?.kn?.firstName ?? '',
          knMiddle: editing.names?.kn?.middleName ?? '',
          knLast: editing.names?.kn?.lastName ?? '',
          enFirst: editing.names?.en?.firstName ?? '',
          enMiddle: editing.names?.en?.middleName ?? '',
          enLast: editing.names?.en?.lastName ?? '',
          birthDate: editing.birthDate ?? '',
          deathDate: editing.deathDate ?? '',
          biography: editing.biography ?? '',
          notes: editing.notes ?? '',
        }
      : emptyPersonValues,
  });
  const { register, handleSubmit, formState, watch, control } = form;
  const { errors, isSubmitting } = formState;
  const watched = watch(['firstName', 'middleName', 'lastName']);
  const [typedFirst, typedMiddle, typedLast] = watched;
  // Placeholders show what the automatic transliteration would produce, so users only type when it needs correcting.
  const suggest = (text: string | undefined, lang: 'kn' | 'en') => localizedParts({ firstName: text ?? '', names: undefined }, lang).firstName;
  const status = watch('status');

  const relationErr = (code: RelationshipErrorCode) => t(`rel.err.${code}` as 'rel.err.self');

  // People who could be linked to the anchor with the chosen relation.
  const candidates = useMemo<Person[]>(() => {
    if (!anchorId || !useExisting) return [];
    return tree.people.filter((p) => {
      if (p.id === anchorId) return false;
      switch (relation) {
        case 'parent':
          return checkRelationship(tree, { type: 'parent-child', sourceId: p.id, targetId: anchorId, kind }).ok;
        case 'child':
          return checkRelationship(tree, { type: 'parent-child', sourceId: anchorId, targetId: p.id, kind }).ok;
        case 'partner':
          return checkRelationship(tree, { type: 'partner', sourceId: anchorId, targetId: p.id }).ok;
        default:
          return false;
      }
    });
  }, [tree, anchorId, useExisting, relation, kind]);

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(undefined);
    try {
      setPhoto(await fileToPhotoDataUrl(file));
    } catch (e) {
      const code = e instanceof PhotoError ? e.code : 'failed';
      setPhotoError(t(code === 'tooLarge' ? 'person.photo.tooLarge' : code === 'invalid' ? 'person.photo.invalid' : 'person.photo.failed'));
    }
  };

  const finish = (personId: string, message: string) => {
    select(personId);
    requestView({ kind: 'focus', ids: [personId] });
    toast.success(message);
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(undefined);
    const draft = valuesToDraft(values, photo);
    const name = displayName(draft);

    if (state.mode === 'edit' && editing) {
      // Patch only the fields this form owns: relationships and ids are never touched.
      commit((tr) => updatePerson(tr, editing.id, draft));
      toast.success(t('person.updated', { name }));
      onClose();
      return;
    }
    if (state.mode === 'first') {
      const person = createPerson(draft);
      commit((tr) => addPerson(tr, person));
      finish(person.id, t('person.added', { name }));
      return;
    }
    if (!anchorId) return;
    const result = addRelative(tree, anchorId, relation, { draft }, { kind, otherPersonId: otherParentId || null, partnerWithExistingParent: partnerWithParent });
    if ('error' in result) {
      setFormError(relationErr(result.error.code));
      return;
    }
    commit(() => result.tree);
    finish(result.personId, t('person.added', { name }));
  });

  const onLinkExisting = () => {
    if (!anchorId || !existingId) return;
    const result = addRelative(tree, anchorId, relation, { existingPersonId: existingId }, { kind, otherPersonId: null });
    if ('error' in result) {
      setFormError(relationErr(result.error.code));
      return;
    }
    commit(() => result.tree);
    const person = index.people.get(existingId);
    finish(existingId, t('rel.linked', { name: person ? displayName(person) : '' }));
  };

  const anchorName = anchor ? displayName(anchor) : '';
  const title =
    state.mode === 'edit'
      ? t('person.edit.title')
      : state.mode === 'first'
        ? t('person.add.first')
        : useExisting
          ? t('person.add.relativeOf', { name: anchorName })
          : t(`person.add.${relation}Of` as 'person.add.childOf', { name: anchorName });

  const showKind = !!anchorId && (relation === 'parent' || relation === 'child' || (relation === 'sibling' && !useExisting));
  const previewPerson = { photo, firstName: watched[0] ?? '', middleName: watched[1], lastName: watched[2] };
  const canLinkExisting = !!anchorId && relation !== 'sibling';

  return (
    <DialogContent size="md" data-testid="person-dialog" aria-describedby="person-dialog-desc" onOpenAutoFocus={(e) => {
      const first = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('input[name="firstName"], select');
      if (first) { e.preventDefault(); first.focus(); }
    }}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription id="person-dialog-desc" className="sr-only">
          {title}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={useExisting ? (e) => { e.preventDefault(); onLinkExisting(); } : onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
        <DialogBody className="space-y-4">
          {anchorId && state.mode !== 'link' && canLinkExisting && (
            <Segmented
              label={t('rel.type')}
              value={useExisting ? 'existing' : 'new'}
              onChange={(v) => setUseExisting(v === 'existing')}
              options={[
                { value: 'new', label: t('rel.mode.new') },
                { value: 'existing', label: t('rel.mode.existing') },
              ]}
            />
          )}

          {useExisting && state.mode === 'link' && (
            <Field label={t('rel.type')} htmlFor="rel-type">
              <Select id="rel-type" value={relation} onChange={(e) => { setRelation(e.target.value as RelativeKind); setExistingId(''); }}>
                <option value="parent">{t('rel.type.parent')}</option>
                <option value="partner">{t('rel.type.partner')}</option>
                <option value="child">{t('rel.type.child')}</option>
              </Select>
            </Field>
          )}

          {showKind && (
            <Field label={t('rel.kind')} htmlFor="rel-kind">
              <Select id="rel-kind" value={kind} onChange={(e) => { setKind(e.target.value as ParentKind); setExistingId(''); }}>
                <option value="biological">{t('rel.kind.biological')}</option>
                <option value="adoptive">{t('rel.kind.adoptive')}</option>
              </Select>
            </Field>
          )}

          {useExisting ? (
            <Field label={t('rel.chooseExisting')} htmlFor="rel-existing">
              {candidates.length === 0 ? (
                <p className="rounded-xl bg-sage/60 px-3 py-2.5 text-sm text-muted" data-testid="no-candidates">
                  {t('rel.noCandidates')}
                </p>
              ) : (
                <Select id="rel-existing" value={existingId} onChange={(e) => setExistingId(e.target.value)} data-testid="existing-person-select">
                  <option value="">{t('rel.chooseExisting.placeholder')}</option>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {displayName(p)} {lifespan(p) && `(${lifespan(p)})`}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <Avatar person={previewPerson} size={72} />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only-file"
                    tabIndex={-1}
                    aria-label={t('person.field.photo')}
                    data-testid="photo-input"
                    onChange={(e) => {
                      void onPickPhoto(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-2 text-sm font-medium">{t('person.field.photo')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                      <Camera /> {photo ? t('person.photo.change') : t('person.photo.add')}
                    </Button>
                    {photo && (
                      <Button size="sm" variant="ghost" onClick={() => setPhoto(undefined)}>
                        <Trash2 /> {t('person.photo.remove')}
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted">{t('person.photo.hint')}</p>
                  {photoError && (
                    <p role="alert" className="mt-1 text-xs font-medium text-danger">
                      {photoError}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('person.field.firstName')} htmlFor="firstName" error={errors.firstName?.message}>
                  <Input id="firstName" autoComplete="off" aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? 'firstName-error' : undefined} {...register('firstName')} />
                </Field>
                <Field label={t('person.field.middleName')} optional={t('app.optional')} htmlFor="middleName" error={errors.middleName?.message}>
                  <Input id="middleName" autoComplete="off" {...register('middleName')} />
                </Field>
                <Field label={t('person.field.lastName')} htmlFor="lastName" error={errors.lastName?.message} optional={t('app.optional')}>
                  <Input id="lastName" autoComplete="off" {...register('lastName')} />
                </Field>
                <Field label={t('person.field.gender')} optional={t('app.optional')} htmlFor="gender">
                  <Select id="gender" {...register('gender')}>
                    <option value="">{t('person.gender.none')}</option>
                    <option value="female">{t('person.gender.female')}</option>
                    <option value="male">{t('person.gender.male')}</option>
                    <option value="other">{t('person.gender.other')}</option>
                    <option value="unknown">{t('person.gender.unknown')}</option>
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <p id="status-label" className="mb-1.5 text-sm font-medium">{t('person.field.status')}</p>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Segmented
                        label={t('person.field.status')}
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { value: 'living', label: t('person.status.living'), icon: <span aria-hidden className="size-2 rounded-full bg-[#3f8f5f]" /> },
                          { value: 'deceased', label: t('person.status.deceased'), icon: <span aria-hidden className="size-2 rounded-full bg-[#7a847c]" /> },
                        ]}
                      />
                    )}
                  />
                </div>
                <Field label={t('person.field.birth')} optional={t('app.optional')} htmlFor="birthDate" error={errors.birthDate?.message} hint={t('person.field.dateHint')}>
                  <Input id="birthDate" inputMode="numeric" placeholder="YYYY-MM-DD" autoComplete="off" aria-invalid={!!errors.birthDate} aria-describedby={errors.birthDate ? 'birthDate-error' : 'birthDate-hint'} {...register('birthDate')} />
                </Field>
                {status === 'deceased' && (
                  <Field label={t('person.field.death')} optional={t('app.optional')} htmlFor="deathDate" error={errors.deathDate?.message}>
                  <Input id="deathDate" inputMode="numeric" placeholder="YYYY-MM-DD" autoComplete="off" aria-invalid={!!errors.deathDate} aria-describedby={errors.deathDate ? 'deathDate-error' : undefined} {...register('deathDate')} />
                </Field>
                )}
              </div>

              <details className="rounded-xl border border-line bg-ivory px-3.5 py-3 text-sm" open={!!(editing?.names?.kn || editing?.names?.en)} data-testid="other-names">
                <summary className="cursor-pointer select-none font-medium text-forest-800">{t('person.field.otherNames')}</summary>
                <p className="mt-2 text-xs text-muted">{t('person.field.otherNames.hint')}</p>
                {(['kn', 'en'] as const).map((lang) => {
                  const keys = lang === 'kn' ? (['knFirst', 'knMiddle', 'knLast'] as const) : (['enFirst', 'enMiddle', 'enLast'] as const);
                  const typed = [typedFirst, typedMiddle, typedLast];
                  return (
                    <div key={lang} className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{t(lang === 'kn' ? 'person.field.nameKn' : 'person.field.nameEn')}</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {keys.map((key, i) => (
                          <Input
                            key={key}
                            lang={lang}
                            autoComplete="off"
                            aria-label={`${t(lang === 'kn' ? 'person.field.nameKn' : 'person.field.nameEn')}: ${t(['person.field.firstName', 'person.field.middleName', 'person.field.lastName'][i] as 'person.field.firstName')}`}
                            placeholder={suggest(typed[i], lang)}
                            data-testid={`name-${key}`}
                            {...register(key)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </details>

              <Field label={t('person.field.biography')} optional={t('app.optional')} htmlFor="biography" hint={t('person.field.biographyHint')} error={errors.biography?.message}>
                <Textarea id="biography" rows={4} aria-describedby="biography-hint" {...register('biography')} />
              </Field>
              <Field label={t('person.field.notes')} optional={t('app.optional')} htmlFor="notes" error={errors.notes?.message}>
                <Textarea id="notes" rows={2} className="min-h-16" {...register('notes')} />
              </Field>

              {anchorId && relation === 'child' && anchorPartners.length > 0 && (
                <Field label={t('rel.otherParent')} htmlFor="other-parent">
                  <Select id="other-parent" value={otherParentId} onChange={(e) => setOtherParentId(e.target.value)}>
                    <option value="">{t('rel.otherParent.none')}</option>
                    {anchorPartners.map((id) => {
                      const p = index.people.get(id);
                      return p && (
                        <option key={id} value={id}>
                          {displayName(p)}
                        </option>
                      );
                    })}
                  </Select>
                </Field>
              )}
              {anchorId && relation === 'parent' && anchorParents.length === 1 && (
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="size-4 accent-forest" checked={partnerWithParent} onChange={(e) => setPartnerWithParent(e.target.checked)} />
                  {t('rel.partnerWithParent', { name: displayName(index.people.get(anchorParents[0])!) })}
                </label>
              )}
            </>
          )}

          {formError && (
            <p role="alert" data-testid="form-error" className="rounded-xl bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger">
              {formError}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('app.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting || (useExisting && !existingId)} data-testid="person-submit">
            {useExisting ? t('app.continue') : state.mode === 'edit' ? t('person.save.edit') : t('person.save.add')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
