// Verify the Firebase ID token through Firebase Auth's public REST API. This avoids
// an Admin SDK cold-start/init failure in the Vercel function.
const defaultWebApiKey = 'AIzaSyDuJUSOBAXY_c497xFSCbZwDbcgh-Cqqhw';

export async function authenticateMember(req) {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) throw Object.assign(new Error('Vui lòng đăng nhập để sử dụng AI.'), { status: 401 });
  let response;
  try {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env.FIREBASE_WEB_API_KEY || defaultWebApiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: match[1] }), signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw Object.assign(new Error('Không xác minh được phiên đăng nhập. Vui lòng thử lại.'), { status: 503 });
  }
  const result = await response.json().catch(() => null);
  const user = result?.users?.[0];
  if (!response.ok || !user?.localId) throw Object.assign(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'), { status: 401 });
  if (user.disabled) throw Object.assign(new Error('Tài khoản đã bị vô hiệu hóa.'), { status: 403 });
  return { uid: user.localId };
}
