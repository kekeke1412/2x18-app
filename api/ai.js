/* global process */
// api/ai.js
// Vercel Serverless Function to proxy DeepSeek requests safely with Dual-Model Routing (v4-flash & v4-pro)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    systemPrompt,
    userPrompt,
    temperature,
    history = [],
    responseMimeType,
    model = 'deepseek-v4-flash'
  } = req.body;

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'System AI Key not configured on server.' });
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || m.content || ""
      })),
      { role: 'user', content: userPrompt }
    ];

    // Chuẩn hóa tên model: deepseek-v4-flash (Fast) hoặc deepseek-v4-pro (Deep Reasoning CoT)
    // Tương thích cả deepseek-chat & deepseek-reasoner nếu nhà cung cấp upstream yêu cầu
    const requestModel = model === 'deepseek-v4-pro' || model === 'deepseek-reasoner'
      ? 'deepseek-v4-pro'
      : 'deepseek-v4-flash';

    const payload = {
      model: requestModel,
      messages,
      response_format: responseMimeType === 'application/json' ? { type: 'json_object' } : null
    };

    // Chỉ thêm temperature nếu không phải là mô hình suy luận cứng (một số reasoner model khóa cố định temp)
    if (temperature !== undefined && requestModel !== 'deepseek-v4-pro') {
      payload.temperature = temperature;
    }

    let response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    let data = await response.json();

    // Cơ chế Fallback dự phòng: Nếu nhà cung cấp endpoint tạm thời chỉ nhận mã alias gốc
    if (!response.ok && (data.error?.message?.includes('model') || response.status === 400 || response.status === 404)) {
      const fallbackModel = requestModel === 'deepseek-v4-pro' ? 'deepseek-reasoner' : 'deepseek-chat';
      payload.model = fallbackModel;
      if (fallbackModel === 'deepseek-chat' && temperature !== undefined) {
        payload.temperature = temperature;
      } else {
        delete payload.temperature;
      }

      response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
      data = await response.json();
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'DeepSeek API Error' });
    }

    const choice = data.choices && data.choices[0];
    const text = choice?.message?.content || '';
    const reasoning = choice?.message?.reasoning_content || '';

    res.status(200).json({
      text,
      reasoning,
      modelUsed: requestModel
    });
  } catch (error) {
    console.error('[DeepSeek Proxy Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
