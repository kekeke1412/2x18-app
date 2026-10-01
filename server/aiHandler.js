export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Nội dung yêu cầu không hợp lệ.');
  const { systemPrompt, userPrompt, temperature = 0.3, history = [], responseMimeType = 'text/plain', model = 'deepseek-chat' } = body;
  if (typeof systemPrompt !== 'string' || !systemPrompt.trim() || systemPrompt.length > 24000
    || typeof userPrompt !== 'string' || !userPrompt.trim() || userPrompt.length > 48000
    || !Array.isArray(history) || history.length > 30 || !Number.isFinite(temperature) || temperature < 0 || temperature > 2
    || !['text/plain', 'application/json'].includes(responseMimeType)
    || !['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash', 'deepseek-v4-pro'].includes(model)) throw new Error('Yêu cầu AI quá dài hoặc không hợp lệ.');
  const messages = history.map(item => {
    if (!item || !['user', 'assistant', 'model'].includes(item.role) || typeof (item.text ?? item.content) !== 'string' || (item.text ?? item.content).length > 24000) throw new Error('Lịch sử trò chuyện không hợp lệ.');
    return { role: item.role === 'user' ? 'user' : 'assistant', content: item.text ?? item.content };
  });
  if (JSON.stringify(body).length > 120000) throw new Error('Yêu cầu AI quá dài. Hãy rút gọn nội dung.');
  return { systemPrompt, userPrompt, temperature, messages, responseMimeType, model };
}

export function createAiHandler({ authenticate, fetchImpl = fetch, env = process.env, now = Date.now }) {
  // Per-instance guard; production-wide limits should also be configured at the gateway.
  const usage = new Map();
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Chỉ hỗ trợ POST.' }); }
    let input;
    try { input = validateRequest(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
    let member;
    try { member = await authenticate(req); } catch (error) { return res.status(error.status || 503).json({ error: error.status ? error.message : 'Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.' }); }
    if (!env.DEEPSEEK_API_KEY) return res.status(503).json({ error: 'Máy chủ chưa cấu hình DEEPSEEK_API_KEY. Bạn vẫn có thể phân loại thủ công.' });
    const time = now();
    for (const [id, bucket] of usage) if (bucket.reset <= time) usage.delete(id);
    const bucket = usage.get(member.uid) || { count: 0, reset: time + 60000, active: 0 };
    if (bucket.count >= 12 || bucket.active >= 2) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'Bạn gửi yêu cầu AI quá nhanh. Vui lòng chờ một phút.' }); }
    bucket.count++; bucket.active++; usage.set(member.uid, bucket);
    try {
      const reasoning = ['deepseek-reasoner', 'deepseek-v4-pro'].includes(input.model);
      const model = reasoning ? env.DEEPSEEK_REASONING_MODEL || 'deepseek-reasoner' : env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat';
      const payload = { model, messages: [{ role: 'system', content: input.systemPrompt }, ...input.messages, { role: 'user', content: input.userPrompt }], max_tokens: reasoning ? 8192 : 4096 };
      if (!reasoning) payload.temperature = input.temperature;
      if (input.responseMimeType === 'application/json') payload.response_format = { type: 'json_object' };
      const upstream = await fetchImpl('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST', signal: AbortSignal.timeout(55000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` }, body: JSON.stringify(payload),
      });
      const result = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const status = upstream.status === 429 ? 429 : 502;
        return res.status(status).json({ error: upstream.status === 429 ? 'DeepSeek đang quá tải. Vui lòng thử lại sau.' : 'DeepSeek chưa xử lý được yêu cầu. Kiểm tra khóa API, số dư và tên mô hình trên máy chủ.' });
      }
      const choice = result?.choices?.[0];
      if (choice?.finish_reason === 'length') return res.status(502).json({ error: 'Kết quả AI bị cắt ngắn. Hãy giảm nội dung đầu vào.' });
      if (typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) return res.status(502).json({ error: 'DeepSeek trả về nội dung trống hoặc sai định dạng.' });
      return res.status(200).json({ text: choice.message.content, reasoning: choice.message.reasoning_content || '', modelUsed: model });
    } catch (error) {
      return res.status(error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : 502).json({ error: 'Không nhận được phản hồi DeepSeek. Vui lòng thử lại.' });
    } finally { bucket.active--; }
  };
}
