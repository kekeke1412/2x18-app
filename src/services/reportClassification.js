export const REPORT_TYPES = { event: 'Tóm tắt sự kiện', research: 'Báo cáo nghiên cứu', book: 'Sách' };

export function validateClassification(value, title) {
  if (!value || !Object.hasOwn(REPORT_TYPES, value.type) || !Array.isArray(value.tags)
      || typeof value.reason !== 'string' || !value.reason.trim()
      || typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)
      || value.confidence < 0 || value.confidence > 100) {
    throw new Error('DeepSeek trả về phân loại không hợp lệ. Vui lòng thử lại hoặc chọn loại thủ công.');
  }
  return {
    type: value.type, typeName: REPORT_TYPES[value.type], confidence: value.confidence,
    suggestedTitle: typeof value.suggestedTitle === 'string' ? value.suggestedTitle.slice(0, 300) : title,
    tags: [...new Set(value.tags.filter(tag => typeof tag === 'string').map(tag => tag.trim().replace(/^#+/, '').slice(0, 40)).filter(Boolean))].slice(0, 8),
    reason: value.reason.trim().slice(0, 600), source: 'deepseek',
  };
}

export function validateTopics(value, reports) {
  if (!Array.isArray(value?.topics)) throw new Error('DeepSeek trả về danh sách chủ đề không hợp lệ.');
  const remaining = new Set(reports.map(report => report.id));
  const topics = value.topics.flatMap((topic, index) => {
    if (typeof topic?.name !== 'string' || !Array.isArray(topic.reportIds)) return [];
    const reportIds = topic.reportIds.filter(id => { if (!remaining.has(id)) return false; remaining.delete(id); return true; });
    return reportIds.length ? [{ id: `topic_${index}`, name: topic.name.slice(0, 120), description: String(topic.description || '').slice(0, 400), tag: String(topic.tag || '').slice(0, 40), reportIds }] : [];
  });
  if (!topics.length) throw new Error('DeepSeek chưa phân loại được các tài liệu.');
  if (remaining.size) topics.push({ id: 'unclassified', name: 'Chưa phân loại', description: 'AI chưa xác định được chủ đề.', tag: '', reportIds: [...remaining] });
  return { topics };
}

// Cache only successful results, coalesce concurrent requests, bound memory use.
export function createClassificationCache(call, now = Date.now) {
  const cache = new Map();
  return async (userId, title, description = '') => {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) throw new Error('Vui lòng nhập tên tài liệu trước khi phân loại.');
    const key = JSON.stringify([userId, cleanTitle, description]);
    const existing = cache.get(key);
    if (existing && existing.until > now()) return existing.result;
    const result = Promise.resolve().then(() => call(cleanTitle, String(description).slice(0, 6000)))
      .then(value => validateClassification(value, cleanTitle)).catch(error => { cache.delete(key); throw error; });
    cache.set(key, { result, until: now() + 10 * 60 * 1000 });
    if (cache.size > 100) cache.delete(cache.keys().next().value);
    return result;
  };
}
export function safeDocumentUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
