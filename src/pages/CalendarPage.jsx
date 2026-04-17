// src/pages/CalendarPage.jsx
// Full Google Calendar–style: Month / Week / Day views
// Auto-syncs: tasks deadlines, attendance sessions, votes with deadlines
// Real-time current-time indicator (Google Calendar style) in Week + Day views
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Users, AlignLeft, ExternalLink, CalendarCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createCalendarEvent } from '../services/googleApi';

const MONTHS_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const DOW_FULL  = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];
const DOW_SHORT = ['CN','T2','T3','T4','T5','T6','T7'];
const HOURS     = Array.from({length:24},(_,i)=>i);

const EVENT_TYPES = [
  { value:'sme',      label:'Họp nhóm SME', color:'#3b82f6', bg:'rgba(59,130,246,0.18)'  },
  { value:'deadline', label:'Deadline',     color:'#ef4444', bg:'rgba(239,68,68,0.18)'   },
  { value:'event',    label:'Sự kiện',      color:'#f59e0b', bg:'rgba(245,158,11,0.18)'  },
  { value:'study',    label:'Học tập',      color:'#10b981', bg:'rgba(16,185,129,0.18)'  },
  { value:'vote',     label:'Bình chọn',    color:'#8b5cf6', bg:'rgba(139,92,246,0.18)'  },
  { value:'attend',   label:'Điểm danh',    color:'#06b6d4', bg:'rgba(6,182,212,0.18)'   },
  { value:'other',    label:'Khác',         color:'#6b7280', bg:'rgba(107,114,128,0.18)' },
];

const typeStyle  = t => EVENT_TYPES.find(e => e.value === t) || EVENT_TYPES[6];
const ds         = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const fmtDate    = (iso) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
const todayObj   = new Date();
const todayStr   = ds(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

// Row heights (px) for week and day views
const WEEK_ROW_H = 48;
const DAY_ROW_H  = 52;

export default function CalendarPage() {
  const { calEvents, addEvent, editEvent, deleteEvent, myTasks, attendance, votes, requireGoogleAuth, toast } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);

  const [curYear,  setCurYear]  = useState(todayObj.getFullYear());
  const [curMonth, setCurMonth] = useState(todayObj.getMonth());
  const [curDay,   setCurDay]   = useState(todayObj.getDate());
  const [view,     setView]     = useState('month');
  const [modal,    setModal]    = useState(null); // { mode:'new'|'edit', event? }
  const [form,     setForm]     = useState({});
  const [popup,    setPopup]    = useState(null); // { event, x, y }
  const [nowTime,  setNowTime]  = useState(new Date()); // real-time clock

  const popupRef    = useRef(null);
  const scrollRef   = useRef(null); // ref for the hour-grid scroll container
  const nextId      = useRef(Date.now());

  // ── Real-time clock (updates every 30s) ──────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // ── Auto-scroll to current time when entering week/day view ──────────────
  useEffect(() => {
    if (view === 'month') return;
    const el = scrollRef.current;
    if (!el) return;
    const rowH = view === 'week' ? WEEK_ROW_H : DAY_ROW_H;
    const scrollTop = (nowTime.getHours() - 1) * rowH;
    setTimeout(() => el.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' }), 80);
  }, [view]); // eslint-disable-line

  // Close popup on outside click
  useEffect(() => {
    const h = e => { if (popup && popupRef.current && !popupRef.current.contains(e.target)) setPopup(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [popup]);

  // ── Auto-generated events from other modules ─────────────
  const autoEvents = useMemo(() => {
    const evs = [];
    // Tasks → deadline events
    (myTasks || []).forEach(t => {
      if (!t.done && t.deadline) {
        evs.push({
          id: `task-${t.id}`,
          title: `📋 ${t.task}`,
          date: t.deadline,
          type: 'deadline',
          allDay: true,
          auto: true,
          desc: `Môn: ${t.subjectId || ''}`,
          readonly: true,
        });
      }
    });
    // Attendance sessions
    (attendance || []).forEach(s => {
      if (s.date) {
        const hasTime = !!s.startTime;
        evs.push({
          id: `attend-${s.sessionId}`,
          title: `📅 ${s.sessionTitle}`,
          date: s.date,
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          type: 'attend',
          allDay: !hasTime,
          auto: true,
          location: s.meetLink || '',
          desc: `${s.present?.length || 0}/${s.total || 0} thành viên`,
          readonly: true,
        });
      }
    });
    // Votes with deadline
    (votes || []).forEach(v => {
      if (v.deadline && !v.closed) {
        const d = v.deadline.slice(0, 10);
        const t = v.deadline.slice(11, 16);
        evs.push({
          id: `vote-${v.id}`,
          title: `🗳️ ${v.title}`,
          date: d,
          startTime: t,
          type: 'vote',
          allDay: false,
          auto: true,
          desc: `Hạn bình chọn`,
          readonly: true,
        });
      }
    });
    return evs;
  }, [myTasks, attendance, votes]);

  const allEvents = useMemo(() => [...calEvents, ...autoEvents], [calEvents, autoEvents]);
  const eventsFor = (dateStr) => allEvents.filter(e => e.date === dateStr);

  // ── Navigation ────────────────────────────────────────────
  const navPrev = () => {
    if (view==='month'){ let m=curMonth-1,y=curYear; if(m<0){m=11;y--;} setCurMonth(m);setCurYear(y); }
    else { const d=new Date(curYear,curMonth,curDay-(view==='week'?7:1)); setCurYear(d.getFullYear());setCurMonth(d.getMonth());setCurDay(d.getDate()); }
  };
  const navNext = () => {
    if (view==='month'){ let m=curMonth+1,y=curYear; if(m>11){m=0;y++;} setCurMonth(m);setCurYear(y); }
    else { const d=new Date(curYear,curMonth,curDay+(view==='week'?7:1)); setCurYear(d.getFullYear());setCurMonth(d.getMonth());setCurDay(d.getDate()); }
  };
  const goToday = () => { setCurYear(todayObj.getFullYear());setCurMonth(todayObj.getMonth());setCurDay(todayObj.getDate()); };

  const titleStr = () => {
    if (view==='month') return `${MONTHS_VI[curMonth]} ${curYear}`;
    if (view==='day')   return `${DOW_FULL[new Date(curYear,curMonth,curDay).getDay()]}, ${curDay} ${MONTHS_VI[curMonth]} ${curYear}`;
    const ws=weekStart(); const we=new Date(ws.getTime()+6*86400000);
    return `${ws.getDate()} – ${we.getDate()} ${MONTHS_VI[we.getMonth()]} ${curYear}`;
  };

  const weekStart = () => {
    const d=new Date(curYear,curMonth,curDay); const dow=d.getDay();
    return new Date(d.getTime()-dow*86400000);
  };

  // ── Form helpers ──────────────────────────────────────────
  const openNew = (date, hour=null) => {
    const d = date || ds(curYear,curMonth,curDay);
    setForm({ title:'', date:d, startTime:hour!=null?`${String(hour).padStart(2,'0')}:00`:'', endTime:'', type:'study', location:'', desc:'', guests:'', allDay:hour==null });
    setModal({ mode:'new' });
  };
  const openEdit = ev => {
    if (ev.readonly) return;
    setForm({...ev}); setModal({ mode:'edit', event:ev }); setPopup(null);
  };
  const saveForm = async (syncToGoogle = false) => {
    if (!form.title?.trim() || !form.date) return;
    const ev = { ...form, title: form.title.trim() };
    if (modal.mode==='new') addEvent({ ...ev, id: ++nextId.current });
    else editEvent(ev);

    if (syncToGoogle) {
      setIsSyncing(true);
      try {
        const token = await requireGoogleAuth();
        if (token) {
          const res = await createCalendarEvent(token, {
            title: ev.title,
            description: ev.desc || '',
            date: ev.date,
            startTime: ev.startTime || '08:00',
            endTime: ev.endTime || '',
            createMeetLink: false,
          });
          toast(`Đã đồng bộ lên Google Calendar! ✅`, 'success');
          // Nếu có link mở sự kiện, mở tab mới
          if (res.htmlLink) window.open(res.htmlLink, '_blank');
        }
      } catch (err) {
        toast(err.message || 'Lỗi đồng bộ Calendar', 'error');
      }
      setIsSyncing(false);
    }

    setModal(null);
  };
  const delEv = id => { deleteEvent(id); setPopup(null); setModal(null); };

  const showPopup = (e, ev) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopup({ event: ev, x: rect.left + window.scrollX, y: rect.bottom + window.scrollY + 4 });
  };

  // ── Event pill renderer ───────────────────────────────────
  const EventPill = ({ ev, onClick }) => {
    const ts = typeStyle(ev.type);
    return (
      <div onClick={onClick}
        className="text-[10px] px-1.5 py-0.5 rounded font-semibold truncate leading-tight cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: ts.bg, color: ts.color, borderLeft: `2px solid ${ts.color}` }}>
        {ev.startTime && <span className="opacity-70 mr-1">{ev.startTime}</span>}
        {ev.title}
      </div>
    );
  };

  // ── Current-time indicator ────────────────────────────────
  // Renders a red Google-Calendar-style line for today's current time
  // pct = fraction through the current hour (0..1)
  const nowDateStr = ds(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());
  const nowHour    = nowTime.getHours();
  const nowPct     = nowTime.getMinutes() / 60; // 0..1

  const NowLine = ({ dateStr, rowH }) => {
    if (dateStr !== nowDateStr) return null;
    return (
      <div
        className="absolute left-0 right-0 z-20 pointer-events-none"
        style={{ top: `${nowHour * rowH + nowPct * rowH}px` }}>
        <div className="flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1"/>
          <div className="flex-1 h-px bg-red-500"/>
        </div>
      </div>
    );
  };

  // ── MONTH VIEW ────────────────────────────────────────────
  const renderMonth = () => {
    const firstDow = new Date(curYear,curMonth,1).getDay();
    const daysInMo = new Date(curYear,curMonth+1,0).getDate();
    const cells = [];
    for(let i=0;i<firstDow;i++) cells.push(null);
    for(let d=1;d<=daysInMo;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);

    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* DOW headers */}
        <div className="grid grid-cols-7 border-b border-gray-800/60 shrink-0">
          {DOW_SHORT.map(d=>(
            <div key={d} className="py-2 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7">
            {cells.map((d,i)=>{
              const dateStr = d ? ds(curYear,curMonth,d) : null;
              const isT   = dateStr === todayStr;
              const evs   = dateStr ? eventsFor(dateStr) : [];
              return (
                <div key={i}
                  className={`min-h-[100px] border-b border-r border-gray-800/30 p-1.5 relative group cursor-pointer transition-colors ${!d?'bg-[#0e0e0e]':isT?'bg-blue-500/5':'hover:bg-[#1a1a1a]'}`}
                  onClick={()=>{ if(d){ setCurDay(d); openNew(ds(curYear,curMonth,d)); } }}>
                  {d && (
                    <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isT?'bg-blue-600 text-white':'text-gray-400 group-hover:text-white'}`}>
                      {d}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {evs.slice(0,3).map(ev=>(
                      <EventPill key={ev.id} ev={ev} onClick={e=>showPopup(e,ev)}/>
                    ))}
                    {evs.length>3 && (
                      <div className="text-[9px] text-gray-500 pl-1 font-bold">+{evs.length-3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── WEEK VIEW ─────────────────────────────────────────────
  const renderWeek = () => {
    const ws  = weekStart();
    const days = Array.from({length:7},(_,i)=>new Date(ws.getTime()+i*86400000));

    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Day header row */}
        <div className="grid border-b border-gray-800/60 shrink-0" style={{gridTemplateColumns:'56px repeat(7,1fr)'}}>
          <div className="border-r border-gray-800/30"/>
          {days.map((d,i)=>{
            const isT = ds(d.getFullYear(),d.getMonth(),d.getDate()) === todayStr;
            return (
              <div key={i} className="py-2 text-center border-r border-gray-800/30 last:border-r-0">
                <div className="text-[10px] font-bold text-gray-600 uppercase">{DOW_SHORT[d.getDay()]}</div>
                <div className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-black ${isT?'bg-blue-600 text-white':'text-gray-300'}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day events row */}
        <div className="bg-[#141414] grid border-b-2 border-gray-800/60 shrink-0" style={{gridTemplateColumns:'56px repeat(7,1fr)'}}>
          <div className="border-r border-gray-800/30 py-1 text-right pr-2">
            <span className="text-[9px] text-gray-600">Cả ngày</span>
          </div>
          {days.map((d,i)=>{
            const dateStr = ds(d.getFullYear(),d.getMonth(),d.getDate());
            const evs = eventsFor(dateStr).filter(e=>e.allDay);
            return (
              <div key={i} className="border-r border-gray-800/20 last:border-r-0 p-0.5 space-y-0.5">
                {evs.map(ev=>(
                  <EventPill key={ev.id} ev={ev} onClick={e=>showPopup(e,ev)}/>
                ))}
              </div>
            );
          })}
        </div>

        {/* Hour grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
          {/* Positioning wrapper for NowLine */}
          <div className="relative" style={{gridTemplateColumns:'56px repeat(7,1fr)'}}>
            {/* NowLine — positioned absolutely over entire column for today */}
            {days.map((d,i)=>{
              const dateStr = ds(d.getFullYear(),d.getMonth(),d.getDate());
              if (dateStr !== nowDateStr) return null;
              // Calculate left offset: 56px gutter + i * (column width)
              // Use percentage trick via inline grid overlay
              return (
                <div key={`now-${i}`}
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{
                    left: `calc(56px + ${i} * ((100% - 56px) / 7))`,
                    width: `calc((100% - 56px) / 7)`,
                  }}>
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: `${nowHour * WEEK_ROW_H + nowPct * WEEK_ROW_H}px` }}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1"/>
                      <div className="flex-1 h-px bg-red-500"/>
                    </div>
                  </div>
                </div>
              );
            })}

            {HOURS.map(h=>(
              <div key={h} className="grid border-b border-gray-800/20" style={{gridTemplateColumns:'56px repeat(7,1fr)',minHeight:WEEK_ROW_H}}>
                <div className="border-r border-gray-800/30 pr-2 text-right shrink-0 pt-1">
                  <span className="text-[10px] text-gray-600 font-bold leading-none">{h===0?'':String(h).padStart(2,'0')+':00'}</span>
                </div>
                {days.map((d,i)=>{
                  const dateStr = ds(d.getFullYear(),d.getMonth(),d.getDate());
                  const evs = eventsFor(dateStr).filter(e=>!e.allDay&&e.startTime&&parseInt(e.startTime)===h);
                  return (
                    <div key={i} className="border-r border-gray-800/20 last:border-r-0 relative p-0.5 hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      onClick={()=>{ setCurDay(d.getDate()); openNew(dateStr,h); }}>
                      {evs.map(ev=>(
                        <EventPill key={ev.id} ev={ev} onClick={e=>showPopup(e,ev)}/>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── DAY VIEW ──────────────────────────────────────────────
  const renderDay = () => {
    const dateStr  = ds(curYear,curMonth,curDay);
    const allDayEs = eventsFor(dateStr).filter(e=>e.allDay);
    const timedEs  = eventsFor(dateStr).filter(e=>!e.allDay);
    const isToday  = dateStr === nowDateStr;

    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* All-day */}
        {allDayEs.length>0 && (
          <div className="p-3 border-b border-gray-800/60 space-y-1 shrink-0 bg-[#141414]">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Cả ngày</div>
            {allDayEs.map(ev=>(
              <EventPill key={ev.id} ev={ev} onClick={e=>showPopup(e,ev)}/>
            ))}
          </div>
        )}
        {/* Timed slots */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
          {/* Relative wrapper for NowLine */}
          <div className="relative">
            {/* NowLine for day view */}
            {isToday && (
              <div
                className="absolute left-14 right-0 z-20 pointer-events-none"
                style={{ top: `${nowHour * DAY_ROW_H + nowPct * DAY_ROW_H}px` }}>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1"/>
                  <div className="flex-1 h-px bg-red-500"/>
                </div>
              </div>
            )}
            {HOURS.map(h=>{
              const evs = timedEs.filter(e=>parseInt(e.startTime)===h);
              return (
                <div key={h} className="flex border-b border-gray-800/20 min-h-[52px] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  onClick={()=>openNew(dateStr,h)}>
                  <div className="w-14 shrink-0 pr-3 text-right pt-1">
                    <span className="text-[10px] text-gray-600 font-bold">{String(h).padStart(2,'0')}:00</span>
                  </div>
                  <div className="flex-1 p-1 space-y-0.5 border-l border-gray-800/30">
                    {evs.map(ev=>(
                      <div key={ev.id} onClick={e=>{ e.stopPropagation(); showPopup(e,ev); }}
                        className="px-3 py-2 rounded-xl cursor-pointer hover:opacity-90 transition-all"
                        style={{ background: typeStyle(ev.type).bg, borderLeft: `3px solid ${typeStyle(ev.type).color}` }}>
                        <div className="text-sm font-bold" style={{color:typeStyle(ev.type).color}}>{ev.title}</div>
                        {ev.endTime && <div className="text-[10px] mt-0.5" style={{color:typeStyle(ev.type).color, opacity:0.7}}>{ev.startTime}–{ev.endTime}</div>}
                        {ev.location && <div className="text-[10px] text-gray-400 mt-0.5">📍 {ev.location}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="px-4 py-3 border-b border-gray-800/60 bg-[#141414] shrink-0 flex items-center gap-2 flex-wrap">
        <button onClick={goToday} className="px-3 py-1.5 border border-gray-700 rounded-xl text-xs font-bold hover:bg-[#252525] transition-all">Hôm nay</button>
        <div className="flex items-center gap-1">
          <button onClick={navPrev} className="p-1.5 hover:bg-[#252525] rounded-lg transition-colors"><ChevronLeft className="w-4 h-4 text-gray-400"/></button>
          <button onClick={navNext} className="p-1.5 hover:bg-[#252525] rounded-lg transition-colors"><ChevronRight className="w-4 h-4 text-gray-400"/></button>
        </div>
        <h2 className="text-sm font-black text-white flex-1 truncate">{titleStr()}</h2>

        {/* Real-time clock badge */}
        {(view === 'week' || view === 'day') && (
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-red-400 border border-red-500/20 px-2 py-1 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>
            {nowTime.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })}
          </div>
        )}

        {/* Legend */}
        <div className="hidden xl:flex items-center gap-2">
          {[{type:'deadline',label:'Task'},{type:'attend',label:'Điểm danh'},{type:'vote',label:'Vote'}].map(l=>{
            const ts = typeStyle(l.type);
            return (
              <span key={l.type} className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                style={{background:ts.bg,color:ts.color}}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:ts.color}}/>
                {l.label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
          {[['month','Tháng'],['week','Tuần'],['day','Ngày']].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${view===v?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300'}`}>{l}</button>
          ))}
        </div>
        <button onClick={()=>openNew(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all">
          <Plus className="w-3.5 h-3.5"/> Thêm
        </button>
      </div>

      {/* ── Calendar body ── */}
      {view==='month' && renderMonth()}
      {view==='week'  && renderWeek()}
      {view==='day'   && renderDay()}

      {/* ── Detail Popup ── */}
      {popup && (
        <div ref={popupRef}
          className="fixed z-50 bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl w-72 p-4 fade-in"
          style={{ top: Math.min(popup.y, window.innerHeight-340), left: Math.min(popup.x, window.innerWidth-300) }}>
          {(() => {
            const ev = popup.event;
            const ts = typeStyle(ev.type);
            return (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:ts.color}}/>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:ts.color}}>{ts.label}</span>
                      {ev.auto && <span className="text-[9px] text-gray-600 border border-gray-700 px-1 rounded">auto</span>}
                    </div>
                    <div className="font-bold text-white text-sm leading-tight">{ev.title}</div>
                  </div>
                  <button onClick={()=>setPopup(null)} className="p-1 text-gray-600 hover:text-white ml-2"><X className="w-4 h-4"/></button>
                </div>
                <div className="space-y-1.5 text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0"/>
                    <span>{fmtDate(ev.date)}{ev.startTime&&` · ${ev.startTime}`}{ev.endTime&&`–${ev.endTime}`}{ev.allDay&&' · Cả ngày'}</span>
                  </div>
                  {ev.location && (
                    ev.location.startsWith('http')
                      ? <a href={ev.location} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5 shrink-0"/><span>Tham gia cuộc họp</span>
                        </a>
                      : <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0"/><span>{ev.location}</span></div>
                  )}
                  {ev.guests && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 shrink-0"/><span>{ev.guests}</span></div>}
                  {ev.desc   && <div className="flex items-start gap-2"><AlignLeft className="w-3.5 h-3.5 shrink-0 mt-0.5"/><span className="line-clamp-3">{ev.desc}</span></div>}
                </div>
                {!ev.readonly && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit(ev)} className="flex-1 py-1.5 text-xs font-bold border border-gray-700 rounded-xl hover:bg-[#252525] transition-all">Sửa</button>
                      <button onClick={()=>delEv(ev.id)} className="flex-1 py-1.5 text-xs font-bold text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all">Xóa</button>
                    </div>
                    <SyncGCalButton ev={ev} requireGoogleAuth={requireGoogleAuth} toast={toast}/>
                  </div>
                )}
                {ev.readonly && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-center text-gray-600 border border-gray-800 rounded-xl py-1.5">
                      Sự kiện được tạo tự động · Sửa trong module gốc
                    </div>
                    <SyncGCalButton ev={ev} requireGoogleAuth={requireGoogleAuth} toast={toast}/>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={()=>setModal(null)}>
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">{modal.mode==='new'?'Thêm sự kiện':'Chỉnh sửa sự kiện'}</h3>
              <button onClick={()=>setModal(null)}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">TIÊU ĐỀ *</label>
                <input className="input-dark" value={form.title||''} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus placeholder="Tên sự kiện..."/>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">LOẠI</label>
                <select className="input-dark" value={form.type||'other'} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  {EVENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">NGÀY</label>
                <input type="date" className="input-dark" value={form.date||''} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                {form.date && <p className="text-[10px] text-gray-600 mt-1">📅 {fmtDate(form.date)}</p>}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={!!form.allDay} onChange={e=>setForm(f=>({...f,allDay:e.target.checked}))}/>
                <span className="text-sm text-gray-300">Cả ngày</span>
              </label>
              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">GIỜ BẮT ĐẦU</label>
                    <input type="time" className="input-dark" value={form.startTime||''} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">GIỜ KẾT THÚC</label>
                    <input type="time" className="input-dark" value={form.endTime||''} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))}/>
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">ĐỊA ĐIỂM / LINK HỌP</label>
                <input className="input-dark" value={form.location||''} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Google Meet, Zoom, Phòng học..."/>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">THÀNH PHẦN</label>
                <input className="input-dark" value={form.guests||''} onChange={e=>setForm(f=>({...f,guests:e.target.value}))} placeholder="Cả nhóm, Core, SME..."/>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold block mb-1">GHI CHÚ</label>
                <textarea rows={2} className="input-dark resize-none" value={form.desc||''} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Mô tả thêm..."/>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-800 flex-wrap">
              {modal.mode==='edit' && (
                <button onClick={()=>delEv(form.id)} className="px-4 py-2 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/10">Xóa</button>
              )}
              <button onClick={()=>setModal(null)} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
              <button onClick={()=>saveForm(false)} disabled={isSyncing}
                className="flex-1 py-2 bg-[#252525] hover:bg-[#303030] border border-gray-700 text-white font-bold text-sm rounded-xl transition-all">
                {modal.mode==='new'?'Lưu':'Lưu'}
              </button>
              <button onClick={()=>saveForm(true)} disabled={isSyncing}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5">
                {isSyncing
                  ? <><Clock className="w-3.5 h-3.5 animate-spin"/> Đang...</>
                  : <><CalendarCheck className="w-3.5 h-3.5"/> + GG Cal</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync to Google Calendar Button ──────────────────────────────────────────
function SyncGCalButton({ ev, requireGoogleAuth, toast }) {
  const [syncing, setSyncing] = useState(false);
  const [synced,  setSynced]  = useState(false);

  const handleSync = async (e) => {
    e.stopPropagation();
    setSyncing(true);
    try {
      const token = await requireGoogleAuth();
      if (!token) { setSyncing(false); return; }
      const res = await createCalendarEvent(token, {
        title: ev.title,
        description: ev.desc || ev.location || '',
        date: ev.date,
        startTime: ev.startTime || '08:00',
        endTime:   ev.endTime   || '',
        createMeetLink: false,
      });
      toast('Đã đẩy lên Google Calendar! ✅', 'success');
      setSynced(true);
      if (res.htmlLink) window.open(res.htmlLink, '_blank');
    } catch (err) {
      toast(err.message || 'Lỗi đồng bộ', 'error');
    }
    setSyncing(false);
  };

  return (
    <button onClick={handleSync} disabled={syncing || synced}
      className={`w-full py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
        synced
          ? 'text-green-400 border border-green-500/30 bg-green-500/10 cursor-default'
          : 'text-blue-400 border border-blue-500/20 hover:bg-blue-500/10'
      }`}>
      {syncing
        ? <><Clock className="w-3.5 h-3.5 animate-spin"/> Đang đồng bộ...</>
        : synced
          ? <><CalendarCheck className="w-3.5 h-3.5"/> Đã lên Google Calendar</>
          : <><CalendarCheck className="w-3.5 h-3.5"/> Đẩy lên Google Calendar</>
      }
    </button>
  );
}
