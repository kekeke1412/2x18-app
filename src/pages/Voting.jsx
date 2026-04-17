// src/pages/Voting.jsx
import React, { useState } from 'react';
import { Vote, Plus, X, Clock, Lock, Users, Trash2 } from 'lucide-react';
import { useApp, uid } from '../context/AppContext';

function timeLeft(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return 'Đã kết thúc';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `Còn ${d} ngày ${h}h`;
  if (h > 0) return `Còn ${h}h ${m}m`;
  return `Còn ${m} phút`;
}

// ── Create Vote Modal ──────────────────────────────────────
function CreateVoteModal({ onClose }) {
  const { addVote, currentUser } = useApp();
  const [title,       setTitle]       = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [multiSelect, setMultiSelect] = useState(true);
  const [options,     setOptions]     = useState(['','']);

  const addOption = () => setOptions(o => [...o, '']);
  const setOption = (i, v) => setOptions(o => o.map((x,j) => j===i ? v : x));
  const delOption = (i) => setOptions(o => o.filter((_,j) => j!==i));

  const save = () => {
    const filtered = options.map(o=>o.trim()).filter(Boolean);
    if (!title.trim() || filtered.length < 2) return;
    addVote({
      title: title.trim(),
      creator: currentUser?.fullName || 'Core',
      createdAt: new Date().toISOString(),
      deadline: deadline || null,
      multiSelect,
      closed: false,
      options: filtered.map(text => ({ id: uid(), text, votes: [] })),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-bold text-white">Tạo bình chọn mới</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-1">TIÊU ĐỀ BÌNH CHỌN *</label>
            <input className="input-dark" placeholder="VD: Chọn giờ họp SME tuần tới..." value={title}
              onChange={e=>setTitle(e.target.value)} autoFocus/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">HẠN BÌNH CHỌN</label>
              <input type="datetime-local" className="input-dark" value={deadline} onChange={e=>setDeadline(e.target.value)}/>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-1">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={multiSelect}
                  onChange={e=>setMultiSelect(e.target.checked)}/>
                <span className="text-sm text-gray-300">Chọn nhiều phương án</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-bold block mb-2">CÁC PHƯƠNG ÁN * (tối thiểu 2)</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input-dark flex-1" placeholder={`Phương án ${i+1}...`}
                    value={opt} onChange={e=>setOption(i, e.target.value)}/>
                  {options.length > 2 && (
                    <button onClick={()=>delOption(i)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4"/>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addOption} className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3.5 h-3.5"/> Thêm phương án
            </button>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button onClick={save} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl">Tạo bình chọn</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────
function ConfirmDeleteModal({ title, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-400"/>
          </div>
          <div>
            <div className="font-bold text-white">Xóa bình chọn?</div>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">"{title}"</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">Tất cả kết quả bình chọn sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-700 rounded-xl text-sm text-gray-400 hover:bg-[#252525]">Hủy</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl">Xóa</button>
        </div>
      </div>
    </div>
  );
}

// ── Vote Card ──────────────────────────────────────────────
function VoteCard({ vote, onDeleteRequest }) {
  const { castVote, closeVote, addVoteOption, currentUser, isCore, getMemberById } = useApp();
  const [newOption, setNewOption] = useState('');
  const [showAdd,   setShowAdd]   = useState(false);

  const userId    = currentUser?.id;
  const isClosed  = vote.closed || (vote.deadline && new Date(vote.deadline) < new Date());
  const totalVotes= vote.options.reduce((s,o) => s + o.votes.length, 0);
  const myVotes   = vote.options.filter(o => o.votes.includes(userId)).map(o=>o.id);

  const handleVote = (optId) => {
    if (isClosed) return;
    castVote({ voteId: vote.id, optionId: optId, userId, multiSelect: vote.multiSelect });
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    addVoteOption({ voteId: vote.id, text: newOption.trim() });
    setNewOption(''); setShowAdd(false);
  };

  return (
    <div className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden ${isClosed?'border-gray-800/30 opacity-80':'border-gray-800/60'}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-white text-sm leading-tight">{vote.title}</h3>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500">bởi {vote.creator}</span>
              {vote.deadline && (
                <span className={`flex items-center gap-1 text-[10px] font-bold ${isClosed?'text-gray-600':'text-amber-400'}`}>
                  <Clock className="w-3 h-3"/>{timeLeft(vote.deadline)}
                </span>
              )}
              <span className="text-[10px] text-gray-500">
                <Users className="w-3 h-3 inline mr-1"/>{totalVotes} lượt vote
              </span>
              {vote.multiSelect && <span className="badge badge-purple">Chọn nhiều</span>}
              {isClosed && <span className="badge badge-gray flex items-center gap-1"><Lock className="w-2.5 h-2.5"/>Đã đóng</span>}
            </div>
          </div>
          {/* Core actions: close + delete */}
          {isCore && (
            <div className="flex items-center gap-1.5 shrink-0">
              {!isClosed && (
                <button onClick={()=>closeVote(vote.id)}
                  className="text-[10px] font-bold text-gray-500 border border-gray-700 px-2 py-1 rounded-lg hover:text-amber-400 hover:border-amber-500/30 transition-colors">
                  Đóng vote
                </button>
              )}
              <button onClick={() => onDeleteRequest(vote)}
                className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Xóa bình chọn">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2.5">
        {vote.options.map(opt => {
          const pct     = totalVotes > 0 ? Math.round(opt.votes.length / totalVotes * 100) : 0;
          const isVoted = myVotes.includes(opt.id);
          const isTop   = opt.votes.length === Math.max(...vote.options.map(o=>o.votes.length)) && opt.votes.length > 0;

          return (
            <div key={opt.id} onClick={()=>handleVote(opt.id)}
              className={`relative rounded-xl border overflow-hidden transition-all ${
                isClosed ? 'cursor-default' : 'cursor-pointer hover:border-blue-500/40'
              } ${isVoted ? 'border-blue-500/40 bg-blue-500/5' : 'border-gray-700/60 bg-[#111]'}`}>
              <div className="absolute inset-0 rounded-xl transition-all duration-700"
                style={{ width:`${pct}%`, background: isVoted ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)' }}/>
              <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-4 h-4 rounded-${vote.multiSelect?'md':'full'} border-2 flex items-center justify-center shrink-0 ${
                    isVoted ? 'border-blue-500 bg-blue-600' : 'border-gray-600'
                  }`}>
                    {isVoted && <div className={`${vote.multiSelect?'w-2 h-2 bg-white rounded-sm':'w-2 h-2 bg-white rounded-full'}`}/>}
                  </div>
                  <span className={`text-sm font-medium truncate ${isVoted?'text-blue-300':'text-gray-300'}`}>{opt.text}</span>
                  {isTop && !isClosed && <span className="badge badge-green shrink-0">Dẫn đầu</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-xs font-bold ${isVoted?'text-blue-400':'text-gray-500'}`}>{pct}%</span>
                  <span className="text-[10px] text-gray-600">({opt.votes.length})</span>
                </div>
              </div>
              {opt.votes.length > 0 && (
                <div className="relative px-4 pb-2 flex items-center gap-1">
                  {opt.votes.slice(0,8).map(uid => {
                    const m = getMemberById(uid);
                    return (
                      <div key={uid} title={m?.fullName}
                        className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[8px] font-bold text-blue-400">
                        {m?.avatar || '?'}
                      </div>
                    );
                  })}
                  {opt.votes.length > 8 && <span className="text-[10px] text-gray-600">+{opt.votes.length-8}</span>}
                </div>
              )}
            </div>
          );
        })}

        {!isClosed && (
          showAdd ? (
            <div className="flex gap-2 pt-1">
              <input className="input-dark flex-1 py-2 text-sm" placeholder="Nhập phương án mới..."
                value={newOption} onChange={e=>setNewOption(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleAddOption()} autoFocus/>
              <button onClick={handleAddOption} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">OK</button>
              <button onClick={()=>setShowAdd(false)} className="px-3 py-2 border border-gray-700 text-gray-400 rounded-xl text-xs hover:bg-[#252525]">
                <X className="w-4 h-4"/>
              </button>
            </div>
          ) : (
            <button onClick={()=>setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors pt-1">
              <Plus className="w-3.5 h-3.5"/> Thêm phương án
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function Voting() {
  const { votes, isCore, deleteVote, toast } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [delTarget,  setDelTarget]  = useState(null); // { id, title }

  const filtered = votes.filter(v => {
    const isClosed = v.closed || (v.deadline && new Date(v.deadline) < new Date());
    if (filter === 'open')   return !isClosed;
    if (filter === 'closed') return isClosed;
    return true;
  });

  const handleDeleteConfirm = () => {
    if (deleteVote && delTarget) {
      deleteVote(delTarget.id);
      toast('Đã xóa bình chọn', 'info');
    }
    setDelTarget(null);
  };

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Vote className="w-5 h-5 text-blue-400"/> Bình chọn nhóm
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Bình chọn giờ học, địa điểm, quyết định nhóm</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#1e1e1e] border border-gray-800 rounded-xl overflow-hidden">
              {[['all','Tất cả'],['open','Đang mở'],['closed','Đã đóng']].map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all ${filter===v?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
            {isCore && (
              <button onClick={()=>setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all">
                <Plus className="w-3.5 h-3.5"/> Tạo vote
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-2xl">
            <Vote className="w-12 h-12 text-gray-700 mb-3"/>
            <p className="text-gray-500 font-medium">Chưa có bình chọn nào</p>
            {isCore && <button onClick={()=>setShowCreate(true)} className="mt-3 text-blue-400 text-sm hover:underline">Tạo bình chọn đầu tiên</button>}
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {filtered.map(v => (
              <VoteCard key={v.id} vote={v} onDeleteRequest={(v) => setDelTarget({ id: v.id, title: v.title })}/>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateVoteModal onClose={()=>setShowCreate(false)}/>}
      {delTarget   && <ConfirmDeleteModal title={delTarget.title} onConfirm={handleDeleteConfirm} onClose={()=>setDelTarget(null)}/>}
    </div>
  );
}
