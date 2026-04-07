// src/pages/Roadmap.jsx
import React, { useState } from 'react';
import { Target, Save, Edit3, Award, Plus, Trash2, CheckCircle2, Clock, TrendingUp, Flag, X, CalendarPlus } from 'lucide-react';
import { useApp, uid } from '../context/AppContext';

const STATUS_OPTS = ['None','Planning','In Progress','Done'];

const statusStyle = s => {
  switch (s) {
    case 'Done':        return { badge:'badge-green',  bar:'#22c55e', label:'Xong ✓' };
    case 'In Progress': return { badge:'badge-blue',   bar:'#3b82f6', label:'Đang làm' };
    case 'Planning':    return { badge:'badge-yellow', bar:'#f59e0b', label:'Kế hoạch' };
    default:            return { badge:'badge-gray',   bar:'#4b5563', label:'Chưa có' };
  }
};

// ── Add Event Modal ────────────────────────────────────────
function AddEventModal({ year, onSave, onClose }) {
  const [form, setForm] = useState({ month:'', level:'', status:'Planning', task:'', pic:'Cả nhóm', goal:'' });
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white">Thêm mốc năm {year}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">THÁNG</label>
              <input className="input-dark" placeholder="VD: T1–T5" value={form.month} onChange={e=>set('month',e.target.value)}/>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">KỲ / MỐC</label>
              <input className="input-dark" placeholder="VD: Kỳ 2 năm 1" value={form.level} onChange={e=>set('level',e.target.value)}/>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">TRẠNG THÁI</label>
            <select className="input-dark" value={form.status} onChange={e=>set('status',e.target.value)}>
              {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">CHI TIẾT TASK</label>
            <textarea rows={2} className="input-dark resize-none" placeholder="Mô tả công việc..." value={form.task} onChange={e=>set('task',e.target.value)}/>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">PHỤ TRÁCH</label>
            <input className="input-dark" placeholder="VD: Cả nhóm, Hưng" value={form.pic} onChange={e=>set('pic',e.target.value)}/>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">GOAL / MỤC TIÊU</label>
            <input className="input-dark" placeholder="Mục tiêu cần đạt được..." value={form.goal} onChange={e=>set('goal',e.target.value)}/>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button onClick={()=>{ if(!form.month||!form.level) return; onSave(form); onClose(); }}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl">
            Thêm mốc
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Year Modal ─────────────────────────────────────────
function AddYearModal({ existingYears, onSave, onClose }) {
  const [yearInput, setYearInput] = useState('');
  const yearNum = parseInt(yearInput, 10);
  const isValid = yearNum >= 2020 && yearNum <= 2040 && !existingYears.includes(yearNum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-blue-400"/> Thêm năm mới
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
        </div>
        <div className="px-5 py-5">
          <label className="text-[10px] text-gray-500 font-bold block mb-2">NĂM (2020–2040)</label>
          <input
            className="input-dark text-lg font-black text-center"
            type="number" placeholder="VD: 2030"
            value={yearInput}
            onChange={e => setYearInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && isValid && (onSave(yearNum), onClose())}
            autoFocus
          />
          {yearInput && !isValid && (
            <p className="text-xs text-red-400 mt-1.5">
              {existingYears.includes(yearNum) ? 'Năm này đã tồn tại' : 'Năm không hợp lệ (2020–2040)'}
            </p>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button
            disabled={!isValid}
            onClick={() => { onSave(yearNum); onClose(); }}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl">
            Thêm năm {yearInput}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Year Stats ─────────────────────────────────────────────
function YearStats({ events }) {
  const done     = events.filter(e=>e.status==='Done').length;
  const inProg   = events.filter(e=>e.status==='In Progress').length;
  const checked  = events.filter(e=>e.checked).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[
        { label:'Tổng mốc',      value:events.length,                      color:'text-gray-300'  },
        { label:'Hoàn thành',    value:done,                               color:'text-green-400' },
        { label:'Đang thực hiện',value:inProg,                             color:'text-blue-400'  },
        { label:'Goal đã đạt',   value:`${checked}/${events.length}`,     color:'text-yellow-400'},
      ].map(s=>(
        <div key={s.label} className="bg-[#1a1a1a] border border-gray-800/60 rounded-xl p-3">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</div>
          <div className={`text-xl font-black mt-1 ${s.color}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function Roadmap() {
  const { roadmap, updateRoadmap, addRoadmapEvent, delRoadmapEvent, addRoadmapYear, deleteRoadmapYear, isCore } = useApp();

  // Derive sorted year list from roadmap state
  const years = [...roadmap].map(y => y.year).sort((a,b) => a-b);

  const [activeYear, setActiveYear] = useState(() => years[0] || new Date().getFullYear());
  const [isEditing,  setIsEditing]  = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [showAddYear,setShowAddYear]= useState(false);
  const [confirmDelYear, setConfirmDelYear] = useState(null);
  const [viewMode,   setViewMode]   = useState('table');

  const yearData = roadmap.find(y => y.year === activeYear);
  const events   = yearData?.events || [];

  const update = (eventId, field, value) =>
    updateRoadmap({ year: activeYear, eventId, field, value });

  const deleteEvt = (eventId) => delRoadmapEvent({ year: activeYear, eventId });
  const handleAdd = (form) => addRoadmapEvent({ year: activeYear, event: { ...form, id: uid(), checked: false } });

  const handleAddYear = (y) => {
    if (addRoadmapYear) addRoadmapYear(y);
    setActiveYear(y);
  };

  const handleDeleteYear = (y) => {
    if (deleteRoadmapYear) deleteRoadmapYear(y);
    const remaining = years.filter(yr => yr !== y);
    setActiveYear(remaining[0] || new Date().getFullYear());
    setConfirmDelYear(null);
  };

  const doneCount    = events.filter(e=>e.status==='Done').length;
  const yearProgress = events.length ? Math.round(doneCount / events.length * 100) : 0;

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400"/> Lộ trình & Mục tiêu 2X18
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Kế hoạch {years.length} năm · {years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
              {[['table','Bảng'],['cards','Thẻ']].map(([v,l])=>(
                <button key={v} onClick={()=>setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all ${viewMode===v?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
            {isCore && (
              <>
                <button onClick={()=>setShowAdd(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1e1e1e] border border-gray-700 text-gray-300 hover:bg-[#252525] transition-all">
                  <Plus className="w-3.5 h-3.5"/> Thêm mốc
                </button>
                <button onClick={()=>setIsEditing(v=>!v)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isEditing ? 'bg-green-600 text-white' : 'bg-[#1e1e1e] border border-gray-700 text-gray-300 hover:bg-[#252525]'
                  }`}>
                  <Edit3 className="w-3.5 h-3.5"/> {isEditing ? 'Xong chỉnh sửa' : 'Chỉnh sửa'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Year Tabs ── */}
      <div className="px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3">
          {years.map(y => (
            <div key={y} className="relative group shrink-0">
              <button
                onClick={() => setActiveYear(y)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeYear === y
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600'
                }`}>
                {y}
                {activeYear === y && (
                  <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-md">
                    {roadmap.find(r=>r.year===y)?.events?.length || 0} mốc
                  </span>
                )}
              </button>
              {/* Delete year button (shown on hover when editing) */}
              {isCore && isEditing && years.length > 1 && (
                <button
                  onClick={() => setConfirmDelYear(y)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  title={`Xóa năm ${y}`}>
                  <X className="w-2.5 h-2.5"/>
                </button>
              )}
            </div>
          ))}

          {/* Add year button */}
          {isCore && (
            <button onClick={() => setShowAddYear(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-dashed border-gray-700 text-gray-500 hover:text-blue-400 hover:border-blue-500/40 transition-all">
              <CalendarPlus className="w-3.5 h-3.5"/> Thêm năm
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
        {/* Year progress bar */}
        <div className="mb-5 mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="font-bold text-gray-300">Năm {activeYear} — Tiến độ hoàn thành</span>
            <span className="font-bold text-white">{yearProgress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${yearProgress}%` }}/>
          </div>
        </div>

        <YearStats events={events}/>

        {viewMode === 'table' && (
          <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[55vh] custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] font-black uppercase text-gray-500 bg-[#1e1e1e] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-800 w-24">Tháng</th>
                    <th className="px-3 py-3 border-b border-gray-800 w-20">Trạng thái</th>
                    <th className="px-4 py-3 border-b border-gray-800">Chi tiết</th>
                    <th className="px-4 py-3 border-b border-gray-800 w-28">Phụ trách</th>
                    <th className="px-4 py-3 border-b border-gray-800">
                      <div className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-yellow-400"/>Goals</div>
                    </th>
                    {isEditing && <th className="px-4 py-3 border-b border-gray-800 w-10"/>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {events.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-600 text-sm">Chưa có mốc nào — thêm mốc đầu tiên!</td></tr>
                  ) : events.map(ev => {
                    const s = statusStyle(ev.status);
                    return (
                      <tr key={ev.id} className={`hover:bg-[#1e1e1e] transition-colors ${ev.checked?'opacity-60':''}`}>
                        <td className="px-4 py-4">
                          <div className="text-xs font-black text-blue-400 mb-1">{ev.month}</div>
                          {isEditing
                            ? <input className="input-dark text-xs py-1 px-2" value={ev.level} onChange={e=>update(ev.id,'level',e.target.value)}/>
                            : <div className="text-xs font-bold text-gray-200">{ev.level}</div>
                          }
                        </td>
                        <td className="px-3 py-4">
                          {isEditing
                            ? <select value={ev.status} onChange={e=>update(ev.id,'status',e.target.value)} className="input-dark text-xs py-1 px-2">
                                {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                            : <span className={`badge ${s.badge}`}>{s.label}</span>
                          }
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          {isEditing
                            ? <textarea rows={2} value={ev.task} onChange={e=>update(ev.id,'task',e.target.value)} className="input-dark text-xs resize-none py-1 px-2 w-full"/>
                            : <p className="text-xs text-gray-300 leading-relaxed italic line-clamp-3">"{ev.task}"</p>
                          }
                        </td>
                        <td className="px-4 py-4">
                          {isEditing
                            ? <input className="input-dark text-xs py-1 px-2" value={ev.pic} onChange={e=>update(ev.id,'pic',e.target.value)}/>
                            : <span className="text-xs text-gray-400 bg-[#252525] px-2 py-1 rounded-lg border border-gray-700">{ev.pic}</span>
                          }
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <input type="checkbox" checked={ev.checked} onChange={e=>update(ev.id,'checked',e.target.checked)}
                              className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer shrink-0"/>
                            {isEditing
                              ? <input className="input-dark text-xs py-1 px-2 flex-1" value={ev.goal} onChange={e=>update(ev.id,'goal',e.target.value)}/>
                              : <span className={`text-xs leading-relaxed flex-1 ${ev.checked?'line-through text-gray-600':'text-gray-200 font-medium'}`}>{ev.goal}</span>
                            }
                          </div>
                        </td>
                        {isEditing && (
                          <td className="px-4 py-4">
                            <button onClick={()=>deleteEvt(ev.id)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-[#1e1e1e] border-t border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">2X18 · Năm {activeYear}</span>
              </div>
              <div className="text-[10px] text-gray-600 italic hidden md:block">
                "Mọi hành trình vạn dặm đều bắt đầu từ một bước chân."
              </div>
            </div>
          </div>
        )}

        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.length === 0
              ? <div className="col-span-2 text-center py-12 text-gray-600">Chưa có mốc nào</div>
              : events.map(ev => {
                  const s = statusStyle(ev.status);
                  return (
                    <div key={ev.id} className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden card-hover ${
                      ev.status==='Done'?'border-green-500/20':ev.status==='In Progress'?'border-blue-500/20':'border-gray-800/60'
                    }`}>
                      <div className="h-1 w-full" style={{background:s.bar}}/>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-xs font-black text-blue-400">{ev.month}</div>
                            <div className="text-sm font-bold text-white mt-0.5">{ev.level}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`badge ${s.badge}`}>{s.label}</span>
                            {isEditing && (
                              <button onClick={()=>deleteEvt(ev.id)} className="p-1 text-gray-600 hover:text-red-400">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-3 italic">"{ev.task}"</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 bg-[#252525] px-2 py-1 rounded-lg border border-gray-700">{ev.pic}</span>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={ev.checked} onChange={e=>update(ev.id,'checked',e.target.checked)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"/>
                            <span className={`text-xs ${ev.checked?'line-through text-gray-600':'text-gray-300'}`}>{ev.goal}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
              })
            }
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd    && <AddEventModal year={activeYear} onSave={handleAdd} onClose={()=>setShowAdd(false)}/>}
      {showAddYear && <AddYearModal existingYears={years} onSave={handleAddYear} onClose={()=>setShowAddYear(false)}/>}

      {/* Confirm delete year */}
      {confirmDelYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400"/>
              </div>
              <div>
                <div className="font-bold text-white">Xóa năm {confirmDelYear}?</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {(roadmap.find(r=>r.year===confirmDelYear)?.events?.length||0)} mốc sẽ bị xóa vĩnh viễn
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmDelYear(null)} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
              <button onClick={()=>handleDeleteYear(confirmDelYear)} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl">Xóa năm {confirmDelYear}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
