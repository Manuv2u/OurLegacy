import type { FamilyTree } from '@/types/family';
import { getDb } from './db';
import { toStorageError } from './errors';

/**
 * The only door between the UI and tree persistence. Today it is backed by
 * IndexedDB; a future version can provide a cloud-backed implementation of the
 * same interface without touching UI code.
 */
export interface TreeRepository {
  list(): Promise<FamilyTree[]>;
  get(id: string): Promise<FamilyTree | undefined>;
  save(tree: FamilyTree): Promise<void>;
  saveMany(trees: FamilyTree[]): Promise<void>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
  count(): Promise<number>;
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toStorageError(e);
  }
}

export class DexieTreeRepository implements TreeRepository {
  list() {
    return guard(async () => (await getDb().trees.orderBy('updatedAt').reverse().toArray()) as FamilyTree[]);
  }
  get(id: string) {
    return guard(() => getDb().trees.get(id));
  }
  save(tree: FamilyTree) {
    return guard(async () => {
      await getDb().trees.put(tree);
    });
  }
  saveMany(trees: FamilyTree[]) {
    return guard(async () => {
      const db = getDb();
      await db.transaction('rw', db.trees, async () => {
        await db.trees.bulkPut(trees);
      });
    });
  }
  remove(id: string) {
    return guard(async () => {
      await getDb().trees.delete(id);
    });
  }
  clearAll() {
    return guard(async () => {
      const db = getDb();
      await db.transaction('rw', db.trees, db.meta, async () => {
        await db.trees.clear();
        await db.meta.clear();
      });
    });
  }
  count() {
    return guard(() => getDb().trees.count());
  }
}

export const treeRepository: TreeRepository = new DexieTreeRepository();
