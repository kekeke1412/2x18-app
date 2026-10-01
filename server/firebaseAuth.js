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
  // Use the caller's Firebase permissions, never an unrestricted admin database credential.
  const read = async path => {
    const url = new URL(`${path}.json`, `${databaseUrl}/`);
    url.searchParams.set('auth', match[1]);
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Object.assign(new Error('Không xác nhận được quyền thành viên.'), { status: 403 });
    return response.json();
  };
  let member = await read(`2x18_members/${encodeURIComponent(claims.uid)}`);
  if (!member) {
    const members = await read('2x18_members');
    member = Object.values(members || {}).find(m => m?.uid === claims.uid || m?.id === claims.uid
      || (claims.email_verified && (m?.email === claims.email || m?.mailSchool === claims.email)));
  }
  if (member?.status !== 'active') throw Object.assign(new Error('Tài khoản chưa được duyệt để sử dụng AI.'), { status: 403 });
  return { uid: claims.uid };
}
