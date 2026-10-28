import { createContext, useContext } from 'react';

export interface CanvasHighlight {
  selectedId: string | null;
  /** People that should be visually de-emphasised (outside the highlighted branch). */
  dimmed: ReadonlySet<string>;
  /** People temporarily highlighted, e.g. a generation jump. */
  highlighted: ReadonlySet<string>;
  /** Relationship of every person to the selected one ("Father", "Grandmother"…), already localised. */
  kin: ReadonlyMap<string, string>;
}

export const CanvasHighlightContext = createContext<CanvasHighlight>({ selectedId: null, dimmed: new Set(), highlighted: new Set(), kin: new Map() });
export const useCanvasHighlight = () => useContext(CanvasHighlightContext);
