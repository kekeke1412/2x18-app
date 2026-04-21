// src/pages/Vocab.jsx
import React, { useState } from 'react';
import { 
  Book, Plus, Search, Trash2, Edit3, ChevronRight, 
  Layers, Clock, User, Star, BookOpen, Sparkles, X, PlusCircle,
  AlertCircle, CheckCircle2, Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Safe array coerce
const toArr = v => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [];
};

export default function Vocab() {
  const { vocab = {}, currentUser, isSuperAdmin, isCore, members, addVocabSet, deleteVocabSet, userVocab = {} } = useApp();
  const canSeeStats = isSuperAdmin || isCore;
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSet, setNewSet] = useState({ title: '', description: '', terms: [] });

  const sets = toArr(vocab).filter(s => 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleAddSet = () => {
    if (!newSet.title.trim()) return;
    addVocabSet({
      ...newSet,
      terms: [] // Initially empty, add terms in the edit/detail view
    });
    setNewSet({ title: '', description: '', terms: [] });
    setShowAddModal(false);
  };

  // ── Statistics Calculation ────────────────────────────────────────────────
  const allSets = toArr(vocab);
  const totalWords = allSets.reduce((sum, s) => sum + (s.terms?.length || 0), 0);
  
  const getLevels = (uid) => {
    const data = userVocab[uid] || {};
    let lvCounts = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    Object.values(data).forEach(setProg => {
      // Handle both old array and new object structures
      if (Array.isArray(setProg)) {
        setProg.forEach(() => { lvCounts[6]++; });
      } else {
        Object.values(setProg).forEach(lv => {
          if (lvCounts[lv] !== undefined) lvCounts[lv]++;
        });
      }
    });
    return lvCounts;
  };

  const myLvs = getLevels(currentUser?.id);
  const myMastered = myLvs[6];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-800/60 bg-[#1a1a1a] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
              Học phần từ vựng
            </h1>
            <p className="text-sm text-gray-400 mt-1">Học tập và ghi nhớ thuật ngữ chuyên ngành cùng 2X18</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-900/30 btn-active"
          >
            <Plus className="w-4 h-4" /> TẠO HỌC PHẦN
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Tìm kiếm học phần..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#121212] border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        {/* ── Mastery Dashboard ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 shadow-xl shadow-indigo-900/20 flex flex-col justify-between border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white/70 text-xs font-black uppercase tracking-widest">Tổng từ vựng nhóm</h3>
              <div className="text-4xl font-black text-white mt-1">{totalWords}</div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-white/60 text-[10px] font-bold uppercase">Cùng nhau xây dựng kho kiến thức</div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-[#1a1a1a] border border-gray-800/60 rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" /> TIẾN ĐỘ CÁ NHÂN
              </h3>
              <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Đã nhớ sâu: {myMastered} từ
              </div>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map(lv => (
                <div key={lv} className="flex flex-col items-center">
                  <div className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all ${lv === 6 ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800/30 border-gray-800/60'}`}>
                    <div className={`text-xl font-black ${lv === 6 ? 'text-green-500' : 'text-gray-300'}`}>{myLvs[lv]}</div>
                    <div className="text-[9px] font-black text-gray-500 uppercase mt-1">{lv === 6 ? 'Nhớ sâu' : `Bậc ${lv}`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Admin Member Stats ── */}
        {canSeeStats && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Thống kê thành viên (Admin)</h2>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-800/20 border-b border-gray-800/60">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Thành viên</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Đã học (Lv 1-5)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Nhớ sâu (Lv 6)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Tổng tiến độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {members.filter(m => m.status === 'active').sort((a,b) => (getLevels(b.id)[6]) - (getLevels(a.id)[6])).map(m => {
                    const lvs = getLevels(m.id);
                    const mastered = lvs[6];
                    const learning = lvs[1] + lvs[2] + lvs[3] + lvs[4] + lvs[5];
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400">
                              {m.avatar || m.fullName?.slice(0,2).toUpperCase()}
                            </div>
                            <div className="text-sm font-bold text-gray-200">{m.fullName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-400">{learning}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-black border border-green-500/20">{mastered}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-xs font-black text-indigo-400">{mastered + learning} / {totalWords}</div>
                          <div className="w-24 h-1 bg-gray-800 rounded-full mt-2 ml-auto overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, ((mastered + learning) / (totalWords || 1)) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
            <Book className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Danh sách học phần</h2>
        </div>

        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-400">Chưa có học phần nào</h2>
            <p className="text-sm text-gray-600 mt-1">Hãy tạo học phần đầu tiên để bắt đầu học tập!</p>
          </div>
        ) : (
          <motion.div 
            variants={{
              show: { transition: { staggerChildren: 0.05 } }
            }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {sets.map(set => (
              <VocabSetCard 
                key={set.id} 
                set={set} 
                onDelete={() => {
                  if (confirm('Xóa học phần này?')) deleteVocabSet(set.id);
                }}
                isOwner={set.authorId === currentUser?.id || isSuperAdmin}
                progress={userVocab[currentUser?.id]?.[set.id]?.length || 0}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <h3 className="font-black text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-400" /> TẠO HỌC PHẦN MỚI
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1.5">Tiêu đề học phần</label>
                  <input 
                    type="text" 
                    placeholder="VD: Từ vựng Tuần 1 - Giải tích 1"
                    value={newSet.title}
                    onChange={e => setNewSet({...newSet, title: e.target.value})}
                    className="w-full bg-[#121212] border border-gray-800 rounded-xl py-3 px-4 text-sm focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1.5">Mô tả (Tùy chọn)</label>
                  <textarea 
                    placeholder="Ghi chú về học phần này..."
                    value={newSet.description}
                    onChange={e => setNewSet({...newSet, description: e.target.value})}
                    className="w-full bg-[#121212] border border-gray-800 rounded-xl py-3 px-4 text-sm focus:border-indigo-500 outline-none transition-all min-h-[100px] resize-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-800 flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">HỦY</button>
                <button 
                  onClick={handleAddSet}
                  disabled={!newSet.title.trim()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-indigo-900/30"
                >
                  TẠO NGAY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VocabSetCard({ set, onDelete, isOwner, progress = {} }) {
  const termCount = toArr(set.terms).length;
  // progress is now an object { wordIndex: level }
  const masteredCount = Object.values(progress).filter(lv => Number(lv) === 6).length;
  const pct = termCount > 0 ? Math.round((masteredCount / termCount) * 100) : 0;

  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        show: { opacity: 1, scale: 1, y: 0 }
      }}
      className="group bg-[#1a1a1a] border border-gray-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg hover:shadow-indigo-500/5"
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            <Clock className="w-3 h-3" /> {termCount} thuật ngữ
          </div>
          {isOwner && (
            <button onClick={onDelete} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <Link to={`/vocab/${set.id}`} className="block">
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{set.title}</h3>
          <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[40px] leading-relaxed">{set.description || 'Chưa có mô tả cho học phần này.'}</p>
        </Link>
      </div>

      <div className="px-5 py-4 bg-[#141414] border-t border-gray-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500">
            {set.authorName?.split(' ').slice(-1)[0][0] || <User className="w-3 h-3" />}
          </div>
          <div className="text-xs">
            <div className="text-gray-400 font-bold">{set.authorName || 'Thành viên'}</div>
            <div className="text-gray-600 text-[10px]">Đã nhớ sâu: {masteredCount}/{termCount}</div>
          </div>
        </div>
        <Link to={`/vocab/${set.id}`} className="p-2 bg-indigo-600/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-800 w-full relative">
        <div 
          className="h-full bg-indigo-500 transition-all duration-1000" 
          style={{ width: `${pct}%` }}
        />
      </div>
      </motion.div>
  );
}
