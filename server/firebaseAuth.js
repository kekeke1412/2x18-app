// Verify the Firebase ID token through Firebase Auth's public REST API and confirm
// active membership in Realtime Database (supporting both uid-keyed and legacy records).
const defaultWebApiKey = 'AIzaSyDuJUSOBAXY_c497xFSCbZwDbcgh-Cqqhw';
const defaultDatabaseUrl = 'https://haix18-app-default-rtdb.asia-southeast1.firebasedatabase.app';

export async function authenticateMember(req, { fetchImpl = fetch, env = process.env } = {}) {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) throw Object.assign(new Error('Vui lòng đăng nhập để sử dụng AI.'), { status: 401 });
  const idToken = match[1];

  let response;
  try {
    response = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY || defaultWebApiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw Object.assign(new Error('Không xác minh được phiên đăng nhập. Vui lòng thử lại.'), { status: 503 });
  }

  const result = await response.json().catch(() => null);
  const user = result?.users?.[0];
  if (!response.ok || !user?.localId) {
    throw Object.assign(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'), { status: 401 });
  }
  if (user.disabled) {
    throw Object.assign(new Error('Tài khoản đã bị vô hiệu hóa.'), { status: 403 });
  }

  const dbBase = (env.FIREBASE_DATABASE_URL || defaultDatabaseUrl).replace(/\/+$/, '');
  const readRtdb = async (path) => {
    const url = `${dbBase}/${path}.json?auth=${encodeURIComponent(idToken)}`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    return { status: res.status, ok: res.ok, data: await res.json().catch(() => null) };
  };

  try {
    // 1. Fast path: check direct uid-keyed member node
    const direct = await readRtdb(`2x18_members/${encodeURIComponent(user.localId)}`);
    if (direct.ok && direct.data && typeof direct.data === 'object') {
      if (direct.data.status !== 'active') {
        throw Object.assign(new Error('Tài khoản của bạn chưa được phê duyệt hoặc đã bị vô hiệu hóa.'), { status: 403, memberBlocked: true });
      }
      return { uid: user.localId, memberId: direct.data.id || user.localId, role: direct.data.role || 'member' };
    }

    // 2. Legacy numeric-keyed fallback: inspect 2x18_members collection
    const collection = await readRtdb('2x18_members');
    if (collection.ok) {
      const list = collection.data && typeof collection.data === 'object'
        ? Object.values(collection.data).filter(Boolean)
        : [];
      const email = (user.email || '').toLowerCase();
      const found = list.find(m => m.uid === user.localId || m.id === user.localId)
        || (email ? list.find(m => (m.email || '').toLowerCase() === email || (m.mailSchool || '').toLowerCase() === email) : null);

      if (!found || found.status !== 'active') {
        throw Object.assign(new Error('Tài khoản của bạn chưa được phê duyệt để sử dụng AI.'), { status: 403, memberBlocked: true });
      }
      return { uid: user.localId, memberId: found.id || user.localId, role: found.role || 'member' };
    }

    if (collection.status === 401 || collection.status === 403 || direct.status === 401 || direct.status === 403) {
      throw Object.assign(new Error('Tài khoản của bạn chưa được phê duyệt để sử dụng AI.'), { status: 403, memberBlocked: true });
    }
  } catch (error) {
    if (error.memberBlocked) throw error;
    throw Object.assign(new Error('Không xác minh được quyền thành viên. Vui lòng thử lại.'), { status: 503 });
  }

  throw Object.assign(new Error('Không xác minh được quyền thành viên. Vui lòng thử lại.'), { status: 503 });
}
