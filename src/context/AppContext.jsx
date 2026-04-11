// src/context/AppContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { auth, db, ref, set, onValue } from '../firebase';
import { get } from 'firebase/database';
import {
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
} from 'firebase/auth';

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const SUPER_ADMIN_EMAIL = 'hungphamba567@gmail.com';

const fbSet = (path, data) => {
  try { set(ref(db, path), data); } catch (e) { console.warn('[fbSet]', path, e?.message); }
};

const toArr = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'object') return Object.values(val).filter(Boolean);
  return [];
};

const A = {
  SET_USER:'SET_USER', SET_LOADING:'SET_LOADING', INIT_DATA:'INIT_DATA',
  UPDATE_PROFILE:'UPDATE_PROFILE', SYNC_GRADES:'SYNC_GRADES',
  UPDATE_GRADE:'UPDATE_GRADE', UPDATE_PROGRESS:'UPDATE_PROGRESS',
  ADD_TASK:'ADD_TASK', EDIT_TASK:'EDIT_TASK', DELETE_TASK:'DELETE_TASK', TOGGLE_TASK:'TOGGLE_TASK',
  ADD_SUBJECT_TASK:'ADD_SUBJECT_TASK', EDIT_SUBJECT_TASK:'EDIT_SUBJECT_TASK',
  DELETE_SUBJECT_TASK:'DELETE_SUBJECT_TASK', TICK_SUBJECT_TASK:'TICK_SUBJECT_TASK',
  ADD_SUBJECT_COMMENT:'ADD_SUBJECT_COMMENT',
  SET_SME:'SET_SME',
  ADD_EVENT:'ADD_EVENT', EDIT_EVENT:'EDIT_EVENT', DELETE_EVENT:'DELETE_EVENT',
  UPDATE_ROADMAP:'UPDATE_ROADMAP', ADD_ROADMAP_EVENT:'ADD_ROADMAP_EVENT',
  DEL_ROADMAP_EVENT:'DEL_ROADMAP_EVENT', ADD_ROADMAP_YEAR:'ADD_ROADMAP_YEAR', DELETE_ROADMAP_YEAR:'DELETE_ROADMAP_YEAR',
  ADD_VOTE:'ADD_VOTE', CAST_VOTE:'CAST_VOTE', CLOSE_VOTE:'CLOSE_VOTE',
  ADD_VOTE_OPTION:'ADD_VOTE_OPTION', DELETE_VOTE:'DELETE_VOTE',
  MARK_NOTIF:'MARK_NOTIF', ADD_NOTIF:'ADD_NOTIF', MARK_ALL_READ:'MARK_ALL_READ',
  DELETE_ATTENDANCE_SESSION:'DELETE_ATTENDANCE_SESSION',
  ADD_ATTENDANCE_SESSION:'ADD_ATTENDANCE_SESSION', CHECK_ATTENDANCE:'CHECK_ATTENDANCE',
  EDIT_ATTENDANCE_SESSION:'EDIT_ATTENDANCE_SESSION',
  ADD_DOC:'ADD_DOC', DELETE_DOC:'DELETE_DOC', RATE_DOC:'RATE_DOC',
  UPDATE_MEMBER_ROLE:'UPDATE_MEMBER_ROLE', REMOVE_MEMBER:'REMOVE_MEMBER',
  ADD_CONTRIBUTION:'ADD_CONTRIBUTION',
  ADD_AUDIT:'ADD_AUDIT', ADD_TOAST:'ADD_TOAST', REMOVE_TOAST:'REMOVE_TOAST',
  UPDATE_SEMESTER_LABEL:'UPDATE_SEMESTER_LABEL',
  RESTORE_FROM_TRASH:'RESTORE_FROM_TRASH',
  PERMANENT_DELETE_TRASH:'PERMANENT_DELETE_TRASH',
  EMPTY_TRASH:'EMPTY_TRASH',
};

const init = {
  currentUser:null, isLoading:true,
  members:[], grades:{}, tasks:[], smeMap:{}, subjectTasks:{}, subjectComments:{},
  calEvents:[], roadmap:[], votes:[], notifications:[],
  attendance:[], docs:{}, contributions:{},
  auditLogs:[], toasts:[], unreadCount:0, semesterLabels:{},
  trash:[],
};

function makeTrashItem(type, data, meta, payload) {
  return {
    id: payload.trashId, type, data, meta: meta || {},
    deletedAt: payload.deletedAt,
    deletedBy: payload.deletedBy || '',
    deletedByName: payload.deletedByName || 'Unknown',
  };
}

function reducer(s, { type, payload }) {
  switch (type) {
    case A.SET_USER:    return { ...s, currentUser: payload };
    case A.SET_LOADING: return { ...s, isLoading: payload };
    case A.INIT_DATA:   return {
      ...s, ...payload,
      unreadCount: (payload.notifications||[]).filter(n=>!n.read).length,
      isLoading: false,
    };
    case A.UPDATE_PROFILE: {
      const members = s.members.map(m => m.id===payload.id ? {...m,...payload} : m);
      const user = s.currentUser?.id===payload.id ? {...s.currentUser,...payload} : s.currentUser;
      return { ...s, members, currentUser:user };
    }
    case A.SYNC_GRADES: return { ...s, grades:{ ...s.grades, [payload.userId]:payload.gradesData } };
    case A.UPDATE_GRADE: {
      const { userId, subjectId, field, value } = payload;
      const prev = s.grades[userId]||{};
      return { ...s, grades:{ ...s.grades, [userId]:{ ...prev, [subjectId]:{ ...(prev[subjectId]||{}), [field]:value } } } };
    }
    case A.UPDATE_PROGRESS: {
      const { userId, subjectId, value } = payload;
      const prev = s.grades[userId]||{};
      return { ...s, grades:{ ...s.grades, [userId]:{ ...prev, [subjectId]:{ ...(prev[subjectId]||{}), myProgress:value } } } };
    }
    case A.ADD_TASK:    return { ...s, tasks:[payload,...s.tasks] };
    case A.EDIT_TASK:   return { ...s, tasks:s.tasks.map(x=>x.id===payload.id?{...x,...payload}:x) };
    case A.DELETE_TASK: {
      const { id, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = s.tasks.find(t=>t.id===id);
      if (!item) return { ...s, tasks:s.tasks.filter(x=>x.id!==id) };
      return { ...s, tasks:s.tasks.filter(x=>x.id!==id), trash:[...(s.trash||[]), makeTrashItem('task', item, {}, { trashId, deletedAt, deletedBy, deletedByName })] };
    }
    case A.TOGGLE_TASK: return { ...s, tasks:s.tasks.map(x=>x.id===payload?{...x,done:!x.done}:x) };
    case A.ADD_SUBJECT_TASK: {
      const {subjectId,task}=payload;
      return { ...s, subjectTasks:{...s.subjectTasks,[subjectId]:[...(s.subjectTasks[subjectId]||[]),task]} };
    }
    case A.EDIT_SUBJECT_TASK: {
      const {subjectId,task}=payload;
      return { ...s, subjectTasks:{...s.subjectTasks,[subjectId]:(s.subjectTasks[subjectId]||[]).map(t=>t.id===task.id?{...t,...task}:t)} };
    }
    case A.DELETE_SUBJECT_TASK: {
      const { subjectId, taskId, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = (s.subjectTasks[subjectId]||[]).find(t=>t.id===taskId);
      const trashItem = item ? makeTrashItem('subjectTask', item, { subjectId }, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return { ...s, subjectTasks:{...s.subjectTasks,[subjectId]:(s.subjectTasks[subjectId]||[]).filter(t=>t.id!==taskId)}, trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]) };
    }
    case A.TICK_SUBJECT_TASK: {
      const {subjectId,taskId,userId,done}=payload;
      return { ...s, subjectTasks:{...s.subjectTasks,[subjectId]:(s.subjectTasks[subjectId]||[]).map(t=>t.id===taskId?{...t,doneBy:{...(t.doneBy||{}),[userId]:done}}:t)} };
    }
    case A.ADD_SUBJECT_COMMENT: {
      const { subjectId, comment } = payload;
      return { ...s, subjectComments:{...s.subjectComments,[subjectId]:[...(s.subjectComments[subjectId]||[]), comment]} };
    }
    case A.SET_SME: return { ...s, smeMap:{...s.smeMap,[payload.subjectId]:payload.userId} };
    case A.ADD_EVENT:  return { ...s, calEvents:[...s.calEvents,payload] };
    case A.EDIT_EVENT: return { ...s, calEvents:s.calEvents.map(e=>e.id===payload.id?payload:e) };
    case A.DELETE_EVENT: {
      const { id, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = s.calEvents.find(e=>e.id===id);
      const trashItem = item ? makeTrashItem('event', item, {}, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return { ...s, calEvents: s.calEvents.filter(e=>e.id!==id), trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]) };
    }
    case A.UPDATE_ROADMAP: {
      const {year,eventId,field,value}=payload;
      return { ...s, roadmap:s.roadmap.map(y=>y.year===year?{...y,events:y.events.map(e=>e.id===eventId?{...e,[field]:value}:e)}:y) };
    }
    case A.ADD_ROADMAP_EVENT: return { ...s, roadmap:s.roadmap.map(y=>y.year===payload.year?{...y,events:[...toArr(y.events),payload.event]}:y) };
    case A.DEL_ROADMAP_EVENT: {
      const { year, eventId, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const yearObj = s.roadmap.find(y=>y.year===year);
      const item = yearObj?.events?.find(e=>e.id===eventId);
      const trashItem = item ? makeTrashItem('roadmapEvent', item, { year }, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return { ...s, roadmap: s.roadmap.map(y=>y.year===year?{...y,events:y.events.filter(e=>e.id!==eventId)}:y), trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]) };
    }
    case A.ADD_ROADMAP_YEAR: {
      if(s.roadmap.find(y=>y.year===payload))return s;
      return { ...s, roadmap:[...s.roadmap,{year:payload,events:[]}].sort((a,b)=>a.year-b.year) };
    }
    case A.DELETE_ROADMAP_YEAR: return { ...s, roadmap:s.roadmap.filter(y=>y.year!==payload) };
    case A.ADD_VOTE: return { ...s, votes:[payload,...s.votes] };
    case A.CAST_VOTE: {
      const {voteId,optionId,userId,multiSelect}=payload;
      return { ...s, votes:s.votes.map(v=>{
        if(v.id!==voteId)return v;
        const opts=toArr(v.options).map(o=>{
          const oVotes = toArr(o.votes);
          if(!multiSelect){const f=oVotes.filter(u=>u!==userId);return o.id===optionId?{...o,votes:[...f,userId]}:{...o,votes:f};}
          if(o.id!==optionId)return o;
          const has=oVotes.includes(userId);
          return {...o,votes:has?oVotes.filter(u=>u!==userId):[...oVotes,userId]};
        });
        return {...v,options:opts};
      })};
    }
    case A.CLOSE_VOTE:      return { ...s, votes:s.votes.map(x=>x.id===payload?{...x,closed:true}:x) };
    case A.ADD_VOTE_OPTION: return { ...s, votes:s.votes.map(x=>x.id===payload.voteId?{...x,options:[...(x.options||[]),{id:uid(),text:payload.text,votes:[]}]}:x) };
    case A.DELETE_VOTE: {
      const { id, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = s.votes.find(v => v.id === id);
      const trashItem = item ? makeTrashItem('vote', item, {}, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return { ...s, votes: s.votes.filter(v => v.id !== id), trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]) };
    }

    case A.MARK_NOTIF: {
      const n=s.notifications.map(x=>x.id===payload?{...x,read:true}:x);
      return { ...s, notifications:n, unreadCount:n.filter(x=>!x.read).length };
    }
    case A.MARK_ALL_READ: return { ...s, notifications:s.notifications.map(x=>({...x,read:true})), unreadCount:0 };
    case A.ADD_NOTIF:       return { ...s, notifications:[payload,...s.notifications], unreadCount:s.unreadCount+1 };
    case A.ADD_ATTENDANCE_SESSION: return { ...s, attendance:[payload,...s.attendance] };
    case A.CHECK_ATTENDANCE: {
      const {sessionId,userId,checked}=payload;
      return { ...s, attendance:s.attendance.map(sess=>sess.sessionId===sessionId?{...sess,present:checked?[...new Set([...toArr(sess.present),userId])]:toArr(sess.present).filter(u=>u!==userId)}:sess) };
    }
    case A.DELETE_ATTENDANCE_SESSION: return { ...s, attendance: s.attendance.filter(a => a.sessionId !== payload) };
    case A.EDIT_ATTENDANCE_SESSION:   return { ...s, attendance: s.attendance.map(a => a.sessionId === payload.sessionId ? { ...a, ...payload } : a) };
    case A.ADD_DOC: {
      const {subjectId,doc}=payload;
      return { ...s, docs:{...s.docs,[subjectId]:[...(s.docs[subjectId]||[]),doc]} };
    }
    case A.DELETE_DOC: {
      const { subjectId, docId, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = (s.docs[subjectId]||[]).find(d=>d.id===docId);
      const trashItem = item ? makeTrashItem('doc', item, { subjectId }, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return { ...s, docs:{...s.docs,[subjectId]:(s.docs[subjectId]||[]).filter(x=>x.id!==docId)}, trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]) };
    }
    case A.RATE_DOC: {
      const {subjectId,docId,userId,stars}=payload;
      return { ...s, docs:{...s.docs,[subjectId]:(s.docs[subjectId]||[]).map(doc=>{
        if(doc.id!==docId)return doc;
        const ratings={...(doc.ratings||{}),[userId]:stars};
        const avg=Object.values(ratings).reduce((a,v)=>a+v,0)/Object.values(ratings).length;
        return {...doc,ratings,avgRating:Math.round(avg*10)/10};
      })}};
    }
    case A.UPDATE_MEMBER_ROLE: {
      const {memberId,role}=payload;
      if(s.members.find(m=>m.id===memberId)?.role==='super_admin')return s;
      return { ...s, members:s.members.map(m=>m.id===memberId?{...m,role}:m) };
    }
    case A.REMOVE_MEMBER: return { ...s, members: s.members.filter(m => m.id !== payload) };
    case A.ADD_CONTRIBUTION: {
      const {userId,points}=payload;
      if(!userId||!points||points<=0)return s;
      return { ...s, contributions:{...s.contributions,[userId]:(Number(s.contributions[userId])||0)+points} };
    }
    case A.ADD_AUDIT:    return { ...s, auditLogs:[payload,...s.auditLogs].slice(0,100) };
    case A.ADD_TOAST:    return { ...s, toasts:[...s.toasts,payload] };
    case A.REMOVE_TOAST: return { ...s, toasts:s.toasts.filter(t=>t.id!==payload) };
    case A.UPDATE_SEMESTER_LABEL: return { ...s, semesterLabels:{...s.semesterLabels,[payload.key]:payload.label} };
    case A.RESTORE_FROM_TRASH: {
      const item = (s.trash||[]).find(t=>t.id===payload);
      if (!item) return s;
      const newTrash = (s.trash||[]).filter(t=>t.id!==payload);
      switch (item.type) {
        case 'task':        return { ...s, trash:newTrash, tasks:[item.data,...s.tasks] };
        case 'doc':         return { ...s, trash:newTrash, docs:{...s.docs,[item.meta.subjectId]:[item.data,...(s.docs[item.meta.subjectId]||[])]} };
        case 'event':       return { ...s, trash:newTrash, calEvents:[...s.calEvents,item.data] };
        case 'vote':        return { ...s, trash:newTrash, votes:[item.data,...s.votes] };
        case 'subjectTask': return { ...s, trash:newTrash, subjectTasks:{...s.subjectTasks,[item.meta.subjectId]:[...(s.subjectTasks[item.meta.subjectId]||[]),item.data]} };
        case 'roadmapEvent':return { ...s, trash:newTrash, roadmap:s.roadmap.map(y=>y.year===item.meta.year?{...y,events:[...y.events,item.data]}:y) };
        default:            return { ...s, trash:newTrash };
      }
    }
    case A.PERMANENT_DELETE_TRASH: return { ...s, trash:(s.trash||[]).filter(t=>t.id!==payload) };
    case A.EMPTY_TRASH:            return { ...s, trash:[] };
    default: return s;
  }
}

const AppContext = createContext(null);
const timerMap  = {};

// ── Push Notification helpers ─────────────────────────────────────────────
/**
 * Cross-platform push notification support:
 *  • Windows / Linux / macOS Chrome & Edge  → ServiceWorker showNotification
 *  • macOS Safari 16+                       → ServiceWorker showNotification
 *  • Android Chrome / Samsung Browser       → ServiceWorker showNotification
 *  • iOS Safari 16.4+ (PWA only)            → ServiceWorker showNotification
 *  • Desktop Firefox                        → new Notification() fallback
 *  • iOS Safari (non-PWA)                   → API not available, guide shown in UI
 *
 * iOS requires the user to "Add to Home Screen" first (PWA install).
 * Once installed, iOS 16.4+ supports Web Push natively.
 */

async function requestPushPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

function firePushNotif({ title, body, url = '/notifications', tag = 'default' }) {
  // Guard: API must exist and be granted
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const opts = {
    body:      body || '',
    icon:      '/icon-192.png',
    badge:     '/icon-192.png',
    tag,
    renotify:  true,
    data:      { url },
    vibrate:   [200, 100, 200],
    // Required for iOS PWA push to work
    silent:    false,
  };

  if ('serviceWorker' in navigator) {
    // Race serviceWorker.ready against a 3-second timeout so we always fire
    const swReady = navigator.serviceWorker.ready;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('SW timeout')), 3000));

    Promise.race([swReady, timeout])
      .then(reg => reg.showNotification(title, opts))
      .catch(() => {
        // Fallback: direct Notification constructor (works on desktop Firefox,
        // older Safari, etc. — will throw on iOS non-PWA, so we wrap in try/catch)
        try { new Notification(title, { body: opts.body, icon: opts.icon, tag }); } catch {}
      });
  } else {
    try { new Notification(title, { body: opts.body, icon: opts.icon, tag }); } catch {}
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);
  const skipSyncRef     = useRef(false);
  const fromFirebaseRef = useRef(false);
  const lastNotifIdRef  = useRef(null);
  const bootedRef       = useRef(false); // prevents push on initial load

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubDB = null;
    try {
      const stored = localStorage.getItem('2x18_current_user');
      if (stored) dispatch({ type:A.SET_USER, payload:JSON.parse(stored) });
    } catch {}

    const subscribeDB = () => {
      if (unsubDB) { unsubDB(); unsubDB = null; }
      dispatch({ type:A.SET_LOADING, payload:true });
      unsubDB = onValue(ref(db, '/'), (snapshot) => {
        const val = snapshot.val() || {};
        const members = toArr(val['2x18_members']);
        const grades  = {};
        members.forEach(m => { if (m?.id) grades[m.id] = val[`${m.id}_grades`] || {}; });
        fromFirebaseRef.current = true;
        dispatch({ type:A.INIT_DATA, payload: {
          members,
          grades,
          smeMap:           val['2x18_sme']              || {},
          tasks:            toArr(val['2x18_tasks']),
          calEvents:        toArr(val['2x18_events']),
          roadmap:          toArr(val['2x18_roadmap']).map(y => ({ ...y, events: toArr(y.events) })),
          votes:            toArr(val['2x18_votes']).map(v => ({ ...v, options: toArr(v.options).map(o => ({ ...o, votes: toArr(o.votes) })) })),
          notifications:    toArr(val['2x18_notifs']),
          attendance:       toArr(val['2x18_attendance']).map(sess => ({ ...sess, present: toArr(sess.present) })),
          contributions:    val['2x18_contributions']     || {},
          docs:             val['2x18_docs']              || {},
          auditLogs:        toArr(val['2x18_audit']),
          subjectTasks:     val['2x18_subject_tasks']     || {},
          subjectComments:  val['2x18_subject_comments']  || {},
          semesterLabels:   val['2x18_semester_labels']   || {},
          trash:            toArr(val['2x18_trash']),
        }});
        // Mark as booted after first load so future notifs fire push
        setTimeout(() => { bootedRef.current = true; }, 1500);
      }, (err) => {
        console.error('[Firebase DB] Access denied:', err.message);
        dispatch({ type:A.SET_LOADING, payload:false });
      });
    };

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        subscribeDB();
      } else {
        localStorage.removeItem('2x18_current_user');
        if (unsubDB) { unsubDB(); unsubDB = null; }
        fromFirebaseRef.current = false;
        bootedRef.current       = false;
        dispatch({ type:A.SET_USER, payload:null });
        dispatch({ type:A.INIT_DATA, payload: { members:[], grades:{}, smeMap:{}, tasks:[], calEvents:[], roadmap:[], votes:[], notifications:[], attendance:[], contributions:{}, docs:{}, auditLogs:[], subjectTasks:{}, subjectComments:{}, semesterLabels:{}, trash:[] }});
      }
    });

    return () => { if (unsubDB) unsubDB(); unsubAuth(); };
  }, []);

  // ── Request push permission on login ─────────────────────────────────────
  useEffect(() => {
    if (state.currentUser && state.currentUser.status !== 'pending') {
      requestPushPermission();
    }
  }, [state.currentUser?.id]); // eslint-disable-line

  // ── Listen for SW navigation messages (notification tap → navigate) ───────
  useEffect(() => {
    const handler = (e) => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: e.detail }));
    };
    window.addEventListener('sw-navigate', handler);
    return () => window.removeEventListener('sw-navigate', handler);
  }, []);

  // ── Fire OS push when new in-app notification arrives ────────────────────
  useEffect(() => {
    if (!bootedRef.current) return;
    const notifs = state.notifications;
    if (!notifs.length) return;
    const newest = notifs[0];
    if (!newest || newest.id === lastNotifIdRef.current) return;
    lastNotifIdRef.current = newest.id;
    if (!newest.read) {
      firePushNotif({
        title: '2X18 – Thông báo mới',
        body:  newest.msg || 'Có hoạt động mới trong nhóm',
        url:   newest.link || '/notifications',
        tag:   newest.type || 'default',
      });
    }
  }, [state.notifications]); // eslint-disable-line

  // ── Sync currentUser from members ─────────────────────────────────────────
  useEffect(() => {
    if (skipSyncRef.current) { skipSyncRef.current = false; return; }
    const cu = state.currentUser;
    if (!cu || state.isLoading) return;
    const fresh = state.members.find(m => m.id === cu.id);
    if (!fresh) return;
    const hasChange = ['role','status','fullName','phone','gender','mssv','mailSchool'].some(f => fresh[f] !== cu[f]);
    if (hasChange) {
      const merged = { ...cu, ...fresh };
      dispatch({ type:A.SET_USER, payload:merged });
      localStorage.setItem('2x18_current_user', JSON.stringify(merged));
    }
  }, [state.members]); // eslint-disable-line

  // ── Auto-sync to Firebase ─────────────────────────────────────────────────
  useEffect(() => {
    if (fromFirebaseRef.current) { fromFirebaseRef.current = false; return; }
    if (!state.currentUser || state.currentUser.status === 'pending') return;
    if (state.isLoading || !state.members.length) return;
    const membersMap = {};
    state.members.forEach(m => { if (m.id) membersMap[m.id] = m; });
    fbSet('2x18_members',          membersMap);
    fbSet('2x18_sme',              state.smeMap);
    fbSet('2x18_tasks',            state.tasks);
    fbSet('2x18_events',           state.calEvents);
    fbSet('2x18_roadmap',          state.roadmap);
    fbSet('2x18_votes',            state.votes);
    fbSet('2x18_notifs',           state.notifications);
    fbSet('2x18_attendance',       state.attendance);
    fbSet('2x18_contributions',    state.contributions);
    fbSet('2x18_docs',             state.docs);
    fbSet('2x18_audit',            state.auditLogs);
    fbSet('2x18_subject_tasks',    state.subjectTasks);
    fbSet('2x18_subject_comments', state.subjectComments);
    fbSet('2x18_semester_labels',  state.semesterLabels);
    fbSet('2x18_trash',            state.trash);
    Object.entries(state.grades).forEach(([uid, g]) => { if (uid && g) fbSet(`${uid}_grades`, g); });
  }, [ // eslint-disable-line
    state.members, state.smeMap, state.tasks, state.calEvents, state.roadmap,
    state.votes, state.notifications, state.attendance, state.contributions,
    state.docs, state.auditLogs, state.subjectTasks, state.subjectComments,
    state.semesterLabels, state.grades, state.trash
  ]);

  // ── Toast auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    state.toasts.forEach(t => {
      if (!timerMap[t.id]) {
        timerMap[t.id] = setTimeout(() => {
          dispatch({ type:A.REMOVE_TOAST, payload:t.id });
          delete timerMap[t.id];
        }, t.duration || 3500);
      }
    });
  }, [state.toasts]);

  // ── Core helpers ──────────────────────────────────────────────────────────
  const toast     = useCallback((msg, type='info', duration=3500) => dispatch({ type:A.ADD_TOAST, payload:{id:uid(),msg,type,duration} }), []);
  const rmToast   = useCallback(id => dispatch({ type:A.REMOVE_TOAST, payload:id }), []);
  const addAudit  = useCallback((action,target='',detail='') => dispatch({ type:A.ADD_AUDIT, payload:{id:uid(),action,target,detail,time:new Date().toISOString()} }), []);
  const trashMeta = useCallback(() => ({ trashId:uid(), deletedAt:new Date().toISOString(), deletedBy:state.currentUser?.id||'', deletedByName:state.currentUser?.fullName||'Unknown' }), [state.currentUser]);
  // In-app + push notification
  const addNotif  = useCallback(n => dispatch({ type:A.ADD_NOTIF, payload:{...n, id:uid(), read:false, time:new Date().toISOString()} }), []);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;
      let member = null;
      const snap1 = await get(ref(db, `2x18_members/${fbUser.uid}`));
      if (snap1.val()) { member = snap1.val(); }
      else {
        const snapAll = await get(ref(db, '2x18_members'));
        member = toArr(snapAll.val()).find(m => m.email === email || m.mailSchool === email);
      }
      if (!member) { await signOut(auth).catch(()=>{}); throw new Error('NOT_FOUND'); }
      if (member.status === 'pending') { await signOut(auth).catch(()=>{}); throw new Error('PENDING'); }
      const user = { ...member, uid: fbUser.uid };
      dispatch({ type: A.SET_USER, payload: user });
      localStorage.setItem('2x18_current_user', JSON.stringify(user));
    } catch (err) {
      if (err.message === 'PENDING' || err.message === 'NOT_FOUND') throw err;
      const msg = { 'auth/user-not-found':'Tài khoản không tồn tại.','auth/wrong-password':'Mật khẩu không đúng.','auth/invalid-email':'Email không hợp lệ.','auth/invalid-credential':'Email hoặc mật khẩu không đúng.','auth/too-many-requests':'Quá nhiều lần thử. Thử lại sau.' }[err.code] || 'Đăng nhập thất bại.';
      throw new Error(msg);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const fbUser = cred.user;
    const isSA = fbUser.email === SUPER_ADMIN_EMAIL;
    const snap = await get(ref(db, `2x18_members/${fbUser.uid}`));
    let member = snap.val();
    if (!member) {
      member = { id:fbUser.uid, uid:fbUser.uid, email:fbUser.email, mailSchool:fbUser.email, fullName:fbUser.displayName||'Thành viên', avatarUrl:fbUser.photoURL||'', avatar:(fbUser.displayName||'NT').split(' ').map(w=>w[0]).slice(-2).join('').toUpperCase(), role:isSA?'super_admin':'member', status:isSA?'active':'pending', mssv:'', phone:'', gender:'', registeredAt:new Date().toISOString() };
      await set(ref(db, `2x18_members/${fbUser.uid}`), member);
    } else if (isSA && (member.role !== 'super_admin' || member.status !== 'active')) {
      member = { ...member, role:'super_admin', status:'active' };
      await set(ref(db, `2x18_members/${member.id}`), member);
    }
    if (member.status === 'pending') { await signOut(auth).catch(()=>{}); return { status:'pending', name:member.fullName, email:member.email }; }
    const user = { ...member, uid: fbUser.uid };
    dispatch({ type: A.SET_USER, payload: user });
    localStorage.setItem('2x18_current_user', JSON.stringify(user));
    return { status: 'ok' };
  }, []);

  const register = useCallback(async (userData) => {
    const { email, password, ho='', ten='', mssv='', phone='', reason='' } = userData;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;
    const fullName = `${ho.trim()} ${ten.trim()}`.trim() || userData.fullName || 'Thành viên';
    const newMember = { id:fbUser.uid, uid:fbUser.uid, email, mailSchool:email, fullName, mssv:mssv.trim(), phone:phone.trim(), gender:'', avatar:(fullName.split(' ').filter(Boolean).map(w=>w[0]).slice(-2).join('')||'TV').toUpperCase(), role:'member', status:'pending', reason, registeredAt:new Date().toISOString() };
    await set(ref(db, `2x18_members/${fbUser.uid}`), newMember);
    await signOut(auth).catch(()=>{});
    return newMember;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem('2x18_current_user');
  }, []);

  // ── PROFILE ───────────────────────────────────────────────────────────────
  const updateProfile = useCallback((profileData) => {
    skipSyncRef.current = true;
    const merged = { ...state.currentUser, ...profileData };
    dispatch({ type:A.UPDATE_PROFILE, payload:merged });
    localStorage.setItem('2x18_current_user', JSON.stringify(merged));
    set(ref(db, `2x18_members/${merged.id}`), merged).catch(e => console.warn(e));
    toast('Đã lưu hồ sơ!', 'success');
  }, [state.currentUser, toast]);

  const updateMemberProfile = useCallback((memberId, profileData) => {
    dispatch({ type:A.UPDATE_PROFILE, payload:{ ...profileData, id:memberId } });
    set(ref(db, `2x18_members/${memberId}`), { ...profileData, id:memberId }).catch(e => console.warn(e));
    toast('Đã cập nhật hồ sơ thành viên!', 'success');
  }, [toast]);

  const approveUser = useCallback(async (memberId) => {
    try {
      await set(ref(db, `2x18_members/${memberId}/status`), 'active');
      dispatch({ type: A.UPDATE_PROFILE, payload: { id: memberId, status: 'active' } });
      toast('Đã duyệt thành viên! ✓', 'success');
    } catch (e) { console.error('[approveUser]', e); toast('Lỗi khi duyệt. Thử lại.', 'error'); }
  }, [toast]);

  const rejectUser = useCallback(async (memberId) => {
    try {
      await set(ref(db, `2x18_members/${memberId}`), null);
      dispatch({ type: A.REMOVE_MEMBER, payload: memberId });
      toast('Đã từ chối đơn đăng ký.', 'info');
    } catch (e) { console.error('[rejectUser]', e); toast('Lỗi khi từ chối. Thử lại.', 'error'); }
  }, [toast]);

  // ── GRADES ────────────────────────────────────────────────────────────────
  const syncGrades    = useCallback((userId, gradesData) => { dispatch({ type:A.SYNC_GRADES, payload:{ userId, gradesData } }); toast('Đã lưu bảng điểm!', 'success'); }, [toast]);
  const updateGrade   = useCallback((userId, subjectId, field, value) => dispatch({ type:A.UPDATE_GRADE, payload:{ userId, subjectId, field, value } }), []);
  const updateProgress= useCallback((userId, subjectId, value) => dispatch({ type:A.UPDATE_PROGRESS, payload:{ userId, subjectId, value } }), []);

  // ── TASKS ─────────────────────────────────────────────────────────────────
  const addTask = useCallback(t => {
    dispatch({ type:A.ADD_TASK, payload:{...t, id:uid(), done:false} });
    addAudit('Thêm task', t.subjectId, t.task);
    toast('Thêm task!', 'success');
    addNotif({ type:'task', msg:`📋 Task mới: "${t.task}"`, link:'/tasks' });
  }, [addAudit, toast, addNotif]);
  const editTask   = useCallback(t  => dispatch({type:A.EDIT_TASK,  payload:t}), []);
  const deleteTask = useCallback(id => { dispatch({ type:A.DELETE_TASK, payload:{ id, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);
  const toggleTask = useCallback(id => dispatch({type:A.TOGGLE_TASK, payload:id}), []);

  const addSubjectTask    = useCallback((sid,t) => { dispatch({type:A.ADD_SUBJECT_TASK,payload:{subjectId:sid,task:{...t,id:uid(),doneBy:{}}}}); toast('Thêm mục!','success'); }, [toast]);
  const editSubjectTask   = useCallback((sid,t) => dispatch({type:A.EDIT_SUBJECT_TASK,payload:{subjectId:sid,task:t}}), []);
  const deleteSubjectTask = useCallback((sid,id) => { dispatch({ type:A.DELETE_SUBJECT_TASK, payload:{ subjectId:sid, taskId:id, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);
  const tickSubjectTask   = useCallback((sid,tid,userId,done) => dispatch({type:A.TICK_SUBJECT_TASK,payload:{subjectId:sid,taskId:tid,userId,done}}), []);
  const addSubjectComment = useCallback((subjectId, text) => {
    const comment = { id:uid(), user:state.currentUser?.fullName||'Ẩn danh', text, time:new Date().toLocaleTimeString('vi'), date:new Date().toLocaleDateString('vi-VN') };
    dispatch({ type:A.ADD_SUBJECT_COMMENT, payload:{ subjectId, comment } });
  }, [state.currentUser]);

  // ── SME / CALENDAR / ROADMAP ──────────────────────────────────────────────
  const setSme = useCallback(p => {
    dispatch({ type:A.SET_SME, payload:p });
    addAudit('Đổi SME', p.subjectId);
    toast('Cập nhật SME!', 'success');
    addNotif({ type:'sme', msg:`👤 SME môn đã được cập nhật`, link:'/subjects' });
  }, [addAudit, toast, addNotif]);

  const addEvent = useCallback(e => {
    dispatch({ type:A.ADD_EVENT, payload:{...e, id:uid()} });
    addNotif({ type:'calendar', msg:`📅 Sự kiện mới: "${e.title}"`, link:'/calendar' });
  }, [addNotif]);
  const editEvent   = useCallback(e  => dispatch({type:A.EDIT_EVENT, payload:e}), []);
  const deleteEvent = useCallback(id => { dispatch({ type:A.DELETE_EVENT, payload:{ id, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);

  const updateRoadmap   = useCallback(p => dispatch({type:A.UPDATE_ROADMAP, payload:p}), []);
  const addRoadmapEvent = useCallback(p => {
    dispatch({ type:A.ADD_ROADMAP_EVENT, payload:{...p, event:{...p.event, id:uid()}} });
    addNotif({ type:'system', msg:`🗺️ Lộ trình: sự kiện mới "${p.event?.title||''}"`, link:'/roadmap' });
  }, [addNotif]);
  const delRoadmapEvent   = useCallback(p    => { dispatch({ type:A.DEL_ROADMAP_EVENT,  payload:{ ...p, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);
  const addRoadmapYear    = useCallback(year => dispatch({type:A.ADD_ROADMAP_YEAR,  payload:year}), []);
  const deleteRoadmapYear = useCallback(year => dispatch({type:A.DELETE_ROADMAP_YEAR, payload:year}), []);

  // ── VOTES ─────────────────────────────────────────────────────────────────
  const addVote = useCallback(v => {
    dispatch({ type:A.ADD_VOTE, payload:{...v, id:uid()} });
    toast('Đã tạo bình chọn!', 'success');
    addNotif({ type:'vote', msg:`🗳️ Bình chọn mới: "${v.title}"`, link:'/voting' });
  }, [toast, addNotif]);
  const castVote      = useCallback(p  => dispatch({type:A.CAST_VOTE,      payload:p}), []);
  const closeVote     = useCallback(id => {
    dispatch({ type:A.CLOSE_VOTE, payload:id });
    const title = state.votes.find(v=>v.id===id)?.title || '';
    addNotif({ type:'vote', msg:`🔒 Bình chọn "${title}" đã đóng`, link:'/voting' });
  }, [state.votes, addNotif]);
  const addVoteOption = useCallback(p => dispatch({type:A.ADD_VOTE_OPTION, payload:p}), []);
  // ── FIX: deleteVote chuyển vào thùng rác (có trashMeta) ────────────────
  const deleteVote = useCallback(id => {
    dispatch({ type:A.DELETE_VOTE, payload:{ id, ...trashMeta() } });
    toast('Đã chuyển vào thùng rác.', 'info');
  }, [trashMeta, toast]);

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const markNotif   = useCallback(id => dispatch({type:A.MARK_NOTIF,   payload:id}), []);
  const markAllRead = useCallback(()  => dispatch({type:A.MARK_ALL_READ}), []);

  // ── ATTENDANCE ────────────────────────────────────────────────────────────
  const addAttendanceSession = useCallback((data) => {
    const s = {...data, sessionId:uid(), present:[], total:state.members.length};
    dispatch({ type:A.ADD_ATTENDANCE_SESSION, payload:s });
    toast('Đã tạo buổi điểm danh!', 'success');
    addNotif({ type:'member', msg:`📋 Điểm danh: "${data.sessionTitle||'Buổi mới'}"`, link:'/attendance' });
  }, [state.members.length, toast, addNotif]);

  const checkAttendance = useCallback(({sessionId,userId,checked}) => {
    const sess = state.attendance.find(a=>a.sessionId===sessionId);
    if (checked && !sess?.present?.includes(userId))
      dispatch({ type:A.ADD_CONTRIBUTION, payload:{userId, points:10} });
    dispatch({ type:A.CHECK_ATTENDANCE, payload:{sessionId, userId, checked} });
  }, [state.attendance]);

  const deleteAttendanceSession = useCallback((sessionId) => {
    dispatch({ type: A.DELETE_ATTENDANCE_SESSION, payload: sessionId });
    toast('Đã xóa buổi họp!', 'info');
  }, [toast]);

  const editAttendanceSession = useCallback((data) => {
    dispatch({ type: A.EDIT_ATTENDANCE_SESSION, payload: data });
    toast('Đã cập nhật thông tin!', 'success');
  }, [toast]);

  // ── DOCS ──────────────────────────────────────────────────────────────────
  const addDoc = useCallback((subjectId, doc) => {
    const full = {...doc, id:uid(), uploadedBy:state.currentUser?.id, uploadedByName:state.currentUser?.fullName, uploadedAt:new Date().toLocaleDateString('vi-VN'), ratings:{}, avgRating:0};
    dispatch({ type:A.ADD_DOC, payload:{subjectId, doc:full} });
    addAudit('Upload tài liệu', subjectId, doc.name);
    dispatch({ type:A.ADD_CONTRIBUTION, payload:{userId:state.currentUser?.id, points:20} });
    toast(`Thêm "${doc.name}"! +20 điểm`, 'success');
    addNotif({ type:'sme', msg:`📄 Tài liệu mới: "${doc.name}"`, link:'/subjects' });
  }, [addAudit, toast, addNotif, state.currentUser]);

  const deleteDoc = useCallback((sid,did) => { dispatch({ type:A.DELETE_DOC, payload:{ subjectId:sid, docId:did, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);

  const rateDoc = useCallback((sid,did,stars) => {
    dispatch({ type:A.RATE_DOC, payload:{subjectId:sid, docId:did, userId:state.currentUser?.id, stars} });
    if (stars===5) {
      const doc=(state.docs[sid]||[]).find(d=>d.id===did);
      if (doc?.uploadedBy && doc.uploadedBy!==state.currentUser?.id)
        dispatch({ type:A.ADD_CONTRIBUTION, payload:{userId:doc.uploadedBy, points:30} });
    }
    toast(`Đánh giá ${stars} sao!`, 'success');
  }, [state.currentUser?.id, state.docs, toast]);

  // ── MISC ──────────────────────────────────────────────────────────────────
  const updateRole = useCallback(p => {
    dispatch({ type:A.UPDATE_MEMBER_ROLE, payload:p });
    set(ref(db, `2x18_members/${p.memberId}/role`), p.role).catch(e => console.warn(e));
  }, []);
  const addContribution     = useCallback(p => dispatch({type:A.ADD_CONTRIBUTION,    payload:p}), []);
  const updateSemesterLabel = useCallback((key,label) => dispatch({type:A.UPDATE_SEMESTER_LABEL, payload:{key,label}}), []);
  const restoreFromTrash     = useCallback(id => { dispatch({type:A.RESTORE_FROM_TRASH,     payload:id}); toast('Đã khôi phục!','success'); }, [toast]);
  const permanentDeleteTrash = useCallback(id => { dispatch({type:A.PERMANENT_DELETE_TRASH, payload:id}); toast('Đã xóa vĩnh viễn.','info'); }, [toast]);
  const emptyTrash           = useCallback(()  => { dispatch({type:A.EMPTY_TRASH});                        toast('Đã dọn sạch thùng rác.','success'); }, [toast]);

  const exportMembersCSV = useCallback(() => {
    const h=['STT','MSSV','Họ tên','Giới tính','Email HUS','SĐT','Role'];
    const r=state.members.filter(m=>m.status!=='pending').map((m,i)=>[i+1,m.mssv,m.fullName,m.gender||'',m.mailSchool||m.email||'',m.phone||'',m.role]);
    const csv=[h,...r].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'),{href:url,download:'2X18_Members.csv'});
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('Đã xuất danh sách!','success');
  }, [state.members, toast]);

  const isProfileComplete = useCallback((m) => {
    if (!m) return false;
    const has = f => m[f] && String(m[f]).trim() !== '';
    return (has('mssv')||has('msv')) && has('fullName') && has('gender') && has('dob') && has('ethnicity') && has('bloodType') && has('pob') && has('phone') && has('mailVnu') && has('mailSchool') && has('facebook');
  }, []);

  const isSuperAdmin = state.currentUser?.role === 'super_admin' || state.currentUser?.email === SUPER_ADMIN_EMAIL || state.currentUser?.mailSchool === SUPER_ADMIN_EMAIL;
  const isCore       = isSuperAdmin || state.currentUser?.role === 'core';
  const myGrades     = state.grades[state.currentUser?.id] || {};
  const myTasks      = state.tasks.filter(t => t.userId === state.currentUser?.id);
  const getMemberById  = id  => state.members.find(m => m.id === id);
  const getSmeMember   = sid => getMemberById(state.smeMap[sid]);
  const activeMembers  = state.members.filter(m => m.status !== 'pending');
  const pendingMembers = state.members.filter(m => m.status === 'pending');

  const value = {
    ...state, isCore, isSuperAdmin, myGrades, myTasks,
    activeMembers, pendingMembers,
    login, logout, loginWithGoogle, register,
    toast, rmToast, addAudit,
    updateProfile, updateMemberProfile, syncGrades, updateGrade, updateProgress,
    approveUser, rejectUser,
    addTask, editTask, deleteTask, toggleTask,
    addSubjectTask, editSubjectTask, deleteSubjectTask, tickSubjectTask,
    addSubjectComment,
    setSme, addEvent, editEvent, deleteEvent,
    updateRoadmap, addRoadmapEvent, delRoadmapEvent, addRoadmapYear, deleteRoadmapYear,
    addVote, castVote, closeVote, addVoteOption, deleteVote,
    markNotif, markAllRead, addNotif,
    addAttendanceSession, checkAttendance, deleteAttendanceSession, editAttendanceSession,
    addDoc, deleteDoc, rateDoc,
    updateRole, addContribution, updateSemesterLabel,
    restoreFromTrash, permanentDeleteTrash, emptyTrash,
    getMemberById, getSmeMember, isProfileComplete, exportMembersCSV,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if(!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
