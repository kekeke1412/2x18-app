// src/pages/Subjects.jsx
import React, { useState } from 'react';
import {
  BookOpen, Search, ShieldCheck, User, ChevronDown, ChevronUp,
  FileText, X, Star, MessageSquare, Send, Plus, Trash2, Check, Edit3, Link, Lock
} from 'lucide-react';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext';

const progressColor = p => p>=80?'#22c55e':p>=50?'#3b82f6':p>=25?'#f59e0b':'#ef4444';
const ProgressBar = ({ value, height=6 }) => (
  <div className="bg-gray-800 rounded-full overflow-hidden" style={{height}}>
    <div className="h-full rounded-full transition-all duration-700" style={{width:`${value}%`,background:progressColor(value)}}/>
  </div>
);

// ── Add Doc Modal (URL only — Google Drive) ────────────────────────────────
function AddDocModal({ subject, onClose, onAdd }) {
  const [form, setForm] = useState({ name:'', url:'', type:'Slide bài giảng', private:false });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const valid = form.name.trim() && form.url.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white text-sm">Thêm tài liệu · {subject?.code}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Tên tài liệu *</label>
            <input className="input-dark" placeholder="VD: Slide tuần 1–4..." value={form.name} onChange={e=>set('name',e.target.value)} autoFocus/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1"><Link className="w-3 h-3"/> Link Google Drive *</label>
            <input className="input-dark" placeholder="https://drive.google.com/..." value={form.url} onChange={e=>set('url',e.target.value)}/>
            <span className="text-[10px] text-gray-600">Paste link chia sẻ từ Google Drive / OneDrive...</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Loại</label>
            <select className="input-dark" value={form.type} onChange={e=>set('type',e.target.value)}>
              {['Slide bài giảng','Bài tập','Đề thi','Tóm tắt lý thuyết','Giáo trình','Paper','Khác'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.private} onChange={e=>set('private',e.target.checked)}/>
            <span className="text-sm text-gray-400">Chỉ nhóm phụ trách xem được</span>
          </label>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button disabled={!valid} onClick={()=>{onAdd(subject.id,form);onClose();}}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl">
            Thêm tài liệu
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subject Task Panel ─────────────────────────────────────────────────────
function SubjectTaskPanel({ subjectId, isSme, currentUser }) {
  const { subjectTasks, addSubjectTask, editSubjectTask, deleteSubjectTask, tickSubjectTask } = useApp();
  const tasks = subjectTasks[subjectId] || [];
  const [adding,  setAdding]  = useState(false);
  const [newTitle,setNewTitle]= useState('');
  const [editId,  setEditId]  = useState(null);
  const [editText,setEditText]= useState('');

  const myDone   = tasks.filter(t=>t.doneBy?.[currentUser?.id]).length;
  const progress = tasks.length>0 ? Math.round(myDone/tasks.length*100) : 0;

  const doAdd = () => {
    if (!newTitle.trim()) return;
    addSubjectTask(subjectId, { title:newTitle.trim(), createdBy:currentUser?.fullName });
    setNewTitle(''); setAdding(false);
  };
  const doEdit = (t) => { editSubjectTask(subjectId, {...t,title:editText}); setEditId(null); };

  return (
    <div className="p-4 border-b border-gray-800/60">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5"/> Danh sách học ({myDone}/{tasks.length})
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
          <input className="input-dark flex-1 py-1.5 text-xs" placeholder="Tên chương / mục / dạng bài..."
            value={newTitle} onChange={e=>setNewTitle(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&doAdd()} autoFocus/>
          <button onClick={doAdd} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">OK</button>
          <button onClick={()=>setAdding(false)} className="p-1.5 text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="space-y-1 mt-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
        {tasks.length===0 ? (
          <div className="text-[10px] text-gray-600 italic py-2 text-center">
            {isSme ? 'Thêm chương/mục để thành viên theo dõi tiến độ.' : 'SME chưa thêm mục học nào.'}
          </div>
        ) : tasks.map(t=>{
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
                  <span className={`flex-1 text-xs leading-snug ${done?'line-through text-gray-500':'text-gray-300'}`}>{t.title}</span>
                  {isSme && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={()=>{setEditId(t.id);setEditText(t.title);}} className="text-gray-600 hover:text-blue-400"><Edit3 className="w-3 h-3"/></button>
                      <button onClick={()=>deleteSubjectTask(subjectId,t.id)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
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
function SubjectCard({ sub, grade, sme, isCore, isSme, onChangeSme, onUpload, docs, members, currentUser, rateDoc }) {
  const [expanded,setExpanded]=useState(false);
  const [comment, setComment] =useState('');
  const [comments,setComments]=useState(()=>JSON.parse(localStorage.getItem(`sme_cmt_${sub.id}`)||'[]'));

  const addComment = () => {
    if(!comment.trim())return;
    const c={id:Date.now(),user:currentUser?.fullName,text:comment,time:new Date().toLocaleTimeString('vi')};
    const updated=[...comments,c];
    setComments(updated); localStorage.setItem(`sme_cmt_${sub.id}`,JSON.stringify(updated));
    setComment('');
  };

  const statusBadge={'Đang học':'badge-blue','Đã học':'badge-green','Chưa học':'badge-gray','Được miễn':'badge-purple'}[grade?.status||'Chưa học'];

  return (
    <div className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden transition-all flex flex-col ${expanded?'border-blue-500/30':'border-gray-800/60'}`}>
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
            <span className="font-bold" style={{color:progressColor(grade?.myProgress||0)}}>{grade?.myProgress||0}%</span>
          </div>
          <ProgressBar value={grade?.myProgress||0}/>
        </div>

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
      </div>

      {expanded && (
        <div className="border-t border-gray-800/60 bg-[#141414]">
          {/* Subject task panel — SME creates, members tick */}
          <SubjectTaskPanel subjectId={sub.id} isSme={isSme||isCore} currentUser={currentUser}/>

          {/* Docs list */}
          <div className="p-4 border-b border-gray-800/60">
            <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5"/> Tài liệu ({docs?.length||0}) · Google Drive
            </h4>
            {(docs||[]).length===0 ? (
              <div className="text-xs text-gray-600 italic text-center py-2">
                Chưa có tài liệu{(isSme||isCore)?' — SME có thể thêm link Drive.':''}
              </div>
            ) : (docs||[]).map(d=>(
              <div key={d.id} className="flex items-center gap-3 p-2 bg-[#111] rounded-xl border border-gray-800 mb-2 hover:border-gray-700 transition-colors">
                <FileText className="w-4 h-4 text-blue-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <a href={d.url} target="_blank" rel="noreferrer"
                    className="text-xs font-medium text-blue-400 hover:underline truncate block">{d.name}</a>
                  <div className="text-[10px] text-gray-600">{d.type} · {d.uploadedByName||'SME'} · {d.uploadedAt}</div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[1,2,3,4,5].map(s=>(
                    <button key={s} onClick={()=>rateDoc(sub.id,d.id,s)}
                      className={`transition-colors ${s<=(d.ratings?.[currentUser?.id]||0)?'text-yellow-400':'text-gray-700 hover:text-yellow-500'}`}>
                      <Star className="w-3 h-3" fill={s<=(d.ratings?.[currentUser?.id]||0)?'currentColor':'none'}/>
                    </button>
                  ))}
                </div>
                {d.avgRating>0 && <span className="text-[10px] text-yellow-400 font-bold shrink-0">{d.avgRating}★</span>}
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5"/> Hỏi đáp SME
            </h4>
            <div className="space-y-2 mb-2 max-h-28 overflow-y-auto custom-scrollbar">
              {comments.length===0
                ? <div className="text-[10px] text-gray-600 italic">Chưa có bình luận.</div>
                : comments.map(c=>(
                  <div key={c.id} className="bg-[#1a1a1a] p-2 rounded-lg border border-gray-800">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] font-bold text-blue-400">{c.user}</span>
                      <span className="text-[9px] text-gray-600">{c.time}</span>
                    </div>
                    <div className="text-xs text-gray-300">{c.text}</div>
                  </div>
                ))}
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={e=>setComment(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addComment()}
                placeholder="Nhập bình luận..." className="input-dark flex-1 text-xs py-1.5 px-3"/>
              <button onClick={addComment} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white">
                <Send className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Subjects() {
  const { currentUser, isCore, smeMap, setSme, docs, addDoc, rateDoc, grades, myGrades, members } = useApp();
  const [search,     setSearch]    = useState('');
  const [filterType, setFilterType]= useState('learning');
  const [uploadSub,  setUploadSub] = useState(null);

  // ── Tab definitions với tên đúng theo yêu cầu ─────────────────────────
  // "Đã học": các môn của tôi đã học
  // "Đang học": các môn đang học
  // "Phụ trách": các môn mình là SME
  // "Tất cả (Core)": toàn bộ nhóm đang và đã học
  const filterTabs = [
    { key:'done',      label:'Đã học' },
    { key:'learning',  label:'Đang học' },
    { key:'sme',       label:'Phụ trách' },
    ...(isCore ? [{ key:'all_core', label:'Tất cả (Core)' }] : []),
  ];

  // Active subject IDs for core "all" view
  const activeInGroup = new Set();
  if (isCore) {
    Object.values(grades).forEach(uG => {
      Object.entries(uG).forEach(([sid, g]) => {
        if (g.status==='Đang học'||g.status==='Đã học'||g.status==='Được miễn') activeInGroup.add(sid);
      });
    });
  }

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
  const avgProg    = myLearning.length ? Math.round(myLearning.reduce((s,sub)=>s+(myGrades[sub.id]?.myProgress||0),0)/myLearning.length) : 0;

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Sticky header */}
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
              Đang học <strong className="text-white">{myLearning.length}</strong> môn ·
              Tiến độ TB <strong style={{color:progressColor(avgProg)}}>{avgProg}%</strong>
            </div>
          </div>

          {/* ── FIX: search icon không bị trùng ── */}
          <div className="relative w-full md:w-64 shrink-0">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <Search className="w-4 h-4 text-gray-600"/>
            </div>
            <input
              className="w-full bg-[#1a1a1a] border border-gray-700 text-white rounded-xl py-2 pl-9 pr-4 text-sm
                         placeholder-gray-600 outline-none focus:border-blue-500 transition-all"
              placeholder="Tìm mã / tên môn..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter tabs */}
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {filtered.length>0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {filtered.map(sub=>(
              <SubjectCard key={sub.id}
                sub={sub} grade={myGrades[sub.id]} sme={smeMap[sub.id]}
                isCore={isCore} isSme={smeMap[sub.id]===currentUser?.fullName}
                onChangeSme={(sid,name)=>setSme({subjectId:sid,userId:name})}
                onUpload={setUploadSub}
                docs={docs[sub.id]} members={members} currentUser={currentUser} rateDoc={rateDoc}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
            <BookOpen className="w-14 h-14 text-gray-700 mb-3"/>
            <p className="text-gray-500 font-medium">Không tìm thấy môn học nào</p>
            <p className="text-xs text-gray-600 mt-1">
              {filterType==='done'    ? 'Chưa có môn nào được đánh dấu "Đã học" trong bảng điểm.' :
               filterType==='learning'? 'Vào Hồ sơ & GPA để đăng ký trạng thái "Đang học".' :
               filterType==='sme'     ? 'Bạn chưa được gán phụ trách môn nào.' :
               'Không có môn nào khớp với tìm kiếm.'}
            </p>
          </div>
        )}
      </div>

      {uploadSub && (
        <AddDocModal subject={uploadSub} onClose={()=>setUploadSub(null)} onAdd={(sid,form)=>addDoc(sid,form)}/>
      )}
    </div>
  );
}
