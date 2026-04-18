// src/pages/Vocab.jsx
import React, { useState } from 'react';
import { 
  Book, Plus, Search, Trash2, Edit3, ChevronRight, 
  Layers, Clock, User, Star, BookOpen, Sparkles, X, PlusCircle,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

export default function Vocab() {
  const { vocab = {}, currentUser, isCore, isSuperAdmin, addVocabSet, deleteVocabSet, userVocab = {} } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSet, setNewSet] = useState({ title: '', description: '', terms: [] });

  const sets = Object.values(vocab).filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
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
        {sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-400">Chưa có học phần nào</h2>
            <p className="text-sm text-gray-600 mt-1">Hãy tạo học phần đầu tiên để bắt đầu học tập!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
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
          </div>
        </div>
      )}
    </div>
  );
}

function VocabSetCard({ set, onDelete, isOwner, progress }) {
  const termCount = set.terms?.length || 0;
  const pct = termCount > 0 ? Math.round((progress / termCount) * 100) : 0;

  return (
    <div className="group bg-[#1a1a1a] border border-gray-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg hover:shadow-indigo-500/5">
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
            <div className="text-gray-600 text-[10px]">Đã học: {pct}%</div>
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
    </div>
  );
}
