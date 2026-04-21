// api/ai.js
// Vercel Serverless Function to proxy DeepSeek requests safely

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, userPrompt, temperature, history, responseMimeType } = req.body;
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

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: temperature || 0.7,
        response_format: responseMimeType === 'application/json' ? { type: 'json_object' } : null
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'DeepSeek API Error' });
    }

    res.status(200).json({ text: data.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('[DeepSeek Proxy Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
