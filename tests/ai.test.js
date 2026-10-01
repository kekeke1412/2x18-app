import { it, expect, vi } from 'vitest';
import { createAiHandler } from '../server/aiHandler.js';
import { createClassificationCache, validateClassification, validateTopics, safeDocumentUrl } from '../src/services/reportClassification.js';
import { checkGoogleResponse, withGoogleAuthorization } from '../src/services/googleErrors.js';

const valid = { type: 'research', confidence: 0, tags: ['ALD', 'ALD'], reason: 'Mô tả thí nghiệm' };
function response() { return { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const body = { systemPrompt: 'Return JSON', userPrompt: 'Phân loại báo cáo', responseMimeType: 'application/json' };
const okFetch = () => Promise.resolve({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(valid) } }] }) });

it('validates AI output and preserves zero confidence', () => {
  expect(validateClassification(valid, 'Title')).toMatchObject({ confidence: 0, tags: ['ALD'], source: 'deepseek' });
  for (const invalid of [{ ...valid, type: 'unknown' }, { ...valid, confidence: 101 }, { ...valid, tags: 'bad' }, { ...valid, reason: '' }]) expect(() => validateClassification(invalid, 'Title')).toThrow();
  expect(safeDocumentUrl('javascript:alert(1)')).toBeNull();
});
it('caches classification, isolates users, retries failures rather than fabricating fallback', async () => {
  const call = vi.fn().mockResolvedValue(valid), cached = createClassificationCache(call);
  await Promise.all([cached('u', 'Title'), cached('u', 'Title')]); expect(call).toHaveBeenCalledTimes(1);
  await cached('another', 'Title'); expect(call).toHaveBeenCalledTimes(2);
  call.mockRejectedValueOnce(new Error('offline'));
  await expect(cached('u', 'New')).rejects.toThrow('offline');
  await cached('u', 'New'); expect(call).toHaveBeenCalledTimes(4);
});
it('keeps all real report IDs exactly once in AI topics', () => {
  const result = validateTopics({ topics: [{ name: 'One', reportIds: ['a', 'a', 'fake'] }, { name: 'Two', reportIds: ['a', 'b'] }] }, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  expect(result.topics.flatMap(topic => topic.reportIds)).toEqual(['a', 'b', 'c']);
});
it('rejects unauthenticated requests before calling DeepSeek', async () => {
  const fetchImpl = vi.fn(okFetch), handler = createAiHandler({ authenticate: async () => { throw Object.assign(new Error('Login'), { status: 401 }); }, fetchImpl, env: { DEEPSEEK_API_KEY: 'test-only' } });
  const res = response(); await handler({ method: 'POST', body }, res);
  expect(res.statusCode).toBe(401); expect(fetchImpl).not.toHaveBeenCalled();
});
it('rejects malformed input, missing server keys and unsupported methods', async () => {
  const handler = createAiHandler({ authenticate: async () => ({ uid: 'u' }), env: {} });
  for (const [req, code] of [[{ method: 'GET' }, 405], [{ method: 'POST', body: {} }, 400], [{ method: 'POST', body }, 503]]) { const res = response(); await handler(req, res); expect(res.statusCode).toBe(code); }
});
it('uses a bounded DeepSeek request and reports the actual configured model', async () => {
  const fetchImpl = vi.fn(okFetch), handler = createAiHandler({ authenticate: async () => ({ uid: 'u' }), fetchImpl, env: { DEEPSEEK_API_KEY: 'test-only', DEEPSEEK_CHAT_MODEL: 'configured-model' } });
  const res = response(); await handler({ method: 'POST', body }, res);
  expect(res.statusCode).toBe(200); expect(res.body.modelUsed).toBe('configured-model');
  const sent = JSON.parse(fetchImpl.mock.calls[0][1].body); expect(sent.max_tokens).toBe(4096); expect(sent.response_format).toEqual({ type: 'json_object' });
});
it('handles upstream failures and enforces per-user request limits', async () => {
  const handler = createAiHandler({ authenticate: async () => ({ uid: 'u' }), fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }), env: { DEEPSEEK_API_KEY: 'test-only' } });
  for (let i = 0; i < 12; i++) { const res = response(); await handler({ method: 'POST', body }, res); expect(res.statusCode).toBe(502); }
  const res = response(); await handler({ method: 'POST', body }, res); expect(res.statusCode).toBe(429);
});
it('recognizes missing Google scopes and retries only after visible reauthorization', async () => {
  await expect(checkGoogleResponse({ ok: false, status: 403, json: async () => ({ error: { errors: [{ reason: 'insufficientPermissions' }] } }) }, 'error')).rejects.toThrow('EXPIRED_TOKEN');
  const requireAuth = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
  const operation = vi.fn().mockRejectedValueOnce(new Error('EXPIRED_TOKEN')).mockResolvedValue('ok');
  expect(await withGoogleAuthorization(requireAuth, operation)).toBe('ok');
  expect(requireAuth.mock.calls).toEqual([[], [true]]); expect(operation.mock.calls).toEqual([['old'], ['new']]);
});
