import { useState } from 'react';
import { BookOpen, Check, Pencil } from 'lucide-react';
import type { Person } from '@/types/family';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { updatePerson } from '@/features/relationships/operations';

/** Inline biography/story editor. Edits are coalesced into one undo step per burst of typing. */
export function StoryEditor({ person }: { person: Person }) {
  const { t } = useI18n();
  const commit = useEditorStore((s) => s.commit);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          autoFocus
          rows={8}
          aria-label={t('profile.story')}
          placeholder={t('person.field.biographyHint')}
          value={person.biography ?? ''}
          data-testid="story-textarea"
          onChange={(e) => {
            const v = e.target.value;
            commit((tr) => updatePerson(tr, person.id, { biography: v.trim() ? v : undefined }), { coalesceKey: `bio:${person.id}` });
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
          <Check /> {t('app.save')}
        </Button>
      </div>
    );
  }

  if (!person.biography) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-ivory px-4 py-4 text-center">
        <BookOpen className="mx-auto mb-2 size-5 text-gold-700" aria-hidden />
        <p className="mb-3 text-sm text-muted">{t('profile.story.empty')}</p>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} data-testid="write-story">
          <Pencil /> {t('profile.story.add')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink" data-testid="story-text">
        {person.biography}
      </p>
      <Button size="sm" variant="ghost" className="-ms-2 mt-2" onClick={() => setEditing(true)}>
        <Pencil /> {t('profile.edit')}
      </Button>
    </div>
  );
}
