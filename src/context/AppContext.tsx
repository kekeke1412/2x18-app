// @ts-nocheck
import React, { createContext, useContext, useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { subjectDatabase } from '../data';
import { auth, db } from '../firebase';
import { ref, get, set, update, onValue, runTransaction } from 'firebase/database';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, onAuthStateChanged } from 'firebase/auth';
import { store } from '../services/firebaseStore';
import { toArray, safeKey, personalNotifications } from '../services/dataStore.js';
import { showNotification, syncAllReminders } from '../services/notificationService';

export const uid = () => crypto.randomUUID();
export const toArr = toArray;
const AppContext = createContext(null);
const EMPTY = {};
const initialData = () => ({ members: [], grades: {}, tasks: [], smeMap: {}, subjectTasks: {}, subjectComments: {}, calEvents: [], roadmap: [], votes: [], notifications: [], attendance: [], docs: {}, contributions: {}, auditLogs: [], semesterLabels: {}, vocab: {}, userVocab: {}, quizHistory: {}, config: {}, trash: [], reports: [] });
const grouped = v => Object.fromEntries(Object.entries(v || {}).map(([key, items]) => [key, toArr(items)]));
const subscriptions = [
  ['2x18_members', 'members', toArr], ['2x18_sme', 'smeMap'], ['2x18_tasks', 'tasks', toArr], ['2x18_events', 'calEvents', toArr],
  ['2x18_roadmap', 'roadmap', v => toArr(v).map(y => ({ ...y, events: toArr(y.events) }))],
  ['2x18_votes', 'votes', v => toArr(v).map(vote => ({ ...vote, options: toArr(vote.options).map(o => ({ ...o, votes: toArr(o.votes) })) }))],
  ['2x18_notifs', 'notifications', toArr], ['2x18_attendance', 'attendance', v => toArr(v).map(s => ({ ...s, present: toArr(s.present) }))],
  ['2x18_contributions', 'contributions'], ['2x18_docs', 'docs', grouped], ['2x18_audit', 'auditLogs', toArr],
  ['2x18_subject_tasks', 'subjectTasks', grouped], ['2x18_subject_comments', 'subjectComments', grouped],
  ['2x18_semester_labels', 'semesterLabels'], ['2x18_vocab', 'vocab'], ['2x18_user_vocab', 'userVocab'],
  ['2x18_quiz_history', 'quizHistory', grouped], ['2x18_config', 'config'], ['2x18_reports', 'reports', toArr],
  ['2x18_trash', 'trash', v => toArr(v).map(t => ({ ...t, deletedAt: t.deletedAt || t.meta?.deletedAt, deletedBy: t.deletedBy || t.meta?.deletedBy, deletedByName: t.deletedByName || t.meta?.deletedByName }))],
];

export function AppProvider({ children }) {
  const [data, setData] = useState(initialData);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [dataErrors, setDataErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [googleDialog, setGoogleDialog] = useState(null);
  const googleSession = useRef(null);
  const googleWaiters = useRef([]);
  const stateRef = useRef({ data, currentUser });
  stateRef.current = { data, currentUser };
  const toastTimers = useRef(new Map());
  const pendingWrites = useRef(new Map());
  const rmToast = useCallback(id => { clearTimeout(toastTimers.current.get(id)); toastTimers.current.delete(id); setToasts(items => items.filter(t => t.id !== id)); }, []);
  const toast = useCallback((msg, type = 'info', duration = 4500) => {
    const id = uid(); setToasts(items => [...items, { id, msg, type }]);
    toastTimers.current.set(id, setTimeout(() => rmToast(id), duration));
  }, [rmToast]);
  useEffect(() => () => { toastTimers.current.forEach(clearTimeout); googleWaiters.current.splice(0).forEach(resolve => resolve(null)); }, []);
  const finishGoogle = useCallback(token => { setGoogleDialog(null); googleWaiters.current.splice(0).forEach(resolve => resolve(token)); }, []);

  // Firebase is authoritative. Incoming snapshots must never trigger writes.
  useEffect(() => {
    let listeners = [], grades = new Map(), generation = 0;
    const cleanup = () => { listeners.forEach(unsub => unsub()); listeners = []; grades.forEach(unsub => unsub()); grades = new Map(); };
    const unsubAuth = onAuthStateChanged(auth, fbUser => {
      const version = ++generation; cleanup();
      setData(initialData()); setDataErrors({}); setCurrentUser(null);
      googleSession.current = null; finishGoogle(null);
      try { localStorage.removeItem('2x18_current_user'); localStorage.removeItem('2x18_google_token'); } catch { /* Storage may be disabled by browser privacy settings. */ }
      if (!fbUser) { setLoading(false); return; }
      setLoading(true);
      const pending = new Set(subscriptions.map(([path]) => path));
      const ready = path => { pending.delete(path); if (!pending.size) setLoading(false); };
      for (const [path, key, transform] of subscriptions) listeners.push(onValue(ref(db, path), snapshot => {
        if (version !== generation) return;
        const value = transform ? transform(snapshot.val()) : snapshot.val() || {};
        setData(previous => ({ ...previous, [key]: value }));
        setDataErrors(previous => { if (!previous[key]) return previous; const next = { ...previous }; delete next[key]; return next; });
        if (key === 'members') {
          const member = value.find(m => m.uid === fbUser.uid || m.id === fbUser.uid) || value.find(m => m.email === fbUser.email || m.mailSchool === fbUser.email);
          setCurrentUser(member?.status === 'active' ? { ...member, uid: fbUser.uid } : null);
          const ids = new Set(value.map(m => m.id).filter(Boolean));
          grades.forEach((unsub, id) => { if (!ids.has(id)) { unsub(); grades.delete(id); } });
          ids.forEach(id => {
            if (!grades.has(id)) grades.set(id, onValue(ref(db, `${safeKey(id)}_grades`), snap => {
              if (version === generation) setData(previous => ({ ...previous, grades: { ...previous.grades, [id]: snap.val() || {} } }));
            }, error => { if (version === generation) setDataErrors(previous => ({ ...previous, grades: error.message })); }));
          });
        }
        ready(path);
      }, error => { if (version !== generation) return; setDataErrors(previous => ({ ...previous, [key]: error.message })); ready(path); }));
    });
    return () => { generation++; cleanup(); unsubAuth(); };
  }, [finishGoogle]);

  const actor = () => {
    const member = stateRef.current.currentUser;
    if (!auth.currentUser || member?.status !== 'active') throw new Error('Vui lòng đăng nhập bằng tài khoản đã được duyệt.');
    return member;
  };
  const core = () => { const member = actor(); if (!['core', 'super_admin'].includes(member.role)) throw new Error('Chỉ Core Team được thực hiện thao tác này.'); return member; };
  // Failed writes keep form data available for retry; repeated clicks share one request.
  const perform = useCallback((key, operation, success = '') => {
    if (pendingWrites.current.has(key)) return pendingWrites.current.get(key);
    const request = Promise.resolve().then(() => { actor(); return operation(); })
      .then(result => { if (success) toast(success, 'success'); return result ?? true; })
      .catch(error => { toast(error.message || 'Không thể lưu dữ liệu. Vui lòng thử lại.', 'error'); return false; })
      .finally(() => pendingWrites.current.delete(key));
    pendingWrites.current.set(key, request); return request;
  }, [toast]);
  const audit = (action, target = '', detail = '') => store.add('2x18_audit', { id: uid(), action, target, detail, time: new Date().toISOString(), actorId: actor().id });
  const notify = (msg, type = 'system', link = '') => store.add('2x18_notifs', { id: uid(), msg, type, link, time: new Date().toISOString(), senderId: actor().id });
  const secondary = async operation => { try { await operation(); } catch { toast('Dữ liệu đã lưu; chưa thể cập nhật thông báo/điểm hoạt động.', 'info'); } };
  const points = (userId, amount) => userId ? runTransaction(ref(db, `2x18_contributions/${safeKey(userId)}`), value => Math.max(0, (Number(value) || 0) + amount), { applyLocally: false }) : Promise.resolve();
  const patch = (collection, id, fields, field = 'id') => store.change(collection, id, item => ({ ...item, ...fields, [field]: item[field] }), field);
  const trash = (collection, id, type, meta = {}, field = 'id') => store.moveToTrash(collection, id, type, meta, actor(), field);
  const roadmapPath = async year => (await store.locate('2x18_roadmap', year, 'year')).path;

  const requireGoogleAuth = useCallback((force = false) => {
    const cached = googleSession.current;
    if (!force && cached?.uid === auth.currentUser?.uid && cached.expiresAt > Date.now()) return Promise.resolve(cached.token);
    googleSession.current = null;
    setGoogleDialog(previous => previous || { busy: false, error: '' });
    return new Promise(resolve => googleWaiters.current.push(resolve));
  }, []);
  const grantGoogle = async () => {
    if (googleDialog?.busy) return;
    if (!auth.currentUser) { finishGoogle(null); toast('Vui lòng đăng nhập lại.', 'error'); return; }
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events'); provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({ prompt: 'consent', login_hint: auth.currentUser.email || '' });
    setGoogleDialog({ busy: true, error: '' });
    try {
      // Called by the dialog button: a fresh gesture even after an expired-token response.
      const credential = await reauthenticateWithPopup(auth.currentUser, provider);
      const token = GoogleAuthProvider.credentialFromResult(credential)?.accessToken;
      if (!token) throw new Error('Google chưa cấp quyền truy cập.');
      googleSession.current = { token, uid: credential.user.uid, expiresAt: Date.now() + 50 * 60 * 1000 };
      finishGoogle(token);
    } catch (error) {
      const message = error.code === 'auth/popup-blocked' ? 'Trình duyệt chặn cửa sổ Google. Cho phép cửa sổ bật lên rồi bấm thử lại.'
        : error.code === 'auth/user-mismatch' ? 'Vui lòng chọn đúng tài khoản Google đang đăng nhập.' : 'Chưa cấp được quyền Google. Bạn có thể thử lại hoặc hủy.';
      setGoogleDialog({ busy: false, error: message });
    }
  };
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const { user } = await signInWithPopup(auth, provider);
      const member = toArr((await get(ref(db, '2x18_members'))).val()).find(m => m.uid === user.uid || m.id === user.uid || m.email === user.email || m.mailSchool === user.email);
      if (!member) {
        const fresh = { id: user.uid, uid: user.uid, email: user.email || '', mailSchool: user.email || '', fullName: user.displayName || 'Thành viên', avatarUrl: user.photoURL || '', avatar: 'TV', role: 'member', status: 'pending', mssv: '', phone: '', gender: '', registeredAt: new Date().toISOString() };
        await store.add('2x18_members', fresh); await signOut(auth); return { status: 'pending', name: fresh.fullName, email: fresh.email };
      }
      if (member.status !== 'active') { await signOut(auth); return { status: 'pending', name: member.fullName, email: member.email }; }
      await patch('2x18_members', member.id, { uid: user.uid, avatarUrl: user.photoURL || member.avatarUrl || '' });
      setCurrentUser({ ...member, uid: user.uid }); return { status: 'ok' };
    } catch (error) { toast(error.code === 'auth/popup-blocked' ? 'Hãy cho phép cửa sổ bật lên để đăng nhập Google.' : error.message, 'error'); throw error; }
  };
  const login = async (email, password) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const member = toArr((await get(ref(db, '2x18_members'))).val()).find(m => m.id === user.uid || m.uid === user.uid || m.email === email || m.mailSchool === email);
    if (!member || member.status !== 'active') { await signOut(auth); throw new Error(member ? 'PENDING' : 'NOT_FOUND'); }
    setCurrentUser({ ...member, uid: user.uid });
  };
  const register = async ({ email, password, ho = '', ten = '', ...profile }) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const member = { ...profile, id: user.uid, uid: user.uid, email, mailSchool: email, fullName: `${ho} ${ten}`.trim() || profile.fullName || 'Thành viên', role: 'member', status: 'pending', registeredAt: new Date().toISOString() };
    await store.add('2x18_members', member); await signOut(auth); return member;
  };
  const logout = () => signOut(auth);
  const addAudit = (action, target, detail) => perform(`audit:${action}:${target}`, () => audit(action, target, detail));
  const pushNotif = (msg, type, link) => perform(`notify:${msg}`, () => notify(msg, type, link));
  const updateProfile = fields => perform('profile', async () => {
    const { role: _role, status: _status, id: _id, uid: _uid, ...profile } = fields;
    await patch('2x18_members', actor().id, profile);
  }, 'Đã lưu hồ sơ!');
  const updateMemberProfile = (id, fields) => perform(`member:${id}`, () => {
    core();
    const { role: _role, status: _status, id: _id, uid: _uid, ...profile } = fields;
    return patch('2x18_members', id, profile);
  }, 'Đã cập nhật hồ sơ thành viên!');
  const approveUser = id => perform(`member:${id}`, async () => { core(); await patch('2x18_members', id, { status: 'active' }); await secondary(() => notify('Đã duyệt thành viên mới vào nhóm!', 'member', '/profile')); }, 'Đã duyệt thành viên!');
  const rejectUser = id => perform(`member:${id}`, () => { core(); return patch('2x18_members', id, { status: 'rejected' }); }, 'Đã từ chối đơn đăng ký.');
  const kickMember = id => perform(`member:${id}`, () => { core(); if (id === actor().id) throw new Error('Không thể tự vô hiệu hóa tài khoản.'); return patch('2x18_members', id, { status: 'disabled' }); }, 'Đã vô hiệu hóa thành viên; hồ sơ và bảng điểm được giữ lại.');
  const updateRole = ({ memberId, role }) => perform(`member:${memberId}`, () => {
    if (actor().role !== 'super_admin' || !['core', 'member'].includes(role)) throw new Error('Không có quyền đổi vai trò này.');
    return store.change('2x18_members', memberId, member => { if (member.role === 'super_admin') throw new Error('Không thể hạ quyền Super Admin.'); return { ...member, role }; });
  });
  const updateConfig = fields => perform('config', () => { core(); return update(ref(db, '2x18_config'), { ...fields, updatedAt: new Date().toISOString(), updatedBy: actor().fullName }); }, 'Đã lưu cấu hình hệ thống!');
  const syncGrades = (userId, gradesData) => perform(`grades:${userId}`, () => {
    if (userId !== actor().id) core();
    const updates = Object.fromEntries(Object.entries(gradesData).flatMap(([subject, fields]) =>
      Object.entries(fields).map(([field, value]) => [`${safeKey(subject)}/${safeKey(field)}`, value])));
    return update(ref(db, `${safeKey(userId)}_grades`), updates);
  }, 'Đã lưu bảng điểm!');
  const updateGrade = (userId, subjectId, field, value) => perform(`grade:${userId}:${subjectId}:${field}`, () => {
    if (userId !== actor().id) core();
    return set(ref(db, `${safeKey(userId)}_grades/${safeKey(subjectId)}/${safeKey(field)}`), value);
  });
  const updateProgress = (userId, subjectId, value) => perform(`progress:${userId}:${subjectId}`, async () => {
    if (userId !== actor().id) core();
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Tiến độ phải từ 0 đến 100.');
    const path = ref(db, `${safeKey(userId)}_grades/${safeKey(subjectId)}/myProgress`);
    await get(path);
    let previous = 0;
    await runTransaction(path, current => { previous = Number(current) || 0; return value; }, { applyLocally: false });
    if ((previous === 100) !== (value === 100)) await secondary(() => points(userId, value === 100 ? 1000 : -1000));
  });
  const addTask = task => perform('addTask', async () => { const record = { ...task, id: uid(), done: false }; await store.add('2x18_tasks', record); await secondary(() => notify(`📋 Task mới: ${task.task}`, 'task', '/tasks')); return record; }, 'Đã thêm task!');
  const editTask = task => perform(`task:${task.id}`, () => patch('2x18_tasks', task.id, task));
  const deleteTask = id => perform(`task:${id}`, () => trash('2x18_tasks', id, 'task'), 'Đã chuyển vào thùng rác.');
  const toggleTask = id => perform(`task:${id}`, async () => {
    const { before, after } = await store.change('2x18_tasks', id, task => ({ ...task, done: !task.done, completedBy: !task.done ? actor().id : null }));
    await secondary(() => points(after.done ? actor().id : before.completedBy || actor().id, after.done ? 500 : -500));
  });
  const addSubjectTask = (sid, task) => perform(`addChecklist:${sid}`, () => store.add(`2x18_subject_tasks/${safeKey(sid)}`, { ...task, id: uid(), doneBy: {} }), 'Đã thêm mục!');
  const editSubjectTask = (sid, task) => perform(`checklist:${sid}:${task.id}`, () => patch(`2x18_subject_tasks/${safeKey(sid)}`, task.id, task));
  const deleteSubjectTask = (sid, id) => perform(`checklist:${sid}:${id}`, () => trash(`2x18_subject_tasks/${safeKey(sid)}`, id, 'subjectTask', { subjectId: sid }), 'Đã chuyển vào thùng rác.');
  const tickSubjectTask = (sid, id, userId, done) => perform(`checklist:${sid}:${id}:${userId}`, () => store.change(`2x18_subject_tasks/${safeKey(sid)}`, id, task => ({ ...task, doneBy: { ...task.doneBy, [safeKey(userId)]: done } })));
  const addSubjectComment = (sid, text) => perform(`comment:${sid}`, () => store.add(`2x18_subject_comments/${safeKey(sid)}`, { id: uid(), user: actor().fullName, text, time: new Date().toLocaleTimeString('vi'), date: new Date().toLocaleDateString('vi-VN') }));
  const setSme = ({ subjectId, userId }) => perform(`sme:${subjectId}`, () => { core(); return set(ref(db, `2x18_sme/${safeKey(subjectId)}`), userId); }, 'Đã cập nhật SME!');
  const addEvent = event => perform('addEvent', () => store.add('2x18_events', { ...event, id: uid() }));
  const editEvent = event => perform(`event:${event.id}`, () => patch('2x18_events', event.id, event));
  const deleteEvent = id => perform(`event:${id}`, () => trash('2x18_events', id, 'event'), 'Đã chuyển vào thùng rác.');
  const updateRoadmap = ({ year, eventId, field, value }) => perform(`roadmap:${year}:${eventId}`, async () => patch(`${await roadmapPath(year)}/events`, eventId, { [safeKey(field)]: value }));
  const addRoadmapEvent = ({ year, event }) => perform(`addRoadmap:${year}`, async () => store.add(`${await roadmapPath(year)}/events`, { ...event, id: uid() }));
  const delRoadmapEvent = ({ year, eventId }) => perform(`roadmap:${year}:${eventId}`, async () => trash(`${await roadmapPath(year)}/events`, eventId, 'roadmapEvent', { year }), 'Đã chuyển vào thùng rác.');
  const addRoadmapYear = year => perform(`year:${year}`, async () => {
    const existing = toArr((await get(ref(db, '2x18_roadmap'))).val()).some(item => String(item.year) === String(year));
    if (existing) throw new Error('Năm học này đã tồn tại.');
    return store.add('2x18_roadmap', { year, events: {} }, 'year');
  });
  const deleteRoadmapYear = year => perform(`year:${year}`, () => { core(); return trash('2x18_roadmap', year, 'roadmapYear', {}, 'year'); }, 'Đã chuyển cả năm và các sự kiện vào thùng rác.');
  const addVote = vote => perform('addVote', async () => { await store.add('2x18_votes', { ...vote, id: uid() }); await secondary(() => notify(`🗳️ Bình chọn mới: ${vote.title}`, 'vote', '/voting')); });
  const castVote = ({ voteId, optionId, userId, multiSelect }) => perform(`vote:${voteId}`, async () => {
    const { before, after } = await store.change('2x18_votes', voteId, vote => {
    if (vote.closed) throw new Error('Bình chọn đã đóng.');
    if (userId !== actor().id) throw new Error('Không thể bình chọn thay người khác.');
    const options = Object.fromEntries(Object.entries(vote.options || {}).map(([key, option]) => {
      const votes = toArr(option.votes), chosen = option.id === optionId;
      return [key, { ...option, votes: !multiSelect ? [...votes.filter(id => id !== userId), ...(chosen ? [userId] : [])] : chosen ? (votes.includes(userId) ? votes.filter(id => id !== userId) : [...votes, userId]) : votes }];
    })); return { ...vote, options };
    });
    const participated = vote => Object.values(vote.options || {}).some(option => toArr(option.votes).includes(userId));
    if (participated(before) !== participated(after)) await secondary(() => points(userId, participated(after) ? 200 : -200));
  }, 'Đã ghi nhận bình chọn!');
  const closeVote = id => perform(`vote:${id}`, () => { core(); return patch('2x18_votes', id, { closed: true }); });
  const addVoteOption = ({ voteId, text }) => perform(`vote:${voteId}`, async () => { const { path } = await store.locate('2x18_votes', voteId); return store.add(`${path}/options`, { id: uid(), text, votes: [] }); });
  const deleteVote = id => perform(`vote:${id}`, () => { core(); return trash('2x18_votes', id, 'vote'); }, 'Đã chuyển bình chọn vào thùng rác.');
  const notifications = useMemo(() => personalNotifications(data.notifications, currentUser?.id), [data.notifications, currentUser?.id]);
  const markNotif = id => perform(`notif:${id}`, () => store.change('2x18_notifs', id, item => ({ ...item, readBy: { ...item.readBy, [actor().id]: true } })));
  const markAllRead = () => perform('readAll', async () => {
    const updates = {};
    const selected = new Set(notifications.filter(n => !n.read).map(n => n.id));
    const snapshot = (await get(ref(db, '2x18_notifs'))).val() || {};
    for (const [key, item] of Object.entries(snapshot)) if (selected.has(item.id)) updates[`2x18_notifs/${safeKey(key)}/readBy/${safeKey(actor().id)}`] = true;
    if (Object.keys(updates).length) await update(ref(db), updates);
  });
  const knownNotifications = useRef(null);
  useEffect(() => {
    if (!currentUser || isLoading) { knownNotifications.current = null; return; }
    const ids = new Set(notifications.map(n => n.id));
    if (knownNotifications.current) notifications.forEach(n => {
      if (!knownNotifications.current.has(n.id) && n.senderId !== currentUser.id && !n.read) void showNotification('2X18 — Thông báo mới', n.msg, { tag: n.id, data: { url: n.link || '/' } });
    }); knownNotifications.current = ids;
  }, [notifications, currentUser?.id, isLoading]);
  useEffect(() => {
    const meetings = data.attendance.map(session => ({ ...session, id: `attendance-${session.sessionId}`, title: session.sessionTitle }));
    syncAllReminders(currentUser ? [...data.calEvents, ...meetings] : []);
    return () => syncAllReminders([]);
  }, [data.calEvents, data.attendance, currentUser?.id]);
  const addAttendanceSession = session => perform('addAttendance', async () => {
    await store.add('2x18_attendance', { ...session, sessionId: uid(), present: [], total: stateRef.current.data.members.filter(m => m.status === 'active').length }, 'sessionId');
    await secondary(() => notify(`📅 Buổi họp mới: ${session.sessionTitle}`, 'calendar', '/attendance'));
  }, 'Đã tạo buổi điểm danh!');
  const checkAttendance = ({ sessionId, userId, checked }) => perform(`attendance:${sessionId}:${userId}`, async () => {
    if (userId !== actor().id) core();
    const { before } = await store.change('2x18_attendance', sessionId, session => ({ ...session, present: checked ? [...new Set([...toArr(session.present), userId])] : toArr(session.present).filter(id => id !== userId) }), 'sessionId');
    if (toArr(before.present).includes(userId) !== checked) await secondary(() => points(userId, checked ? 500 : -500));
  });
  const deleteAttendanceSession = id => perform(`attendance:${id}`, () => { core(); return trash('2x18_attendance', id, 'attendanceSession', {}, 'sessionId'); }, 'Đã chuyển buổi họp vào thùng rác.');
  const editAttendanceSession = session => perform(`attendance:${session.sessionId}`, () => patch('2x18_attendance', session.sessionId, session, 'sessionId'), 'Đã cập nhật buổi họp!');
  const addReport = report => perform('addReport', async () => {
    const record = { ...report, id: uid(), authorId: actor().id, status: ['core', 'super_admin'].includes(actor().role) ? 'approved' : 'pending', createdAt: new Date().toISOString() };
    await store.add('2x18_reports', record);
    await secondary(async () => { await points(actor().id, 1000); await audit('Đăng báo cáo', record.title); await notify(`📄 Báo cáo mới: ${record.title}`, 'report', '/reports'); }); return record;
  }, 'Đã lưu báo cáo!');
  const approveReport = id => perform(`report:${id}`, () => { core(); return patch('2x18_reports', id, { status: 'approved' }); }, 'Đã phê duyệt tài liệu!');
  const reportPermission = (report, deleting = false) => { const user = actor(); if (!['core', 'super_admin'].includes(user.role) && (report.authorId !== user.id || (deleting && report.status !== 'pending'))) throw new Error('Bạn không có quyền sửa/xóa báo cáo này.'); };
  const updateReport = (id, fields) => perform(`report:${id}`, () => store.change('2x18_reports', id, report => { reportPermission(report); const { id: _id, authorId: _authorId, status: _status, ...editable } = fields; return { ...report, ...editable, updatedAt: new Date().toISOString() }; }), 'Đã cập nhật báo cáo!');
  const deleteReport = id => perform(`report:${id}`, async () => { const { data: report } = await store.locate('2x18_reports', id); reportPermission(report, true); await trash('2x18_reports', id, 'report'); }, 'Đã chuyển báo cáo vào thùng rác.');
  const addDoc = (sid, doc) => perform(`addDoc:${sid}`, async () => { await store.add(`2x18_docs/${safeKey(sid)}`, { ...doc, id: uid(), uploadedBy: actor().id, uploadedByName: actor().fullName, uploadedAt: new Date().toLocaleDateString('vi-VN'), ratings: {}, avgRating: 0 }); await secondary(async () => { await points(actor().id, 1000); await notify(`📄 Tài liệu mới: ${doc.name}`, 'sme', '/subjects'); }); }, 'Đã thêm tài liệu!');
  const deleteDoc = (sid, id) => perform(`doc:${sid}:${id}`, () => trash(`2x18_docs/${safeKey(sid)}`, id, 'doc', { subjectId: sid }), 'Đã chuyển vào thùng rác.');
  const rateDoc = (sid, id, stars) => perform(`doc:${sid}:${id}`, () => store.change(`2x18_docs/${safeKey(sid)}`, id, doc => {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Đánh giá phải từ 1 đến 5 sao.');
    const ratings = { ...doc.ratings, [actor().id]: stars }, values = Object.values(ratings).map(Number);
    return { ...doc, ratings, avgRating: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 };
  }), 'Đã lưu đánh giá!');
  const addContribution = ({ userId, points: amount }) => perform(`points:${userId}`, () => { core(); return points(userId, amount); });
  const updateSemesterLabel = (key, label) => perform(`semester:${key}`, () => set(ref(db, `2x18_semester_labels/${safeKey(key)}`), label));
  const addVocabSet = vocabulary => perform('addVocab', async () => { await store.add('2x18_vocab', { ...vocabulary, id: uid(), authorId: actor().id, authorName: actor().fullName, createdAt: new Date().toISOString() }); await secondary(() => points(actor().id, 500)); }, 'Đã tạo học phần!');
  const editVocabSet = vocabulary => perform(`vocab:${vocabulary.id}`, () => patch('2x18_vocab', vocabulary.id, vocabulary), 'Đã cập nhật học phần!');
  const deleteVocabSet = id => perform(`vocab:${id}`, () => trash('2x18_vocab', id, 'vocabSet'), 'Đã chuyển học phần vào thùng rác.');
  const markWordLearned = (setId, index, learned) => perform(`word:${setId}:${index}`, () => set(ref(db, `2x18_user_vocab/${safeKey(actor().id)}/${safeKey(setId)}/${safeKey(index)}`), learned ? 6 : null));
  const incrementWordLevel = (setId, index) => perform(`word:${setId}:${index}`, async () => {
    const userId = actor().id;
    const path = ref(db, `2x18_user_vocab/${safeKey(userId)}/${safeKey(setId)}/${safeKey(index)}`);
    await get(path);
    let previous = 0;
    await runTransaction(path, value => { previous = Number(value) || 0; return Math.min(6, previous + 1); }, { applyLocally: false });
    if (previous === 5) await secondary(() => points(userId, 500));
  });
  const addQuizResult = result => perform('quizResult', async () => {
    await store.add(`2x18_quiz_history/${safeKey(actor().id)}`, { ...result, id: uid(), timestamp: new Date().toISOString() });
    if (result.percentage === 100) await secondary(() => points(actor().id, 1000));
  });
  const restoreFromTrash = id => perform(`trash:${id}`, () => { core(); return store.restore(id); }, 'Đã khôi phục!');
  const permanentDeleteTrash = id => perform(`trash:${id}`, () => { core(); return store.removeTrash([id]); }, 'Đã xóa vĩnh viễn mục đã chọn.');
  const emptyTrash = () => perform('emptyTrash', () => { core(); return store.removeTrash(stateRef.current.data.trash.map(t => t.id)); }, 'Đã dọn các mục trong thùng rác.');
  const myGrades = data.grades[currentUser?.id] || EMPTY;
  const myGradesEnriched = useMemo(() => Object.entries(myGrades).map(([sid, score]) => { const subject = subjectDatabase.find(s => s.id === sid); return { subjectId: sid, subjectName: subject?.name || sid, code: subject?.code || '', credits: subject?.credits || 0, status: score.status || 'Chưa rõ', ...score }; }), [myGrades]);
  const getMemberById = id => data.members.find(m => m.id === id);
  const getSmeMember = sid => getMemberById(data.smeMap[sid]) || data.members.find(m => m.fullName === data.smeMap[sid]);
  const isSuperAdmin = currentUser?.role === 'super_admin', isCore = isSuperAdmin || currentUser?.role === 'core';
  const isLearningSme = Boolean(currentUser && Object.entries(data.smeMap).some(([sid, owner]) => (owner === currentUser.id || owner === currentUser.fullName) && myGrades[sid]?.status === 'Đang học'));
  const isProfileComplete = m => Boolean(m && (m.mssv || m.msv) && ['fullName', 'gender', 'dob', 'ethnicity', 'bloodType', 'pob', 'phone', 'mailVnu', 'mailSchool', 'facebook'].every(key => String(m[key] || '').trim()));
  const exportMembersCSV = () => {
    const rows = [['STT', 'MSSV', 'Họ tên', 'Giới tính', 'Email HUS', 'SĐT', 'Role'], ...data.members.filter(m => m.status === 'active').map((m, i) => [i + 1, m.mssv, m.fullName, m.gender, m.mailSchool || m.email, m.phone, m.role])];
    const csv = rows.map(row => row.map(value => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = "'" + text; return `"${text.replaceAll('"', '""')}"`; }).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })); const anchor = Object.assign(document.createElement('a'), { href: url, download: '2X18_Members.csv' }); anchor.click(); URL.revokeObjectURL(url);
  };
  const value = { ...data, currentUser, isLoading, dataErrors, notifications, unreadCount: notifications.filter(n => !n.read).length,
    toasts, isCore, isSuperAdmin, isLearningSme, myGrades, myGradesEnriched, activeMembers: data.members.filter(m => m.status === 'active'), pendingMembers: data.members.filter(m => m.status === 'pending'),
    selectedProfileUser, setSelectedProfileUser, login, logout, loginWithGoogle, register, requireGoogleAuth, toast, rmToast, addAudit,
    updateProfile, updateMemberProfile, updateConfig, syncGrades, updateGrade, updateProgress, approveUser, rejectUser, kickMember, updateRole,
    addTask, editTask, deleteTask, toggleTask, addSubjectTask, editSubjectTask, deleteSubjectTask, tickSubjectTask, addSubjectComment, setSme,
    addEvent, editEvent, deleteEvent, updateRoadmap, addRoadmapEvent, delRoadmapEvent, addRoadmapYear, deleteRoadmapYear,
    addVote, castVote, closeVote, addVoteOption, deleteVote, markNotif, markAllRead, addNotif: pushNotif,
    addAttendanceSession, checkAttendance, deleteAttendanceSession, editAttendanceSession, addReport, approveReport, updateReport, deleteReport,
    addDoc, deleteDoc, rateDoc, addContribution, updateSemesterLabel, addVocabSet, editVocabSet, deleteVocabSet, markWordLearned, incrementWordLevel, addQuizResult,
    restoreFromTrash, permanentDeleteTrash, emptyTrash, getMemberById, getSmeMember, isProfileComplete, exportMembersCSV };
  return <AppContext.Provider value={value}>
    {children}
    {Object.keys(dataErrors).length > 0 && <div role="alert" className="fixed bottom-3 left-3 z-[1000] max-w-md rounded-xl border border-amber-500 bg-gray-900 p-3 text-sm text-amber-200">Chưa tải được một phần dữ liệu ({Object.keys(dataErrors).join(', ')}). Kiểm tra kết nối/quyền Firebase rồi tải lại trang.</div>}
    {googleDialog && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="google-access-title">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#1e1e1e] p-6 text-gray-200">
        <h2 id="google-access-title" className="text-xl font-bold text-white">Cấp quyền Google</h2>
        <p className="mt-3 text-sm">Để tải tài liệu lên Drive hoặc tạo lịch/Meet, hãy cấp quyền cho tài khoản Google đang đăng nhập.</p>
        {googleDialog.error && <p role="alert" className="mt-3 text-sm text-red-300">{googleDialog.error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button disabled={googleDialog.busy} onClick={() => finishGoogle(null)} className="rounded-lg border border-gray-600 px-4 py-2">Hủy</button>
          <button autoFocus disabled={googleDialog.busy} onClick={grantGoogle} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">{googleDialog.busy ? 'Đang chờ Google…' : 'Tiếp tục với Google'}</button>
        </div>
      </div>
    </div>}
  </AppContext.Provider>;
}
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used within AppProvider'); return context; };
