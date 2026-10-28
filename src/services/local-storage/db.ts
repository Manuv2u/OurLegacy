import Dexie, { type EntityTable } from 'dexie';
import type { FamilyTree } from '@/types/family';

export interface MetaRecord {
  key: string;
  value: unknown;
}

export class OurLegacyDB extends Dexie {
  trees!: EntityTable<FamilyTree, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor(name = 'ourlegacy') {
    super(name);
    this.version(1).stores({
      trees: 'id, updatedAt',
      meta: 'key',
    });
  }
}

export const DB_NAME = 'ourlegacy';
let instance: OurLegacyDB | null = null;

export function getDb(): OurLegacyDB {
  if (!instance) instance = new OurLegacyDB(DB_NAME);
  return instance;
}

/** Test hook: drop the cached connection so a fresh database can be opened. */
export function resetDbForTests(): void {
  instance?.close();
  instance = null;
}
