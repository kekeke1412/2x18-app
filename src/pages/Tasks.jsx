import React, { useState } from 'react';
import {
  ClipboardList, Clock, FileText, Upload, Plus, CheckCircle2,
  AlertCircle, Folder, Trash2, Lock, ShieldAlert, X,
  ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext'; // KẾT NỐI CONTEXT 

const MEMBER_LIST = [
  'Phạm Bá Hưng','Nguyễn Thành','Trần Lan Anh','Lê Minh Khôi',
  'Phạm Tuấn Anh','Vũ Hải Nam','Đinh Thu Hà','Ngô Minh Đức',
  'Bùi Khánh Linh','Hoàng Minh Long','Trần Thị Hoàn','Mai Thị Anh',
  'Nguyễn Văn Trọng','Lê Thu Hà','Phạm Việt Dũng','Nguyễn Minh Tú',
];

const progressColor = p => p>=80?'#22c55e':p>=50?'#3b82f6':p>=25?'#f59e0b':'#ef4444';

const ProgressBar = ({ value, height=5 }) => (
  <div className="bg-gray-800 rounded-full overflow-hidden" style={{height}}>
    <div className="h-full rounded-full transition-all duration-500"
      style={{ width:`${Math.min(100,value)}%`, background:progressColor(value) }} />
  </div>
);

const daysDiff = d => Math.ceil((new Date(d)-new Date())/(1000*60*60*24));

export default function Tasks() {
  // HOÀN TOÀN DÙNG DATA TỪ APP CONTEXT, KHÔNG CÒN LOCALSTORAGE
  const { 
    currentUser, myGrades: grades, myTasks, smeMap, docs,
    addTask: ctxAddTask, deleteTask: ctxDeleteTask, 
    setSme: ctxSetSme, addDoc: ctxAddDoc, updateProgress: ctxUpdateProgress,
    isCore 
  } = useApp();

  const profile = currentUser || {};
  const myName = profile.fullName || '';

  const [isAdding,    setIsAdding]    = useState(false);
  const [newTask,     setNewTask]     = useState({ code:'', title:'', date:'', type:'Bắt buộc' });
  const [showMembers, setShowMembers] = useState({});
  const [uploadSub,   setUploadSub]  = useState(null);
  const [activeTab,   setActiveTab]  = useState('tasks');

  const userSubjects = subjectDatabase.filter(s => grades[s.id]?.status === 'Đang học');

  const changeSme = (subId, name) => ctxSetSme({subjectId: subId, userId: name});

  const handleAddTask = () => {
    if (!newTask.code||!newTask.title||!newTask.date) return;
    // Bắn Task lên Context, Dashboard sẽ lập tức nhận được
    ctxAddTask({
      userId: currentUser?.id, // BẮT BUỘC để phân biệt Task của ai
      code: newTask.code, 
      subjectId: newTask.code, 
      task: newTask.title, 
      deadline: newTask.date, 
      date: newTask.date, 
      type: newTask.type 
    });
    setIsAdding(false);
    setNewTask({ code:'', title:'', date:'', type:'Bắt buộc' });
  };

  const removeTask = id => ctxDeleteTask(id);

  const updateMyProgress = (subId, value) => {
    ctxUpdateProgress({ userId: currentUser?.id, subjectId: subId, value: Number(value) });
  };

  const doUpload = (subId, form) => {
    if (!form.name) return;
    ctxAddDoc(subId, form);
    setUploadSub(null);
  };

  const activeMyTasks = myTasks.filter(t=>userSubjects.some(s=>s.id===t.code)).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const overdue = activeMyTasks.filter(t=>daysDiff(t.deadline)<0);
  const upcoming= activeMyTasks.filter(t=>daysDiff(t.deadline)>=0);

  const getMemberProgress = subId => MEMBER_LIST.map(name => ({
    name,
    progress: Math.floor((name.charCodeAt(0)*subId.length*7)%81)+10,
  }));

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400"/> Trung tâm Điều phối
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{myName} · {profile.role||'Member'}</p>
          </div>
          <div className="flex items-center gap-2">
            {[['tasks','Task'],['sme','SME & Tiến độ'],['docs','Tài liệu']].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab===k?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300 border border-gray-800'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {activeTab==='tasks' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-400">DANH SÁCH TASK</h2>
              <button onClick={()=>setIsAdding(v=>!v)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20">
                <Plus className="w-3.5 h-3.5"/>
                {isAdding?'Hủy':'Thêm Task'}
              </button>
            </div>

            {isAdding && (
              <div className="bg-[#1a1a1a] border border-blue-500/30 rounded-2xl p-4 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">MÔN HỌC</label>
                    <select className="input-dark" value={newTask.code} onChange={e=>setNewTask(f=>({...f,code:e.target.value}))}>
                      <option value="">-- Chọn --</option>
                      {userSubjects.map(s=><option key={s.id} value={s.id}>{s.code} – {s.name.slice(0,25)}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">CÔNG VIỆC</label>
                    <input className="input-dark" placeholder="Mô tả công việc..." value={newTask.title}
                      onChange={e=>setNewTask(f=>({...f,title:e.target.value}))}
                      onKeyDown={e=>e.key==='Enter'&&handleAddTask()} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">HẠN NỘP</label>
                    <input type="date" className="input-dark" value={newTask.date}
                      onChange={e=>setNewTask(f=>({...f,date:e.target.value}))} />
                  </div>
                </div>
                <button onClick={handleAddTask}
                  className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all">
                  Xác nhận thêm task
                </button>
              </div>
            )}

            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-400"/>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Trễ hạn ({overdue.length})</span>
                </div>
                {overdue.map(t=><TaskRow key={t.id} task={t} onDelete={removeTask} />)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400"/>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Sắp đến ({upcoming.length})</span>
              </div>
              {upcoming.length > 0
                ? upcoming.map(t=><TaskRow key={t.id} task={t} onDelete={removeTask} />)
                : <EmptyState icon={CheckCircle2} msg="Không có task nào sắp đến" />
              }
            </div>

            {userSubjects.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">TIẾN ĐỘ CỦA TÔI</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userSubjects.map(sub => {
                    const prog = grades[sub.id]?.myProgress || 0;
                    return (
                      <div key={sub.id} className="bg-[#1a1a1a] border border-gray-800/60 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-[10px] font-bold text-blue-400">{sub.code}</div>
                            <div className="text-xs font-medium text-gray-300 mt-0.5 leading-tight">{sub.name}</div>
                          </div>
                          <span className="text-base font-black ml-2 shrink-0" style={{color:progressColor(prog)}}>{prog}%</span>
                        </div>
                        <ProgressBar value={prog} height={6} />
                        <input type="range" min={0} max={100} step={5} value={prog}
                          onChange={e=>updateMyProgress(sub.id,e.target.value)}
                          className="w-full mt-2 accent-blue-600 cursor-pointer" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab==='sme' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400"/>
              <h2 className="text-sm font-bold text-gray-300">Phụ trách môn (SME) & Tiến độ thành viên</h2>
              {isCore && <span className="badge badge-blue">Core · Toàn quyền</span>}
            </div>

            {userSubjects.length === 0
              ? <EmptyState icon={BookOpen} msg="Đăng ký môn học trong Hồ sơ & GPA trước" />
              : userSubjects.map(sub => {
                const isMySme = smeMap[sub.id]===myName;
                const show = showMembers[sub.id];
                const members = getMemberProgress(sub.id);
                const avg = Math.round(members.reduce((s,m)=>s+m.progress,0)/members.length);

                return (
                  <div key={sub.id} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold text-blue-400 mb-0.5">{sub.code}</div>
                          <div className="text-sm font-bold text-white">{sub.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(isMySme||isCore) && (
                            <button onClick={()=>setUploadSub(sub)}
                              className="flex items-center gap-1.5 text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition-colors">
                              <Upload className="w-3 h-3"/> Upload
                            </button>
                          )}
                          <button onClick={()=>setShowMembers(p=>({...p,[sub.id]:!p[sub.id]}))}
                            className="flex items-center gap-1 text-[11px] text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-[#252525]">
                            <Users className="w-3 h-3"/>
                            {show?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 p-2.5 bg-[#111] rounded-xl border border-gray-800">
                        <div className="w-7 h-7 bg-blue-600/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                          {(smeMap[sub.id]||'?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-gray-500 font-bold">NHÓM TRƯỞNG MÔN (SME)</div>
                          {isCore ? (
                            <select value={smeMap[sub.id]||''} onChange={e=>changeSme(sub.id,e.target.value)}
                              className="text-sm text-white bg-transparent border-none outline-none w-full cursor-pointer mt-0.5">
                              <option value="">-- Chọn SME --</option>
                              {MEMBER_LIST.map(m=><option key={m} value={m}>{m}</option>)}
                            </select>
                          ) : (
                            <div className="text-sm text-gray-200">{smeMap[sub.id]||'Chưa chỉ định'}</div>
                          )}
                        </div>
                        {isMySme && <span className="badge badge-yellow shrink-0">Bạn</span>}
                        {!isMySme && !isCore && smeMap[sub.id] && <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0"/>}
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar value={avg} height={6} />
                        <span className="text-xs font-bold shrink-0" style={{color:progressColor(avg)}}>TB {avg}%</span>
                      </div>
                    </div>

                    {show && (
                      <div className="border-t border-gray-800/60 p-4 fade-in">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Tiến độ từng thành viên
                        </div>
                        <div className="space-y-2.5">
                          {members.map((m,i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#252525] border border-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                                {m.name.split(' ').pop()[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between text-[11px] mb-0.5">
                                  <span className="text-gray-400 truncate">{m.name}</span>
                                  <span className="font-bold shrink-0 ml-2" style={{color:progressColor(m.progress)}}>{m.progress}%</span>
                                </div>
                                <ProgressBar value={m.progress} height={4} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        )}

        {activeTab==='docs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                <Folder className="w-4 h-4 text-yellow-400"/> Tài liệu môn học
              </h2>
            </div>
            {userSubjects.map(sub => {
              const subDocs = docs[sub.id] || [];
              const isMySme = smeMap[sub.id]===myName;
              return (
                <div key={sub.id} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 mr-2">{sub.code}</span>
                      <span className="text-sm font-medium text-gray-200">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{subDocs.length} file</span>
                      {(isMySme||isCore) && (
                        <button onClick={()=>setUploadSub(sub)}
                          className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-500/20">
                          <Upload className="w-3 h-3"/> Upload
                        </button>
                      )}
                      {!isMySme && !isCore && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-600">
                          <Lock className="w-3 h-3"/> SME: {smeMap[sub.id]||'Chưa có'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    {subDocs.length === 0
                      ? <div className="text-xs text-gray-600 italic py-2 text-center">Chưa có tài liệu nào</div>
                      : subDocs.map(d => (
                        <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#222] transition-colors cursor-pointer group">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-blue-400"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-200 truncate">{d.name}</div>
                            <div className="text-[10px] text-gray-600">{d.type} · {d.by||'SME'} · {d.date}</div>
                          </div>
                          {d.private && <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0"/>}
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
            })}
          </div>
        )}
      </div>

      {uploadSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={()=>setUploadSub(null)}>
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm">Upload · {uploadSub.code}</h3>
              <button onClick={()=>setUploadSub(null)}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
            </div>
            <UploadForm onSubmit={f=>doUpload(uploadSub.id,f)} onClose={()=>setUploadSub(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function UploadForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name:'', type:'Slide bài giảng', private:false });
  return (
    <div>
      <div className="px-5 py-4 space-y-3">
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-5 text-center hover:border-blue-500/50 transition-colors cursor-pointer">
          <Upload className="w-7 h-7 text-gray-600 mx-auto mb-2"/>
          <div className="text-xs text-gray-400">Kéo thả file hoặc click để chọn</div>
          <div className="text-[10px] text-gray-600 mt-1">PDF, DOCX, PPTX · Tối đa 50MB</div>
        </div>
        <input className="input-dark" placeholder="Tên tài liệu..." value={form.name}
          onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
        <select className="input-dark" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
          {['Slide bài giảng','Bài tập','Đề thi','Tóm tắt lý thuyết','Giáo trình','Paper','Khác'].map(t=><option key={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400">
          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.private}
            onChange={e=>setForm(f=>({...f,private:e.target.checked}))} />
          Chỉ thành viên nhóm phụ trách xem được
        </label>
      </div>
      <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
        <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
        <button onClick={()=>onSubmit(form)} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl">Upload</button>
      </div>
    </div>
  );
}

function TaskRow({ task, onDelete }) {
  const days = daysDiff(task.deadline);
  const isLate = days < 0;
  const isSoon = days >= 0 && days <= 3;
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border mb-2 hover:bg-[#1e1e1e] transition-colors group ${
      isLate ? 'border-red-500/20 bg-red-500/5' : 'border-gray-800/60 bg-[#1a1a1a]'
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
          {isLate ? `Trễ ${Math.abs(days)} ngày` : days===0 ? 'Hôm nay' : `Còn ${days}d`}
        </span>
        <button onClick={()=>onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 transition-all">
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon:Icon, msg }) {
  return (
    <div className="flex flex-col items-center py-10 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
      <Icon className="w-10 h-10 text-gray-700 mb-2"/>
      <p className="text-sm text-gray-600">{msg}</p>
    </div>
  );
}