import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Baby, Heart, UserPlus, Users } from 'lucide-react';
import type { Person } from '@/types/family';
import { PersonCardView } from './PersonCardView';
import { useCanvasHighlight } from './canvasContext';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import type { RelativeKind } from '@/features/relationships/operations';
import type { MessageKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { isDeceased } from '@/utils/status';

export type PersonNodeType = Node<{ person: Person }, 'person'>;

const QUICK: Record<RelativeKind, { icon: typeof Heart; label: MessageKey; key: string }> = {
  parent: { icon: UserPlus, label: 'side.addParent', key: 'P' },
  child: { icon: Baby, label: 'side.addChild', key: 'C' },
  partner: { icon: Heart, label: 'side.addPartner', key: 'M' },
  sibling: { icon: Users, label: 'side.addSibling', key: 'S' },
};

/** Small "+" buttons around the selected card so relatives can be added without leaving the canvas. */
function QuickAdd({ personId }: { personId: string }) {
  const { t } = useI18n();
  const openDialog = useUiStore((s) => s.openDialog);
  const horizontal = useEditorStore((s) => s.tree?.layout?.direction === 'horizontal');
  const hasParents = useEditorStore((s) => !!s.tree?.relationships.some((r) => r.type === 'parent-child' && r.targetId === personId));
  const bioParents = useEditorStore((s) => s.tree?.relationships.filter((r) => r.type === 'parent-child' && r.targetId === personId).length ?? 0);
  const hasPartner = useEditorStore((s) => !!s.tree?.relationships.some((r) => r.type === 'partner' && (r.sourceId === personId || r.targetId === personId)));

  // Where each button sits depends on the layout direction (parents above vs. to the left, and so on).
  const spots: Record<RelativeKind, string> = horizontal
    ? { parent: '-start-4 top-1/2 -translate-y-1/2 -translate-x-1/2', child: '-end-4 top-1/2 -translate-y-1/2 translate-x-1/2', partner: 'start-1/2 -bottom-4 -translate-x-1/2 translate-y-1/2', sibling: 'start-1/2 -top-4 -translate-x-1/2 -translate-y-1/2' }
    : { parent: 'start-1/2 -top-4 -translate-x-1/2 -translate-y-1/2', child: 'start-1/2 -bottom-4 -translate-x-1/2 translate-y-1/2', partner: '-end-4 top-1/2 -translate-y-1/2 translate-x-1/2', sibling: '-start-4 top-1/2 -translate-y-1/2 -translate-x-1/2' };

  const shown: RelativeKind[] = ['parent', 'child'];
  if (!hasPartner) shown.push('partner');
  if (hasParents) shown.push('sibling');

  return (
    <>
      {shown.map((kind) => {
        if (kind === 'parent' && bioParents >= 2) return null;
        const { icon: Icon, label, key } = QUICK[kind];
        const text = `${t(label)} (${key})`;
        return (
          <button
            key={kind}
            type="button"
            title={text}
            aria-label={t(label)}
            data-testid={`quick-add-${kind}`}
            onClick={(e) => {
              e.stopPropagation();
              openDialog({ kind: 'person', mode: 'add', relation: kind, anchorId: personId });
            }}
            className={cn('nodrag nopan absolute z-10 flex size-7 items-center justify-center rounded-full border border-forest/30 bg-white text-forest shadow-card transition-colors hover:bg-forest hover:text-white focus-visible:outline-2 focus-visible:outline-forest', spots[kind])}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </>
  );
}

function PersonNodeImpl({ data }: NodeProps<PersonNodeType>) {
  const { person } = data;
  const { selectedId, dimmed, highlighted, kin } = useCanvasHighlight();
  const { t, displayName, lifespan } = useI18n();
  const years = lifespan(person);
  const selected = selectedId === person.id;
  const relation = kin.get(person.id);
  return (
    <div className="relative">
      <button
        type="button"
        data-person-id={person.id}
        data-testid="person-card"
        aria-pressed={selected}
        aria-label={t('canvas.card.label', { name: displayName(person), years: `${years ? `, ${years}` : ''}${isDeceased(person) && !years.includes(t('person.status.deceased')) ? `, ${t('person.status.deceased')}` : ''}` })}
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        {/* React Flow only draws an edge between nodes that expose handles; ours route their own paths, so these are invisible anchors. */}
        <Handle type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
        <PersonCardView person={person} selected={selected} dimmed={dimmed.has(person.id)} highlighted={highlighted.has(person.id)} />
        <Handle type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0, pointerEvents: 'none' }} />
      </button>
      {relation && (
        <span
          data-testid="kin-label"
          className={cn('pointer-events-none absolute -top-2.5 start-4 z-10 max-w-[calc(100%-2rem)] truncate rounded-full bg-sage-300 px-2.5 py-0.5 text-[11px] font-semibold leading-[1.5] text-forest-800 shadow-card', dimmed.has(person.id) && 'opacity-35')}
        >
          {relation}
        </span>
      )}
      {selected && <QuickAdd personId={person.id} />}
    </div>
  );
}

export const PersonNode = memo(PersonNodeImpl);
