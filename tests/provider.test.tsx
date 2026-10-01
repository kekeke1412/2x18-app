import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mock = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'firebase-user', email: 'test@example.com' } as any },
  authCallback: null as any, listeners: new Map<string, Set<any>>(),
  values: {} as any, write: vi.fn(), reauth: vi.fn(), popup: vi.fn(), api: null as any,
}));
vi.mock('../src/firebase', () => ({ auth: mock.auth, db: {} }));
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  get: async (path: string) => ({ val: () => mock.values[path] ?? null }),
  set: mock.write, update: mock.write,
  runTransaction: async (path: string, transform: any) => { mock.write(path, transform(mock.values[path] ?? null)); return { committed: true }; },
  onValue: (path: string, callback: any) => {
    const set = mock.listeners.get(path) || new Set(); set.add(callback); mock.listeners.set(path, set);
    callback({ val: () => mock.values[path] ?? null });
    return () => set.delete(callback);
  },
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: any) => { mock.authCallback = callback; callback(mock.auth.currentUser); return () => {}; },
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), signOut: vi.fn(), signInWithPopup: mock.popup, reauthenticateWithPopup: mock.reauth,
  GoogleAuthProvider: class { addScope() {} setCustomParameters() {} static credentialFromResult() { return { accessToken: 'fresh-token' }; } },
}));
vi.mock('../src/services/notificationService', () => ({ showNotification: vi.fn(), syncAllReminders: vi.fn() }));
import { AppProvider, useApp } from '../src/context/AppContext';
import { useReports } from '../src/hooks/useDomainQueries';

function Probe() {
  mock.api = useApp();
  const { data: reports } = useReports();
  return <div>{reports.map((report: any) => <span key={report.id}>{report.title}</span>)}</div>;
}
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  mock.listeners.clear(); mock.write.mockClear(); mock.reauth.mockReset();
  mock.auth.currentUser = { uid: 'firebase-user', email: 'test@example.com' };
  mock.values = {
    '2x18_members': { legacy: { id: 'member', uid: 'firebase-user', status: 'active', role: 'core', fullName: 'Test' } },
    '2x18_reports': { r: { id: 'r', title: 'Original report' } },
  };
});
afterEach(cleanup);

it('subscribes once, never writes on snapshots, and accepts remote deletion', async () => {
  render(<AppProvider><Probe /></AppProvider>);
  expect(screen.getByText('Original report')).toBeTruthy();
  expect(mock.listeners.get('2x18_reports')?.size).toBe(1);
  expect(mock.write).not.toHaveBeenCalled();
  act(() => mock.listeners.get('2x18_reports')?.forEach(callback => callback({ val: () => null })));
  expect(screen.queryByText('Original report')).toBeNull();
  expect(mock.write).not.toHaveBeenCalled();
});
it('clears reports and private collections on sign out', () => {
  render(<AppProvider><Probe /></AppProvider>);
  act(() => { mock.auth.currentUser = null; mock.authCallback(null); });
  expect(mock.api.currentUser).toBeNull(); expect(mock.api.reports).toEqual([]); expect(mock.api.vocab).toEqual({});
  expect([...mock.listeners.values()].every(set => set.size === 0)).toBe(true);
});
it('shows a consent dialog, opens Google only on click, caches token and prompts again when forced', async () => {
  mock.reauth.mockResolvedValue({ user: { uid: 'firebase-user' } });
  render(<AppProvider><Probe /></AppProvider>);
  let pending: Promise<string>;
  act(() => { pending = mock.api.requireGoogleAuth(); });
  expect(screen.getByRole('dialog')).toBeTruthy(); expect(mock.reauth).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await pending!).toBe('fresh-token');
  expect(await mock.api.requireGoogleAuth()).toBe('fresh-token'); expect(mock.reauth).toHaveBeenCalledTimes(1);
  act(() => { pending = mock.api.requireGoogleAuth(true); });
  expect(screen.getByRole('dialog')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
  expect(await pending!).toBeNull();
});
it('keeps a failed popup recoverable and cancellation resolves the waiting operation', async () => {
  mock.reauth.mockRejectedValue({ code: 'auth/popup-blocked' });
  render(<AppProvider><Probe /></AppProvider>);
  let pending: Promise<string>;
  act(() => { pending = mock.api.requireGoogleAuth(true); });
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục với Google' }));
  await screen.findByText(/Trình duyệt chặn cửa sổ Google/);
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
  expect(await pending!).toBeNull();
});

it.each(['Dashboard', 'Profile', 'Subjects', 'Tasks', 'Roadmap', 'CalendarPage', 'Voting', 'Notifications', 'Attendance', 'Gamification', 'Trash', 'Reports', 'Vocab', 'FlashcardSet'])('renders %s with authenticated empty collections without writes', async page => {
  const Page = (await import(`../src/pages/${page}.tsx`)).default;
  const mounted = render(<MemoryRouter><AppProvider><Page /></AppProvider></MemoryRouter>);
  expect(mounted.container.textContent?.length).toBeGreaterThan(0);
  expect(mock.write).not.toHaveBeenCalled();
});
