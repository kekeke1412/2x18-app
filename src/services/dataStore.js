// Keep legacy Firebase array keys intact; all new records use stable IDs.
export const toArray = value => value && typeof value === 'object' ? Object.values(value).filter(v => v != null) : [];

export function findEntry(value, id, field = 'id') {
  return Object.entries(value || {}).find(([key, item]) =>
    item && String(item[field] ?? key) === String(id));
}

export function safeKey(value) {
  const key = String(value ?? '');
  if (!key || [...key].some(character => '.#$[]/'.includes(character) || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error('Mã dữ liệu không hợp lệ.');
  return key;
}

export function personalNotifications(items, userId) {
  return toArray(items).map(item => ({
    ...item,
    // Old global read flags cannot tell us which user actually read the item.
    read: Boolean(item.readBy?.[userId]),
  })).sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
}

export function createDataStore(adapter) {
  const locate = async (collection, id, field = 'id') => {
    const entry = findEntry(await adapter.read(collection), id, field);
    if (!entry) throw new Error('Mục này không còn tồn tại. Hãy tải lại danh sách.');
    return { path: `${collection}/${safeKey(entry[0])}`, data: entry[1] };
  };

  const add = async (collection, data, field = 'id') => {
    const path = `${collection}/${safeKey(data[field])}`;
    const committed = await adapter.transaction(path, old => old == null ? data : undefined);
    if (!committed) throw new Error('Mã dữ liệu đã tồn tại; không ghi đè bản cũ.');
    return data;
  };

  const change = async (collection, id, transform, field = 'id') => {
    const { path } = await locate(collection, id, field);
    let before, after;
    const committed = await adapter.transaction(path, current => {
      if (current == null || String(current[field] ?? path.split('/').at(-1)) !== String(id)) return;
      before = current;
      after = transform(current);
      return after;
    });
    if (!committed) throw new Error('Dữ liệu đã thay đổi hoặc bị xóa. Vui lòng thử lại.');
    return { before, after };
  };

  const moveToTrash = async (collection, id, type, meta, actor, field = 'id') => {
    const { path, data } = await locate(collection, id, field);
    const trashId = adapter.id();
    // Confirm the backup before removing the original. A conditional transaction
    // prevents deleting a record another client edited after the read.
    await add('2x18_trash', {
        id: trashId, type, data, meta: meta || {}, sourcePath: path,
        deletedAt: new Date().toISOString(), deletedBy: actor.id,
        deletedByName: actor.fullName || 'Thành viên',
    });
    const removed = await adapter.transaction(path, current => JSON.stringify(current) === JSON.stringify(data) ? null : undefined);
    if (!removed) throw new Error('Mục đã thay đổi trong lúc xóa. Giữ nguyên dữ liệu mới và bản sao trong thùng rác.');
  };

  const destination = async item => {
    const sid = () => safeKey(item.meta?.subjectId);
    const paths = {
      task: '2x18_tasks', event: '2x18_events', report: '2x18_reports',
      vote: '2x18_votes', vocabSet: '2x18_vocab', attendanceSession: '2x18_attendance',
      roadmapYear: '2x18_roadmap',
    };
    if (item.type === 'doc') return `2x18_docs/${sid()}`;
    if (item.type === 'subjectTask') return `2x18_subject_tasks/${sid()}`;
    if (item.type === 'roadmapEvent') {
      const year = await locate('2x18_roadmap', item.meta?.year, 'year');
      return `${year.path}/events`;
    }
    if (!paths[item.type]) throw new Error('Loại dữ liệu chưa hỗ trợ khôi phục; bản sao vẫn được giữ.');
    return paths[item.type];
  };

  const restore = async id => {
    const { path: trashPath, data: item } = await locate('2x18_trash', id);
    const collection = await destination(item);
    const field = item.type === 'attendanceSession' ? 'sessionId' : item.type === 'roadmapYear' ? 'year' : 'id';
    const recordId = item.data?.[field];
    safeKey(recordId);
    const existing = findEntry(await adapter.read(collection), recordId, field);
    if (existing) throw new Error('Mục này đã tồn tại. Giữ bản trong thùng rác để tránh ghi đè dữ liệu.');
    // Restore first, await acknowledgement, then remove backup. If removal fails,
    // both copies remain recoverable; never delete the only copy first.
    await add(collection, item.data, field);
    await adapter.update({ [trashPath]: null });
  };

  const removeTrash = async ids => {
    const current = await adapter.read('2x18_trash');
    const updates = {};
    for (const id of ids) {
      const entry = findEntry(current, id);
      if (entry) updates[`2x18_trash/${safeKey(entry[0])}`] = null;
    }
    if (Object.keys(updates).length) await adapter.update(updates);
  };
  return { locate, add, change, moveToTrash, restore, removeTrash };
}
