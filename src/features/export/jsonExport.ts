import type { FamilyTree } from '@/types/family';
import { downloadBlob, safeFilename } from '@/lib/download';
import { serializeBackup } from '@/lib/backup';
import { useSettingsStore } from '@/stores/settingsStore';
import { treeRepository } from '@/services/local-storage/treeRepository';

export async function exportJson(tree: FamilyTree, all: boolean) {
  const trees = all ? await treeRepository.list() : [tree];
  // Prefer the in-memory (possibly unsaved) version of the open tree.
  const merged = all ? trees.map((t) => (t.id === tree.id ? tree : t)) : trees;
  if (all && !merged.some((t) => t.id === tree.id)) merged.unshift(tree);
  const blob = new Blob([serializeBackup(merged)], { type: 'application/json' });
  downloadBlob(blob, safeFilename(all ? 'ourlegacy-backup' : `${tree.name}.ourlegacy`, 'json'));
  useSettingsStore.getState().update({ lastBackupAt: new Date().toISOString() });
  return { trees: merged.length, bytes: blob.size };
}

export async function exportAllTreesJson() {
  const trees = await treeRepository.list();
  const blob = new Blob([serializeBackup(trees)], { type: 'application/json' });
  downloadBlob(blob, safeFilename('ourlegacy-backup', 'json'));
  useSettingsStore.getState().update({ lastBackupAt: new Date().toISOString() });
  return trees.length;
}

export async function exportTreeJsonById(id: string) {
  const tree = await treeRepository.get(id);
  if (!tree) return false;
  const blob = new Blob([serializeBackup([tree])], { type: 'application/json' });
  downloadBlob(blob, safeFilename(`${tree.name}.ourlegacy`, 'json'));
  useSettingsStore.getState().update({ lastBackupAt: new Date().toISOString() });
  return true;
}
