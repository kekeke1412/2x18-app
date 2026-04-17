// src/pages/Subjects.jsx
import React, { useState, useMemo } from 'react';
import {
  BookOpen, Search, ShieldCheck, User, ChevronDown, ChevronUp,
  FileText, X, Star, MessageSquare, Send, Plus, Trash2, Check, Edit3, Link, Users,
  CheckCircle2, Circle
} from 'lucide-react';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext';
import { uploadToDrive } from '../services/googleApi';

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
    <div className="h-full rounded-full transition-all duration-700"
      style={{width:`${Math.min(100,value)}%`,background:progressColor(value)}}/>
  </div>
);

// ── Member Checklist Progress Modal ────────────────────────────────────────
function MemberProgressModal({ member, subjectId, subjectName, onClose }) {
  const { subjectTasks } = useApp();
  const tasks = subjectTasks[subjectId] || [];
  const done  = tasks.filter(t => t.doneBy?.[member.id]).length;
  const pct   = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0;

  const initials = (member.fullName || '?').split(' ').filter(Boolean).map(w=>w[0]).slice(-2).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {member.avatarUrl
              ? <img src={member.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-gray-700 shrink-0"/>
              : <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">{initials}</div>
            }
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{member.fullName}</div>
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
              {tasks.map((t, i) => {
                const checked = !!t.doneBy?.[member.id];
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
                    {checked && <span className="text-[9px] text-green-500 shrink-0 font-bold">✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.private}
              onChange={e=>setF('private',e.target.checked)}/>
            <span className="text-sm text-gray-400">Chỉ nhóm phụ trách xem được</span>
          </label>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} disabled={isUploading} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button disabled={!valid || isUploading} onClick={handleAdd}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2">
            {isUploading ? <><Clock className="w-4 h-4 animate-spin"/> Đang tải...</> : 'Thêm tài liệu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subject Task Panel (Checklist) ─────────────────────────────────────────
function SubjectTaskPanel({ subjectId, isSme, currentUser }) {
  const { subjectTasks, addSubjectTask, editSubjectTask, deleteSubjectTask, tickSubjectTask } = useApp();
  const tasks = subjectTasks[subjectId] || [];

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
            {isSme
              ? 'Thêm chương / mục / dạng bài để thành viên theo dõi tiến độ.'
              : 'SME chưa thêm checklist cho môn này.'}
          </div>
        ) : tasks.map(t => {
          const done = !!t.doneBy?.[currentUser?.id];
          return (
            <div key={t.id} className={`group flex items-center gap-2 p-2 rounded-lg ${done?'bg-green-500/5 border border-green-500/10':'bg-[#111] border border-gray-800'}`}>
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
                        className="text-gray-600 hover:text-red-400" title="Xóa (vào thùng rác)"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────────────
function SubjectCard({ sub, grade, sme, isCore, isSme, onChangeSme, onUpload, docs: docsProp, members, currentUser, rateDoc, grades }) {
  const { subjectTasks, subjectComments, addSubjectComment, deleteDoc } = useApp();
  const [expanded,   setExpanded]   = useState(false);
  const [comment,    setComment]    = useState('');
  // Member progress modal (core/admin only)
  const [memberProgress, setMemberProgress] = useState(null); // { member, subjectId }

  const tasks    = subjectTasks[sub.id] || [];
  const myDone   = tasks.filter(t=>t.doneBy?.[currentUser?.id]).length;
  const progress = tasks.length > 0 ? Math.round(myDone / tasks.length * 100) : 0;

  const comments = subjectComments[sub.id] || [];

  // FIX: safe array coerce for docs (Firebase may return object with numeric keys)
  const docs = toArr(docsProp);

  // Build learner map from grades
  const learnerMap = useMemo(() => {
    const map = { 'Đang học': [], 'Đã học': [], 'Được miễn': [] };
    (members || []).forEach(m => {
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

  // Render a learner avatar badge
  const renderLearnerBadge = (m, colorClass, label, clickable = false) => {
    const initials = (m.avatar || m.fullName?.[0] || '?');
    return (
      <div key={m.id}
        title={clickable ? `${m.fullName} – nhấn để xem tiến độ` : `${m.fullName} – ${label}`}
        onClick={clickable && isCore ? () => setMemberProgress({ member: m, subjectId: sub.id, subjectName: sub.name }) : undefined}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${colorClass} ${
          clickable && isCore ? 'cursor-pointer hover:opacity-80 hover:ring-1 hover:ring-current' : ''
        }`}>
        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
          label === 'học' ? 'bg-blue-600/30 text-blue-300'
          : label === '✓' ? 'bg-green-600/30 text-green-300'
          : 'bg-purple-600/30 text-purple-300'
        }`}>
          {initials}
        </div>
        <span className="text-[10px] font-medium max-w-[80px] truncate">
          {m.fullName.split(' ').slice(-1)[0]}
        </span>
        {isCore && label === 'học' && (
          <span className="text-[8px] opacity-60 shrink-0">↗</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all flex flex-col ${expanded?'border-blue-500/30':'border-gray-800/60'}`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                  {sub.code}
                </span>
                <span className={`badge ${statusBadge}`}>{grade?.status||'Chưa học'}</span>
                {isSme && <span className="badge badge-yellow">Phụ trách</span>}
              </div>
              <h3 className="font-bold text-white text-sm leading-tight">{sub.name}</h3>
              <div className="text-xs text-gray-600 mt-0.5">{sub.credits} TC · {sub.type}</div>
            </div>
            <button onClick={()=>setExpanded(v=>!v)}
              className="p-1.5 hover:bg-[#252525] rounded-lg text-gray-500 shrink-0 border border-gray-800">
              {expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
            </button>
          </div>

          {/* My progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Tiến độ của bạn</span>
              <span className="font-bold" style={{color:progressColor(progress)}}>{progress}%</span>
            </div>
            <ProgressBar value={progress}/>
            {tasks.length > 0 && (
              <div className="text-[10px] text-gray-600 mt-1">{myDone}/{tasks.length} mục hoàn thành</div>
            )}
          </div>

          {/* SME row */}
          {(grade?.status === 'Đã học' || grade?.status === 'Được miễn') ? (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                <span>🎓</span> Đã hoàn thành
              </div>
              {(isSme||isCore) && (
                <button onClick={()=>onUpload(sub)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg hover:bg-blue-500/20">
                  <Link className="w-3 h-3"/> Tài liệu
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600/20 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                  {(sme||'?')[0]}
                </div>
                {isCore ? (
                  <select value={sme||''} onChange={e=>onChangeSme(sub.id,e.target.value)}
                    className="text-xs bg-[#252525] text-white border border-gray-700 rounded-lg px-2 py-1 outline-none cursor-pointer">
                    <option value="">-- Chọn SME --</option>
                    {members.map(m=><option key={m.id} value={m.fullName}>{m.fullName}</option>)}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">{sme||'Chưa có SME'}</span>
                )}
              </div>
              {(isSme||isCore) && (
                <button onClick={()=>onUpload(sub)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg hover:bg-blue-500/20">
                  <Link className="w-3 h-3"/> Tài liệu
                </button>
              )}
            </div>
          )}

          {/* Mini "Đang học" avatar row */}
          {learnerMap['Đang học'].length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800/40">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-gray-500 font-bold shrink-0">Đang học:</span>
                {learnerMap['Đang học'].slice(0, 5).map(m =>
                  m.avatarUrl ? (
                    <img key={m.id} src={m.avatarUrl} alt={m.fullName} title={isCore ? `${m.fullName} – nhấn để xem tiến độ` : m.fullName}
                      onClick={isCore ? () => setMemberProgress({ member:m, subjectId:sub.id, subjectName:sub.name }) : undefined}
                      className={`w-5 h-5 rounded-full object-cover border border-blue-500/30 shrink-0 ${isCore ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : ''}`}
                      onError={e=>{e.target.style.display='none'}}/>
                  ) : (
                    <div key={m.id} title={isCore ? `${m.fullName} – nhấn để xem tiến độ` : m.fullName}
                      onClick={isCore ? () => setMemberProgress({ member:m, subjectId:sub.id, subjectName:sub.name }) : undefined}
                      className={`w-5 h-5 rounded-full bg-blue-600/25 border border-blue-500/30 flex items-center justify-center text-[8px] font-bold text-blue-300 shrink-0 ${isCore ? 'cursor-pointer hover:ring-1 hover:ring-blue-400' : ''}`}>
                      {m.avatar || m.fullName?.[0] || '?'}
                    </div>
                  )
                )}
                {learnerMap['Đang học'].length > 5 && (
                  <span className="text-[10px] text-gray-500">+{learnerMap['Đang học'].length - 5}</span>
                )}
              </div>
              {isCore && learnerMap['Đang học'].length > 0 && (
                <div className="text-[9px] text-gray-600 mt-1">Nhấn vào avatar để xem tiến độ từng người</div>
              )}
            </div>
          )}
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="border-t border-gray-800/60 bg-[#141414]">

            {/* Checklist */}
            <SubjectTaskPanel subjectId={sub.id} isSme={isSme||isCore} currentUser={currentUser}/>

            {/* Member learner list — with clickable progress for core */}
            {allLearners.length > 0 && (
              <div className="p-4 border-b border-gray-800/60">
                <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5"/> Thành viên học môn này ({allLearners.length})
                  {isCore && tasks.length > 0 && (
                    <span className="text-[9px] text-blue-400/60 font-normal ml-1">· Nhấn vào tên để xem tiến độ</span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {/* Đang học – clickable for core */}
                  {learnerMap['Đang học'].map(m =>
                    renderLearnerBadge(m, 'bg-blue-500/10 border-blue-500/20 text-blue-300', 'học', true)
                  )}
                  {/* Đã học */}
                  {learnerMap['Đã học'].map(m =>
                    renderLearnerBadge(m, 'bg-green-500/10 border-green-500/20 text-green-300', '✓', false)
                  )}
                  {/* Được miễn */}
                  {learnerMap['Được miễn'].map(m =>
                    renderLearnerBadge(m, 'bg-purple-500/10 border-purple-500/20 text-purple-300', 'miễn', false)
                  )}
                </div>
              </div>
            )}

            {/* Docs – FIX: show ALL docs with scrollable container */}
            <div className="p-4 border-b border-gray-800/60">
              <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5"/> Tài liệu ({docs.length}) · Google Drive
              </h4>
              {docs.length === 0 ? (
                <div className="text-xs text-gray-600 italic text-center py-2">
                  Chưa có tài liệu{(isSme||isCore)?' — nhấn "Tài liệu" ở trên để thêm link Drive':''}
                </div>
              ) : (
                // FIX: removed max-h cap so ALL docs are visible; added scrollable container
                <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-2 bg-[#111] rounded-xl border border-gray-800 hover:border-gray-700 transition-colors group">
                      <FileText className="w-4 h-4 text-blue-400 shrink-0"/>
                      <div className="flex-1 min-w-0">
                        <a href={d.url} target="_blank" rel="noreferrer"
                          className="text-xs font-medium text-blue-400 hover:underline truncate block">{d.name}</a>
                        <div className="text-[10px] text-gray-600">{d.type} · {d.uploadedByName||'SME'} · {d.uploadedAt}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s=>(
                            <button key={s} onClick={()=>rateDoc(sub.id,d.id,s)}
                              className={`transition-colors ${s<=(d.ratings?.[currentUser?.id]||0)?'text-yellow-400':'text-gray-700 hover:text-yellow-500'}`}>
                              <Star className="w-3 h-3" fill={s<=(d.ratings?.[currentUser?.id]||0)?'currentColor':'none'}/>
                            </button>
                          ))}
                        </div>
                        {d.avgRating>0 && (
                          <span className="text-[10px] text-yellow-400 font-bold ml-1">{d.avgRating}★</span>
                        )}
                        {(isSme||isCore) && (
                          <button onClick={()=>deleteDoc(sub.id, d.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all ml-1">
                            <Trash2 className="w-3 h-3"/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="p-4">
              <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5"/> Hỏi đáp SME
              </h4>
              <div className="space-y-2 mb-2 max-h-28 overflow-y-auto custom-scrollbar">
                {comments.length === 0
                  ? <div className="text-[10px] text-gray-600 italic">Chưa có bình luận.</div>
                  : comments.map(c=>(
                    <div key={c.id} className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-blue-400">{c.user}</span>
                        <span className="text-[9px] text-gray-600">{c.time}</span>
                      </div>
                      <div className="text-xs text-gray-300">{c.text}</div>
                    </div>
                  ))
                }
              </div>
              <div className="flex gap-2">
                <input value={comment} onChange={e=>setComment(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleComment()}
                  placeholder="Nhập bình luận..." className="input-dark flex-1 text-xs py-1.5 px-3"/>
                <button onClick={handleComment} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white">
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Member progress modal */}
      {memberProgress && (
        <MemberProgressModal
          member={memberProgress.member}
          subjectId={memberProgress.subjectId}
          subjectName={memberProgress.subjectName}
          onClose={() => setMemberProgress(null)}
        />
      )}
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Subjects() {
  const { currentUser, isCore, smeMap, setSme, docs, addDoc, rateDoc, grades, myGrades, members } = useApp();
  const [search,      setSearch]     = useState('');
  const [filterType,  setFilterType] = useState('learning');
  const [uploadSub,   setUploadSub]  = useState(null);

  const filterTabs = [
    { key:'done',     label:'Đã học' },
    { key:'learning', label:'Đang học' },
    { key:'sme',      label:'Phụ trách' },
    ...(isCore ? [{ key:'all_core', label:'Tất cả (Core)' }] : []),
  ];

  const activeInGroup = useMemo(() => {
    const s = new Set();
    if (isCore) {
      Object.values(grades).forEach(uG => {
        Object.entries(uG).forEach(([sid,g]) => {
          if (g.status==='Đang học'||g.status==='Đã học'||g.status==='Được miễn') s.add(sid);
        });
      });
    }
    return s;
  }, [grades, isCore]);

  const filtered = subjectDatabase.filter(sub => {
    const q = search.toLowerCase();
    const matchSearch = sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q);
    if (!matchSearch) return false;
    const myStatus = myGrades[sub.id]?.status;
    const isMySme  = smeMap[sub.id] === currentUser?.fullName;
    if (filterType==='done')     return myStatus==='Đã học'||myStatus==='Được miễn';
    if (filterType==='learning') return myStatus==='Đang học';
    if (filterType==='sme')      return isMySme;
    if (filterType==='all_core') return isCore && (activeInGroup.has(sub.id)||smeMap[sub.id]);
    return myStatus==='Đang học'||isMySme;
  });

  const myLearning = subjectDatabase.filter(s=>myGrades[s.id]?.status==='Đang học');

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-white">Môn học & SME</h1>
              {isCore
                ? <span className="badge badge-blue flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>Core</span>
                : <span className="badge badge-gray flex items-center gap-1"><User className="w-3 h-3"/>Member</span>}
            </div>
            <div className="text-sm text-gray-500">
              Đang học <strong className="text-white">{myLearning.length}</strong> môn
            </div>
          </div>
          <div className="relative w-full md:w-64 shrink-0">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <Search className="w-4 h-4 text-gray-600"/>
            </div>
            <input
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white rounded-xl py-2 pl-9 pr-4 text-sm placeholder-gray-600 outline-none focus:border-blue-500 transition-all"
              placeholder="Tìm mã / tên môn..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-1 mt-4 overflow-x-auto custom-scrollbar pb-1">
          {filterTabs.map(t=>(
            <button key={t.key} onClick={()=>setFilterType(t.key)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType===t.key?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300 hover:bg-[#222]'
              }`}>
              {t.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-600 self-center shrink-0">{filtered.length} môn</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {filtered.map(sub=>(
              <SubjectCard key={sub.id}
                sub={sub} grade={myGrades[sub.id]} sme={smeMap[sub.id]}
                isCore={isCore} isSme={smeMap[sub.id]===currentUser?.fullName}
                onChangeSme={(sid,name)=>setSme({subjectId:sid,userId:name})}
                onUpload={setUploadSub}
                docs={docs[sub.id]} members={members} currentUser={currentUser} rateDoc={rateDoc}
                grades={grades}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
            <BookOpen className="w-14 h-14 text-gray-700 mb-3"/>
            <p className="text-gray-500 font-medium">Không tìm thấy môn học nào</p>
            <p className="text-xs text-gray-600 mt-1">
              {filterType==='done'    ?'Chưa có môn nào được đánh dấu "Đã học" trong bảng điểm.' :
               filterType==='learning'?'Vào Hồ sơ & GPA để đăng ký trạng thái "Đang học".' :
               filterType==='sme'     ?'Bạn chưa được gán phụ trách môn nào.' :
               'Không có môn nào khớp với tìm kiếm.'}
            </p>
          </div>
        )}
      </div>

      {uploadSub && (
        <AddDocModal
          subject={uploadSub}
          onClose={()=>setUploadSub(null)}
          onAdd={(sid,form)=>addDoc(sid,form)}
        />
      )}
    </div>
  );
}
