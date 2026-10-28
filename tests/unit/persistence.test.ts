import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DexieTreeRepository } from '@/services/local-storage/treeRepository';
import { getDb, resetDbForTests } from '@/services/local-storage/db';
import { startAutosave } from '@/services/local-storage/autosave';
import { useEditorStore } from '@/stores/editorStore';
import { createSampleTree } from '@/features/family-tree/sampleTree';
import { createEmptyTree, duplicateTree } from '@/lib/trees';
import { addPerson, createPerson, updatePerson } from '@/features/relationships/operations';
import { toStorageError } from '@/services/local-storage/errors';

const repo = new DexieTreeRepository();

beforeEach(async () => {
  resetDbForTests();
  await getDb().delete();
  resetDbForTests();
  useEditorStore.getState().unload();
});

describe('DexieTreeRepository', () => {
  it('saves, lists (newest first), reads back and deletes trees', async () => {
    const a = { ...createEmptyTree('A', 'vertical'), updatedAt: '2020-01-01T00:00:00.000Z' };
    const b = { ...createSampleTree(), updatedAt: '2021-01-01T00:00:00.000Z' };
    await repo.save(a);
    await repo.save(b);
    expect((await repo.list()).map((t) => t.id)).toEqual([b.id, a.id]);
    expect(await repo.get(b.id)).toEqual(b);
    expect(await repo.count()).toBe(2);
    await repo.remove(a.id);
    expect(await repo.get(a.id)).toBeUndefined();
  });

  it('persists across a closed connection (simulated reload)', async () => {
    const t = createSampleTree();
    await repo.save(t);
    resetDbForTests();
    expect(await repo.get(t.id)).toEqual(t);
  });

  it('save replaces an existing tree and clearAll wipes everything', async () => {
    const t = createEmptyTree('A', 'vertical');
    await repo.save(t);
    await repo.save({ ...t, name: 'B' });
    expect((await repo.get(t.id))?.name).toBe('B');
    expect(await repo.count()).toBe(1);
    await repo.clearAll();
    expect(await repo.count()).toBe(0);
  });

  it('duplicates with a new id and keeps data', () => {
    const t = createSampleTree();
    const d = duplicateTree(t, 'Copy');
    expect(d.id).not.toBe(t.id);
    expect(d.people).toEqual(t.people);
    expect(d.people).not.toBe(t.people);
  });

  it('maps storage failures to typed errors', () => {
    expect(toStorageError({ name: 'QuotaExceededError' }).code).toBe('quota');
    expect(toStorageError({ name: 'DatabaseClosedError' }).code).toBe('unavailable');
    expect(toStorageError(new Error('x')).code).toBe('unknown');
  });
});

describe('autosave', () => {
  it('debounces writes, reports truthful status and persists the latest state', async () => {
    const tree = createEmptyTree('T', 'vertical');
    await repo.save(tree);
    const store = useEditorStore.getState();
    store.load(tree);
    const save = vi.spyOn(repo, 'save');
    const auto = startAutosave(repo, 20);

    useEditorStore.getState().commit((t) => addPerson(t, createPerson({ firstName: 'One' })));
    expect(useEditorStore.getState().saveStatus).toBe('saving');
    useEditorStore.getState().commit((t) => addPerson(t, createPerson({ firstName: 'Two' })));
    await auto.flush();
    expect(useEditorStore.getState().saveStatus).toBe('saved');
    expect(save).toHaveBeenCalledTimes(1);
    expect((await repo.get(tree.id))?.people.map((p) => p.firstName)).toEqual(['One', 'Two']);
    auto.stop();
    save.mockRestore();
  });

  it('reports failure, keeps the change pending and recovers on retry', async () => {
    const tree = createEmptyTree('T', 'vertical');
    useEditorStore.getState().load(tree);
    const auto = startAutosave(repo, 10);
    const save = vi.spyOn(repo, 'save').mockRejectedValueOnce(toStorageError({ name: 'QuotaExceededError' }));

    useEditorStore.getState().commit((t) => addPerson(t, createPerson({ firstName: 'X' })));
    await auto.flush();
    expect(useEditorStore.getState().saveStatus).toBe('failed');
    expect(useEditorStore.getState().saveError).toBe('quota');
    expect(useEditorStore.getState().tree?.people).toHaveLength(1); // nothing silently discarded

    save.mockRestore();
    await auto.flush();
    expect(useEditorStore.getState().saveStatus).toBe('saved');
    expect((await repo.get(tree.id))?.people).toHaveLength(1);
    auto.stop();
  });

  it('never writes sample trees', async () => {
    const sample = createSampleTree();
    useEditorStore.getState().load(sample, { sample: true });
    const auto = startAutosave(repo, 5);
    useEditorStore.getState().commit((t) => updatePerson(t, t.people[0].id, { firstName: 'Changed' }));
    await auto.flush();
    expect(await repo.count()).toBe(0);
    expect(useEditorStore.getState().saveStatus).toBe('idle');
    auto.stop();
  });
});

describe('undo / redo history', () => {
  const setup = () => {
    useEditorStore.getState().load(createEmptyTree('T', 'vertical'));
    return useEditorStore.getState();
  };

  it('undoes and redoes add, edit and delete steps', () => {
    const s = setup();
    const p = createPerson({ firstName: 'A' });
    s.commit((t) => addPerson(t, p));
    s.commit((t) => updatePerson(t, p.id, { firstName: 'B' }));
    expect(useEditorStore.getState().tree!.people[0].firstName).toBe('B');
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().tree!.people[0].firstName).toBe('A');
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().tree!.people).toHaveLength(0);
    useEditorStore.getState().redo();
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().tree!.people[0].firstName).toBe('B');
    expect(useEditorStore.getState().future).toHaveLength(0);
  });

  it('a new change clears the redo stack', () => {
    const s = setup();
    s.commit((t) => addPerson(t, createPerson({ firstName: 'A' })));
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().future).toHaveLength(1);
    useEditorStore.getState().commit((t) => addPerson(t, createPerson({ firstName: 'B' })));
    expect(useEditorStore.getState().future).toHaveLength(0);
  });

  it('coalesces rapid edits with the same key into one history entry', () => {
    const s = setup();
    const p = createPerson({ firstName: 'A' });
    s.commit((t) => addPerson(t, p));
    for (const bio of ['h', 'he', 'hel', 'hell', 'hello']) {
      useEditorStore.getState().commit((t) => updatePerson(t, p.id, { biography: bio }), { coalesceKey: `bio:${p.id}` });
    }
    expect(useEditorStore.getState().past).toHaveLength(2);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().tree!.people[0].biography).toBeUndefined();
  });

  it('is a no-op when the updater returns the same tree', () => {
    const s = setup();
    expect(s.commit((t) => t)).toBe(false);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });

  it('clears the selection when the selected person disappears', () => {
    const s = setup();
    const p = createPerson({ firstName: 'A' });
    s.commit((t) => addPerson(t, p));
    useEditorStore.getState().select(p.id);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().selectedId).toBeNull();
  });
});
