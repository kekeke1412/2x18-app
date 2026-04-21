// src/context/AppContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { subjectDatabase } from '../data';
import { auth, db, ref, set, onValue } from '../firebase';
import { get, update } from 'firebase/database';
import {
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
} from 'firebase/auth';

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const SUPER_ADMIN_EMAIL = 'hungphamba567@gmail.com';

const fbSet = (path, data) => {
  try { set(ref(db, path), data); } catch (e) { console.warn('[fbSet]', path, e?.message); }
};

// Firebase Realtime DB có thể trả về object thay vì array → convert an toàn
export const toArr = (val) => {
  if (!val) return [];
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
  ADD_VOTE:'ADD_VOTE', CAST_VOTE:'CAST_VOTE', CLOSE_VOTE:'CLOSE_VOTE', ADD_VOTE_OPTION:'ADD_VOTE_OPTION', DELETE_VOTE:'DELETE_VOTE',
  MARK_NOTIF:'MARK_NOTIF', ADD_NOTIF:'ADD_NOTIF', MARK_ALL_READ:'MARK_ALL_READ',
  DELETE_ATTENDANCE_SESSION:'DELETE_ATTENDANCE_SESSION',
  ADD_ATTENDANCE_SESSION:'ADD_ATTENDANCE_SESSION', CHECK_ATTENDANCE:'CHECK_ATTENDANCE',EDIT_ATTENDANCE_SESSION:'EDIT_ATTENDANCE_SESSION',
  ADD_DOC:'ADD_DOC', DELETE_DOC:'DELETE_DOC', RATE_DOC:'RATE_DOC',
  UPDATE_MEMBER_ROLE:'UPDATE_MEMBER_ROLE', REMOVE_MEMBER:'REMOVE_MEMBER',
  ADD_CONTRIBUTION:'ADD_CONTRIBUTION',
  ADD_AUDIT:'ADD_AUDIT', ADD_TOAST:'ADD_TOAST', REMOVE_TOAST:'REMOVE_TOAST',
  UPDATE_SEMESTER_LABEL:'UPDATE_SEMESTER_LABEL',
  RESTORE_FROM_TRASH:'RESTORE_FROM_TRASH',
  PERMANENT_DELETE_TRASH:'PERMANENT_DELETE_TRASH',
  EMPTY_TRASH:'EMPTY_TRASH',
  ADD_REPORT:'ADD_REPORT', APPROVE_REPORT:'APPROVE_REPORT', DELETE_REPORT:'DELETE_REPORT',
  SET_REPORTS:'SET_REPORTS',
  SET_GOOGLE_TOKEN:'SET_GOOGLE_TOKEN',
  ADD_QUIZ_RESULT:'ADD_QUIZ_RESULT',
  ADD_VOCAB_SET:'ADD_VOCAB_SET', EDIT_VOCAB_SET:'EDIT_VOCAB_SET', DELETE_VOCAB_SET:'DELETE_VOCAB_SET',
  MARK_WORD_LEARNED:'MARK_WORD_LEARNED', INCREMENT_WORD_LEVEL:'INCREMENT_WORD_LEVEL',
};

const init = {
  currentUser:null, isLoading:true,
  members:[], grades:{}, tasks:[], smeMap:{}, subjectTasks:{}, subjectComments:{},
  calEvents:[], roadmap:[], votes:[], notifications:[],
  attendance:[], docs:{}, contributions:{},
  auditLogs:[], toasts:[], unreadCount:0, semesterLabels:{},
  vocab:{}, userVocab:{}, quizHistory:{}, config: {}, trash: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────
function makeTrashItem(type, data, meta, payload) {
  return {
    id: payload.trashId, type, data, meta: meta || {},
    deletedAt: payload.deletedAt,
    deletedBy: payload.deletedBy || '',
    deletedByName: payload.deletedByName || 'Unknown',
  };
}

// ── Reducer ────────────────────────────────────────────────────────────────
function reducer(s, { type, payload }) {
  switch (type) {
    case A.SET_USER:    return { ...s, currentUser: payload, isLoading: payload ? s.isLoading : false };
    case A.SET_LOADING: return { ...s, isLoading: payload };
    case A.SET_GOOGLE_TOKEN: return { ...s, googleToken: payload };
    case A.INIT_DATA: {
      return {
        ...s, ...payload,
        // reports is managed separately via SET_REPORTS to avoid race conditions
        reports: s.reports,
        unreadCount: (payload.notifications||[]).filter(n=>!n.read).length,
      };
    }

    case A.SET_REPORTS: {
      // Local-wins merge: Firebase is authoritative for known records,
      // but local-only records (newly added, not yet in Firebase) are preserved.
      const fbMap = new Map();
      (payload || []).forEach(r => r?.id && fbMap.set(r.id, r));
      // Keep any local records that Firebase doesn't know about yet
      const localOnly = (s.reports || []).filter(r => r?.id && !fbMap.has(r.id));
      return { ...s, reports: [...(payload || []), ...localOnly] };
    }

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
      const trashItem = makeTrashItem('task', item, {}, { trashId, deletedAt, deletedBy, deletedByName });
      return { ...s, tasks:s.tasks.filter(x=>x.id!==id), trash:[...(s.trash||[]), trashItem] };
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
      return {
        ...s,
        subjectTasks:{...s.subjectTasks,[subjectId]:(s.subjectTasks[subjectId]||[]).filter(t=>t.id!==taskId)},
        trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]),
      };
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
      return {
        ...s, calEvents: s.calEvents.filter(e=>e.id!==id),
        trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]),
      };
    }

    case A.UPDATE_ROADMAP: {
      const {year,eventId,field,value}=payload;
      return { ...s, roadmap:s.roadmap.map(y=>y.year===year?{...y,events:y.events.map(e=>e.id===eventId?{...e,[field]:value}:e)}:y) };
    }
    // FIX: dùng toArr để tránh crash khi y.events là object (do Firebase trả về)
    case A.ADD_ROADMAP_EVENT: return { ...s, roadmap:s.roadmap.map(y=>y.year===payload.year?{...y,events:[...toArr(y.events),payload.event]}:y) };
    case A.DEL_ROADMAP_EVENT: {
      const { year, eventId, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const yearObj = s.roadmap.find(y=>y.year===year);
      const item = yearObj?.events?.find(e=>e.id===eventId);
      const trashItem = item ? makeTrashItem('roadmapEvent', item, { year }, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return {
        ...s,
        roadmap: s.roadmap.map(y=>y.year===year?{...y,events:y.events.filter(e=>e.id!==eventId)}:y),
        trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]),
      };
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
        // FIX: dùng toArr để tránh crash khi options/votes là object từ Firebase
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
    case A.DELETE_VOTE:     return { ...s, votes:s.votes.filter(x=>x.id!==payload) };
    case A.ADD_VOTE_OPTION: return { ...s, votes:s.votes.map(x=>x.id===payload.voteId?{...x,options:[...(x.options||[]),{id:uid(),text:payload.text,votes:[]}]}:x) };

    case A.MARK_NOTIF: {
      const n=s.notifications.map(x=>x.id===payload?{...x,read:true}:x);
      return { ...s, notifications:n, unreadCount:n.filter(x=>!x.read).length };
    }
    case A.MARK_ALL_READ: return { ...s, notifications:s.notifications.map(x=>({...x,read:true})), unreadCount:0 };
    case A.ADD_NOTIF:       return { ...s, notifications:[payload,...s.notifications], unreadCount:s.unreadCount+1 };

    case A.ADD_ATTENDANCE_SESSION: return { ...s, attendance:[payload,...s.attendance] };
    case A.CHECK_ATTENDANCE: {
      const {sessionId,userId,checked}=payload;
      // FIX: dùng toArr để tránh crash khi present là object từ Firebase
      return { ...s, attendance:s.attendance.map(sess=>sess.sessionId===sessionId?{...sess,present:checked?[...new Set([...toArr(sess.present),userId])]:toArr(sess.present).filter(u=>u!==userId)}:sess) };
    }

    case A.DELETE_ATTENDANCE_SESSION: {
      const { sessionId, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = s.attendance.find(a => a.sessionId === sessionId);
      const trashItem = item ? makeTrashItem('attendanceSession', item, {}, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return { 
        ...s, 
        attendance: s.attendance.filter(a => a.sessionId !== sessionId),
        trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]),
      };
    }

    case A.EDIT_ATTENDANCE_SESSION:
      return { 
        ...s, 
        attendance: s.attendance.map(a => 
          a.sessionId === payload.sessionId ? { ...a, ...payload } : a
        ) 
      };

    case A.ADD_DOC: {
      const {subjectId,doc}=payload;
      return { ...s, docs:{...s.docs,[subjectId]:[...(s.docs[subjectId]||[]),doc]} };
    }
    case A.DELETE_DOC: {
      const { subjectId, docId, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = (s.docs[subjectId]||[]).find(d=>d.id===docId);
      const trashItem = item ? makeTrashItem('doc', item, { subjectId }, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return {
        ...s, docs:{...s.docs,[subjectId]:(s.docs[subjectId]||[]).filter(x=>x.id!==docId)},
        trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]),
      };
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
    case A.REMOVE_MEMBER:
      return { ...s, members: s.members.filter(m => m.id !== payload) };
    case A.ADD_CONTRIBUTION: {
      const {userId,points}=payload;
      if(!userId||!points||points<=0)return s;
      return { ...s, contributions:{...s.contributions,[userId]:(Number(s.contributions[userId])||0)+points} };
    }
    case A.ADD_AUDIT:    return { ...s, auditLogs:[payload,...s.auditLogs].slice(0,100) };
    case A.ADD_TOAST:    return { ...s, toasts:[...s.toasts,payload] };
    case A.REMOVE_TOAST: return { ...s, toasts:s.toasts.filter(t=>t.id!==payload) };
    case A.UPDATE_SEMESTER_LABEL: return { ...s, semesterLabels:{...s.semesterLabels,[payload.key]:payload.label} };
    
    case A.ADD_REPORT: return { ...s, reports: [payload, ...(s.reports||[])] };
    case A.APPROVE_REPORT: return { ...s, reports: (s.reports||[]).map(r => r.id === payload ? { ...r, status: 'approved' } : r) };
    case A.DELETE_REPORT: {
      const { id, trashId, deletedAt, deletedBy, deletedByName } = payload;
      const item = (s.reports||[]).find(r => r.id === id);
      const trashItem = item ? makeTrashItem('report', item, {}, { trashId, deletedAt, deletedBy, deletedByName }) : null;
      return {
        ...s, reports: (s.reports||[]).filter(r => r.id !== id),
        trash: trashItem ? [...(s.trash||[]), trashItem] : (s.trash||[]),
      };
    }

    case A.RESTORE_FROM_TRASH: {
      const item = (s.trash||[]).find(t=>t.id===payload);
      if (!item) return s;
      const newTrash = (s.trash||[]).filter(t=>t.id!==payload);
      switch (item.type) {
        case 'task':         return { ...s, trash:newTrash, tasks:[item.data,...s.tasks] };
        case 'doc': {
          const sid = item.meta.subjectId;
          return { ...s, trash:newTrash, docs:{...s.docs,[sid]:[item.data,...(s.docs[sid]||[])]} };
        }
        case 'event':        return { ...s, trash:newTrash, calEvents:[...s.calEvents,item.data] };
        case 'subjectTask': {
          const sid = item.meta.subjectId;
          return { ...s, trash:newTrash, subjectTasks:{...s.subjectTasks,[sid]:[...(s.subjectTasks[sid]||[]),item.data]} };
        }
        case 'roadmapEvent': {
          const year = item.meta.year;
          return { ...s, trash:newTrash, roadmap:s.roadmap.map(y=>y.year===year?{...y,events:[...y.events,item.data]}:y) };
        }
        case 'report':       return { ...s, trash:newTrash, reports:[item.data, ...s.reports] };
        case 'attendanceSession': return { ...s, trash:newTrash, attendance:[item.data, ...s.attendance] };
        default: return { ...s, trash:newTrash };
      }
    }
    case A.PERMANENT_DELETE_TRASH:
      return { ...s, trash:(s.trash||[]).filter(t=>t.id!==payload) };
    case A.EMPTY_TRASH:
      return { ...s, trash:[] };

    case A.ADD_VOCAB_SET: return { ...s, vocab:{...s.vocab, [payload.id]:payload} };
    case A.EDIT_VOCAB_SET: return { ...s, vocab:{...s.vocab, [payload.id]:{...s.vocab[payload.id], ...payload}} };
    case A.DELETE_VOCAB_SET: {
      const {id} = payload;
      const newVocab = {...s.vocab};
      delete newVocab[id];
      return { ...s, vocab:newVocab };
    }
    case A.MARK_WORD_LEARNED: {
      const {setId, wordIndex, userId, learned} = payload;
      const idx = String(wordIndex);
      const userSets = s.userVocab[userId] || {};
      const currentSetData = userSets[setId] || {};
      
      // Migrate array to object if needed
      let levels = Array.isArray(currentSetData) 
        ? currentSetData.reduce((acc, i) => ({ ...acc, [i]: 6 }), {})
        : { ...currentSetData };

      if (learned) levels[idx] = 6;
      else delete levels[idx];

      return { ...s, userVocab: { ...s.userVocab, [userId]: { ...userSets, [setId]: levels } } };
    }
    case A.INCREMENT_WORD_LEVEL: {
      const {setId, wordIndex, userId} = payload;
      const idx = String(wordIndex);
      const userSets = s.userVocab[userId] || {};
      const currentSetData = userSets[setId] || {};
      
      let levels = Array.isArray(currentSetData) 
        ? currentSetData.reduce((acc, i) => ({ ...acc, [i]: 6 }), {})
        : { ...currentSetData };

      const curLv = Number(levels[idx]) || 0;
      if (curLv < 6) levels[idx] = curLv + 1;

      return { ...s, userVocab: { ...s.userVocab, [userId]: { ...userSets, [setId]: levels } } };
    }
    case A.ADD_QUIZ_RESULT: {
      const { userId, result } = payload;
      const prev = s.quizHistory[userId] || [];
      return { ...s, quizHistory: { ...s.quizHistory, [userId]: [result, ...prev] } };
    }

    default: return s;
  }
}

const AppContext = createContext(null);
const timerMap  = {};

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);
  const skipSyncRef     = useRef(false);
  const fromFirebaseRef = useRef(false);

  // ── Global font-size scaling (tăng cỡ chữ toàn app) ──────────────────────
  useEffect(() => {
    const el = document.createElement('style');
    el.id = '2x18-font-scale';
    el.textContent = `
      html { font-size: 15.5px !important; }
      .text-xs   { font-size: 0.82rem !important; }
      .text-sm   { font-size: 0.92rem !important; }
      .text-base { font-size: 1rem   !important; }
    `;
    document.head.appendChild(el);
    return () => { document.getElementById('2x18-font-scale')?.remove(); };
  }, []);

  // ── Request browser notification permission ────────────────────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubListeners = [];
    let gradeUnsubs = {};

    try {
      const stored = localStorage.getItem('2x18_current_user');
      if (stored) dispatch({ type:A.SET_USER, payload:JSON.parse(stored) });
      const storedToken = localStorage.getItem('2x18_google_token');
      if (storedToken) dispatch({ type:A.SET_GOOGLE_TOKEN, payload:storedToken });
    } catch {}

    const subscribeDB = () => {
      // Clear old listeners if re-subscribing
      unsubListeners.forEach(u => u());
      unsubListeners = [];
      Object.values(gradeUnsubs).forEach(u => u());
      gradeUnsubs = {};

      dispatch({ type:A.SET_LOADING, payload:true });

      const loadedNodes = new Set();
      const nodesToLoad = 19; // Updated to include config

      const checkLoaded = (nodeKey) => {
        loadedNodes.add(nodeKey);
        if (loadedNodes.size >= nodesToLoad) {
          dispatch({ type: A.SET_LOADING, payload: false });
        }
      };

      const listen = (dbKey, stateKey, transform) => {
        const u = onValue(ref(db, dbKey), (snap) => {
          const finalVal = transform ? transform(snap.val()) : snap.val();
          fromFirebaseRef.current = true;
          // Reuse INIT_DATA as a MERGE_DATA action since it uses ...s, ...payload
          dispatch({ type: A.INIT_DATA, payload: { [stateKey]: finalVal } });
          checkLoaded(dbKey);
        }, (err) => {
          console.error(`[Firebase DB] Access denied for ${dbKey}:`, err.message);
          checkLoaded(dbKey);
        });
        unsubListeners.push(u);
      };

      // 1. Members and dynamic Grades listeners
      listen('2x18_members', 'members', (val) => {
        const membersArr = toArr(val);
        const currentIds = membersArr.filter(m => m && m.id).map(m => m.id);
        
        // Cleanup grade listeners for deleted members
        Object.keys(gradeUnsubs).forEach(id => {
          if (!currentIds.includes(id)) {
            gradeUnsubs[id]();
            delete gradeUnsubs[id];
          }
        });

        // Add grade listeners for new members
        currentIds.forEach(id => {
          if (!gradeUnsubs[id]) {
            gradeUnsubs[id] = onValue(ref(db, `${id}_grades`), (snap) => {
               fromFirebaseRef.current = true;
               dispatch({ type: A.SYNC_GRADES, payload: { userId: id, gradesData: snap.val() || {} } });
            });
          }
        });
        
        return membersArr;
      });

      // 2. All other nodes
      listen('2x18_sme', 'smeMap', v => v || {});
      listen('2x18_tasks', 'tasks', toArr);
      listen('2x18_events', 'calEvents', toArr);
      listen('2x18_roadmap', 'roadmap', v => toArr(v).map(y => ({ ...y, events: toArr(y.events) })));
      listen('2x18_votes', 'votes', v => toArr(v).map(vt => ({ ...vt, options: toArr(vt.options).map(o => ({ ...o, votes: toArr(o.votes) })) })));
      listen('2x18_notifs', 'notifications', toArr);
      listen('2x18_attendance', 'attendance', v => toArr(v).map(sess => ({ ...sess, present: Array.isArray(sess.present) ? sess.present.filter(Boolean) : toArr(sess.present), total: sess.total || 0 })));
      listen('2x18_contributions', 'contributions', v => v || {});
      listen('2x18_docs', 'docs', v => v || {});
      listen('2x18_audit', 'auditLogs', toArr);
      listen('2x18_subject_tasks', 'subjectTasks', v => v || {});
      listen('2x18_subject_comments', 'subjectComments', v => v || {});
      listen('2x18_semester_labels', 'semesterLabels', v => v || {});
      listen('2x18_trash', 'trash', toArr);
      listen('2x18_vocab', 'vocab', v => v || {});
      listen('2x18_user_vocab', 'userVocab', v => v || {});
      listen('2x18_quiz_history', 'quizHistory', v => v || {});
      listen('2x18_config', 'config', v => v || {});

      // 3. Isolated Reports Listener
      const unsubReports = onValue(ref(db, '2x18_reports'), (snap) => {
        dispatch({ type: A.SET_REPORTS, payload: toArr(snap.val()) });
      });
      unsubListeners.push(unsubReports);
    };

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        subscribeDB();
      } else {
        localStorage.removeItem('2x18_current_user');
        unsubListeners.forEach(u => u());
        unsubListeners = [];
        Object.values(gradeUnsubs).forEach(u => u());
        gradeUnsubs = {};
        
        fromFirebaseRef.current = false;
        dispatch({ type:A.SET_USER, payload:null });
        dispatch({ type:A.INIT_DATA, payload: {
          members:[], grades:{}, smeMap:{}, tasks:[],
          calEvents:[], roadmap:[], votes:[],
          notifications:[], attendance:[], contributions:{},
          docs:{}, auditLogs:[], subjectTasks:{}, subjectComments:{},
          semesterLabels:{}, trash: [], config: {}, toasts: [],
        }});
      }
    });

    return () => { 
      unsubListeners.forEach(u => u());
      Object.values(gradeUnsubs).forEach(u => u());
      unsubAuth(); 
    };
  }, []);




  // ── Sync currentUser from members ─────────────────────────────────────────
  useEffect(() => {
    if (skipSyncRef.current) { skipSyncRef.current = false; return; }
    const cu = state.currentUser;
    if (!cu || state.isLoading) return;
    const fresh = state.members.find(m => m.id === cu.id);
    if (!fresh) return;
    const hasChange = ['role','status','fullName','phone','gender','mssv','mailSchool'].some(
      f => fresh[f] !== cu[f]
    );
    if (hasChange) {
      const merged = { ...cu, ...fresh };
      dispatch({ type:A.SET_USER, payload:merged });
      localStorage.setItem('2x18_current_user', JSON.stringify(merged));
    }
  }, [state.members]); // eslint-disable-line

  // ── Auto-sync to Firebase ─────────────────────────────────────────────────


  useEffect(() => {
    if (state.isLoading) return; 
    
    // logic skip sync if just came from firebase remains but let's be less aggressive
    if (fromFirebaseRef.current) {
      fromFirebaseRef.current = false;
      // We don't return here anymore to ensure user changes in the same batch aren't lost
    }
    if (!state.currentUser || state.currentUser.status === 'pending') return;
    if (state.isLoading || !state.members.length) return;
    
    const membersMap = {};
    state.members.forEach(m => { if (m.id) membersMap[m.id] = m; });
    fbSet('2x18_members', membersMap);

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
    fbSet('2x18_vocab',            state.vocab);
    fbSet('2x18_user_vocab',       state.userVocab);
    // fbSet('2x18_config',           state.config); // Handled by updateConfig to avoid loops
    // fbSet('2x18_quiz_history',     state.quizHistory); // Removed from global sync for reliability
    Object.entries(state.grades).forEach(([uid, g]) => {
      if (uid && g) fbSet(`${uid}_grades`, g);
    });
  }, [ // eslint-disable-line
    state.members, state.smeMap, state.tasks, state.calEvents, state.roadmap,
    state.votes, state.notifications, state.contributions,
    state.docs, state.auditLogs, state.subjectTasks, state.subjectComments,
    state.semesterLabels, state.grades, state.attendance, state.trash,
    state.vocab, state.userVocab, state.quizHistory, state.isLoading
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
  const toast    = useCallback((msg, type='info', duration=3500) =>
    dispatch({ type:A.ADD_TOAST, payload:{id:uid(),msg,type,duration} }), []);
  const rmToast  = useCallback(id => dispatch({ type:A.REMOVE_TOAST, payload:id }), []);
  const addAudit = useCallback((action,target='',detail='') =>
    dispatch({ type:A.ADD_AUDIT, payload:{id:uid(),action,target,detail,time:new Date().toISOString()} }), []);
  const trashMeta = useCallback(() => ({
    trashId:     uid(),
    deletedAt:   new Date().toISOString(),
    deletedBy:   state.currentUser?.id    || '',
    deletedByName: state.currentUser?.fullName || 'Unknown',
  }), [state.currentUser]);

  // ── Notification helper — dispatch in-app + browser push ──────────────────
  const pushNotif = useCallback((msg, type = 'system', link = '') => {
    const n = { id: uid(), msg, type, link, read: false, time: new Date().toISOString() };
    dispatch({ type: A.ADD_NOTIF, payload: n });
    if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      try {
        new Notification('2X18 — ' + (type === 'task' ? '📋' : type === 'vote' ? '🗳️' : type === 'calendar' ? '📅' : type === 'member' ? '👥' : type === 'sme' ? '📄' : '🔔') + ' Thông báo mới', {
          body: msg,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: n.id,
        });
      } catch (e) { /* ignore */ }
    }
  }, []);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;

      let member = null;
      const snap1 = await get(ref(db, `2x18_members/${fbUser.uid}`));
      if (snap1.val()) {
        member = snap1.val();
      } else {
        const snapAll = await get(ref(db, '2x18_members'));
        member = toArr(snapAll.val()).find(m => m.email === email || m.mailSchool === email);
      }

      if (!member) {
        await signOut(auth).catch(() => {});
        throw new Error('NOT_FOUND');
      }
      if (member.status === 'pending') {
        await signOut(auth).catch(() => {});
        throw new Error('PENDING');
      }
      const user = { ...member, uid: fbUser.uid };
      dispatch({ type: A.SET_USER, payload: user });
      localStorage.setItem('2x18_current_user', JSON.stringify(user));
    } catch (err) {
      if (err.message === 'PENDING' || err.message === 'NOT_FOUND') throw err;
      const msg = {
        'auth/user-not-found':     'Tài khoản không tồn tại.',
        'auth/wrong-password':     'Mật khẩu không đúng.',
        'auth/invalid-email':      'Email không hợp lệ.',
        'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
        'auth/too-many-requests':  'Quá nhiều lần thử. Thử lại sau.',
      }[err.code] || 'Đăng nhập thất bại.';
      throw new Error(msg);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      console.log('[Auth] Starting Google Login...');
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;
      const isSA = fbUser.email === SUPER_ADMIN_EMAIL;

      const snap = await get(ref(db, `2x18_members/${fbUser.uid}`));
      let member = snap.val();

      if (!member) {
        member = {
          id: fbUser.uid, uid: fbUser.uid,
          email: fbUser.email, mailSchool: fbUser.email,
          fullName: fbUser.displayName || 'Thành viên',
          avatarUrl: fbUser.photoURL || '',
          avatar: (fbUser.displayName || 'NT').split(' ').map(w => w[0]).slice(-2).join('').toUpperCase(),
          role: isSA ? 'super_admin' : 'member',
          status: isSA ? 'active' : 'pending',
          mssv: '', phone: '', gender: '',
          registeredAt: new Date().toISOString(),
        };
        await set(ref(db, `2x18_members/${fbUser.uid}`), member);
      } else {
        const googlePhoto = fbUser.photoURL || '';
        const needsAvatarSync = googlePhoto && member.avatarUrl !== googlePhoto;
        const needsAdminFix = isSA && (member.role !== 'super_admin' || member.status !== 'active');

        if (needsAvatarSync || needsAdminFix) {
          member = {
            ...member,
            avatarUrl: googlePhoto || member.avatarUrl || '',
            ...(needsAdminFix ? { role: 'super_admin', status: 'active' } : {}),
          };
          await set(ref(db, `2x18_members/${member.id}`), member);
        }
      }

      if (member.status === 'pending') {
        await signOut(auth).catch(() => {});
        return { status: 'pending', name: member.fullName, email: member.email };
      }

      const user = { ...member, uid: fbUser.uid };
      dispatch({ type: A.SET_USER, payload: user });
      localStorage.setItem('2x18_current_user', JSON.stringify(user));
      
      const credential = GoogleAuthProvider.credentialFromResult(cred);
      if (credential?.accessToken) {
        dispatch({ type: A.SET_GOOGLE_TOKEN, payload: credential.accessToken });
        localStorage.setItem('2x18_google_token', credential.accessToken);
      }
      
      console.log('[Auth] Google Login Success');
      return { status: 'ok' };
    } catch (err) {
      console.error('[Auth] Google Login Error:', err);
      const msg = {
        'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup và thử lại!',
        'auth/cancelled-popup-request': 'Yêu cầu đăng nhập đã bị hủy.',
        'auth/popup-closed-by-user': 'Cửa sổ đăng nhập đã bị đóng.',
        'auth/unauthorized-domain': 'Tên miền này chưa được cấp phép trong Firebase Console!',
        'auth/network-request-failed': 'Lỗi kết nối mạng. Hãy kiểm tra lại đường truyền!',
      }[err.code] || `Lỗi đăng nhập Google: ${err.message}`;
      
      toast(msg, 'error');
      throw err;
    }
  }, [toast]);

  const register = useCallback(async (userData) => {
    const { email, password, ho='', ten='', mssv='', phone='', reason='' } = userData;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;
    const fullName = `${ho.trim()} ${ten.trim()}`.trim() || userData.fullName || 'Thành viên';
    
    const newMember = {
      id: fbUser.uid, uid: fbUser.uid,
      email, mailSchool: email,
      fullName, mssv: mssv.trim(), phone: phone.trim(),
      gender: '',
      avatar: (fullName.split(' ').filter(Boolean).map(w => w[0]).slice(-2).join('') || 'TV').toUpperCase(),
      role: 'member', status: 'pending',
      reason,
      registeredAt: new Date().toISOString(),
    };
    
    await set(ref(db, `2x18_members/${fbUser.uid}`), newMember);
    await signOut(auth).catch(() => {});
    return newMember;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem('2x18_current_user');
    localStorage.removeItem('2x18_google_token');
    dispatch({ type: A.SET_GOOGLE_TOKEN, payload: null });
  }, []);

  const requireGoogleAuth = useCallback(async (force = false) => {
    if (state.googleToken && !force) return state.googleToken;
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      // Nếu force, xóa token cũ trước
      if (force) {
        dispatch({ type: A.SET_GOOGLE_TOKEN, payload: null });
        localStorage.removeItem('2x18_google_token');
      }

      const cred = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(cred);
      if (credential?.accessToken) {
        dispatch({ type: A.SET_GOOGLE_TOKEN, payload: credential.accessToken });
        localStorage.setItem('2x18_google_token', credential.accessToken);
        return credential.accessToken;
      }
    } catch (e) {
      console.error('[requireGoogleAuth]', e);
      toast('Vui lòng cấp quyền Google để dùng tính năng này!', 'error');
    }
    return null;
  }, [state.googleToken, toast]);

  // ── PROFILE & FEATURES ────────────────────────────────────────────────────
  const updateProfile = useCallback((profileData) => {
    skipSyncRef.current = true;
    const merged = { ...state.currentUser, ...profileData };
    dispatch({ type:A.UPDATE_PROFILE, payload:merged });
    localStorage.setItem('2x18_current_user', JSON.stringify(merged));
    
    // FIX: Ghi trực tiếp để tránh lỗi phân quyền từ auto-sync
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
      // FIX: Cập nhật status trực tiếp của 1 người
      await set(ref(db, `2x18_members/${memberId}/status`), 'active');
      dispatch({ type: A.UPDATE_PROFILE, payload: { id: memberId, status: 'active' } });
      pushNotif(`Đã duyệt thành viên mới vào nhóm!`, 'member', '/profile');
      toast('Đã duyệt thành viên! ✓', 'success');
    } catch (e) {
      console.error('[approveUser]', e);
      toast('Lỗi khi duyệt. Thử lại.', 'error');
    }
  }, [toast]);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      const merged = { 
        ...state.config, 
        ...newConfig, 
        updatedAt: new Date().toISOString(),
        updatedBy: state.currentUser?.fullName || 'Admin'
      };
      
      // Optimistic update: Update local state immediately
      dispatch({ type: A.INIT_DATA, payload: { config: merged } });
      
      // Persist to Firebase
      await set(ref(db, '2x18_config'), merged);
      
      toast('Đã lưu cấu hình hệ thống! ✓', 'success');
      return true;
    } catch (e) {
      console.error('[updateConfig]', e);
      toast('Lỗi khi lưu cấu hình. Kiểm tra quyền Admin.', 'error');
      return false;
    }
  }, [state.config, state.currentUser, toast]);

  const rejectUser = useCallback(async (memberId) => {
    try {
      // FIX: Xóa thẳng nhánh của người đó
      await set(ref(db, `2x18_members/${memberId}`), null);
      dispatch({ type: A.REMOVE_MEMBER, payload: memberId });
      toast('Đã từ chối đơn đăng ký.', 'info');
    } catch (e) {
      console.error('[rejectUser]', e);
      toast('Lỗi khi từ chối. Thử lại.', 'error');
    }
  }, [toast]);

  const kickMember = useCallback(async (memberId) => {
    try {
      const updates = {};
      updates[`2x18_members/${memberId}`] = null;
      updates[`${memberId}_grades`] = null;
      updates[`2x18_contributions/${memberId}`] = null;
      
      await update(ref(db), updates);
      
      toast('Đã xóa dữ liệu thành viên thành công!', 'success');
      addAudit('kick_member', `ID: ${memberId}`);
    } catch (err) {
      console.error('[kickMember]', err);
      toast('Lỗi khi kick thành viên: ' + err.message, 'error');
    }
  }, [toast, addAudit]);

  // ── GRADES & FEATURES ─────────────────────────────────────────────────────
  const syncGrades   = useCallback((userId, gradesData) => {
    dispatch({ type:A.SYNC_GRADES,    payload:{ userId, gradesData } });
    toast('Đã lưu bảng điểm!', 'success');
  }, [toast]);
  const updateGrade   = useCallback((userId, subjectId, field, value) =>
    dispatch({ type:A.UPDATE_GRADE,   payload:{ userId, subjectId, field, value } }), []);
  const updateProgress = useCallback((userId, subjectId, value) => {
    const prevValue = state.grades[userId]?.[subjectId]?.myProgress || 0;
    dispatch({ type:A.UPDATE_PROGRESS, payload:{ userId, subjectId, value } });
    if (value === 100 && prevValue < 100) {
      dispatch({type:A.ADD_CONTRIBUTION, payload:{userId, points:3000}});
      toast('Chúc mừng! Tiến độ môn học đạt 100%. +3000 điểm 🎓', 'success');
    }
  }, [state.grades, toast]);

  const addTask    = useCallback(t  => {
    dispatch({type:A.ADD_TASK,payload:{...t,id:uid(),done:false}});
    addAudit('Thêm task',t.subjectId,t.task);
    pushNotif(`📋 Task mới: "${t.task}"${t.subjectId ? ` — ${t.subjectId}` : ''}`, 'task', '/tasks');
    toast('Thêm task!','success');
  }, [addAudit, pushNotif, toast]);
  const editTask   = useCallback(t  => dispatch({type:A.EDIT_TASK,  payload:t}), []);
  const deleteTask = useCallback(id => { dispatch({ type:A.DELETE_TASK, payload:{ id, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);
  const toggleTask = useCallback(id => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const nextDone = !task.done;
    dispatch({type:A.TOGGLE_TASK,payload:id});
    if (nextDone) {
      dispatch({type:A.ADD_CONTRIBUTION, payload:{userId:state.currentUser?.id, points:1500}});
      toast('Hoàn thành task! +1500 điểm 🎉', 'success');
    }
  }, [state.tasks, state.currentUser?.id, toast]);

  const addSubjectTask    = useCallback((sid,t) => { dispatch({type:A.ADD_SUBJECT_TASK,payload:{subjectId:sid,task:{...t,id:uid(),doneBy:{}}}}); toast('Thêm mục!','success'); }, [toast]);
  const editSubjectTask   = useCallback((sid,t) => dispatch({type:A.EDIT_SUBJECT_TASK,payload:{subjectId:sid,task:t}}), []);
  const deleteSubjectTask = useCallback((sid,id) => { dispatch({ type:A.DELETE_SUBJECT_TASK, payload:{ subjectId:sid, taskId:id, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);
  const tickSubjectTask   = useCallback((sid,tid,userId,done) => dispatch({type:A.TICK_SUBJECT_TASK,payload:{subjectId:sid,taskId:tid,userId,done}}), []);

  const addSubjectComment = useCallback((subjectId, text) => {
    const comment = {
      id: uid(),
      user: state.currentUser?.fullName || 'Ẩn danh',
      text,
      time: new Date().toLocaleTimeString('vi'),
      date: new Date().toLocaleDateString('vi-VN'),
    };
    dispatch({ type:A.ADD_SUBJECT_COMMENT, payload:{ subjectId, comment } });
  }, [state.currentUser]);

  const setSme   = useCallback(p  => { dispatch({type:A.SET_SME,payload:p}); addAudit('Đổi SME',p.subjectId); toast('Cập nhật SME!','success'); }, [addAudit,toast]);
  const addEvent    = useCallback(e  => dispatch({type:A.ADD_EVENT,  payload:{...e,id:uid()}}), []);
  const editEvent   = useCallback(e  => dispatch({type:A.EDIT_EVENT, payload:e}), []);
  const deleteEvent = useCallback(id => { dispatch({ type:A.DELETE_EVENT, payload:{ id, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);

  const updateRoadmap     = useCallback(p    => dispatch({type:A.UPDATE_ROADMAP,   payload:p}), []);
  const addRoadmapEvent   = useCallback(p    => dispatch({type:A.ADD_ROADMAP_EVENT,payload:{...p,event:{...p.event,id:uid()}}}), []);
  const delRoadmapEvent   = useCallback(p    => { dispatch({ type:A.DEL_ROADMAP_EVENT, payload:{ ...p, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);
  const addRoadmapYear    = useCallback(year => dispatch({type:A.ADD_ROADMAP_YEAR, payload:year}), []);
  const deleteRoadmapYear = useCallback(year => dispatch({type:A.DELETE_ROADMAP_YEAR,payload:year}), []);

  const addVote       = useCallback(v  => {
    dispatch({type:A.ADD_VOTE, payload:{...v,id:uid()}});
    pushNotif(`🗳️ Bình chọn mới: "${v.title}"`, 'vote', '/voting');
  }, [pushNotif]);
  const castVote      = useCallback(p => {
    dispatch({type:A.CAST_VOTE, payload:p});
    // Award 500 points for voting
    dispatch({type:A.ADD_CONTRIBUTION, payload:{userId:state.currentUser?.id, points:500}});
    toast('Đã ghi nhận bình chọn! +500 điểm 🎉', 'success');
  }, [state.currentUser?.id, toast]);
  const closeVote     = useCallback(id => {
    dispatch({type:A.CLOSE_VOTE, payload:id});
    pushNotif('🔒 Một bình chọn vừa được đóng lại.', 'vote', '/voting');
  }, [pushNotif]);
  const addVoteOption = useCallback(p  => dispatch({type:A.ADD_VOTE_OPTION,payload:p}), []);
  const deleteVote    = useCallback(id => { dispatch({type:A.DELETE_VOTE, payload:id}); toast('Đã xóa bình chọn.','info'); }, [toast]);

  const markNotif   = useCallback(id => dispatch({type:A.MARK_NOTIF,  payload:id}), []);
  const markAllRead = useCallback(()  => dispatch({type:A.MARK_ALL_READ}), []);
  const addNotif    = pushNotif; // alias — pushNotif handles both dispatch + browser push

  const addAttendanceSession = useCallback((data) => {
    const sessionId = uid();
    const s = { ...data, sessionId, present: [], total: state.members.length };
    dispatch({ type: A.ADD_ATTENDANCE_SESSION, payload: s });
    set(ref(db, `2x18_attendance/${sessionId}`), s); // Ghi trực tiếp
    pushNotif(`📅 Buổi họp mới: "${data.sessionTitle}" — ${data.date}`, 'calendar', '/attendance');
    toast('Đã tạo buổi điểm danh!', 'success');
  }, [state.members.length, pushNotif, toast]);

  const checkAttendance = useCallback(({ sessionId, userId, checked }) => {
    const sess = state.attendance.find(a => a.sessionId === sessionId);
    if (!sess) return;
    
    if (checked && !sess.present?.includes(userId))
      dispatch({ type: A.ADD_CONTRIBUTION, payload: { userId, points: 1000 } });
    
    dispatch({ type: A.CHECK_ATTENDANCE, payload: { sessionId, userId, checked } });
    
    // Cập nhật danh sách present trực tiếp trong Firebase
    const nextPresent = checked 
      ? [...(sess.present || []), userId]
      : (sess.present || []).filter(id => id !== userId);
    set(ref(db, `2x18_attendance/${sessionId}/present`), nextPresent);
  }, [state.attendance]);

  const deleteAttendanceSession = useCallback((sessionId) => {
    const meta = trashMeta();
    const sess = state.attendance.find(s => s.sessionId === sessionId);
    dispatch({ type: A.DELETE_ATTENDANCE_SESSION, payload: { sessionId, ...meta } });
    
    set(ref(db, `2x18_attendance/${sessionId}`), null); // Xóa bản ghi
    if (sess) {
      set(ref(db, `2x18_trash/${meta.trashId}`), { id: meta.trashId, type: 'attendanceSession', data: sess, meta });
    }
    toast('Đã chuyển vào thùng rác.', 'info');
  }, [state.attendance, trashMeta, toast]);

  const editAttendanceSession = useCallback((data) => {
    dispatch({ type: A.EDIT_ATTENDANCE_SESSION, payload: data });
    // Merge với session hiện tại để không mất present/total
    const existing = state.attendance.find(s => s.sessionId === data.sessionId);
    const merged = { ...(existing || {}), ...data, present: existing?.present || [], total: existing?.total || 0 };
    set(ref(db, `2x18_attendance/${data.sessionId}`), merged);
    toast('Đã cập nhật thông tin!', 'success');
  }, [state.attendance, toast]);

  const addReport = useCallback((r) => {
    const id = uid();
    const newReport = { ...r, id, createdAt: new Date().toISOString() };
    
    dispatch({ type: A.ADD_REPORT, payload: newReport });
    // Ghi vào bản ghi cụ thể, tránh ghi đè toàn bộ mảng
    set(ref(db, `2x18_reports/${id}`), newReport); 
    
    addAudit('Đăng báo cáo', r.title, `Trạng thái: ${r.status}`);
    toast(r.status === 'approved' ? 'Đã đăng và tự động duyệt!' : 'Đã gửi báo cáo, chờ phê duyệt.', 'success');
  }, [addAudit, toast]);

  const approveReport = useCallback((id) => {
    const report = (state.reports || []).find(r => r.id === id);
    if (!report) return;

    dispatch({ type: A.APPROVE_REPORT, payload: id });
    // Cập nhật chỉ trường status của bản ghi đó
    set(ref(db, `2x18_reports/${id}/status`), 'approved');
    
    addAudit('Duyệt báo cáo', report.title);
    toast('Đã phê duyệt tài liệu!', 'success');
  }, [state.reports, addAudit, toast]);

  const deleteReport = useCallback((id) => {
    const report = (state.reports || []).find(r => r.id === id);
    if (!report) return;

    const meta = trashMeta();
    dispatch({ type: A.DELETE_REPORT, payload: { id, ...meta } });
    
    // Xóa bản ghi cụ thể và đẩy vào trash
    set(ref(db, `2x18_reports/${id}`), null);
    const trashItem = { id: meta.trashId, type: 'report', data: report, meta };
    set(ref(db, `2x18_trash/${meta.trashId}`), trashItem);
    
    addAudit('Xóa báo cáo', report.title);
    toast('Đã chuyển tài liệu vào thùng rác', 'info');
  }, [state.reports, trashMeta, addAudit, toast]);

  const addDoc = useCallback((subjectId,doc) => {
    const full = {...doc,id:uid(),uploadedBy:state.currentUser?.id,uploadedByName:state.currentUser?.fullName,uploadedAt:new Date().toLocaleDateString('vi-VN'),ratings:{},avgRating:0};
    dispatch({type:A.ADD_DOC,payload:{subjectId,doc:full}});
    addAudit('Upload tài liệu',subjectId,doc.name);
    dispatch({type:A.ADD_CONTRIBUTION,payload:{userId:state.currentUser?.id,points:2000}});
    pushNotif(`📄 Tài liệu mới: "${doc.name}" — môn ${subjectId}`, 'sme', '/subjects');
    toast(`Thêm "${doc.name}"! +2000 điểm`,'success');
  }, [addAudit, pushNotif, toast, state.currentUser]);

  const deleteDoc = useCallback((sid,did) => { dispatch({ type:A.DELETE_DOC, payload:{ subjectId:sid, docId:did, ...trashMeta() } }); toast('Đã chuyển vào thùng rác.', 'info'); }, [trashMeta, toast]);

  const rateDoc = useCallback((sid,did,stars) => {
    dispatch({type:A.RATE_DOC,payload:{subjectId:sid,docId:did,userId:state.currentUser?.id,stars}});
    if (stars===5) {
      const doc=(state.docs[sid]||[]).find(d=>d.id===did);
      if (doc?.uploadedBy && doc.uploadedBy!==state.currentUser?.id)
        dispatch({type:A.ADD_CONTRIBUTION,payload:{userId:doc.uploadedBy,points:3000}});
    }
    toast(`Đánh giá ${stars} sao!`,'success');
  }, [state.currentUser?.id,state.docs,toast]);

  const updateRole = useCallback(p => {
    dispatch({type:A.UPDATE_MEMBER_ROLE,payload:p});
    set(ref(db, `2x18_members/${p.memberId}/role`), p.role).catch(e => console.warn(e));
  }, []);
  
  const addContribution     = useCallback(p => dispatch({type:A.ADD_CONTRIBUTION,  payload:p}), []);
  const updateSemesterLabel = useCallback((key,label) => dispatch({type:A.UPDATE_SEMESTER_LABEL,payload:{key,label}}), []);

  // ── VOCABULARY ────────────────────────────────────────────────────────────
  const addVocabSet = useCallback((set) => {
    const id = uid();
    const newSet = { ...set, id, authorId: state.currentUser?.id, authorName: state.currentUser?.fullName, createdAt: new Date().toISOString() };
    dispatch({ type: A.ADD_VOCAB_SET, payload: newSet });
    toast('Đã tạo học phần mới!', 'success');
  }, [state.currentUser, toast]);

  const editVocabSet = useCallback((set) => {
    dispatch({ type: A.EDIT_VOCAB_SET, payload: set });
    toast('Đã cập nhật học phần!', 'success');
  }, [toast]);

  const deleteVocabSet = useCallback((id) => {
    dispatch({ type: A.DELETE_VOCAB_SET, payload: { id } });
    toast('Đã xóa học phần.', 'info');
  }, [toast]);

  const markWordLearned = useCallback((setId, wordIndex, learned) => {
    if (!state.currentUser?.id) return;
    dispatch({ type: A.MARK_WORD_LEARNED, payload: { setId, wordIndex, userId: state.currentUser.id, learned } });
  }, [state.currentUser]);

  const incrementWordLevel = useCallback((setId, wordIndex) => {
    if (!state.currentUser?.id) return;
    dispatch({ type: A.INCREMENT_WORD_LEVEL, payload: { setId, wordIndex, userId: state.currentUser.id } });
  }, [state.currentUser]);

  const addQuizResult = useCallback((result) => {
    if (!state.currentUser?.id) return;
    const userId = state.currentUser.id;
    const fullResult = { ...result, id: uid(), timestamp: new Date().toISOString() };
    
    // Ghi trực tiếp lên Firebase để đảm bảo không bị mất
    const historyRef = ref(db, `2x18_quiz_history/${userId}`);
    onValue(historyRef, (snapshot) => {
      // Chỉ lấy 1 lần duy nhất để update
    }, { onlyOnce: true });

    // Cách an toàn hơn: dùng push hoặc ghi đè node con
    const existingHistory = state.quizHistory[userId] || [];
    const newHistory = [fullResult, ...existingHistory];
    
    // Cập nhật local trước cho nhanh
    dispatch({ type: A.ADD_QUIZ_RESULT, payload: { userId, result: fullResult } });
    
    // Sau đó đẩy lên Firebase
    fbSet(`2x18_quiz_history/${userId}`, newHistory);
  }, [state.currentUser, state.quizHistory]);



  const restoreFromTrash = useCallback(async (id) => {
    const item = (state.trash || []).find(t => t.id === id);
    if (!item) return;

    dispatch({ type: A.RESTORE_FROM_TRASH, payload: id });
    
    // Xóa khỏi trash trên Firebase
    set(ref(db, `2x18_trash/${id}`), null);
    
    // Khôi phục về node gốc trên Firebase
    if (item.type === 'report') {
      set(ref(db, `2x18_reports/${item.data.id}`), item.data);
    } else if (item.type === 'doc') {
      const sid = item.meta.subjectId;
      // Docs vẫn dùng cơ chế cũ nên chỉ cần xóa trash, useEffect sẽ lo phần còn lại
    }
    // ... các loại khác tương tự
    
    toast('Đã khôi phục!', 'success');
  }, [state.trash, toast]);

  const permanentDeleteTrash = useCallback((id) => {
    dispatch({ type: A.PERMANENT_DELETE_TRASH, payload: id });
    // Xóa trực tiếp trên Firebase
    set(ref(db, `2x18_trash/${id}`), null);
    toast('Đã xóa vĩnh viễn.', 'info');
  }, [toast]);

  const emptyTrash = useCallback(() => {
    dispatch({ type: A.EMPTY_TRASH });
    set(ref(db, '2x18_trash'), null);
    toast('Đã dọn sạch thùng rác.', 'success');
  }, [toast]);

  const exportMembersCSV = useCallback(() => {
    const h=['STT','MSSV','Họ tên','Giới tính','Email HUS','SĐT','Role'];
    const r=state.members.filter(m=>m.status!=='pending').map((m,i)=>[i+1,m.mssv,m.fullName,m.gender||'',m.mailSchool||m.email||'',m.phone||'',m.role]);
    const csv=[h,...r].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'),{href:url,download:'2X18_Members.csv'});
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('Đã xuất danh sách!','success');
  }, [state.members,toast]);

  const isProfileComplete = useCallback((m) => {
    if (!m) return false;
    const has = f => m[f] && String(m[f]).trim() !== '';
    return (
      (has('mssv') || has('msv')) &&
      has('fullName') && has('gender') && has('dob') && has('ethnicity') &&
      has('bloodType') && has('pob') && has('phone') && has('mailVnu') &&
      has('mailSchool') && has('facebook')
    );
  }, []);

  const isSuperAdmin = state.currentUser?.role?.toLowerCase() === 'super_admin'
    || state.currentUser?.email === SUPER_ADMIN_EMAIL
    || state.currentUser?.mailSchool === SUPER_ADMIN_EMAIL;

  const isCore       = isSuperAdmin || state.currentUser?.role?.toLowerCase() === 'core';
  
  const myGrades     = state.grades[state.currentUser?.id] || {};

  // Enrich grades specifically for AI usage (Array format)
  const myGradesEnriched = useMemo(() => {
    return Object.entries(myGrades).map(([sid, scoreData]) => {
      const sub = subjectDatabase.find(s => s.id === sid);
      return {
        subjectId: sid,
        subjectName: sub?.name || sid,
        code: sub?.code || '',
        credits: sub?.credits || 0,
        status: scoreData?.status || 'Chưa rõ',
        ...scoreData
      };
    });
  }, [myGrades]);

  const myTasks      = state.tasks.filter(t => t.userId === state.currentUser?.id);
  const getMemberById  = id  => state.members.find(m => m.id === id);
  const getSmeMember   = sid => getMemberById(state.smeMap[sid]);
  const activeMembers  = state.members.filter(m => m.status !== 'pending');
  const pendingMembers = state.members.filter(m => m.status === 'pending');

  const value = {
    ...state, isCore, isSuperAdmin, myGrades, myGradesEnriched, myTasks,
    activeMembers, pendingMembers,
    login, logout, loginWithGoogle, register,
    toast, rmToast, addAudit,
    updateProfile, updateMemberProfile, syncGrades, updateGrade, updateProgress,
    approveUser, rejectUser, kickMember,
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
    addVocabSet, editVocabSet, deleteVocabSet, markWordLearned, addQuizResult,
    restoreFromTrash, permanentDeleteTrash, emptyTrash,
    addReport, approveReport, deleteReport,
    getMemberById, getSmeMember, isProfileComplete, exportMembersCSV,
    requireGoogleAuth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if(!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};