import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Background, BackgroundVariant, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { useI18n } from '@/i18n/useI18n';
import { DEFAULT_CARD, layoutTree } from './layout';
import { PersonNode, type PersonNodeType } from './PersonNode';
import { RelationEdge, type RelationEdgeType } from './RelationEdge';
import { CanvasHighlightContext } from './canvasContext';
import { branchOf, buildIndex } from '@/features/relationships/graph';
import { navigate, type NavDirection } from './keyboardNav';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { kinContext, kinOf, sexOf } from '@/features/relationships/kinship';
import { kinLabel } from '@/features/relationships/kinshipLabels';

const nodeTypes = { person: PersonNode };
const edgeTypes = { relation: RelationEdge };

const ARROWS: Record<string, NavDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function Canvas() {
  const { t, locale } = useI18n();
  const rf = useReactFlow();
  const tree = useEditorStore((s) => s.tree)!;
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const view = useEditorStore((s) => s.view);
  const focusBranch = useUiStore((s) => s.focusBranch);
  const highlighted = useUiStore((s) => s.highlighted);
  const showKinship = useUiStore((s) => s.showKinship);
  const setUi = useUiStore((s) => s.set);
  const isDesktop = useIsDesktop();
  const direction = tree.layout?.direction ?? 'vertical';
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(
    () => layoutTree(tree, { direction, cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height }),
    // Layout depends only on structure + direction, not on names or biographies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree.people.map((p) => `${p.id}:${p.birthDate ?? ''}`).join('|'), tree.relationships, direction],
  );
  const index = useMemo(() => buildIndex(tree), [tree]);

  const nodes = useMemo<Node[]>(
    () =>
      tree.people.map<PersonNodeType>((person) => ({
        id: person.id,
        type: 'person',
        position: layout.positions.get(person.id) ?? { x: 0, y: 0 },
        data: { person },
        width: DEFAULT_CARD.width,
        height: DEFAULT_CARD.height,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
      })),
    [tree.people, layout],
  );
  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map<RelationEdgeType>((e) => ({
        id: e.id,
        type: 'relation',
        source: e.personIds[0],
        target: e.personIds[1] ?? e.personIds[0],
        data: { edge: e },
        selectable: false,
        focusable: false,
        zIndex: 0,
      })),
    [layout],
  );

  const dimmed = useMemo(() => {
    if (!focusBranch || !selectedId || !index.people.has(selectedId)) return new Set<string>();
    const keep = new Set([...branchOf(index, selectedId, 'descendants'), ...branchOf(index, selectedId, 'ancestors')]);
    return new Set(tree.people.filter((p) => !keep.has(p.id)).map((p) => p.id));
  }, [focusBranch, selectedId, index, tree.people]);

  // "Who is everyone to the selected person?" — father, grandmother, son… from the parent links and gender.
  const kin = useMemo(() => {
    const labels = new Map<string, string>();
    if (!showKinship) return labels;
    // Partner roles (Husband / Wife) are always shown, whatever is selected, once gender is known.
    for (const p of tree.people) {
      if ((p.gender === 'male' || p.gender === 'female') && (index.partners.get(p.id)?.length ?? 0) > 0) labels.set(p.id, kinLabel({ rel: 'partner', sex: sexOf(p.gender) }, locale));
    }
    if (!selectedId || !index.people.has(selectedId)) return labels;
    const ctx = kinContext(index, selectedId);
    for (const p of tree.people) {
      const k = kinOf(ctx, p.id);
      if (k) labels.set(p.id, kinLabel(k, locale));
    }
    return labels;
  }, [showKinship, selectedId, index, tree.people, locale]);

  const highlightCtx = useMemo(
    () => ({ selectedId, dimmed, highlighted: new Set(highlighted), kin }),
    [selectedId, dimmed, highlighted, kin],
  );

  // Execute view commands issued from toolbars/sidebars.
  const lastNonce = useRef<number>(-1);
  useEffect(() => {
    if (!view || view.nonce === lastNonce.current) return;
    lastNonce.current = view.nonce;
    // Wait a frame so freshly added nodes are in the store before we measure.
    const id = requestAnimationFrame(() => {
      switch (view.kind) {
        case 'fit':
          void rf.fitView({ padding: 0.18, duration: 350, maxZoom: 1.25 });
          break;
        case 'zoomIn':
          void rf.zoomIn({ duration: 180 });
          break;
        case 'zoomOut':
          void rf.zoomOut({ duration: 180 });
          break;
        case 'focus': {
          const ids = view.ids.filter((i) => layout.positions.has(i));
          if (!ids.length) break;
          if (ids.length === 1) {
            const p = layout.positions.get(ids[0])!;
            const zoom = Math.min(Math.max(rf.getZoom(), 0.75), 1.1);
            void rf.setCenter(p.x + DEFAULT_CARD.width / 2, p.y + DEFAULT_CARD.height / 2, { zoom, duration: 400 });
          } else {
            void rf.fitView({ nodes: ids.map((i) => ({ id: i })), padding: 0.3, maxZoom: 1.1, duration: 450 });
          }
          break;
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [view, rf, layout]);

  // Re-fit when the layout direction flips.
  const prevDirection = useRef(direction);
  useEffect(() => {
    if (prevDirection.current !== direction) {
      prevDirection.current = direction;
      const id = requestAnimationFrame(() => void rf.fitView({ padding: 0.18, duration: 400, maxZoom: 1.25 }));
      return () => cancelAnimationFrame(id);
    }
  }, [direction, rf]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      select(node.id);
      setUi({ profileOpen: true, highlighted: [] });
    },
    [select, setUi],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const dir = ARROWS[e.key];
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-person-id]');
      if (!dir || !el) return;
      const from = el.dataset.personId!;
      const next = navigate(layout, index, from, dir);
      if (!next) return;
      e.preventDefault();
      select(next);
      const target = containerRef.current?.querySelector<HTMLElement>(`[data-person-id="${CSS.escape(next)}"]`);
      target?.focus({ preventScroll: true });
      const p = layout.positions.get(next)!;
      const vp = rf.getViewport();
      const box = containerRef.current?.getBoundingClientRect();
      if (box) {
        const sx = (p.x + DEFAULT_CARD.width / 2) * vp.zoom + vp.x;
        const sy = (p.y + DEFAULT_CARD.height / 2) * vp.zoom + vp.y;
        if (sx < 60 || sy < 60 || sx > box.width - 60 || sy > box.height - 60) {
          void rf.setCenter(p.x + DEFAULT_CARD.width / 2, p.y + DEFAULT_CARD.height / 2, { zoom: vp.zoom, duration: 250 });
        }
      }
    },
    [layout, index, select, rf],
  );

  return (
    <CanvasHighlightContext.Provider value={highlightCtx}>
      <div ref={containerRef} className="size-full" onKeyDown={onKeyDown} role="application" aria-label={t('canvas.label')} aria-describedby="canvas-kbd-hint" data-testid="tree-canvas">
        <p id="canvas-kbd-hint" className="sr-only">
          {t('canvas.kbdHint')}
        </p>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => select(null)}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1.25 }}
          minZoom={0.08}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          proOptions={{ hideAttribution: true }}
          aria-label={t('canvas.label')}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1.6} color="#d9dfd5" />
          {isDesktop && tree.people.length > 6 && <MiniMap pannable zoomable nodeColor="#cfdfd3" maskColor="rgb(248 248 245 / 0.7)" nodeStrokeWidth={0} ariaLabel={t('canvas.label')} />}
        </ReactFlow>
      </div>
    </CanvasHighlightContext.Provider>
  );
}

export function TreeCanvas() {
  const treeId = useEditorStore((s) => s.tree?.id);
  return (
    <ReactFlowProvider key={treeId}>
      <Canvas />
    </ReactFlowProvider>
  );
}
