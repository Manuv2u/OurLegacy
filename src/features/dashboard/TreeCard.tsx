import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Download, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import type { FamilyTree } from '@/types/family';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StaticTree } from '@/features/family-tree/StaticTree';
import { DEFAULT_CARD, layoutTree } from '@/features/family-tree/layout';
import { useI18n } from '@/i18n/useI18n';

interface Props {
  tree: FamilyTree;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function TreeCard({ tree, onRename, onDuplicate, onDelete, onExport }: Props) {
  const { t, formatDateTime } = useI18n();
  const layout = useMemo(
    () => layoutTree(tree, { direction: tree.layout?.direction ?? 'vertical', cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height }),
    [tree],
  );
  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-pop" data-testid="tree-card" data-tree-name={tree.name}>
      <Link to={`/app/tree/${tree.id}`} className="block rounded-t-2xl bg-[radial-gradient(circle,#dfe5dc_1.2px,transparent_1.2px)] bg-ivory [background-size:20px_20px]" aria-label={`${t('dash.tree.open')}: ${tree.name}`} tabIndex={-1}>
        <div className="flex h-36 items-center justify-center p-4">
          {tree.people.length ? (
            <div className="h-full w-full">
              <StaticTree tree={tree} layout={layout} padding={20} variant="mini" />
            </div>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted">
              <Users className="size-4" aria-hidden /> {t('dash.tree.empty')}
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start gap-2">
          <h3 className="serif min-w-0 flex-1 truncate text-lg font-semibold" title={tree.name}>
            {tree.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('dash.tree.actions', { name: tree.name })} data-testid="tree-actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onRename} data-testid="action-rename">
                <Pencil /> {t('dash.tree.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate} data-testid="action-duplicate">
                <Copy /> {t('dash.tree.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onExport} data-testid="action-export">
                <Download /> {t('dash.tree.exportBackup')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={onDelete} data-testid="action-delete">
                <Trash2 /> {t('dash.tree.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-muted">
          {t('dash.tree.people', { count: tree.people.length })} · {t('dash.tree.modified', { date: formatDateTime(tree.updatedAt) })}
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-3 self-start">
          <Link to={`/app/tree/${tree.id}`} data-testid="open-tree">
            {t('dash.tree.open')}
          </Link>
        </Button>
      </div>
    </article>
  );
}
