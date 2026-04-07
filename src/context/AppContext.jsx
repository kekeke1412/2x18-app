// src/context/AppContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { MOCK_MEMBERS, MOCK_SME, MOCK_VOTES, MOCK_NOTIFICATIONS, MOCK_ATTENDANCE, MOCK_CONTRIBUTIONS, MOCK_ROADMAP } from '../mockData';

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const persist = (k, d) => { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} };
const load    = (k, fb) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fb; } catch { return fb; } };

// ─────────────────────────── Action types ───────────────────────────────────
const A = {
  SET_USER:'SET_USER', SET_LOADING:'SET_LOADING', INIT_DATA:'INIT_DATA',
  UPDATE_PROFILE:'UPDATE_PROFILE', SYNC_GRADES:'SYNC_GRADES',
  UPDATE_GRADE:'UPDATE_GRADE', UPDATE_PROGRESS:'UPDATE_PROGRESS',
  ADD_TASK:'ADD_TASK', EDIT_TASK:'EDIT_TASK', DELETE_TASK:'DELETE_TASK', TOGGLE_TASK:'TOGGLE_TASK',
  ADD_SUBJECT_TASK:'ADD_SUBJECT_TASK', EDIT_SUBJECT_TASK:'EDIT_SUBJECT_TASK',
  DELETE_SUBJECT_TASK:'DELETE_SUBJECT_TASK', TICK_SUBJECT_TASK:'TICK_SUBJECT_TASK',
  SET_SME:'SET_SME',
  ADD_EVENT:'ADD_EVENT', EDIT_EVENT:'EDIT_EVENT', DELETE_EVENT:'DELETE_EVENT',
  UPDATE_ROADMAP:'UPDATE_ROADMAP', ADD_ROADMAP_EVENT:'ADD_ROADMAP_EVENT',
  DEL_ROADMAP_EVENT:'DEL_ROADMAP_EVENT', ADD_ROADMAP_YEAR:'ADD_ROADMAP_YEAR',
  DELETE_ROADMAP_YEAR:'DELETE_ROADMAP_YEAR',
  ADD_VOTE:'ADD_VOTE', CAST_VOTE:'CAST_VOTE', CLOSE_VOTE:'CLOSE_VOTE', ADD_VOTE_OPTION:'ADD_VOTE_OPTION',
  MARK_NOTIF:'MARK_NOTIF', ADD_NOTIF:'ADD_NOTIF', MARK_ALL_READ:'MARK_ALL_READ',
  // ── Attendance: sessions now live in Context + localStorage ──
  ADD_ATTENDANCE_SESSION:'ADD_ATTENDANCE_SESSION',
  CHECK_ATTENDANCE:'CHECK_ATTENDANCE',
  ADD_DOC:'ADD_DOC', DELETE_DOC:'DELETE_DOC', RATE_DOC:'RATE_DOC',
  UPDATE_MEMBER_ROLE:'UPDATE_MEMBER_ROLE',
  // ── FIX: ADD_CONTRIBUTION phải thực sự cộng dồn ──
  ADD_CONTRIBUTION:'ADD_CONTRIBUTION',
  ADD_AUDIT:'ADD_AUDIT', ADD_TOAST:'ADD_TOAST', REMOVE_TOAST:'REMOVE_TOAST',
  UPDATE_SEMESTER_LABEL:'UPDATE_SEMESTER_LABEL',
};

const init = {
  currentUser:null, isLoading:true,
  members:[], grades:{}, tasks:[], smeMap:{}, subjectTasks:{},
  calEvents:[], roadmap:[], votes:[], notifications:[],
  attendance:[], docs:{}, contributions:{},
  auditLogs:[], toasts:[], unreadCount:0, semesterLabels:{},
};

// ─────────────────────────── Reducer ────────────────────────────────────────
function reducer(s, { type, payload }) {
  switch (type) {
    case A.SET_USER:    return { ...s, currentUser: payload };
    case A.SET_LOADING: return { ...s, isLoading: payload };
    case A.INIT_DATA:   return {
      ...s, ...payload,
      unreadCount: (payload.notifications || []).filter(n => !n.read).length,
      isLoading: false,
    };

    // ── Profile ──────────────────────────────────────────────────────────────
    case A.UPDATE_PROFILE: {
      const members = s.members.map(m => m.id === payload.id ? { ...m, ...payload } : m);
      const user    = s.currentUser?.id === payload.id ? { ...s.currentUser, ...payload } : s.currentUser;
      persist('2x18_members', members);
      persist('2x18_current_user', user);
      return { ...s, members, currentUser: user };
    }

    // ── Grades ───────────────────────────────────────────────────────────────
    case A.SYNC_GRADES: {
      const { userId, gradesData } = payload;
      const grades = { ...s.grades, [userId]: gradesData };
      persist(`${userId}_grades`, gradesData);
      return { ...s, grades };
    }
    case A.UPDATE_GRADE: {
      const { userId, subjectId, field, value } = payload;
      const prev = s.grades[userId] || {};
      const ng = { ...s.grades, [userId]: { ...prev, [subjectId]: { ...(prev[subjectId] || {}), [field]: value } } };
      persist(`${userId}_grades`, ng[userId]);
      return { ...s, grades: ng };
    }
    case A.UPDATE_PROGRESS: {
      const { userId, subjectId, value } = payload;
      const prev = s.grades[userId] || {};
      const ng = { ...s.grades, [userId]: { ...prev, [subjectId]: { ...(prev[subjectId] || {}), myProgress: value } } };
      persist(`${userId}_grades`, ng[userId]);
      return { ...s, grades: ng };
    }

    // ── Personal tasks ────────────────────────────────────────────────────────
    case A.ADD_TASK:    { const t = [payload, ...s.tasks];                                persist('2x18_tasks', t); return { ...s, tasks: t }; }
    case A.EDIT_TASK:   { const t = s.tasks.map(x => x.id === payload.id ? { ...x, ...payload } : x); persist('2x18_tasks', t); return { ...s, tasks: t }; }
    case A.DELETE_TASK: { const t = s.tasks.filter(x => x.id !== payload);               persist('2x18_tasks', t); return { ...s, tasks: t }; }
    case A.TOGGLE_TASK: { const t = s.tasks.map(x => x.id === payload ? { ...x, done: !x.done } : x); persist('2x18_tasks', t); return { ...s, tasks: t }; }

    // ── Subject tasks ─────────────────────────────────────────────────────────
    case A.ADD_SUBJECT_TASK: {
      const { subjectId, task } = payload;
      const st = { ...s.subjectTasks, [subjectId]: [...(s.subjectTasks[subjectId] || []), task] };
      persist('2x18_subject_tasks', st); return { ...s, subjectTasks: st };
    }
    case A.EDIT_SUBJECT_TASK: {
      const { subjectId, task } = payload;
      const st = { ...s.subjectTasks, [subjectId]: (s.subjectTasks[subjectId] || []).map(t => t.id === task.id ? { ...t, ...task } : t) };
      persist('2x18_subject_tasks', st); return { ...s, subjectTasks: st };
    }
    case A.DELETE_SUBJECT_TASK: {
      const { subjectId, taskId } = payload;
      const st = { ...s.subjectTasks, [subjectId]: (s.subjectTasks[subjectId] || []).filter(t => t.id !== taskId) };
      persist('2x18_subject_tasks', st); return { ...s, subjectTasks: st };
    }
    case A.TICK_SUBJECT_TASK: {
      const { subjectId, taskId, userId, done } = payload;
      const st = {
        ...s.subjectTasks,
        [subjectId]: (s.subjectTasks[subjectId] || []).map(t =>
          t.id === taskId ? { ...t, doneBy: { ...(t.doneBy || {}), [userId]: done } } : t
        ),
      };
      persist('2x18_subject_tasks', st); return { ...s, subjectTasks: st };
    }

    // ── SME ───────────────────────────────────────────────────────────────────
    case A.SET_SME: {
      const smeMap = { ...s.smeMap, [payload.subjectId]: payload.userId };
      persist('2x18_sme', smeMap); return { ...s, smeMap };
    }

    // ── Calendar ──────────────────────────────────────────────────────────────
    case A.ADD_EVENT:    { const c = [...s.calEvents, payload]; persist('2x18_events', c); return { ...s, calEvents: c }; }
    case A.EDIT_EVENT:   { const c = s.calEvents.map(e => e.id === payload.id ? payload : e); persist('2x18_events', c); return { ...s, calEvents: c }; }
    case A.DELETE_EVENT: { const c = s.calEvents.filter(e => e.id !== payload); persist('2x18_events', c); return { ...s, calEvents: c }; }

    // ── Roadmap ───────────────────────────────────────────────────────────────
    case A.UPDATE_ROADMAP: {
      const { year, eventId, field, value } = payload;
      const r = s.roadmap.map(y => y.year === year
        ? { ...y, events: y.events.map(e => e.id === eventId ? { ...e, [field]: value } : e) }
        : y);
      persist('2x18_roadmap', r); return { ...s, roadmap: r };
    }
    case A.ADD_ROADMAP_EVENT: {
      const r = s.roadmap.map(y => y.year === payload.year ? { ...y, events: [...y.events, payload.event] } : y);
      persist('2x18_roadmap', r); return { ...s, roadmap: r };
    }
    case A.DEL_ROADMAP_EVENT: {
      const r = s.roadmap.map(y => y.year === payload.year
        ? { ...y, events: y.events.filter(e => e.id !== payload.eventId) } : y);
      persist('2x18_roadmap', r); return { ...s, roadmap: r };
    }
    case A.ADD_ROADMAP_YEAR: {
      if (s.roadmap.find(y => y.year === payload)) return s;
      const r = [...s.roadmap, { year: payload, events: [] }].sort((a, b) => a.year - b.year);
      persist('2x18_roadmap', r); return { ...s, roadmap: r };
    }
    case A.DELETE_ROADMAP_YEAR: {
      const r = s.roadmap.filter(y => y.year !== payload);
      persist('2x18_roadmap', r); return { ...s, roadmap: r };
    }

    // ── Votes ─────────────────────────────────────────────────────────────────
    case A.ADD_VOTE: { const v = [payload, ...s.votes]; persist('2x18_votes', v); return { ...s, votes: v }; }
    case A.CAST_VOTE: {
      const { voteId, optionId, userId, multiSelect } = payload;
      const v = s.votes.map(vote => {
        if (vote.id !== voteId) return vote;
        const opts = vote.options.map(o => {
          if (!multiSelect) {
            const f = o.votes.filter(u => u !== userId);
            return o.id === optionId ? { ...o, votes: [...f, userId] } : { ...o, votes: f };
          }
          if (o.id !== optionId) return o;
          const has = o.votes.includes(userId);
          return { ...o, votes: has ? o.votes.filter(u => u !== userId) : [...o.votes, userId] };
        });
        return { ...vote, options: opts };
      });
      persist('2x18_votes', v); return { ...s, votes: v };
    }
    case A.CLOSE_VOTE:      { const v = s.votes.map(x => x.id === payload ? { ...x, closed: true } : x); persist('2x18_votes', v); return { ...s, votes: v }; }
    case A.ADD_VOTE_OPTION: {
      const v = s.votes.map(x => x.id === payload.voteId
        ? { ...x, options: [...x.options, { id: uid(), text: payload.text, votes: [] }] } : x);
      persist('2x18_votes', v); return { ...s, votes: v };
    }

    // ── Notifications ──────────────────────────────────────────────────────────
    case A.MARK_NOTIF: {
      const n = s.notifications.map(x => x.id === payload ? { ...x, read: true } : x);
      persist('2x18_notifs', n);
      return { ...s, notifications: n, unreadCount: n.filter(x => !x.read).length };
    }
    case A.MARK_ALL_READ: {
      const n = s.notifications.map(x => ({ ...x, read: true }));
      persist('2x18_notifs', n); return { ...s, notifications: n, unreadCount: 0 };
    }
    case A.ADD_NOTIF: {
      const n = [payload, ...s.notifications];
      persist('2x18_notifs', n); return { ...s, notifications: n, unreadCount: s.unreadCount + 1 };
    }

    // ── Attendance — sessions in Context/localStorage (BUG FIX) ───────────────
    case A.ADD_ATTENDANCE_SESSION: {
      // Thêm session vào đầu mảng và persist ngay lập tức
      const attendance = [payload, ...s.attendance];
      persist('2x18_attendance', attendance);
      return { ...s, attendance };
    }
    case A.CHECK_ATTENDANCE: {
      const { sessionId, userId, checked } = payload;
      const attendance = s.attendance.map(sess =>
        sess.sessionId === sessionId
          ? {
              ...sess,
              present: checked
                ? [...new Set([...sess.present, userId])]
                : sess.present.filter(u => u !== userId),
            }
          : sess
      );
      persist('2x18_attendance', attendance);
      return { ...s, attendance };
    }

    // ── Docs ──────────────────────────────────────────────────────────────────
    case A.ADD_DOC: {
      const { subjectId, doc } = payload;
      const d = { ...s.docs, [subjectId]: [...(s.docs[subjectId] || []), doc] };
      persist('2x18_docs', d); return { ...s, docs: d };
    }
    case A.DELETE_DOC: {
      const { subjectId, docId } = payload;
      const d = { ...s.docs, [subjectId]: (s.docs[subjectId] || []).filter(x => x.id !== docId) };
      persist('2x18_docs', d); return { ...s, docs: d };
    }
    case A.RATE_DOC: {
      const { subjectId, docId, userId, stars } = payload;
      const d = {
        ...s.docs,
        [subjectId]: (s.docs[subjectId] || []).map(doc => {
          if (doc.id !== docId) return doc;
          const ratings = { ...(doc.ratings || {}), [userId]: stars };
          const avg = Object.values(ratings).reduce((a, v) => a + v, 0) / Object.values(ratings).length;
          return { ...doc, ratings, avgRating: Math.round(avg * 10) / 10 };
        }),
      };
      persist('2x18_docs', d); return { ...s, docs: d };
    }

    // ── Members & Contributions ───────────────────────────────────────────────
    case A.UPDATE_MEMBER_ROLE: {
      const { memberId, role } = payload;
      if (s.members.find(m => m.id === memberId)?.role === 'super_admin') return s;
      const members = s.members.map(m => m.id === memberId ? { ...m, role } : m);
      persist('2x18_members', members); return { ...s, members };
    }

    // ── FIX: Cộng điểm thực sự vào contributions ─────────────────────────────
    case A.ADD_CONTRIBUTION: {
      const { userId, points } = payload;
      // Bảo vệ: userId và points phải hợp lệ
      if (!userId || !points || points <= 0) return s;
      const current = Number(s.contributions[userId]) || 0;
      const contributions = { ...s.contributions, [userId]: current + points };
      persist('2x18_contributions', contributions);
      return { ...s, contributions };
    }

    // ── Audit ─────────────────────────────────────────────────────────────────
    case A.ADD_AUDIT: {
      const logs = [payload, ...s.auditLogs].slice(0, 100);
      persist('2x18_audit', logs); return { ...s, auditLogs: logs };
    }

    // ── Toast ─────────────────────────────────────────────────────────────────
    case A.ADD_TOAST:    return { ...s, toasts: [...s.toasts, payload] };
    case A.REMOVE_TOAST: return { ...s, toasts: s.toasts.filter(t => t.id !== payload) };

    // ── Semester labels ───────────────────────────────────────────────────────
    case A.UPDATE_SEMESTER_LABEL: {
      const sl = { ...s.semesterLabels, [payload.key]: payload.label };
      persist('2x18_semester_labels', sl); return { ...s, semesterLabels: sl };
    }

    default: return s;
  }
}

// ─────────────────────────── Helpers ────────────────────────────────────────
// Đọc TOÀN BỘ dữ liệu từ localStorage (dùng lại khi login/boot)
function loadAllData() {
  const members        = load('2x18_members',        MOCK_MEMBERS);
  const smeMap         = load('2x18_sme',            MOCK_SME);
  const tasks          = load('2x18_tasks',          []);
  const calEvents      = load('2x18_events',         []);
  const roadmap        = load('2x18_roadmap',        MOCK_ROADMAP);
  const votes          = load('2x18_votes',          MOCK_VOTES);
  const notifications  = load('2x18_notifs',         MOCK_NOTIFICATIONS);
  // ── FIX: attendance load từ localStorage, không dùng MOCK ──
  const attendance     = load('2x18_attendance',     MOCK_ATTENDANCE);
  const contributions  = load('2x18_contributions',  MOCK_CONTRIBUTIONS);
  const docs           = load('2x18_docs',           {});
  const auditLogs      = load('2x18_audit',          []);
  const subjectTasks   = load('2x18_subject_tasks',  {});
  const semesterLabels = load('2x18_semester_labels',{});
  const grades         = {};
  members.forEach(m => { grades[m.id] = load(`${m.id}_grades`, {}); });
  return { members, grades, tasks, smeMap, calEvents, roadmap, votes, notifications, attendance, contributions, docs, auditLogs, subjectTasks, semesterLabels };
}

// ─────────────────────────── Provider ───────────────────────────────────────
const AppContext = createContext(null);
const timerMap  = {};

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const data       = loadAllData();
    const storedUser = load('2x18_current_user', null);
    dispatch({ type: A.INIT_DATA, payload: data });
    if (storedUser) dispatch({ type: A.SET_USER, payload: storedUser });
  }, []);

  // ── Toast auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    state.toasts.forEach(t => {
      if (!timerMap[t.id]) {
        timerMap[t.id] = setTimeout(() => {
          dispatch({ type: A.REMOVE_TOAST, payload: t.id });
          delete timerMap[t.id];
        }, t.duration || 3500);
      }
    });
  }, [state.toasts]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const toast    = useCallback((msg, type = 'info', duration = 3500) =>
    dispatch({ type: A.ADD_TOAST, payload: { id: uid(), msg, type, duration } }), []);
  const rmToast  = useCallback(id => dispatch({ type: A.REMOVE_TOAST, payload: id }), []);
  const addAudit = useCallback((action, target = '', detail = '') =>
    dispatch({ type: A.ADD_AUDIT, payload: { id: uid(), action, target, detail, time: new Date().toISOString() } }), []);

  // ── AUTH — FIX: reload ALL data on login ──────────────────────────────────
  const login = useCallback((user) => {
    persist('2x18_current_user', user);
    // Reload toàn bộ data từ localStorage để không mất dữ liệu sau logout/login
    const data = loadAllData();
    dispatch({ type: A.INIT_DATA, payload: data });
    dispatch({ type: A.SET_USER,  payload: user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('2x18_current_user');
    dispatch({ type: A.SET_USER, payload: null });
    // Không xóa data — chỉ xóa session user
  }, []);

  // ── Profile / Grades ──────────────────────────────────────────────────────
  const updateProfile = useCallback((p) => {
    dispatch({ type: A.UPDATE_PROFILE, payload: p });
    addAudit('Cập nhật hồ sơ', p.fullName || '');
    toast('Lưu hồ sơ thành công! ✓', 'success');
  }, [addAudit, toast]);

  const syncGrades = useCallback((userId, gradesData) => {
    dispatch({ type: A.SYNC_GRADES, payload: { userId, gradesData } });
    toast('Lưu bảng điểm thành công!', 'success');
  }, [toast]);

  const updateGrade    = useCallback(p => dispatch({ type: A.UPDATE_GRADE,    payload: p }), []);
  const updateProgress = useCallback(p => dispatch({ type: A.UPDATE_PROGRESS, payload: p }), []);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const addTask    = useCallback(t => {
    dispatch({ type: A.ADD_TASK, payload: { ...t, id: uid(), done: false } });
    addAudit('Thêm task', t.subjectId, t.task);
    toast('Thêm task thành công!', 'success');
  }, [addAudit, toast]);
  const editTask   = useCallback(t  => dispatch({ type: A.EDIT_TASK,   payload: t }),  []);
  const deleteTask = useCallback(id => dispatch({ type: A.DELETE_TASK, payload: id }), []);
  const toggleTask = useCallback(id => dispatch({ type: A.TOGGLE_TASK, payload: id }), []);

  // ── Subject tasks ──────────────────────────────────────────────────────────
  const addSubjectTask    = useCallback((subjectId, task) => {
    dispatch({ type: A.ADD_SUBJECT_TASK, payload: { subjectId, task: { ...task, id: uid(), doneBy: {} } } });
    toast('Thêm mục học thành công!', 'success');
  }, [toast]);
  const editSubjectTask   = useCallback((subjectId, task) => dispatch({ type: A.EDIT_SUBJECT_TASK,   payload: { subjectId, task } }), []);
  const deleteSubjectTask = useCallback((subjectId, taskId) => dispatch({ type: A.DELETE_SUBJECT_TASK, payload: { subjectId, taskId } }), []);
  const tickSubjectTask   = useCallback((subjectId, taskId, userId, done) =>
    dispatch({ type: A.TICK_SUBJECT_TASK, payload: { subjectId, taskId, userId, done } }), []);

  // ── SME / Calendar / Roadmap ───────────────────────────────────────────────
  const setSme = useCallback(p => {
    dispatch({ type: A.SET_SME, payload: p });
    addAudit('Đổi SME', p.subjectId);
    toast('Cập nhật SME thành công!', 'success');
  }, [addAudit, toast]);

  const addEvent    = useCallback(e  => dispatch({ type: A.ADD_EVENT,   payload: { ...e, id: uid() } }), []);
  const editEvent   = useCallback(e  => dispatch({ type: A.EDIT_EVENT,  payload: e }), []);
  const deleteEvent = useCallback(id => dispatch({ type: A.DELETE_EVENT, payload: id }), []);

  const updateRoadmap     = useCallback(p    => dispatch({ type: A.UPDATE_ROADMAP,    payload: p }), []);
  const addRoadmapEvent   = useCallback(p    => dispatch({ type: A.ADD_ROADMAP_EVENT, payload: { ...p, event: { ...p.event, id: uid() } } }), []);
  const delRoadmapEvent   = useCallback(p    => dispatch({ type: A.DEL_ROADMAP_EVENT, payload: p }), []);
  const addRoadmapYear    = useCallback(year => dispatch({ type: A.ADD_ROADMAP_YEAR,  payload: year }), []);
  const deleteRoadmapYear = useCallback(year => dispatch({ type: A.DELETE_ROADMAP_YEAR, payload: year }), []);

  // ── Votes ─────────────────────────────────────────────────────────────────
  const addVote       = useCallback(v  => dispatch({ type: A.ADD_VOTE,       payload: { ...v, id: uid() } }), []);
  const castVote      = useCallback(p  => dispatch({ type: A.CAST_VOTE,       payload: p }), []);
  const closeVote     = useCallback(id => dispatch({ type: A.CLOSE_VOTE,      payload: id }), []);
  const addVoteOption = useCallback(p  => dispatch({ type: A.ADD_VOTE_OPTION, payload: p }), []);

  // ── Notifications ─────────────────────────────────────────────────────────
  const markNotif   = useCallback(id => dispatch({ type: A.MARK_NOTIF,    payload: id }), []);
  const markAllRead = useCallback(()  => dispatch({ type: A.MARK_ALL_READ }), []);
  const addNotif    = useCallback(n   => dispatch({ type: A.ADD_NOTIF,
    payload: { ...n, id: uid(), read: false, time: new Date().toISOString() } }), []);

  // ── Attendance — FIX: sessions stored in Context, not local React state ───
  const addAttendanceSession = useCallback((sessionData) => {
    const session = {
      ...sessionData,
      sessionId: uid(),
      present: [],
      total: state.members.length,
    };
    dispatch({ type: A.ADD_ATTENDANCE_SESSION, payload: session });
    toast('Đã tạo buổi điểm danh!', 'success');
    return session.sessionId;
  }, [state.members.length, toast]);

  // ── FIX: checkAttendance — chặn duplicate + cộng điểm 1 lần duy nhất ────
  const checkAttendance = useCallback(({ sessionId, userId, checked }) => {
    // Kiểm tra trạng thái hiện tại trong state để chặn duplicate
    const session = state.attendance.find(a => a.sessionId === sessionId);
    const wasPresent = session?.present?.includes(userId) || false;

    // Chỉ cộng điểm khi: checked=true VÀ chưa có mặt trước đó
    if (checked && !wasPresent) {
      dispatch({ type: A.ADD_CONTRIBUTION, payload: { userId, points: 10 } });
    }

    // Dispatch update ngay lập tức → UI re-render
    dispatch({ type: A.CHECK_ATTENDANCE, payload: { sessionId, userId, checked } });
  }, [state.attendance]);

  // ── Docs ──────────────────────────────────────────────────────────────────
  const addDoc = useCallback((subjectId, doc) => {
    const fullDoc = {
      ...doc,
      id: uid(),
      uploadedBy: state.currentUser?.id,
      uploadedByName: state.currentUser?.fullName,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
      ratings: {},
      avgRating: 0,
    };
    dispatch({ type: A.ADD_DOC, payload: { subjectId, doc: fullDoc } });
    addAudit('Upload tài liệu', subjectId, doc.name);
    dispatch({ type: A.ADD_CONTRIBUTION, payload: { userId: state.currentUser?.id, points: 20 } });
    toast(`Thêm "${doc.name}" thành công! +20 điểm`, 'success');
  }, [addAudit, toast, state.currentUser]);

  const deleteDoc = useCallback((subjectId, docId) =>
    dispatch({ type: A.DELETE_DOC, payload: { subjectId, docId } }), []);

  const rateDoc = useCallback((subjectId, docId, stars) => {
    dispatch({ type: A.RATE_DOC, payload: { subjectId, docId, userId: state.currentUser?.id, stars } });
    if (stars === 5) {
      const doc = (state.docs[subjectId] || []).find(d => d.id === docId);
      if (doc?.uploadedBy && doc.uploadedBy !== state.currentUser?.id) {
        dispatch({ type: A.ADD_CONTRIBUTION, payload: { userId: doc.uploadedBy, points: 30 } });
      }
    }
    toast(`Đánh giá ${stars} sao!`, 'success');
  }, [state.currentUser?.id, state.docs, toast]);

  // ── Members ───────────────────────────────────────────────────────────────
  const updateRole      = useCallback(p => dispatch({ type: A.UPDATE_MEMBER_ROLE, payload: p }), []);
  const addContribution = useCallback(p => dispatch({ type: A.ADD_CONTRIBUTION,   payload: p }), []);

  const updateSemesterLabel = useCallback((key, label) =>
    dispatch({ type: A.UPDATE_SEMESTER_LABEL, payload: { key, label } }), []);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportMembersCSV = useCallback(() => {
    const h = ['STT','MSSV','Họ tên','Giới tính','Email HUS','SĐT','Role'];
    const r = state.members.map((m, i) => [i + 1, m.mssv, m.fullName, m.gender || '', m.mailSchool || '', m.phone || '', m.role]);
    const csv = [h, ...r].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: '2X18_Members.csv' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Đã xuất danh sách thành viên!', 'success');
  }, [state.members, toast]);

  // ── isProfileComplete: chỉ cần 5 trường cơ bản ───────────────────────────
  const isProfileComplete = useCallback((m) => {
    if (!m) return false;
    return ['mssv', 'fullName', 'phone', 'mailSchool', 'gender'].every(
      f => m[f] && String(m[f]).trim() !== ''
    );
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const isCore       = state.currentUser?.role === 'core' || state.currentUser?.role === 'super_admin';
  const isSuperAdmin = state.currentUser?.mssv === '25000723';
  const myGrades     = state.grades[state.currentUser?.id] || {};
  const myTasks      = state.tasks.filter(t => t.userId === state.currentUser?.id);
  const getMemberById = id  => state.members.find(m => m.id === id);
  const getSmeMember  = sid => getMemberById(state.smeMap[sid]);

  const value = {
    ...state,
    isCore, isSuperAdmin, myGrades, myTasks,
    login, logout, toast, rmToast, addAudit,
    updateProfile, syncGrades, updateGrade, updateProgress,
    addTask, editTask, deleteTask, toggleTask,
    addSubjectTask, editSubjectTask, deleteSubjectTask, tickSubjectTask,
    setSme, addEvent, editEvent, deleteEvent,
    updateRoadmap, addRoadmapEvent, delRoadmapEvent, addRoadmapYear, deleteRoadmapYear,
    addVote, castVote, closeVote, addVoteOption,
    markNotif, markAllRead, addNotif,
    addAttendanceSession, checkAttendance,
    addDoc, deleteDoc, rateDoc,
    updateRole, addContribution, updateSemesterLabel,
    getMemberById, getSmeMember, isProfileComplete, exportMembersCSV,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
