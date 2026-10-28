import { Baby, ChevronsLeft, ChevronsRight, Download, GitBranch, Heart, Link2, Maximize, MoveHorizontal, MoveVertical, Plus, ShieldCheck, Upload, UserPlus, Users, ZoomIn, ZoomOut, Crosshair, ArrowUpToLine, ArrowDownToLine, Rows3, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/useI18n';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { useEditorActions, type Generation } from './useEditorActions';

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  collapsed?: boolean;
  active?: boolean;
  title?: string;
  testId?: string;
}

function SideItem({ icon, label, onClick, disabled, collapsed, active, title, testId }: ItemProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={collapsed ? label : undefined}
      aria-pressed={active}
      title={disabled ? title : undefined}
      data-testid={testId}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
        collapsed ? 'size-10 justify-center' : 'h-9 px-2.5',
        active ? 'bg-sage text-forest-800' : 'text-ink hover:bg-sage/70',
      )}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
  return collapsed ? (
    <Tip label={label} side="right">
      {button}
    </Tip>
  ) : (
    button
  );
}

function SectionTitle({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="mx-auto my-1.5 h-px w-6 bg-line" />;
  return <h3 className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">{children}</h3>;
}

/** Desktop/tablet left sidebar. Collapses to an icon rail. */
export function EditorSidebar({ forceCollapsed, sheet }: { forceCollapsed?: boolean; sheet?: boolean }) {
  const { t } = useI18n();
  const userCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const collapsed = sheet ? false : (forceCollapsed ?? userCollapsed);
  const set = useUiStore((s) => s.set);
  const openDialog = useUiStore((s) => s.openDialog);
  const focusBranch = useUiStore((s) => s.focusBranch);
  const showKinship = useUiStore((s) => s.showKinship);
  const direction = useEditorStore((s) => s.tree?.layout?.direction ?? 'vertical');
  const hasPeople = useEditorStore((s) => (s.tree?.people.length ?? 0) > 0);
  const a = useEditorActions();
  const needs = !a.hasSelection;
  const hint = t('side.selectHint');

  const gens: { id: Generation; label: string; icon: React.ReactNode }[] = [
    { id: 'grandparents', label: t('side.gen.grandparents'), icon: <ArrowUpToLine /> },
    { id: 'parents', label: t('side.gen.parents'), icon: <Users /> },
    { id: 'current', label: t('side.gen.current'), icon: <Rows3 /> },
    { id: 'children', label: t('side.gen.children'), icon: <Baby /> },
    { id: 'grandchildren', label: t('side.gen.grandchildren'), icon: <ArrowDownToLine /> },
  ];

  return (
    <nav
      aria-label={t('side.actions')}
      data-testid="editor-sidebar"
      className={cn('flex shrink-0 flex-col overflow-y-auto p-2', sheet ? 'w-full' : 'border-e border-line bg-white/80 transition-[width] duration-200', !sheet && (collapsed ? 'w-14 items-center' : 'w-60'))}
    >
      {!hasPeople ? (
        <SideItem collapsed={collapsed} icon={<Plus />} label={t('side.addFirst')} onClick={a.addFirst} testId="side-add-first" />
      ) : (
        <>
          <SectionTitle collapsed={collapsed}>{t('side.add')}</SectionTitle>
          <SideItem collapsed={collapsed} icon={<UserPlus />} label={t('side.addParent')} onClick={() => a.addRelative('parent')} disabled={needs} title={hint} testId="side-add-parent" />
          <SideItem collapsed={collapsed} icon={<Heart />} label={t('side.addPartner')} onClick={() => a.addRelative('partner')} disabled={needs} title={hint} testId="side-add-partner" />
          <SideItem collapsed={collapsed} icon={<Baby />} label={t('side.addChild')} onClick={() => a.addRelative('child')} disabled={needs} title={hint} testId="side-add-child" />
          <SideItem collapsed={collapsed} icon={<Users />} label={t('side.addSibling')} onClick={() => a.addRelative('sibling')} disabled={needs || !a.canAddSibling} title={needs ? hint : t('side.noParentsForSibling')} testId="side-add-sibling" />
          <SideItem collapsed={collapsed} icon={<Link2 />} label={t('side.addRelative')} onClick={a.linkExisting} disabled={needs} title={hint} testId="side-link-existing" />
        </>
      )}

      <SectionTitle collapsed={collapsed}>{t('side.layout')}</SectionTitle>
      <SideItem collapsed={collapsed} icon={<MoveVertical />} label={t('side.layout.vertical')} onClick={() => a.setDirection('vertical')} active={direction === 'vertical'} testId="layout-vertical" />
      <SideItem collapsed={collapsed} icon={<MoveHorizontal />} label={t('side.layout.horizontal')} onClick={() => a.setDirection('horizontal')} active={direction === 'horizontal'} testId="layout-horizontal" />

      <SectionTitle collapsed={collapsed}>{t('side.view')}</SectionTitle>
      <SideItem collapsed={collapsed} icon={<ZoomIn />} label={t('side.zoomIn')} onClick={a.zoomIn} testId="zoom-in" />
      <SideItem collapsed={collapsed} icon={<ZoomOut />} label={t('side.zoomOut')} onClick={a.zoomOut} testId="zoom-out" />
      <SideItem collapsed={collapsed} icon={<Maximize />} label={t('side.fit')} onClick={a.fit} testId="fit-view" />
      <SideItem collapsed={collapsed} icon={<Crosshair />} label={t('side.center')} onClick={a.centerSelected} disabled={needs} title={hint} />
      <SideItem collapsed={collapsed} icon={<GitBranch />} label={focusBranch ? t('side.focusBranch.off') : t('side.focusBranch')} onClick={() => set({ focusBranch: !focusBranch })} active={focusBranch} disabled={needs && !focusBranch} title={hint} testId="focus-branch" />

      <SideItem collapsed={collapsed} icon={<Tags />} label={t('side.showKinship')} onClick={() => set({ showKinship: !showKinship })} active={showKinship} testId="toggle-kinship" />

      <SectionTitle collapsed={collapsed}>{t('side.generations')}</SectionTitle>
      <div role="group" aria-label={t('a11y.generationShortcuts')} className="contents">
        {gens.map((g) => (
          <SideItem key={g.id} collapsed={collapsed} icon={g.icon} label={g.label} onClick={() => a.goToGeneration(g.id)} disabled={needs} title={t('side.gen.needsSelection')} testId={`gen-${g.id}`} />
        ))}
      </div>

      <SectionTitle collapsed={collapsed}>{t('side.data')}</SectionTitle>
      <SideItem collapsed={collapsed} icon={<Download />} label={t('side.exportJson')} onClick={() => void a.exportTreeJson()} testId="side-export-json" />
      <SideItem collapsed={collapsed} icon={<Upload />} label={t('side.importJson')} onClick={() => openDialog({ kind: 'import' })} testId="side-import-json" />

      <div className="mt-auto pt-4">
        {!collapsed && (
          <p className="mb-2 flex items-start gap-2 rounded-xl bg-sage/60 px-2.5 py-2 text-[11px] leading-snug text-forest-800" data-testid="privacy-notice">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{t('notice.privacy')}</span>
          </p>
        )}
        {forceCollapsed === undefined && !sheet && (
          <Button variant="ghost" size={collapsed ? 'icon' : 'sm'} className={cn(!collapsed && 'w-full justify-start')} onClick={() => set({ sidebarCollapsed: !userCollapsed })} aria-label={collapsed ? t('side.expand') : t('side.collapse')}>
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            {!collapsed && t('side.collapse')}
          </Button>
        )}
      </div>
    </nav>
  );
}
