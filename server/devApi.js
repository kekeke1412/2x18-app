import { createAiHandler } from './aiHandler.js';
import { authenticateMember } from './firebaseAuth.js';

export function createDevApi(env) {
  const handler = createAiHandler({ authenticate: authenticateMember, env });
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/ai') return next();
    let body = '', tooLarge = false;
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 120000) { tooLarge = true; break; }
    }
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
    if (tooLarge) return res.status(413).json({ error: 'Yêu cầu AI quá dài.' });
    try { req.body = body ? JSON.parse(body) : {}; } catch { return res.status(400).json({ error: 'JSON không hợp lệ.' }); }
    await handler(req, res);
  };
}
