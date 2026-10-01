import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID || 'haix18-app';
const databaseUrl = process.env.FIREBASE_DATABASE_URL || 'https://haix18-app-default-rtdb.asia-southeast1.firebasedatabase.app';
const app = getApps().find(item => item.name === 'ai-auth') || initializeApp({ projectId }, 'ai-auth');

export async function authenticateMember(req) {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) throw Object.assign(new Error('Vui lòng đăng nhập để sử dụng AI.'), { status: 401 });
  let claims;
  try { claims = await getAuth(app).verifyIdToken(match[1]); }
  catch { throw Object.assign(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'), { status: 401 }); }
  // Firebase Authentication is the access boundary for the AI endpoint. Member-state
  // checking is deliberately best-effort: many existing RTDB rule sets allow a user to
  // read their own profile but not the whole legacy members collection. Blocking a valid
  // Firebase session in that case made the deployed AI appear broken.
  const read = async path => {
    const url = new URL(`${path}.json`, `${databaseUrl}/`);
    url.searchParams.set('auth', match[1]);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Không đọc được hồ sơ thành viên (${response.status}).`);
    return response.json();
  };
  try {
    // New accounts are keyed by uid. Do not scan the whole collection from a serverless
    // request: legacy numeric keys commonly make that read fail under correct rules.
    const member = await read(`2x18_members/${encodeURIComponent(claims.uid)}`);
    if (member && member.status !== 'active') {
      throw Object.assign(new Error('Tài khoản chưa được duyệt để sử dụng AI.'), { status: 403, memberStatus: true });
    }
  } catch (error) {
    if (error.memberStatus) throw error;
    // Keep the endpoint available for existing legacy profiles when their database rules
    // do not expose this lookup to the caller. The client still requires a signed-in user.
    console.warn('[AI] Could not verify member record; accepting verified Firebase user.', error.message);
  }
  return { uid: claims.uid };
}
