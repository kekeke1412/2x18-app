export async function checkGoogleResponse(response, fallback) {
  if (response.ok) return;
  const data = await response.json().catch(() => ({}));
  const reasons = data.error?.errors?.map(error => error.reason) || [];
  if (response.status === 401 || (response.status === 403 && (reasons.includes('insufficientPermissions') || data.error?.details?.some(detail => detail.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT')))) {
    throw new Error('EXPIRED_TOKEN');
  }
  if (response.status === 403 && reasons.some(reason => ['accessNotConfigured', 'serviceDisabled'].includes(reason))) {
    throw new Error('Quản trị viên cần bật Google Calendar/Drive API trong Google Cloud. Đăng nhập lại không khắc phục được lỗi này.');
  }
  throw new Error(data.error?.message || fallback);
}

export async function withGoogleAuthorization(requireAuth, operation) {
  let token = await requireAuth();
  if (!token) return null;
  try { return await operation(token); }
  catch (error) {
    if (error.message !== 'EXPIRED_TOKEN') throw error;
    token = await requireAuth(true);
    return token ? operation(token) : null;
  }
}
