export const toDisplay = (iso?: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
};

export const localDateStr = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const daysDiffLocal = (deadline?: string | null, refDate: Date = new Date()): number => {
  if (!deadline) return 999;
  const raw = String(deadline).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const target = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(raw);
  if (Number.isNaN(target.getTime())) return 999;
  target.setHours(0, 0, 0, 0);
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export const safeExternalUrl = (
  value?: string | null,
  options: { allowBareDomain?: boolean } = {}
): string | null => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^(javascript|data|vbscript|file):/i.test(raw)) return null;
  const candidate = options.allowBareDomain && !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)
    ? `https://${raw.replace(/^\/+/, '')}`
    : raw;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
};

export const isImeComposing = (event: any): boolean =>
  Boolean(event?.nativeEvent?.isComposing || event?.isComposing || event?.keyCode === 229);

export const roleLabel = (role?: string) => {
  if (role === 'super_admin') return { text: 'Super Admin', cls: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
  if (role === 'core') return { text: 'Core Team', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
  return { text: 'Thành viên', cls: 'bg-gray-700/40 text-gray-400 border border-gray-700' };
};

export const getInitials = (name = ''): string =>
  String(name || '').split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('').toUpperCase() || '??';
