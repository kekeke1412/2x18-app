// src/context/AppContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { MOCK_MEMBERS, MOCK_SME, MOCK_VOTES, MOCK_NOTIFICATIONS, MOCK_ATTENDANCE, MOCK_CONTRIBUTIONS, MOCK_ROADMAP } from '../mockData';
import { auth, db, ref, set, onValue } from '../firebase';
import {
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
} from 'firebase/auth';

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Firebase write — OUTSIDE reducer (reducer phải là pure function)
const fbSet = (path, data) => {
  try { set(ref(db, path), data); } catch (e) { console.warn('[fbSet]', path, e?.message); }
};

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
  DEL_ROADMAP_EVENT:'DEL_ROADMAP_EVENT', ADD_ROADMAP_YEAR:'ADD_ROADMAP_YEAR', DELETE_ROADMAP_YEAR:'DELETE_ROADMAP_YEAR',
  ADD_VOTE:'ADD_VOTE', CAST_VOTE:'CAST_VOTE', CLOSE_VOTE:'CLOSE_VOTE', ADD_VOTE_OPTION:'ADD_VOTE_OPTION',
  MARK_NOTIF:'MARK_NOTIF', ADD_NOTIF:'ADD_NOTIF', MARK_ALL_READ:'MARK_ALL_READ',
  ADD_ATTENDANCE_SESSION:'ADD_ATTENDANCE_SESSION', CHECK_ATTENDANCE:'CHECK_ATTENDANCE',
  ADD_DOC:'ADD_DOC', DELETE_DOC:'DELETE_DOC', RATE_DOC:'RATE_DOC',
  UPDATE_MEMBER_ROLE:'UPDATE_MEMBER_ROLE', ADD_CONTRIBUTION:'ADD_CONTRIBUTION',
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

// PURE reducer — no side effects
function reducer(s, { type, payload }) {
  switch (type) {
    case A.SET_USER:    return { ...s, currentUser: payload };
    case A.SET_LOADING: return { ...s, isLoading: payload };
    case A.INIT_DATA:   return { ...s, ...payload, unreadCount:(payload.notifications||[]).filter(n=>!n.read).length, isLoading:false };

    case A.UPDATE_PROFILE: {
      const members = s.members.map(m => m.id===payload.id ? {...m,...payload} : m);
      const user = s.currentUser?.id===payload.id ? {...s.currentUser,...payload} : s.currentUser;
      return { ...s, members, currentUser:user };
    }
    case A.SYNC_GRADES: return { ...s, grades: { ...s.grades, [payload.userId]: payload.gradesData } };
    case A.UPDATE_GRADE: {
      const { userId, subjectId, field, value } = payload;
      const prev = s.grades[userId]||{};
      return { ...s, grades: { ...s.grades, [userId]: { ...prev, [subjectId]: { ...(prev[subjectId]||{}), [field]:value } } } };
    }
    case A.UPDATE_PROGRESS: {
      const { userId, subjectId, value } = payload;
      const prev = s.grades[userId]||{};
      return { ...s, grades: { ...s.grades, [userId]: { ...prev, [subjectId]: { ...(prev[subjectId]||{}), myProgress:value } } } };
    }
    case A.ADD_TASK:    return { ...s, tasks:[payload,...s.tasks] };
    case A.EDIT_TASK:   return { ...s, tasks:s.tasks.map(x=>x.id===payload.id?{...x,...payload}:x) };
    case A.DELETE_TASK: return { ...s, tasks:s.tasks.filter(x=>x.id!==payload) };
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
      const {subjectId,taskId}=payload;
      return { ...s, subjectTasks:{...s.subjectTasks,[subjectId]:(s.subjectTasks[subjectId]||[]).filter(t=>t.id!==taskId)} };
    }
    case A.TICK_SUBJECT_TASK: {
      const {subjectId,taskId,userId,done}=payload;
      return { ...s, subjectTasks:{...s.subjectTasks,[subjectId]:(s.subjectTasks[subjectId]||[]).map(t=>t.id===taskId?{...t,doneBy:{...(t.doneBy||{}),[userId]:done}}:t)} };
    }
    case A.SET_SME: return { ...s, smeMap:{...s.smeMap,[payload.subjectId]:payload.userId} };
    case A.ADD_EVENT:    return { ...s, calEvents:[...s.calEvents,payload] };
    case A.EDIT_EVENT:   return { ...s, calEvents:s.calEvents.map(e=>e.id===payload.id?payload:e) };
    case A.DELETE_EVENT: return { ...s, calEvents:s.calEvents.filter(e=>e.id!==payload) };
    case A.UPDATE_ROADMAP: {
      const {year,eventId,field,value}=payload;
      return { ...s, roadmap:s.roadmap.map(y=>y.year===year?{...y,events:y.events.map(e=>e.id===eventId?{...e,[field]:value}:e)}:y) };
    }
    case A.ADD_ROADMAP_EVENT: return { ...s, roadmap:s.roadmap.map(y=>y.year===payload.year?{...y,events:[...y.events,payload.event]}:y) };
    case A.DEL_ROADMAP_EVENT: return { ...s, roadmap:s.roadmap.map(y=>y.year===payload.year?{...y,events:y.events.filter(e=>e.id!==payload.eventId)}:y) };
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
        const opts=v.options.map(o=>{
          if(!multiSelect){const f=o.votes.filter(u=>u!==userId);return o.id===optionId?{...o,votes:[...f,userId]}:{...o,votes:f};}
          if(o.id!==optionId)return o;
          const has=o.votes.includes(userId);
          return {...o,votes:has?o.votes.filter(u=>u!==userId):[...o.votes,userId]};
        });
        return {...v,options:opts};
      })};
    }
    case A.CLOSE_VOTE:      return { ...s, votes:s.votes.map(x=>x.id===payload?{...x,closed:true}:x) };
    case A.ADD_VOTE_OPTION: return { ...s, votes:s.votes.map(x=>x.id===payload.voteId?{...x,options:[...x.options,{id:uid(),text:payload.text,votes:[]}]}:x) };
    case A.MARK_NOTIF: {
      const n=s.notifications.map(x=>x.id===payload?{...x,read:true}:x);
      return { ...s, notifications:n, unreadCount:n.filter(x=>!x.read).length };
    }
    case A.MARK_ALL_READ: return { ...s, notifications:s.notifications.map(x=>({...x,read:true})), unreadCount:0 };
    case A.ADD_NOTIF: return { ...s, notifications:[payload,...s.notifications], unreadCount:s.unreadCount+1 };
    case A.ADD_ATTENDANCE_SESSION: return { ...s, attendance:[payload,...s.attendance] };
    case A.CHECK_ATTENDANCE: {
      const {sessionId,userId,checked}=payload;
      return { ...s, attendance:s.attendance.map(sess=>sess.sessionId===sessionId?{...sess,present:checked?[...new Set([...sess.present,userId])]:sess.present.filter(u=>u!==userId)}:sess) };
    }
    case A.ADD_DOC: {
      const {subjectId,doc}=payload;
      return { ...s, docs:{...s.docs,[subjectId]:[...(s.docs[subjectId]||[]),doc]} };
    }
    case A.DELETE_DOC: {
      const {subjectId,docId}=payload;
      return { ...s, docs:{...s.docs,[subjectId]:(s.docs[subjectId]||[]).filter(x=>x.id!==docId)} };
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
    case A.ADD_CONTRIBUTION: {
      const {userId,points}=payload;
      if(!userId||!points||points<=0)return s;
      return { ...s, contributions:{...s.contributions,[userId]:(Number(s.contributions[userId])||0)+points} };
    }
    case A.ADD_AUDIT:    return { ...s, auditLogs:[payload,...s.auditLogs].slice(0,100) };
    case A.ADD_TOAST:    return { ...s, toasts:[...s.toasts,payload] };
    case A.REMOVE_TOAST: return { ...s, toasts:s.toasts.filter(t=>t.id!==payload) };
    case A.UPDATE_SEMESTER_LABEL: return { ...s, semesterLabels:{...s.semesterLabels,[payload.key]:payload.label} };
    default: return s;
  }
}

const AppContext = createContext(null);
const timerMap  = {};

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);

  // ── Boot: Firebase RTDB realtime listener ─────────────────────────────────
  useEffect(() => {
    // Restore session cache from localStorage first
    try {
      const stored = localStorage.getItem('2x18_current_user');
      if (stored) dispatch({ type: A.SET_USER, payload: JSON.parse(stored) });
    } catch {}

    // Firebase DB realtime listener (root)
    const unsubDB = onValue(ref(db, '/'), (snapshot) => {
      const val = snapshot.val() || {};
      const members = val['2x18_members'] || MOCK_MEMBERS;
      const grades  = {};
      members.forEach(m => { if (m?.id) grades[m.id] = val[`${m.id}_grades`] || {}; });
      dispatch({ type: A.INIT_DATA, payload: {
        members, grades,
        smeMap:         val['2x18_sme']            || MOCK_SME,
        tasks:          val['2x18_tasks']           || [],
        calEvents:      val['2x18_events']          || [],
        roadmap:        val['2x18_roadmap']         || MOCK_ROADMAP,
        votes:          val['2x18_votes']           || MOCK_VOTES,
        notifications:  val['2x18_notifs']          || MOCK_NOTIFICATIONS,
        attendance:     val['2x18_attendance']      || MOCK_ATTENDANCE,
        contributions:  val['2x18_contributions']   || MOCK_CONTRIBUTIONS,
        docs:           val['2x18_docs']            || {},
        auditLogs:      val['2x18_audit']           || [],
        subjectTasks:   val['2x18_subject_tasks']   || {},
        semesterLabels: val['2x18_semester_labels'] || {},
      }});
    }, (err) => {
      // Firebase rules blocked → show app with mock data
      console.error('[Firebase DB] Access denied:', err.message);
      console.warn('%c⚠️  Firebase Rules cần được cập nhật!\nVào Console → Realtime Database → Rules → set ".read":true ".write":true', 'color:orange;font-weight:bold');
      dispatch({ type: A.INIT_DATA, payload: {
        members:MOCK_MEMBERS, grades:{}, smeMap:MOCK_SME, tasks:[],
        calEvents:[], roadmap:MOCK_ROADMAP, votes:MOCK_VOTES,
        notifications:MOCK_NOTIFICATIONS, attendance:MOCK_ATTENDANCE,
        contributions:MOCK_CONTRIBUTIONS, docs:{}, auditLogs:[],
        subjectTasks:{}, semesterLabels:{},
      }});
    });

    // Firebase Auth state listener
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        localStorage.removeItem('2x18_current_user');
        dispatch({ type: A.SET_USER, payload: null });
      }
    });

    return () => { unsubDB(); unsubAuth(); };
  }, []);

  // ── Auto-sync state to Firebase when it changes ───────────────────────────
  useEffect(() => {
    if (state.isLoading || !state.members.length) return;
    fbSet('2x18_members',       state.members);
    fbSet('2x18_sme',           state.smeMap);
    fbSet('2x18_tasks',         state.tasks);
    fbSet('2x18_events',        state.calEvents);
    fbSet('2x18_roadmap',       state.roadmap);
    fbSet('2x18_votes',         state.votes);
    fbSet('2x18_notifs',        state.notifications);
    fbSet('2x18_attendance',    state.attendance);
    fbSet('2x18_contributions', state.contributions);
    fbSet('2x18_docs',          state.docs);
    fbSet('2x18_audit',         state.auditLogs);
    fbSet('2x18_subject_tasks', state.subjectTasks);
    fbSet('2x18_semester_labels', state.semesterLabels);
    Object.entries(state.grades).forEach(([uid, g]) => {
      if (uid && g) fbSet(`${uid}_grades`, g);
    });
  }, [ // eslint-disable-line
    state.members, state.smeMap, state.tasks, state.calEvents, state.roadmap,
    state.votes, state.notifications, state.attendance, state.contributions,
    state.docs, state.auditLogs, state.subjectTasks, state.semesterLabels, state.grades
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

  // ── Actions ───────────────────────────────────────────────────────────────
  const toast    = useCallback((msg, type='info', duration=3500) =>
    dispatch({ type:A.ADD_TOAST, payload:{id:uid(),msg,type,duration} }), []);
  const rmToast  = useCallback(id => dispatch({ type:A.REMOVE_TOAST, payload:id }), []);
  const addAudit = useCallback((action,target='',detail='') =>
    dispatch({ type:A.ADD_AUDIT, payload:{id:uid(),action,target,detail,time:new Date().toISOString()} }), []);

  // Helper: find profile by email across multiple email fields
  const findProfile = useCallback((email) =>
    state.members.find(m => m.email===email || m.mailSchool===email || m.mailPersonal===email),
    [state.members]);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    dispatch({ type:A.SET_LOADING, payload:true });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = findProfile(email) || {
        id: cred.user.uid, email: cred.user.email,
        fullName: cred.user.displayName || 'Thành viên',
        role: 'member', mssv: '', phone: '', gender: '',
        mailSchool: email,
      };
      localStorage.setItem('2x18_current_user', JSON.stringify(profile));
      dispatch({ type:A.SET_USER, payload:profile });
      toast('Đăng nhập thành công! 👋', 'success');
    } catch (err) {
      dispatch({ type:A.SET_LOADING, payload:false });
      const msg = { 'auth/user-not-found':'Tài khoản không tồn tại.', 'auth/wrong-password':'Mật khẩu không đúng.', 'auth/invalid-email':'Email không hợp lệ.', 'auth/invalid-credential':'Email hoặc mật khẩu không đúng.', 'auth/too-many-requests':'Quá nhiều lần thử. Thử lại sau.' }[err.code] || 'Đăng nhập thất bại.';
      toast(msg, 'error');
      throw new Error(msg);
    }
  }, [findProfile, toast]);

  const loginWithGoogle = useCallback(async () => {
    dispatch({ type:A.SET_LOADING, payload:true });
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt:'select_account' });
      const result = await signInWithPopup(auth, provider);
      const email  = result.user.email;
      let profile  = findProfile(email);
      if (!profile) {
        profile = {
          id:result.user.uid, email, mailSchool:email,
          fullName:result.user.displayName||'Thành viên',
          avatarUrl:result.user.photoURL||'',
          role:'member', mssv:'', phone:'', gender:'', status:'pending',
          avatar:(result.user.displayName||'NT').split(' ').map(w=>w[0]).slice(-2).join('').toUpperCase(),
        };
        const updated = [...state.members, profile];
        dispatch({ type:A.INIT_DATA, payload:{...state, members:updated, isLoading:false} });
        fbSet('2x18_members', updated);
      }
      localStorage.setItem('2x18_current_user', JSON.stringify(profile));
      dispatch({ type:A.SET_USER, payload:profile });
      toast('Đăng nhập Google thành công! 🎉', 'success');
    } catch (err) {
      dispatch({ type:A.SET_LOADING, payload:false });
      if (err.code !== 'auth/popup-closed-by-user') toast('Lỗi đăng nhập Google. Thử lại.', 'error');
      throw err;
    }
  }, [findProfile, state, toast]);

  const register = useCallback(async (userData) => {
    const { email, password, ho, ten, mssv, phone, reason } = userData;
    dispatch({ type:A.SET_LOADING, payload:true });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const newMember = {
        id:cred.user.uid, email, mailSchool:email,
        fullName:`${ho.trim()} ${ten.trim()}`,
        mssv:mssv.trim(), phone:phone.trim(),
        role:'member', status:'pending', reason:reason||'',
        gender:'', avatar:(ho.trim()[0]+(ten.trim().split(' ').pop()[0]||'')).toUpperCase(),
      };
      const updated = [...state.members, newMember];
      fbSet('2x18_members', updated);
      dispatch({ type:A.SET_LOADING, payload:false });
      toast('Đã gửi đơn! Chờ Core Team duyệt trong 1–2 ngày 📩', 'success');
      return cred.user;
    } catch (err) {
      dispatch({ type:A.SET_LOADING, payload:false });
      const msg = {'auth/email-already-in-use':'Email này đã có tài khoản.','auth/weak-password':'Mật khẩu quá yếu (≥ 6 ký tự).'}[err.code] || 'Đăng ký thất bại.';
      toast(msg, 'error');
      throw new Error(msg);
    }
  }, [state.members, toast]);

  const logout = useCallback(async () => {
    await signOut(auth).catch(()=>{});
    localStorage.removeItem('2x18_current_user');
    dispatch({ type:A.SET_USER, payload:null });
  }, []);

  const updateProfile = useCallback((p) => {
    dispatch({ type:A.UPDATE_PROFILE, payload:p });
    addAudit('Cập nhật hồ sơ', p.fullName||'');
    toast('Lưu hồ sơ thành công! ✓', 'success');
    localStorage.setItem('2x18_current_user', JSON.stringify({...state.currentUser,...p}));
  }, [addAudit, toast, state.currentUser]);

  const syncGrades    = useCallback((userId,gradesData) => { dispatch({type:A.SYNC_GRADES,payload:{userId,gradesData}}); toast('Lưu bảng điểm!','success'); }, [toast]);
  const updateGrade   = useCallback(p => dispatch({type:A.UPDATE_GRADE,   payload:p}), []);
  const updateProgress= useCallback(p => dispatch({type:A.UPDATE_PROGRESS,payload:p}), []);
  const addTask       = useCallback(t  => { dispatch({type:A.ADD_TASK,payload:{...t,id:uid(),done:false}}); addAudit('Thêm task',t.subjectId,t.task); toast('Thêm task!','success'); }, [addAudit,toast]);
  const editTask      = useCallback(t  => dispatch({type:A.EDIT_TASK,  payload:t}), []);
  const deleteTask    = useCallback(id => dispatch({type:A.DELETE_TASK,payload:id}), []);
  const toggleTask    = useCallback(id => dispatch({type:A.TOGGLE_TASK,payload:id}), []);
  const addSubjectTask    = useCallback((sid,t) => { dispatch({type:A.ADD_SUBJECT_TASK,payload:{subjectId:sid,task:{...t,id:uid(),doneBy:{}}}}); toast('Thêm mục!','success'); }, [toast]);
  const editSubjectTask   = useCallback((sid,t) => dispatch({type:A.EDIT_SUBJECT_TASK,  payload:{subjectId:sid,task:t}}), []);
  const deleteSubjectTask = useCallback((sid,id)=> dispatch({type:A.DELETE_SUBJECT_TASK,payload:{subjectId:sid,taskId:id}}), []);
  const tickSubjectTask   = useCallback((sid,tid,userId,done) => dispatch({type:A.TICK_SUBJECT_TASK,payload:{subjectId:sid,taskId:tid,userId,done}}), []);
  const setSme   = useCallback(p  => { dispatch({type:A.SET_SME,payload:p}); addAudit('Đổi SME',p.subjectId); toast('Cập nhật SME!','success'); }, [addAudit,toast]);
  const addEvent    = useCallback(e  => dispatch({type:A.ADD_EVENT,  payload:{...e,id:uid()}}), []);
  const editEvent   = useCallback(e  => dispatch({type:A.EDIT_EVENT, payload:e}), []);
  const deleteEvent = useCallback(id => dispatch({type:A.DELETE_EVENT,payload:id}), []);
  const updateRoadmap     = useCallback(p    => dispatch({type:A.UPDATE_ROADMAP,   payload:p}), []);
  const addRoadmapEvent   = useCallback(p    => dispatch({type:A.ADD_ROADMAP_EVENT,payload:{...p,event:{...p.event,id:uid()}}}), []);
  const delRoadmapEvent   = useCallback(p    => dispatch({type:A.DEL_ROADMAP_EVENT,payload:p}), []);
  const addRoadmapYear    = useCallback(year => dispatch({type:A.ADD_ROADMAP_YEAR, payload:year}), []);
  const deleteRoadmapYear = useCallback(year => dispatch({type:A.DELETE_ROADMAP_YEAR,payload:year}), []);
  const addVote       = useCallback(v  => dispatch({type:A.ADD_VOTE,      payload:{...v,id:uid()}}), []);
  const castVote      = useCallback(p  => dispatch({type:A.CAST_VOTE,      payload:p}), []);
  const closeVote     = useCallback(id => dispatch({type:A.CLOSE_VOTE,     payload:id}), []);
  const addVoteOption = useCallback(p  => dispatch({type:A.ADD_VOTE_OPTION,payload:p}), []);
  const markNotif   = useCallback(id => dispatch({type:A.MARK_NOTIF,   payload:id}), []);
  const markAllRead = useCallback(()  => dispatch({type:A.MARK_ALL_READ}), []);
  const addNotif    = useCallback(n   => dispatch({type:A.ADD_NOTIF,payload:{...n,id:uid(),read:false,time:new Date().toISOString()}}), []);

  const addAttendanceSession = useCallback((data) => {
    const s = {...data, sessionId:uid(), present:[], total:state.members.length};
    dispatch({type:A.ADD_ATTENDANCE_SESSION,payload:s});
    toast('Đã tạo buổi điểm danh!','success');
  }, [state.members.length,toast]);

  const checkAttendance = useCallback(({sessionId,userId,checked}) => {
    const sess = state.attendance.find(a=>a.sessionId===sessionId);
    if (checked && !sess?.present?.includes(userId))
      dispatch({type:A.ADD_CONTRIBUTION,payload:{userId,points:10}});
    dispatch({type:A.CHECK_ATTENDANCE,payload:{sessionId,userId,checked}});
  }, [state.attendance]);

  const addDoc = useCallback((subjectId,doc) => {
    const full = {...doc,id:uid(),uploadedBy:state.currentUser?.id,uploadedByName:state.currentUser?.fullName,uploadedAt:new Date().toLocaleDateString('vi-VN'),ratings:{},avgRating:0};
    dispatch({type:A.ADD_DOC,payload:{subjectId,doc:full}});
    addAudit('Upload tài liệu',subjectId,doc.name);
    dispatch({type:A.ADD_CONTRIBUTION,payload:{userId:state.currentUser?.id,points:20}});
    toast(`Thêm "${doc.name}"! +20 điểm`,'success');
  }, [addAudit,toast,state.currentUser]);

  const deleteDoc = useCallback((sid,did) => dispatch({type:A.DELETE_DOC,payload:{subjectId:sid,docId:did}}), []);
  const rateDoc   = useCallback((sid,did,stars) => {
    dispatch({type:A.RATE_DOC,payload:{subjectId:sid,docId:did,userId:state.currentUser?.id,stars}});
    if (stars===5) {
      const doc=(state.docs[sid]||[]).find(d=>d.id===did);
      if (doc?.uploadedBy && doc.uploadedBy!==state.currentUser?.id)
        dispatch({type:A.ADD_CONTRIBUTION,payload:{userId:doc.uploadedBy,points:30}});
    }
    toast(`Đánh giá ${stars} sao!`,'success');
  }, [state.currentUser?.id,state.docs,toast]);

  const updateRole          = useCallback(p => dispatch({type:A.UPDATE_MEMBER_ROLE,payload:p}), []);
  const addContribution     = useCallback(p => dispatch({type:A.ADD_CONTRIBUTION,  payload:p}), []);
  const updateSemesterLabel = useCallback((key,label) => dispatch({type:A.UPDATE_SEMESTER_LABEL,payload:{key,label}}), []);

  const exportMembersCSV = useCallback(() => {
    const h=['STT','MSSV','Họ tên','Giới tính','Email HUS','SĐT','Role'];
    const r=state.members.map((m,i)=>[i+1,m.mssv,m.fullName,m.gender||'',m.mailSchool||m.email||'',m.phone||'',m.role]);
    const csv=[h,...r].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'),{href:url,download:'2X18_Members.csv'});
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('Đã xuất danh sách!','success');
  }, [state.members,toast]);

  const isProfileComplete = useCallback((m) => {
    if(!m)return false;
    return ['mssv','fullName','phone','gender'].every(f=>m[f]&&String(m[f]).trim()!=='') && (m.mailSchool||m.email);
  }, []);

  const isCore       = state.currentUser?.role==='core'||state.currentUser?.role==='super_admin';
  const isSuperAdmin = state.currentUser?.mssv==='25000723';
  const myGrades     = state.grades[state.currentUser?.id]||{};
  const myTasks      = state.tasks.filter(t=>t.userId===state.currentUser?.id);
  const getMemberById = id  => state.members.find(m=>m.id===id);
  const getSmeMember  = sid => getMemberById(state.smeMap[sid]);

  const value = {
    ...state, isCore, isSuperAdmin, myGrades, myTasks,
    login, logout, loginWithGoogle, register,
    toast, rmToast, addAudit,
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
  if(!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
