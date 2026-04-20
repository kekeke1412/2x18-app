// src/pages/Subjects.jsx
import React, { useState, useMemo } from 'react';
import {
  BookOpen, Search, ShieldCheck, User, ChevronDown, ChevronUp,
  FileText, X, Star, MessageSquare, Send, Plus, Trash2, Check, Edit3, Link, Users,
  CheckCircle2, Circle, Clock, Book
} from 'lucide-react';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext';
import { uploadToDrive } from '../services/googleApi';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '../components/UserAvatar';

const progressColor = p => p>=80?'#22c55e':p>=50?'#3b82f6':p>=25?'#f59e0b':'#ef4444';

// Safe array coerce (handles Firebase object-as-array)
const toArr = v => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [];
};

const ProgressBar = ({ value, height=6 }) => (
  <div className="bg-gray-800 rounded-full overflow-hidden" style={{height}}>
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100,value)}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="h-full rounded-full"
      style={{background:progressColor(value)}}
    />
  </div>
);

// ── Member Checklist Progress Modal ────────────────────────────────────────
function MemberProgressModal({ member, subjectId, subjectName, onClose }) {
  const { subjectTasks } = useApp();
  const tasks = toArr(subjectTasks?.[subjectId]);
  const done  = tasks.filter(t => t.doneBy?.[member?.id]).length;
  const pct   = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0;

  const initials = (member?.fullName || '?').split(' ').filter(Boolean).map(w=>w[0]).slice(-2).join('').toUpperCase();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e=>e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {member?.avatarUrl
              ? <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-gray-700 shrink-0"/>
              : <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">{initials}</div>
            }
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{member?.fullName}</div>
              <div className="text-[10px] text-gray-500 truncate">{subjectName}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white ml-2 shrink-0">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Progress summary */}
        <div className="px-5 py-3 border-b border-gray-800 shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Tiến độ checklist</span>
            <span className="text-sm font-black" style={{color:progressColor(pct)}}>{pct}%</span>
          </div>
          <ProgressBar value={pct} height={6}/>
          <div className="text-[10px] text-gray-500 mt-1">{done}/{tasks.length} mục đã hoàn thành</div>
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">SME chưa tạo checklist cho môn này.</div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((t) => {
                const checked = !!t.doneBy?.[member?.id];
                return (
                  <div key={t.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
                      checked
                        ? 'bg-green-500/8 border-green-500/20'
                        : 'bg-[#111] border-gray-800'
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      checked ? 'bg-green-500' : 'bg-gray-800 border border-gray-700'
                    }`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white"/>}
                    </div>
                    <span className={`text-xs flex-1 leading-snug ${checked ? 'text-gray-400 line-through' : 'text-gray-300'}`}>
                      {t.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Add Doc Modal ──────────────────────────────────────────────────────────
function AddDocModal({ subject, onClose, onAdd }) {
  const { requireGoogleAuth, toast } = useApp();
  const [form, setForm] = useState({ name:'', url:'', type:'Slide bài giảng', private:false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const setF  = (k,v) => setForm(f=>({...f,[k]:v}));
  const valid = form.name.trim() && (form.url.trim() || selectedFile);

  const handleAdd = async () => {
    let finalUrl = form.url.trim();
    if (selectedFile) {
      setIsUploading(true);
      try {
        const token = await requireGoogleAuth();
        if (!token) return setIsUploading(false);
        finalUrl = await uploadToDrive(token, selectedFile, `2X18_${subject.code}`);
      } catch (err) {
        setIsUploading(false);
        return toast(err.message || 'Lỗi upload Drive', 'error');
      }
      setIsUploading(false);
    }
    onAdd(subject.id, { ...form, url: finalUrl });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl" 
        onClick={e=>e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white text-sm">Thêm tài liệu · {subject?.code}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Tên tài liệu *</label>
            <input className="input-dark" placeholder="VD: Slide tuần 1–4..."
              value={form.name} onChange={e=>setF('name',e.target.value)} autoFocus/>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-1">
              Tài liệu đính kèm *
            </label>
            <div className="relative">
              <input type="file" onChange={e => { setSelectedFile(e.target.files[0]); setF('url', '') }}
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
              value={form.url} onChange={e=>{setF('url',e.target.value); setSelectedFile(null);}}/>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Loại</label>
            <select className="input-dark" value={form.type} onChange={e=>setF('type',e.target.value)}>
              {['Slide bài giảng','Bài tập','Đề thi','Tóm tắt lý thuyết','Giáo trình','Paper','Khác'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} disabled={isUploading} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button disabled={!valid || isUploading} onClick={handleAdd}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2">
            {isUploading ? <><Clock className="w-4 h-4 animate-spin"/> Đang tải...</> : 'Thêm tài liệu'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Subject Task Panel (Checklist) ─────────────────────────────────────────
function SubjectTaskPanel({ subjectId, isSme, currentUser }) {
  const { subjectTasks, addSubjectTask, editSubjectTask, deleteSubjectTask, tickSubjectTask } = useApp();
  const tasks = toArr(subjectTasks[subjectId]);

  const [adding,   setAdding]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editId,   setEditId]   = useState(null);
  const [editText, setEditText] = useState('');

  const myDone   = tasks.filter(t=>t.doneBy?.[currentUser?.id]).length;
  const progress = tasks.length > 0 ? Math.round(myDone / tasks.length * 100) : 0;

  const doAdd = () => {
    if (!newTitle.trim()) return;
    addSubjectTask(subjectId, { title:newTitle.trim(), createdBy:currentUser?.fullName });
    setNewTitle(''); setAdding(false);
  };
  const doEdit = (t) => { editSubjectTask(subjectId, {...t, title:editText}); setEditId(null); };

  return (
    <div className="p-4 border-b border-gray-800/60">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5"/> Checklist học ({myDone}/{tasks.length})
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold" style={{color:progressColor(progress)}}>{progress}%</span>
          {isSme && (
            <button onClick={()=>setAdding(v=>!v)}
              className="text-[10px] text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg hover:bg-blue-500/10">
              <Plus className="w-3 h-3 inline"/> Thêm mục
            </button>
          )}
        </div>
      </div>

      <ProgressBar value={progress} height={4}/>

      {adding && isSme && (
        <div className="flex gap-2 mt-2">
          <input className="input-dark flex-1 py-1.5 text-xs"
            placeholder="Tên chương / mục / dạng bài..."
            value={newTitle} onChange={e=>setNewTitle(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&doAdd()} autoFocus/>
          <button onClick={doAdd} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">OK</button>
          <button onClick={()=>setAdding(false)} className="p-1.5 text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="space-y-1 mt-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
        {tasks.length === 0 ? (
          <div className="text-[10px] text-gray-600 italic py-2 text-center">
            {isSme ? 'Thêm chương / mục / dạng bài để thành viên theo dõi tiến độ.' : 'SME chưa thêm checklist cho môn này.'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((t, i) => {
              const done = !!t.doneBy?.[currentUser?.id];
              return (
                <motion.div 
                  layout key={t.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  className={`group flex items-center gap-2 p-2 rounded-lg ${done?'bg-green-500/5 border border-green-500/10':'bg-[#111] border border-gray-800'}`}
                >
                  <input type="checkbox" checked={done}
                    onChange={e=>tickSubjectTask(subjectId,t.id,currentUser?.id,e.target.checked)}
                    className="w-3.5 h-3.5 accent-green-500 cursor-pointer shrink-0"/>
                  {editId===t.id && isSme ? (
                    <>
                      <input className="flex-1 bg-transparent text-xs text-white outline-none border-b border-blue-500"
                        value={editText} onChange={e=>setEditText(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&doEdit(t)} autoFocus/>
                      <button onClick={()=>doEdit(t)} className="text-green-400"><Check className="w-3 h-3"/></button>
                      <button onClick={()=>setEditId(null)} className="text-gray-500"><X className="w-3 h-3"/></button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-xs leading-snug ${done?'line-through text-gray-500':'text-gray-300'}`}>
                        {t.title}
                      </span>
                      {isSme && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={()=>{setEditId(t.id);setEditText(t.title);}}
                            className="text-gray-600 hover:text-blue-400"><Edit3 className="w-3 h-3"/></button>
                          <button onClick={()=>deleteSubjectTask(subjectId,t.id)}
                            className="text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────────────
function SubjectCard({ sub, grade, sme, isCore, isSme, onChangeSme, onUpload, docs: docsProp, members, currentUser, rateDoc, grades, onViewProgress }) {
  const { subjectTasks, subjectComments, addSubjectComment, deleteDoc } = useApp();
  const [expanded,   setExpanded]   = useState(false);
  const [comment,    setComment]    = useState('');

  const tasks    = toArr(subjectTasks[sub.id]);
  const myDone   = tasks.filter(t=>t.doneBy?.[currentUser?.id]).length;
  const progress = tasks.length > 0 ? Math.round(myDone / tasks.length * 100) : 0;
  const comments = toArr(subjectComments[sub.id]);
  const docs     = toArr(docsProp);

  const learnerMap = useMemo(() => {
    const map = { 'Đang học': [], 'Đã học': [], 'Được miễn': [] };
    (members || []).forEach(m => {
      if (!m?.id) return;
      const st = grades?.[m.id]?.[sub.id]?.status;
      if (map[st]) map[st].push(m);
    });
    return map;
  }, [members, grades, sub.id]);

  const allLearners = [...learnerMap['Đang học'], ...learnerMap['Đã học'], ...learnerMap['Được miễn']];

  const handleComment = () => {
    if (!comment.trim()) return;
    addSubjectComment(sub.id, comment.trim());
    setComment('');
  };

  const statusBadge = {
    'Đang học':'badge-blue','Đã học':'badge-green',
    'Chưa học':'badge-gray','Được miễn':'badge-purple',
  }[grade?.status||'Chưa học'];

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all flex flex-col ${expanded?'border-blue-500/30':'border-gray-800/60'}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{sub.code}</span>
              <span className={`badge ${statusBadge}`}>{grade?.status||'Chưa học'}</span>
              {isSme && <span className="badge badge-yellow">Phụ trách</span>}
            </div>
            <h3 className="font-bold text-white text-sm leading-tight">{sub.name}</h3>
            <div className="text-xs text-gray-600 mt-0.5">{sub.credits} TC · {sub.type}</div>
          </div>
          <button onClick={()=>setExpanded(v=>!v)} className="p-1.5 hover:bg-[#252525] rounded-lg text-gray-500 shrink-0 border border-gray-800">
            {expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
          </button>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Tiến độ của bạn</span>
            <span className="font-bold" style={{color:progressColor(progress)}}>{progress}%</span>
          </div>
          <ProgressBar value={progress}/>
        </div>

        <div className="flex items-center justify-between mt-3">
          {grade?.status === 'Đã học' && !isCore ? (
            <div className="flex items-center gap-1.5 py-1 px-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-wider">Môn này đã xong!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserAvatar user={members.find(m => m.fullName === sme)} size={24} />
              {isCore ? (
                <select value={sme||''} onChange={e=>onChangeSme(sub.id,e.target.value)} className="text-xs bg-[#252525] text-white border border-gray-700 rounded-lg px-2 py-1 outline-none">
                  <option value="">-- Chọn SME --</option>
                  {members.map(m=><option key={m.id} value={m.fullName}>{m.fullName}</option>)}
                </select>
              ) : <span className="text-xs text-gray-400">{sme||'Chưa có SME'}</span>}
            </div>
          )}
          <button onClick={()=>onUpload(sub)} className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
            <Link className="w-3 h-3"/> Tài liệu
          </button>
        </div>

        {(learnerMap['Đang học'].length > 0 || learnerMap['Đã học'].length > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-800/40 space-y-2">
            {learnerMap['Đang học'].length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Đang học:</span>
                <div className="flex -space-x-1.5">
                  {learnerMap['Đang học'].slice(0, 5).map(m => (
                    <div key={m.id} onClick={isCore ? () => onViewProgress(m) : undefined}
                      className={`relative ${isCore ? 'cursor-pointer hover:z-10' : ''}`}>
                      <UserAvatar user={m} size={20} className="border-2 border-[#1a1a1a]" />
                    </div>
                  ))}
                  {learnerMap['Đang học'].length > 5 && (
                    <div className="w-5 h-5 rounded-full bg-gray-800 border-2 border-[#1a1a1a] flex items-center justify-center text-[8px] font-bold text-gray-400">
                      +{learnerMap['Đang học'].length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
            {learnerMap['Đã học'].length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-green-400 font-bold uppercase tracking-tighter">Đã học:</span>
                <div className="flex -space-x-1.5">
                  {learnerMap['Đã học'].slice(0, 5).map(m => (
                    <div key={m.id} onClick={isCore ? () => onViewProgress(m) : undefined}
                      className={`relative ${isCore ? 'cursor-pointer hover:z-10' : ''}`}>
                      <UserAvatar user={m} size={20} className="border-2 border-[#1a1a1a]" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#1a1a1a] flex items-center justify-center">
                        <Check className="w-1.5 h-1.5 text-white" strokeWidth={4} />
                      </div>
                    </div>
                  ))}
                  {learnerMap['Đã học'].length > 5 && (
                    <div className="w-5 h-5 rounded-full bg-gray-800 border-2 border-[#1a1a1a] flex items-center justify-center text-[8px] font-bold text-gray-400">
                      +{learnerMap['Đã học'].length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-800/60 bg-[#141414] overflow-hidden">
            <SubjectTaskPanel subjectId={sub.id} isSme={isSme||isCore} currentUser={currentUser}/>
            
            {allLearners.length > 0 && (
              <div className="p-4 border-b border-gray-800/60 space-y-3">
                <h4 className="text-xs font-bold text-gray-400">Thành viên ({allLearners.length})</h4>
                
                {['Đã học', 'Đang học', 'Được miễn'].map(status => {
                  const list = learnerMap[status];
                  if (!list.length) return null;
                  const color = status === 'Đã học' ? 'text-green-400' : status === 'Đang học' ? 'text-blue-400' : 'text-purple-400';
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{status}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {list.map(m => (
                          <div key={m.id} onClick={isCore ? () => onViewProgress(m) : undefined}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border border-gray-800 bg-[#111] ${isCore?'cursor-pointer hover:border-blue-500/30 transition-all':''}`}>
                            <UserAvatar user={m} size={16} />
                            <span className="text-[10px] text-gray-300">{m.fullName}</span>
                            {status === 'Đã học' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-4 border-b border-gray-800/60">
              <h4 className="text-xs font-bold text-gray-400 mb-2">Tài liệu ({docs.length})</h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-2 bg-[#111] rounded-xl border border-gray-800">
                    <FileText className="w-4 h-4 text-blue-400"/>
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-400 hover:underline truncate flex-1">{d.name}</a>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s=>(
                        <Star key={s} onClick={()=>rateDoc(sub.id,d.id,s)} className={`w-3 h-3 cursor-pointer ${s<=(d.ratings?.[currentUser?.id]||0)?'text-yellow-400':'text-gray-700'}`} fill={s<=(d.ratings?.[currentUser?.id]||0)?'currentColor':'none'}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4">
              <h4 className="text-xs font-bold text-gray-400 mb-2">Hỏi đáp SME</h4>
              <div className="space-y-2 mb-2 max-h-28 overflow-y-auto custom-scrollbar">
                {comments.map(c=>(
                  <div key={c.id} className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800 text-xs text-gray-300">
                    <div className="flex justify-between font-bold text-blue-400 mb-1"><span>{c.user}</span><span>{c.time}</span></div>
                    {c.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleComment()} placeholder="Nhập bình luận..." className="input-dark flex-1 text-xs py-1.5 px-3"/>
                <button onClick={handleComment} className="p-1.5 bg-blue-600 text-white rounded-lg"><Send className="w-4 h-4"/></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Subjects() {
  const { currentUser, isCore, smeMap, setSme, docs, addDoc, rateDoc, grades, myGrades, members } = useApp();
  const [search,      setSearch]     = useState('');
  const [filterType,  setFilterType] = useState('learning');
  const [uploadSub,   setUploadSub]  = useState(null);
  const [memberProgress, setMemberProgress] = useState(null);

  const filtered = subjectDatabase.filter(sub => {
    const q = search.toLowerCase();
    const match = sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q);
    if (!match) return false;
    const myStatus = myGrades[sub.id]?.status;
    if (filterType==='done') return myStatus==='Đã học'||myStatus==='Được miễn';
    if (filterType==='learning') return myStatus==='Đang học';
    if (filterType==='sme') return smeMap[sub.id] === currentUser?.fullName;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-xl font-black text-white">Môn học & SME</h1><p className="text-xs text-gray-500">Quản lý lộ trình học tập và hỗ trợ từ chuyên gia</p></div>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2"/>
            <input className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl py-2 pl-9 pr-4 text-sm" placeholder="Tìm môn học..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {[['learning','Đang học'],['done','Đã hoàn thành'],['sme','Phụ trách']].map(([k,l])=>(
            <button key={k} onClick={()=>setFilterType(k)} className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType===k?'bg-blue-600 text-white':'text-gray-500 hover:bg-[#222]'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(s => (
              <SubjectCard key={s.id} sub={s} grade={myGrades[s.id]} sme={smeMap[s.id]} isCore={isCore} isSme={smeMap[s.id]===currentUser?.fullName} onChangeSme={(sid,n)=>setSme({subjectId:sid,userId:n})} onUpload={setUploadSub} docs={docs[s.id]} members={members} currentUser={currentUser} rateDoc={rateDoc} grades={grades} onViewProgress={setMemberProgress}/>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {uploadSub && <AddDocModal subject={uploadSub} onClose={()=>setUploadSub(null)} onAdd={(sid,f)=>addDoc(sid,f)} />}
        {memberProgress && <MemberProgressModal member={memberProgress} subjectId={memberProgress.subjectId} subjectName={memberProgress.subjectName} onClose={()=>setMemberProgress(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
