export const toDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const roleLabel = (role) => {
  if (role === 'super_admin') return { text: 'Super Admin', cls: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
  if (role === 'core') return { text: 'Core Team', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
  return { text: 'Thành viên', cls: 'bg-gray-700/40 text-gray-400 border border-gray-700' };
};

export const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('').toUpperCase() || '??';
