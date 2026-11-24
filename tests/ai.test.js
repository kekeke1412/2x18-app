import { it, expect, vi } from 'vitest';
import { createAiHandler } from '../server/aiHandler.js';
import { authenticateMember } from '../server/firebaseAuth.js';
import { createClassificationCache, validateClassification, validateTopics, safeDocumentUrl } from '../src/services/reportClassification.js';
import { checkGoogleResponse, withGoogleAuthorization } from '../src/services/googleErrors.js';
import { daysDiffLocal, safeExternalUrl } from '../src/utils/stringUtils.ts';
import { calcGpaStats, clampScore } from '../src/utils/gradeUtils.ts';
import { computeCPA } from '../src/utils/dashboardUtils.ts';

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
it('uses a bounded DeepSeek request, disables default CoT on non-reasoning calls, and reports configured model', async () => {
  const fetchImpl = vi.fn(okFetch), handler = createAiHandler({ authenticate: async () => ({ uid: 'u' }), fetchImpl, env: { DEEPSEEK_API_KEY: 'test-only', DEEPSEEK_CHAT_MODEL: 'configured-model' } });
  const res = response(); await handler({ method: 'POST', body }, res);
  expect(res.statusCode).toBe(200); expect(res.body.modelUsed).toBe('configured-model');
  const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(sent.max_tokens).toBe(4096);
  expect(sent.thinking).toEqual({ type: 'disabled' });
  expect(sent.response_format).toEqual({ type: 'json_object' });
});
it('blocks pending or unregistered Firebase users in authenticateMember while allowing active members', async () => {
  const makeFetch = (directMember, collectionMembers = null, collectionStatus = 200) => vi.fn(async (url) => {
    if (url.includes('identitytoolkit.googleapis.com')) {
      return { ok: true, status: 200, json: async () => ({ users: [{ localId: 'uid-1', email: 'm@hus.edu.vn' }] }) };
    }
    if (url.includes('/2x18_members/uid-1.json')) {
      return { ok: true, status: 200, json: async () => directMember };
    }
    if (url.includes('/2x18_members.json')) {
      return { ok: collectionStatus === 200, status: collectionStatus, json: async () => collectionMembers };
    }
    throw new Error('Unexpected URL ' + url);
  });

  await expect(authenticateMember({ headers: { authorization: 'Bearer tok' } }, { fetchImpl: makeFetch({ id: 'uid-1', status: 'pending' }), env: {} }))
    .rejects.toMatchObject({ status: 403 });
  await expect(authenticateMember({ headers: { authorization: 'Bearer tok' } }, { fetchImpl: makeFetch(null, null, 401), env: {} }))
    .rejects.toMatchObject({ status: 403 });
  await expect(authenticateMember({ headers: { authorization: 'Bearer tok' } }, { fetchImpl: makeFetch({ id: 'uid-1', status: 'active', role: 'core' }), env: {} }))
    .resolves.toEqual({ uid: 'uid-1', memberId: 'uid-1', role: 'core' });
});
it('handles local dates, safe external URLs, and unified CPA calculations accurately', () => {
  const ref = new Date(2026, 10, 24, 23, 30, 0); // Nov 24, 2026 23:30 local
  expect(daysDiffLocal('2026-11-24', ref)).toBe(0);
  expect(daysDiffLocal('2026-11-25', ref)).toBe(1);
  expect(daysDiffLocal('2026-11-23', ref)).toBe(-1);

  expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
  expect(safeExternalUrl('facebook.com/hus2x18', { allowBareDomain: true })).toBe('https://facebook.com/hus2x18');
  expect(Number.isNaN(clampScore('12.5'))).toBe(true);
  expect(Number.isNaN(clampScore('-3'))).toBe(true);
  expect(clampScore('8.5')).toBe(8.5);

  const emptyStats = computeCPA({});
  expect(emptyStats.cpa).toBe('—');
  expect(calcGpaStats({}).cpa).toBe('—');
});
it('handles upstream failures and enforces per-user request limits', async () => {
  const handler = createAiHandler({ authenticate: async () => ({ uid: 'u' }), fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }), env: { DEEPSEEK_API_KEY: 'test-only' } });
  for (let i = 0; i < 12; i++) { const res = response(); await handler({ method: 'POST', body }, res); expect(res.statusCode).toBe(502); }
  const res = response(); await handler({ method: 'POST', body }, res); expect(res.statusCode).toBe(429);
});
import { renderLatexString, safeSetHTML } from '../src/utils/sanitizeHtml.ts';
import { applyColorScheme } from '../src/components/ui/ThemeToggle.tsx';

it('recognizes missing Google scopes and retries only after visible reauthorization', async () => {
  await expect(checkGoogleResponse({ ok: false, status: 403, json: async () => ({ error: { errors: [{ reason: 'insufficientPermissions' }] } }) }, 'error')).rejects.toThrow('EXPIRED_TOKEN');
  const requireAuth = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
  const operation = vi.fn().mockRejectedValueOnce(new Error('EXPIRED_TOKEN')).mockResolvedValue('ok');
  expect(await withGoogleAuthorization(requireAuth, operation)).toBe('ok');
  expect(requireAuth.mock.calls).toEqual([[], [true]]); expect(operation.mock.calls).toEqual([['old'], ['new']]);
});

it('streams SSE deltas and collapsible reasoning chunks when stream: true is requested', async () => {
  const sseChunks = [
    'data: {"choices":[{"delta":{"reasoning_content":"Bước 1: phân tích..."},"finish_reason":null}]}\n\n',
    'data: {"choices":[{"delta":{"content":"Xin chào 2X18!"},"finish_reason":"stop"}]}\n\n',
    'data: [DONE]\n\n',
  ];
  const streamFetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    body: (async function* () {
      for (const chunk of sseChunks) yield chunk;
    })(),
  }));

  const handler = createAiHandler({
    authenticate: async () => ({ uid: 'u1' }),
    fetchImpl: streamFetch,
    env: { DEEPSEEK_API_KEY: 'test-only' },
  });

  const written = [];
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    write(chunk) { written.push(chunk); },
    end() { this.ended = true; },
  };

  await handler(
    {
      method: 'POST',
      body: {
        systemPrompt: '2X18 Copilot',
        userPrompt: 'Chào bạn',
        responseMimeType: 'text/plain',
        model: 'deepseek-reasoner',
        stream: true,
      },
    },
    res
  );

  expect(res.headers['Content-Type']).toContain('text/event-stream');
  expect(res.ended).toBe(true);
  const fullStream = written.join('');
  expect(fullStream).toContain('"type":"meta"');
  expect(fullStream).toContain('"type":"reasoning"');
  expect(fullStream).toContain('Bước 1: phân tích...');
  expect(fullStream).toContain('"type":"delta"');
  expect(fullStream).toContain('Xin chào 2X18!');
  expect(fullStream).toContain('data: [DONE]');
});

it('renders KaTeX math and strips XSS payloads via safeSetHTML and syncs color-scheme meta', async () => {
  const mathHtml = renderLatexString('E_g = 1.12\\text{ eV}', false);
  expect(mathHtml).toContain('katex');

  const el = document.createElement('div');
  await safeSetHTML(
    el,
    `<p>An toàn</p><script>window.__xss = true;</script><img src="x" onerror="alert(1)"><span>${mathHtml}</span>`
  );
  expect(el.innerHTML).toContain('An toàn');
  expect(el.innerHTML).not.toContain('<script');
  expect(el.innerHTML).not.toContain('onerror');

  applyColorScheme('light');
  expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');

  applyColorScheme('system');
  expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('light dark');
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

