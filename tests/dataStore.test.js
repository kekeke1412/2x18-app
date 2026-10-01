import { describe, it, expect } from 'vitest';
import { createDataStore, personalNotifications, safeKey } from '../src/services/dataStore.js';
import { archiveSeason } from '../src/services/seasonArchive.js';

function memory(initial) {
  let data = structuredClone(initial), sequence = 0;
  const writes = [];
  const read = path => path.split('/').reduce((node, key) => node?.[key], data) ?? null;
  const put = (path, value) => {
    const parts = path.split('/'); let node = data;
    for (const key of parts.slice(0, -1)) node = node[key] ||= {};
    if (value === null) delete node[parts.at(-1)]; else node[parts.at(-1)] = structuredClone(value);
  };
  const adapter = {
    read: async path => structuredClone(read(path)), id: () => `trash-${++sequence}`,
    update: async changes => { writes.push(changes); for (const [path, value] of Object.entries(changes)) put(path, value); },
    transaction: async (path, transform) => {
      const value = transform(structuredClone(read(path)));
      if (value === undefined) return false;
      writes.push({ [path]: value }); put(path, value); return true;
    },
  };
  return { adapter, read, put, writes, store: createDataStore(adapter) };
}
const actor = { id: 'member', fullName: 'Người dùng' };

it('archives current points and awards together with reset while preserving unrelated data', () => {
  const root = { '2x18_members': { m: { id: 'm' } }, '2x18_contributions': { m: 123, recentlyEarned: 17 }, gamif_awards: { m: ['a'] }, gamif_titles: { a: { name: 'Award' } }, gamif_seasons: { old: { name: 'Old' } } };
  const saved = archiveSeason(root, { id: 'new', name: 'Mùa mới' });
  expect(saved.gamif_seasons.new.snapshot).toEqual(root['2x18_contributions']);
  expect(saved.gamif_seasons.new.awardSnapshot).toEqual(root.gamif_awards);
  expect(saved.gamif_seasons.old).toEqual(root.gamif_seasons.old);
  expect(saved['2x18_contributions']).toEqual({ m: 0, recentlyEarned: 0 });
  expect(saved['2x18_members']).toEqual(root['2x18_members']);
  expect(root['2x18_contributions'].m).toBe(123);
});

describe('legacy Firebase records and safe trash', () => {
  it.each(['task', 'event', 'report', 'vote', 'vocabSet', 'attendanceSession', 'doc', 'subjectTask', 'roadmapEvent', 'roadmapYear'])('moves and restores %s without touching siblings', async type => {
    const collections = { task: '2x18_tasks', event: '2x18_events', report: '2x18_reports', vote: '2x18_votes', vocabSet: '2x18_vocab', attendanceSession: '2x18_attendance', doc: '2x18_docs/math', subjectTask: '2x18_subject_tasks/math', roadmapEvent: '2x18_roadmap/0/events', roadmapYear: '2x18_roadmap' };
    const field = type === 'attendanceSession' ? 'sessionId' : type === 'roadmapYear' ? 'year' : 'id';
    const m = memory({ '2x18_roadmap': { 0: { year: 2026, events: {} } } });
    const path = collections[type], record = { [field]: 'original', title: 'Dữ liệu cũ', nested: { retain: true } };
    m.put(`${path}/1`, record); m.put(`${path}/4`, { [field]: 'other', title: 'Không đổi' });
    await m.store.moveToTrash(path, 'original', type, { subjectId: 'math', year: 2026 }, actor, field);
    expect(m.read(`${path}/1`)).toBeNull();
    expect(m.read('2x18_trash/trash-1').data).toEqual(record);
    expect(m.read(`${path}/4`).title).toBe('Không đổi');
    await m.store.restore('trash-1');
    expect(m.read(`${path}/original`)).toEqual(record);
    expect(m.read('2x18_trash/trash-1')).toBeNull();
  });
  it('keeps the original if backup is denied', async () => {
    const m = memory({ '2x18_tasks': { 0: { id: 'a', title: 'Keep' } } });
    m.adapter.transaction = async () => { throw new Error('PERMISSION_DENIED'); };
    await expect(m.store.moveToTrash('2x18_tasks', 'a', 'task', {}, actor)).rejects.toThrow();
    expect(m.read('2x18_tasks/0').title).toBe('Keep');
  });
  it('never deletes a concurrent edit after making a backup', async () => {
    const m = memory({ '2x18_tasks': { 0: { id: 'a', title: 'Old' } } });
    const transaction = m.adapter.transaction;
    m.adapter.transaction = async (path, transform) => {
      if (path === '2x18_tasks/0') m.put(path, { id: 'a', title: 'New' });
      return transaction(path, transform);
    };
    await expect(m.store.moveToTrash('2x18_tasks', 'a', 'task', {}, actor)).rejects.toThrow('thay đổi');
    expect(m.read('2x18_tasks/0').title).toBe('New');
    expect(m.read('2x18_trash/trash-1').data.title).toBe('Old');
  });
  it('keeps trash when restoration fails and never overwrites a duplicate', async () => {
    const backup = { id: 'trash', type: 'report', data: { id: 'r', title: 'Old' } };
    const m = memory({ '2x18_trash': { 3: backup }, '2x18_reports': { legacy: { id: 'r', title: 'New' } } });
    await expect(m.store.restore('trash')).rejects.toThrow('đã tồn tại');
    expect(m.read('2x18_trash/3')).toEqual(backup);
    expect(m.read('2x18_reports/legacy').title).toBe('New');
  });
  it('keeps a recoverable backup if trash cleanup fails after restoring', async () => {
    const m = memory({ '2x18_trash': { 2: { id: 'trash', type: 'report', data: { id: 'r', title: 'Keep' } } } });
    m.adapter.update = async () => { throw new Error('offline'); };
    await expect(m.store.restore('trash')).rejects.toThrow('offline');
    expect(m.read('2x18_reports/r').title).toBe('Keep');
    expect(m.read('2x18_trash/2')).not.toBeNull();
  });
  it('clears only selected trash IDs, including legacy numeric keys', async () => {
    const m = memory({ '2x18_trash': { 0: { id: 'old' }, recentlyAdded: { id: 'new' } } });
    await m.store.removeTrash(['old']);
    expect(m.read('2x18_trash/0')).toBeNull(); expect(m.read('2x18_trash/recentlyAdded')).toEqual({ id: 'new' });
  });
  it('updates a legacy record in place without replacing other fields', async () => {
    const m = memory({ '2x18_reports': { 3: { id: 'r', title: 'Old', link: 'https://example.com' }, 7: { id: 'other' } } });
    await m.store.change('2x18_reports', 'r', record => ({ ...record, title: 'New' }));
    expect(m.read('2x18_reports/3')).toEqual({ id: 'r', title: 'New', link: 'https://example.com' });
    expect(m.read('2x18_reports/7')).toEqual({ id: 'other' });
  });
  it('tracks notification reads independently and rejects unsafe paths', () => {
    const records = [{ id: 'n', read: true, readBy: { alice: true } }];
    expect(personalNotifications(records, 'alice')[0].read).toBe(true);
    expect(personalNotifications(records, 'bob')[0].read).toBe(false);
    for (const key of ['', '../root', 'a.b', 'a\n']) expect(() => safeKey(key)).toThrow();
  });
});
