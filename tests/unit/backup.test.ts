import { describe, expect, it } from 'vitest';
import { ImportError, parseBackup, serializeBackup } from '@/lib/backup';
import { createSampleTree } from '@/features/family-tree/sampleTree';
import { updatePerson } from '@/features/relationships/operations';

describe('JSON backup', () => {
  it('round-trips a tree exactly (export → import)', () => {
    const tree = createSampleTree();
    const parsed = parseBackup(serializeBackup([tree]));
    expect(parsed.rejected).toEqual([]);
    expect(parsed.trees).toEqual([tree]);
  });

  it('round-trips stories, photos and Kannada text', () => {
    let tree = createSampleTree();
    const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    tree = updatePerson(tree, tree.people[0].id, { firstName: 'ಸುರೇಶ್', biography: 'ಕಥೆ\nline two', photo });
    const back = parseBackup(serializeBackup([tree])).trees[0];
    expect(back.people[0]).toMatchObject({ firstName: 'ಸುರೇಶ್', biography: 'ಕಥೆ\nline two', photo });
  });

  it('accepts several trees and a bare tree object', () => {
    expect(parseBackup(serializeBackup([createSampleTree(), createSampleTree()])).trees).toHaveLength(2);
    expect(parseBackup(JSON.stringify(createSampleTree())).trees).toHaveLength(1);
  });

  it('rejects invalid JSON, wrong shapes and newer schema versions', () => {
    const code = (text: string) => {
      try {
        parseBackup(text);
      } catch (e) {
        return (e as ImportError).code;
      }
      return null;
    };
    expect(code('{nope')).toBe('json');
    expect(code('42')).toBe('format');
    expect(code('{"hello":"world"}')).toBe('format');
    expect(code('{"trees":[]}')).toBe('format');
    expect(code(JSON.stringify({ app: 'OurLegacy', format: 'ourlegacy-backup', schemaVersion: 999, trees: [createSampleTree()] }))).toBe('version');
  });

  it('rejects trees with broken relationships but imports the valid ones', () => {
    const good = createSampleTree();
    const bad = createSampleTree();
    bad.relationships.push({ id: 'x', type: 'partner', sourceId: bad.people[0].id, targetId: 'ghost' });
    const parsed = parseBackup(serializeBackup([good, bad]));
    expect(parsed.trees).toHaveLength(1);
    expect(parsed.rejected).toHaveLength(1);
    expect(parsed.rejected[0].reason).toContain('missingPerson');
  });

  it('rejects trees with parent-child cycles', () => {
    const t = createSampleTree();
    const [a, b] = t.people;
    t.relationships = [
      { id: '1', type: 'parent-child', sourceId: a.id, targetId: b.id },
      { id: '2', type: 'parent-child', sourceId: b.id, targetId: a.id },
    ];
    expect(parseBackup(serializeBackup([t])).rejected[0].reason).toContain('cycle');
  });

  it('rejects malformed fields such as impossible dates', () => {
    const t = createSampleTree();
    t.people[0].birthDate = '1950-13-45';
    expect(parseBackup(serializeBackup([t])).rejected).toHaveLength(1);
  });

  it('refuses external photo URLs so imports never cause network requests', () => {
    const t = createSampleTree();
    t.people[0].photo = 'https://tracker.example/pixel.png';
    expect(parseBackup(serializeBackup([t])).rejected).toHaveLength(1);
  });
});

describe('living / deceased status', () => {
  it('round-trips isDeceased and rejects non-boolean values', () => {
    const t = createSampleTree();
    const withStatus = updatePerson(t, t.people[0].id, { isDeceased: true });
    expect(parseBackup(serializeBackup([withStatus])).trees[0].people[0].isDeceased).toBe(true);
    const bad = JSON.parse(serializeBackup([withStatus]));
    bad.trees[0].people[0].isDeceased = 'yes';
    expect(parseBackup(JSON.stringify(bad)).rejected).toHaveLength(1);
  });
});
