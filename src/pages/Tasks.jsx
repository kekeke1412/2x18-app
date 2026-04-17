// src/pages/Tasks.jsx
import React, { useState } from 'react';
import {
  ClipboardList, Clock, FileText, Plus, CheckCircle2,
  AlertCircle, Folder, Trash2, X, Link,
  ChevronDown, ChevronUp, BookOpen, Sparkles, Loader2, User as UserIcon
} from 'lucide-react';
import { suggestTaskAssignment } from '../services/aiService';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext';
import { uploadToDrive } from '../services/googleApi';

// Safe array coerce – Firebase may return object with numeric keys
const toArr = v => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [];
};

const progressColor = p => p>=80?'#22c55e':p>=50?'#3b82f6':p>=25?'#f59e0b':'#ef4444';

const ProgressBar = ({ value, height=5 }) => (
  <div className="bg-gray-800 rounded-full overflow-hidden" style={{height}}>
    <div className="h-full rounded-full transition-all duration-500"
      style={{ width:`${Math.min(100,value)}%`, background:progressColor(value) }} />
  </div>
);

const daysDiff = d => Math.ceil((new Date(d)-new Date())/(1000*60*60*24));

export default function Tasks() {
  const {
    currentUser, myGrades: grades, myTasks, subjectTasks,
    docs, smeMap,
    addTask:    ctxAddTask,
    deleteTask: ctxDeleteTask,
    addDoc:     ctxAddDoc,
    deleteDoc:  ctxDeleteDoc,
  } = useApp();

  const profile = currentUser || {};
  const myName  = profile.fullName || '';

  const [activeTab,  setActiveTab]  = useState('tasks');
  const [expandProg, setExpandProg] = useState({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  
  // State for adding task (extended for Admin/Core)
  const [newTask,    setNewTask]     = useState({ 
    code: '', 
    title: '', 
    date: '', 
    type: 'Bắt buộc', 
    assigneeId: currentUser?.id || '' 
  });

  // Môn đang học của tôi
  const userSubjects = subjectDatabase.filter(s => grades[s.id]?.status === 'Đang học');

  const handleAddTask = () => {
    if (!newTask.code || !newTask.title || !newTask.date) return;
    ctxAddTask({
      userId:    newTask.assigneeId || currentUser?.id,
      code:      newTask.code,
      subjectId: newTask.code,
      task:      newTask.title,
      deadline:  newTask.date,
      date:      newTask.date,
      type:      newTask.type,
    });
    setIsAdding(false);
    setAiSuggestion(null);
    setNewTask({ code:'', title:'', date:'', type:'Bắt buộc', assigneeId: currentUser?.id });
  };

  const handleAiSuggest = async () => {
    if (!newTask.title.trim()) return;
    setIsAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await suggestTaskAssignment(newTask.title, members, myTasks);
      setAiSuggestion(res);
      // Auto-fill some fields if possible
      if (res.suggestedAssignee) {
        const found = members.find(m => m.fullName === res.suggestedAssignee);
        if (found) setNewTask(prev => ({ ...prev, assigneeId: found.id }));
      }
      if (res.estimatedDays) {
        const d = new Date();
        d.setDate(d.getDate() + res.estimatedDays);
        setNewTask(prev => ({ ...prev, date: d.toISOString().split('T')[0] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const activeMyTasks = myTasks
    .filter(t => userSubjects.some(s=>s.id===t.code))
    .sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const overdue  = activeMyTasks.filter(t=>daysDiff(t.deadline)<0);
  const upcoming = activeMyTasks.filter(t=>daysDiff(t.deadline)>=0);

  // Tính tiến độ từ checklist (subjectTasks)
  const getChecklistProgress = (subId) => {
    const tasks = subjectTasks[subId] || [];
    if (!tasks.length) return { done:0, total:0, pct:0 };
    const done = tasks.filter(t=>t.doneBy?.[currentUser?.id]).length;
    return { done, total:tasks.length, pct:Math.round(done/tasks.length*100) };
  };

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400"/> Tiến độ & Task
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{myName} · {profile.role||'Member'}</p>
          </div>
          <div className="flex items-center gap-2">
            {[['tasks','Task'],['docs','Tài liệu']].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab===k?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300 border border-gray-800'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

        {/* ── TAB: TASKS ──────────────────────────────────────────────────── */}
        {activeTab==='tasks' && (
          <div className="space-y-5">
            {/* Thêm task */}
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-400">DANH SÁCH TASK</h2>
              <button onClick={()=>setIsAdding(v=>!v)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20">
                <Plus className="w-3.5 h-3.5"/>
                {isAdding?'Hủy':'Thêm Task'}
              </button>
            </div>

            {isAdding && (
              <div className="bg-[#1a1a1a] border border-blue-500/30 rounded-2xl p-5 shadow-2xl fade-in space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Thêm nhiệm vụ mới</h3>
                  <button 
                    onClick={handleAiSuggest}
                    disabled={isAiLoading || !newTask.title.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-black rounded-lg transition-all disabled:opacity-40 shadow-lg shadow-blue-500/20"
                  >
                    {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI GỢI Ý
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">CÔNG VIỆC</label>
                    <input className="input-dark w-full" placeholder="Mô tả công việc (Ví dụ: Soạn slide tuần 5...)"
                      value={newTask.title}
                      onChange={e=>setNewTask(f=>({...f,title:e.target.value}))}
                      onKeyDown={e=>e.key==='Enter'&&handleAddTask()} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">MÔN HỌC</label>
                    <select className="input-dark w-full" value={newTask.code} onChange={e=>setNewTask(f=>({...f,code:e.target.value}))}>
                      <option value="">-- Chọn --</option>
                      {subjectDatabase.map(s=><option key={s.id} value={s.id}>{s.code} – {s.name.slice(0,25)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">HẠN NỘP</label>
                    <input type="date" className="input-dark w-full" value={newTask.date}
                      onChange={e=>setNewTask(f=>({...f,date:e.target.value}))} />
                  </div>
                </div>

                {(isCore || isSuperAdmin) && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-gray-500 font-bold block mb-1 flex items-center gap-1">
                        <UserIcon className="w-2.5 h-2.5" /> NGƯỜI THỰC HIỆN (CORE ONLY)
                      </label>
                      <select className="input-dark w-full" value={newTask.assigneeId} onChange={e=>setNewTask(f=>({...f,assigneeId:e.target.value}))}>
                        <option value={currentUser?.id}>Bản thân ({myName})</option>
                        {members.filter(m => m.id !== currentUser?.id).map(m => (
                          <option key={m.id} value={m.id}>{m.fullName} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-1">LOẠI</label>
                      <select className="input-dark w-full" value={newTask.type} onChange={e=>setNewTask(f=>({...f,type:e.target.value}))}>
                        <option>Bắt buộc</option>
                        <option>Tự nguyện</option>
                        <option>Sự kiện</option>
                        <option>Quan trọng</option>
                      </select>
                    </div>
                  </div>
                )}

                {aiSuggestion && (
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2 fade-in">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Sparkles className="w-3 h-3" /> AI ĐỀ XUẤT:
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed">
                      {aiSuggestion.reason}
                    </div>
                    {aiSuggestion.subtasks?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {aiSuggestion.subtasks.map((st, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-800 rounded-lg text-[10px] text-gray-400 border border-gray-700">
                            + {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleAddTask}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 btn-active">
                  XÁC NHẬN VÀ GIAO VIỆC
                </button>
              </div>
            )}

            {/* Trễ hạn */}
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-400"/>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Trễ hạn ({overdue.length})</span>
                </div>
                {overdue.map(t=><TaskRow key={t.id} task={t} onDelete={ctxDeleteTask}/>)}
              </div>
            )}

            {/* Sắp đến */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400"/>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Sắp đến ({upcoming.length})</span>
              </div>
              {upcoming.length > 0
                ? upcoming.map(t=><TaskRow key={t.id} task={t} onDelete={ctxDeleteTask}/>)
                : <EmptyState icon={CheckCircle2} msg="Không có task nào sắp đến"/>
              }
            </div>

            {/* Tiến độ môn học (tính từ checklist) */}
            {userSubjects.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">TIẾN ĐỘ MÔN HỌC</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userSubjects.map(sub => {
                    const { done, total, pct } = getChecklistProgress(sub.id);
                    const isMySme = smeMap[sub.id] === myName;
                    const show    = expandProg[sub.id];
                    const tasks   = subjectTasks[sub.id] || [];
                    return (
                      <div key={sub.id} className="bg-[#1a1a1a] border border-gray-800/60 rounded-xl overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="text-[10px] font-bold text-blue-400">{sub.code}</div>
                              <div className="text-xs font-medium text-gray-300 mt-0.5 leading-tight">{sub.name}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-black" style={{color:progressColor(pct)}}>{pct}%</span>
                              {tasks.length > 0 && (
                                <button onClick={()=>setExpandProg(p=>({...p,[sub.id]:!p[sub.id]}))}
                                  className="p-1 text-gray-600 hover:text-gray-300 border border-gray-800 rounded-lg">
                                  {show?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
                                </button>
                              )}
                            </div>
                          </div>
                          <ProgressBar value={pct} height={6}/>
                          <div className="text-[10px] text-gray-600 mt-1.5">
                            {total > 0
                              ? `${done}/${total} mục hoàn thành · Chi tiết tại Môn học`
                              : isMySme
                                ? <span className="text-amber-600">Bạn là SME — vào <strong>Môn học</strong> để thêm checklist</span>
                                : 'SME chưa tạo checklist'
                            }
                          </div>
                        </div>
                        {show && tasks.length > 0 && (
                          <div className="border-t border-gray-800/60 px-4 py-3 bg-[#141414] fade-in">
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                              {tasks.map(t => {
                                const checked = !!t.doneBy?.[currentUser?.id];
                                return (
                                  <div key={t.id} className={`flex items-center gap-2 text-xs ${checked?'text-gray-500 line-through':'text-gray-300'}`}>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${checked?'bg-green-500':'bg-gray-700'}`}/>
                                    {t.title}
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-gray-600 mt-2">Tick checkbox trong tab <strong className="text-blue-400">Môn học</strong></p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: TÀI LIỆU ───────────────────────────────────────────────── */}
        {activeTab==='docs' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
              <Folder className="w-4 h-4 text-yellow-400"/> Tài liệu môn học
            </h2>
            {userSubjects.length === 0
              ? <EmptyState icon={BookOpen} msg="Đăng ký môn học trong Hồ sơ & GPA trước"/>
              : userSubjects.map(sub => {
                // FIX: safe array coerce for docs to handle Firebase object-as-array
                const subDocs = toArr(docs[sub.id]);
                const isMySme = smeMap[sub.id] === myName;
                return (
                  <div key={sub.id} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                      <div>
                        <span className="text-[10px] font-bold text-blue-400 mr-2">{sub.code}</span>
                        <span className="text-sm font-medium text-gray-200">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{subDocs.length} file</span>
                        {isMySme && (
                          <button onClick={()=>setUploadSub(sub)}
                            className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-500/20">
                            <Link className="w-3 h-3"/> Thêm link
                          </button>
                        )}
                      </div>
                    </div>
                    {/* FIX: scrollable container – show ALL docs */}
                    <div className="p-3 max-h-72 overflow-y-auto custom-scrollbar">
                      {subDocs.length === 0
                        ? <div className="text-xs text-gray-600 italic py-2 text-center">Chưa có tài liệu nào</div>
                        : subDocs.map(d=>(
                          <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#222] transition-colors group mb-1">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-blue-400"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              {d.url
                                ? <a href={d.url} target="_blank" rel="noreferrer"
                                    className="text-sm font-medium text-blue-400 hover:underline truncate block">{d.name}</a>
                                : <div className="text-sm font-medium text-gray-200 truncate">{d.name}</div>
                              }
                              <div className="text-[10px] text-gray-600">{d.type} · {d.uploadedByName||'SME'} · {d.uploadedAt}</div>
                            </div>
                            <button onClick={()=>ctxDeleteDoc(sub.id, d.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-600 transition-all">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}
      </div>

      {/* Modal thêm tài liệu */}
      {uploadSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={()=>setUploadSub(null)}>
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm">Thêm tài liệu · {uploadSub.code}</h3>
              <button onClick={()=>setUploadSub(null)}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
            </div>
            <AddDocForm
              subjectCode={uploadSub.code}
              onSubmit={f=>{ ctxAddDoc(uploadSub.id,f); setUploadSub(null); }}
              onClose={()=>setUploadSub(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Doc Form ───────────────────────────────────────────────────────────
function AddDocForm({ onSubmit, onClose, subjectCode = 'Tasks' }) {
  const { requireGoogleAuth, toast } = useApp();
  const [form, setForm] = useState({ name:'', url:'', type:'Slide bài giảng', private:false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const valid = form.name.trim() && (form.url.trim() || selectedFile);

  const handleAdd = async () => {
    let finalUrl = form.url.trim();
    if (selectedFile) {
      setIsUploading(true);
      try {
        const token = await requireGoogleAuth();
        if (!token) return setIsUploading(false);
        finalUrl = await uploadToDrive(token, selectedFile, `2X18_${subjectCode}`);
      } catch (err) {
        setIsUploading(false);
        return toast(err.message || 'Lỗi upload Drive', 'error');
      }
      setIsUploading(false);
    }
    onSubmit({ ...form, url: finalUrl });
  };

  return (
    <div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Tên tài liệu *</label>
          <input className="input-dark" placeholder="VD: Slide tuần 1–4..."
            value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-1">
            Tài liệu đính kèm *
          </label>
          <div className="relative">
            <input type="file" onChange={e => { setSelectedFile(e.target.files[0]); setForm(f=>({...f,url:''})) }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={isUploading}/>
            <div className={`w-full h-11 px-4 flex items-center border rounded-xl text-sm transition-all ${selectedFile ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[#121212] border-gray-700 text-gray-500'}`}>
              <span className="truncate">{selectedFile ? selectedFile.name : 'Chọn file từ máy tính...'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 my-2">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-[10px] text-gray-500 font-bold uppercase">Hoặc dán link Drive</span>
            <div className="h-px bg-gray-800 flex-1"></div>
          </div>

          <input className="input-dark" placeholder="https://drive.google.com/..." disabled={isUploading}
            value={form.url} onChange={e=>{setForm(f=>({...f,url:e.target.value})); setSelectedFile(null);}}/>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Loại</label>
          <select className="input-dark" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            {['Slide bài giảng','Bài tập','Đề thi','Tóm tắt lý thuyết','Giáo trình','Paper','Khác'].map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.private}
            onChange={e=>setForm(f=>({...f,private:e.target.checked}))}/>
          Chỉ thành viên nhóm phụ trách xem được
        </label>
      </div>
      <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
        <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
        <button disabled={!valid} onClick={()=>onSubmit(form)}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl">
          Thêm
        </button>
      </div>
    </div>
  );
}

// ── TaskRow ────────────────────────────────────────────────────────────────
function TaskRow({ task, onDelete }) {
  const days   = daysDiff(task.deadline);
  const isLate = days < 0;
  const isSoon = days >= 0 && days <= 3;
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border mb-2 hover:bg-[#1e1e1e] transition-colors group ${
      isLate?'border-red-500/20 bg-red-500/5':'border-gray-800/60 bg-[#1a1a1a]'
    }`}>
      <div className={`p-2 rounded-xl shrink-0 ${isLate?'bg-red-500/10':'bg-blue-500/10'}`}>
        <FileText className={`w-5 h-5 ${isLate?'text-red-400':'text-blue-400'}`}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-200 truncate">{task.task}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          <span className="font-bold text-blue-400">{task.code}</span> · Hạn: {task.deadline}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`badge ${isLate?'badge-red':isSoon?'badge-yellow':'badge-gray'}`}>
          {isLate?`Trễ ${Math.abs(days)} ngày`:days===0?'Hôm nay':`Còn ${days}d`}
        </span>
        <button onClick={()=>onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 transition-all"
          title="Xóa (vào thùng rác)">
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
function EmptyState({ icon:Icon, msg }) {
  return (
    <div className="flex flex-col items-center py-10 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
      <Icon className="w-10 h-10 text-gray-700 mb-2"/>
      <p className="text-sm text-gray-600">{msg}</p>
    </div>
  );
}
