import { z } from 'zod';
import { SCHEMA_VERSION, type FamilyTree } from '@/types/family';
import { deathBeforeBirth, isValidPartialDate } from '@/utils/dates';
import { findIntegrityIssues } from '@/features/relationships/validation';
import { nowIso } from '@/utils/id';

/**
 * JSON backup format: a versioned envelope around one or more trees. Everything
 * coming from a file is untrusted, so it is validated structurally (zod) and
 * semantically (integrity checks) before it can reach storage.
 */
export const BACKUP_FORMAT = 'ourlegacy-backup';
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

const shortText = z.string().max(500);
const longText = z.string().max(200_000);
const partialDate = z
  .string()
  .max(10)
  .refine((v) => isValidPartialDate(v), 'invalid date');
const isoString = z.string().max(40);

/** Only inline image data URLs are accepted, so an imported file can never trigger a network request. */
const photo = z
  .string()
  .max(6_000_000)
  .refine((v) => /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v), 'photo must be an inline image');

const nameParts = z
  .object({ firstName: shortText.optional(), middleName: shortText.optional(), lastName: shortText.optional() })
  .optional();

const personSchema = z.object({
  id: z.string().min(1).max(100),
  firstName: shortText.default(''),
  middleName: shortText.optional(),
  lastName: shortText.optional(),
  gender: z.enum(['female', 'male', 'other', 'unknown']).optional(),
  birthDate: partialDate.optional(),
  deathDate: partialDate.optional(),
  isDeceased: z.boolean().optional(),
  names: z.object({ kn: nameParts, en: nameParts }).optional(),
  photo: photo.optional(),
  biography: longText.optional(),
  notes: longText.optional(),
  createdAt: isoString.default(() => nowIso()),
  updatedAt: isoString.default(() => nowIso()),
});

const relationshipSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['parent-child', 'partner']),
  sourceId: z.string().min(1).max(100),
  targetId: z.string().min(1).max(100),
  kind: z.enum(['biological', 'adoptive']).optional(),
});

const treeSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(300),
  schemaVersion: z.number().int().min(1),
  createdAt: isoString.default(() => nowIso()),
  updatedAt: isoString.default(() => nowIso()),
  people: z.array(personSchema).max(50_000),
  relationships: z.array(relationshipSchema).max(200_000),
  layout: z.object({ direction: z.enum(['vertical', 'horizontal']) }).optional(),
});

export interface BackupEnvelope {
  app: 'OurLegacy';
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  trees: FamilyTree[];
}

export function createBackup(trees: FamilyTree[]): BackupEnvelope {
  return { app: 'OurLegacy', format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(), trees };
}

export function serializeBackup(trees: FamilyTree[]): string {
  return JSON.stringify(createBackup(trees), null, 2);
}

export type ImportErrorCode = 'json' | 'format' | 'version' | 'tooLarge';

export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    readonly detail?: string,
  ) {
    super(`Import error: ${code}`);
    this.name = 'ImportError';
  }
}

export interface RejectedTree {
  name: string;
  reason: string;
}

export interface ParsedBackup {
  trees: FamilyTree[];
  rejected: RejectedTree[];
}

/** Bring older schema versions up to the current one. Version 1 is current; this is the seam for future migrations. */
function migrateTree(raw: z.infer<typeof treeSchema>): FamilyTree {
  return { ...raw, schemaVersion: SCHEMA_VERSION } as FamilyTree;
}

function describeIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.length ? issue.path.join('.') : 'tree';
  return `${path}: ${issue.message}`;
}

/**
 * Parse and validate backup text. Accepts the envelope format as well as a bare
 * tree object. Trees that fail validation are reported in `rejected`; the rest
 * can still be imported.
 */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('tooLarge');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('json');
  }
  if (!data || typeof data !== 'object') throw new ImportError('format');
  const obj = data as Record<string, unknown>;

  let rawTrees: unknown[];
  if (Array.isArray(obj.trees)) {
    if (obj.format !== BACKUP_FORMAT && obj.app !== 'OurLegacy') throw new ImportError('format');
    if (typeof obj.schemaVersion === 'number' && obj.schemaVersion > SCHEMA_VERSION) {
      throw new ImportError('version', String(obj.schemaVersion));
    }
    rawTrees = obj.trees;
  } else if (Array.isArray(obj.people) && Array.isArray(obj.relationships)) {
    rawTrees = [obj];
  } else {
    throw new ImportError('format');
  }
  if (rawTrees.length === 0) throw new ImportError('format');

  const trees: FamilyTree[] = [];
  const rejected: RejectedTree[] = [];
  for (const raw of rawTrees) {
    const name = typeof (raw as { name?: unknown })?.name === 'string' ? (raw as { name: string }).name : '?';
    const treeVersion = (raw as { schemaVersion?: unknown })?.schemaVersion;
    if (typeof treeVersion === 'number' && treeVersion > SCHEMA_VERSION) {
      throw new ImportError('version', String(treeVersion));
    }
    const result = treeSchema.safeParse(raw);
    if (!result.success) {
      rejected.push({ name, reason: describeIssue(result.error.issues[0]) });
      continue;
    }
    const tree = migrateTree(result.data);
    const issues = findIntegrityIssues(tree);
    if (issues.length) {
      rejected.push({ name: tree.name, reason: `${issues[0].code} (${issues[0].detail})` });
      continue;
    }
    // Keep going if a death date precedes a birth date; surface it later rather than reject real family data.
    tree.people.forEach((p) => void deathBeforeBirth(p.birthDate, p.deathDate));
    trees.push(tree);
  }
  if (trees.length === 0 && rejected.length === 0) throw new ImportError('format');
  return { trees, rejected };
}
