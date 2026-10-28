import { BookOpen } from 'lucide-react';
import type { Person } from '@/types/family';
import { cn } from '@/lib/utils';
import { initials } from '@/utils/names';
import { isDeceased } from '@/utils/status';
import { useI18n } from '@/i18n/useI18n';
import { DEFAULT_CARD } from './layout';
import { PortraitArt } from './PortraitArt';
import { useAgeGroup } from './ageGroupContext';
import { groupFromDates } from './ageGroups';

interface Props {
  person: Person;
  selected?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  className?: string;
  /** Render without interactive affordances (landing, exports). */
  flat?: boolean;
}

export function Avatar({ person, size = 52, className }: { person: Pick<Person, 'photo' | 'firstName' | 'middleName' | 'lastName' | 'isDeceased' | 'deathDate' | 'birthDate' | 'gender' | 'names'> & { id?: string }; size?: number; className?: string }) {
  const { t, displayName, localParts } = useI18n();
  const label = initials(localParts(person));
  const inferred = useAgeGroup(person.id);
  const gender = person.gender === 'male' || person.gender === 'female' ? person.gender : null;
  return (
    <span
      data-gender={!person.photo ? (gender ?? undefined) : undefined}
      className={cn('relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold ring-1', isDeceased(person) ? 'bg-[#e4e6e0] text-[#4a544c] ring-[#7a847c]/25' : 'bg-sage text-forest-800 ring-forest/10', className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {person.photo ? (
        <img src={person.photo} alt={t('card.photoOf', { name: displayName(person) })} className={cn('size-full object-cover', isDeceased(person) && 'grayscale-[0.6]')} draggable={false} />
      ) : gender ? (
        <>
          <PortraitArt gender={gender} seed={person.id ?? `${person.firstName}${person.lastName ?? ''}`} group={inferred ?? groupFromDates(person.birthDate, person.deathDate) ?? 'adult'} />
          <span className="sr-only">{t(gender === 'male' ? 'person.gender.male' : 'person.gender.female')}</span>
        </>
      ) : (
        <span aria-hidden>{label || '·'}</span>
      )}
    </span>
  );
}

/** The visual person card. Shared by the editor canvas, landing preview and exports. */
export function PersonCardView({ person, selected, dimmed, highlighted, className, flat }: Props) {
  const { displayName, lifespan } = useI18n();
  const years = lifespan(person);
  const deceased = isDeceased(person);
  return (
    <div
      style={{ width: DEFAULT_CARD.width, height: DEFAULT_CARD.height }}
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border px-3.5 text-start transition-[box-shadow,border-color,opacity] duration-150',
        deceased ? 'bg-[#f3f3ee]' : 'bg-white',
        selected ? 'border-forest shadow-[0_0_0_3px_rgb(49_92_70/0.22)]' : highlighted ? 'border-gold shadow-card' : deceased ? 'border-[#cfd3cb] shadow-card' : 'border-line shadow-card',
        !flat && !selected && 'hover:border-forest/50 hover:shadow-pop',
        dimmed && 'opacity-35',
        className,
      )}
    >
      <Avatar person={person} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[14px] font-semibold leading-[1.45] text-ink">{displayName(person)}</span>
        {years && <span className="mt-0.5 block truncate text-xs leading-[1.5] text-muted">{years}</span>}
      </span>
      <span
        aria-hidden
        data-status={deceased ? 'deceased' : 'living'}
        className={cn('absolute end-2.5 bottom-2.5 size-2.5 rounded-full ring-2 ring-white', deceased ? 'bg-[#7a847c]' : 'bg-[#3f8f5f]')}
      />
      {person.biography && <BookOpen aria-hidden className="size-3.5 shrink-0 self-start text-gold-700 mt-3" />}
    </div>
  );
}
