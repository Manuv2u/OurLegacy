/**
 * Typed, versioned family data model. Intentionally free of any rendering or
 * storage library so it can be persisted, exported and (later) synced as-is.
 */
export const SCHEMA_VERSION = 1;

export type Gender = 'female' | 'male' | 'other' | 'unknown';
export type RelationshipType = 'parent-child' | 'partner';
export type ParentKind = 'biological' | 'adoptive';
export type LayoutDirection = 'vertical' | 'horizontal';

/** Dates are stored as partial ISO strings: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
export type PartialDate = string;

/** First / middle / last name parts, used for per-language spellings. */
export interface NameParts {
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

export interface Person {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: Gender;
  birthDate?: PartialDate;
  deathDate?: PartialDate;
  /** Marks someone as deceased even when no death date is known. A death date also implies deceased. */
  isDeceased?: boolean;
  /**
   * Optional spellings of the name in other languages. When a language has no entry the name is transliterated
   * automatically for display, so the stored `firstName`/`lastName` stay exactly as the user typed them.
   */
  names?: { kn?: NameParts; en?: NameParts };
  /** Downscaled JPEG data URL stored inline with the person. */
  photo?: string;
  biography?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * For `parent-child`, `sourceId` is the parent and `targetId` the child.
 * For `partner`, the order carries no meaning.
 */
export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  /** Only meaningful for `parent-child`. Defaults to `biological`. */
  kind?: ParentKind;
}

export interface TreeLayoutMeta {
  direction: LayoutDirection;
}

export interface FamilyTree {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  relationships: Relationship[];
  layout?: TreeLayoutMeta;
}

export type NameOrder = 'given-first' | 'family-first';
