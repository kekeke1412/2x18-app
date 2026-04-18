// src/pages/FlashcardSet.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, Edit3, Sparkles, 
  Volume2, CheckCircle2, Circle, ArrowLeft, ArrowRight,
  Maximize2, RotateCcw, Save, Trash, X, Loader2, Book, Layers
} from 'lucide-react';
import { useApp, toArr } from '../context/AppContext';
import { suggestDefinitions } from '../services/vocabService';

export default function FlashcardSet() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { vocab = {}, currentUser, editVocabSet, markWordLearned, userVocab = {} } = useApp();
  
  const set = vocab[setId];
  const progress = userVocab[currentUser?.id]?.[setId] || [];
  
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'flashcards' | 'quiz'
  const [cards, setCards] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (set) {
      setCards(toArr(set.terms));
    }
  }, [set]);

  if (!set) return <div className="p-10 text-center text-gray-500">Học phần không tồn tại hoặc đã bị xóa.</div>;

  const handleSave = () => {
    editVocabSet({ ...set, terms: cards });
    setIsEditing(false);
  };

  const handleAddCard = () => {
    setCards([...cards, { word: '', definition: '', ipa: '', example: '', exampleVi: '' }]);
  };

  const handleRemoveCard = (idx) => {
    setCards(cards.filter((_, i) => i !== idx));
  };

  const handleAiSuggest = async (idx) => {
    const word = cards[idx].word;
    if (!word.trim()) return;
    
    setIsAiLoading(idx);
    try {
      const suggestions = await suggestDefinitions([word]);
      if (suggestions && suggestions[0]) {
        const s = suggestions[0];
        const newCards = [...cards];
        newCards[idx] = { ...newCards[idx], ...s };
        setCards(newCards);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleLearned = (idx) => {
    const isLearned = progress.includes(idx);
    markWordLearned(setId, idx, !isLearned);
  };

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#1a1a1a] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/vocab" className="p-2 hover:bg-gray-800 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-white">{set.title}</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              {cards.length} THUẬT NGỮ · ĐÃ HỌC {progress.length}/{cards.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-900/20">
              <Save className="w-3.5 h-3.5" /> LƯU THAY ĐỔI
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all border border-indigo-500/30">
              <Edit3 className="w-3.5 h-3.5" /> CHỈNH SỬA
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-2 bg-[#1a1a1a]/60 border-b border-gray-800/40 flex items-center gap-6 shrink-0">
        {[
          { id: 'list', label: 'Danh sách', icon: Layers },
          { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: RotateCcw },
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === t.id ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {activeTab === t.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {cards.length === 0 && !isEditing && (
                <div className="text-center py-20 bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-800">
                  <Book className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm font-bold">Học phần này chưa có từ vựng.</p>
                  <button onClick={() => { setIsEditing(true); handleAddCard(); }} className="mt-4 text-indigo-400 text-xs font-black uppercase underline">Thêm từ mới ngay</button>
                </div>
              )}

              {cards.map((card, idx) => (
                <div key={idx} className={`bg-[#1a1a1a] border rounded-2xl p-5 transition-all ${isEditing ? 'border-indigo-500/30' : 'border-gray-800 hover:border-gray-700'}`}>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-600 tracking-widest uppercase">Thẻ #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleAiSuggest(idx)}
                            disabled={isAiLoading === idx}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20"
                          >
                            {isAiLoading === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI SUGGEST
                          </button>
                          <button onClick={() => handleRemoveCard(idx)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          placeholder="Thuật ngữ (Ví dụ: Physics)"
                          value={card.word}
                          onChange={e => {
                            const n = [...cards];
                            n[idx].word = e.target.value;
                            setCards(n);
                          }}
                          className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none"
                        />
                        <input 
                          placeholder="Định nghĩa (Ví dụ: Vật lý học)"
                          value={card.definition}
                          onChange={e => {
                            const n = [...cards];
                            n[idx].definition = e.target.value;
                            setCards(n);
                          }}
                          className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                          placeholder="Phiên âm (Ví dụ: /ˈfɪz.ɪks/)"
                          value={card.ipa}
                          onChange={e => {
                            const n = [...cards];
                            n[idx].ipa = e.target.value;
                            setCards(n);
                          }}
                          className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none"
                        />
                        <input 
                          placeholder="Câu ví dụ..."
                          value={card.example}
                          onChange={e => {
                            const n = [...cards];
                            n[idx].example = e.target.value;
                            setCards(n);
                          }}
                          className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none"
                        />
                        <input 
                          placeholder="Dịch nghĩa ví dụ..."
                          value={card.exampleVi}
                          onChange={e => {
                            const n = [...cards];
                            n[idx].exampleVi = e.target.value;
                            setCards(n);
                          }}
                          className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-black text-indigo-400">{card.word}</h4>
                          <span className="text-xs text-gray-500 font-mono italic">{card.ipa}</span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium mb-3">{card.definition}</p>
                        {card.example && (
                          <div className="pl-3 border-l-2 border-indigo-500/20 py-1">
                            <p className="text-xs text-gray-400 italic mb-1">"{card.example}"</p>
                            <p className="text-[10px] text-gray-600">→ {card.exampleVi}</p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => toggleLearned(idx)}
                        className={`p-2 rounded-full transition-all ${progress.includes(idx) ? 'text-green-500 bg-green-500/10' : 'text-gray-700 hover:text-gray-500 bg-gray-800/50'}`}
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isEditing && (
                <button 
                  onClick={handleAddCard}
                  className="w-full py-5 bg-[#1a1a1a] border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 font-bold hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex flex-col items-center gap-2"
                >
                  <Plus className="w-6 h-6" />
                  <span>THÊM THẺ MỚI</span>
                </button>
              )}
            </div>
          )}

          {/* ── FLASHCARD VIEW ────────────────────────────────────────────── */}
          {activeTab === 'flashcards' && (
            <div className="flex flex-col items-center justify-center pt-10 pb-20">
              {cards.length === 0 ? (
                <p className="text-gray-500">Chưa có thuật ngữ nào để hiển thị thẻ.</p>
              ) : (
                <>
                  <div 
                    className="relative w-full max-w-lg aspect-[3/2] cursor-pointer perspective"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div className={`w-full h-full duration-700 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                      {/* Mặt trước */}
                      <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="absolute top-6 left-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Thuật ngữ</div>
                        <h2 className="text-4xl font-black text-white tracking-tight">{cards[currentIndex].word}</h2>
                        <p className="text-sm text-gray-500 font-mono italic mt-4">{cards[currentIndex].ipa}</p>
                        <div className="absolute bottom-6 flex items-center gap-2 text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">
                          CHẠM ĐỂ XEM ĐỊNH NGHĨA
                        </div>
                      </div>
                      {/* Mặt sau */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl backdrop-blur-md">
                        <div className="absolute top-6 left-6 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Định nghĩa</div>
                        <p className="text-2xl font-bold text-gray-200 leading-snug">{cards[currentIndex].definition}</p>
                        {cards[currentIndex].example && (
                          <div className="mt-8 p-4 bg-black/30 rounded-2xl border border-white/5 max-w-[80%]">
                            <p className="text-xs text-gray-400 italic mb-1">"{cards[currentIndex].example}"</p>
                            <p className="text-[10px] text-gray-500">{cards[currentIndex].exampleVi}</p>
                          </div>
                        )}
                        <div className="absolute bottom-6 flex items-center gap-2 text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">
                          CHẠM ĐỂ QUAY LẠI
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="mt-12 flex items-center gap-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
                      disabled={currentIndex === 0}
                      className="p-4 bg-[#1a1a1a] border border-gray-800 rounded-2xl hover:border-indigo-500/50 disabled:opacity-20 transition-all"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-sm font-black text-gray-500 tracking-widest">
                      {currentIndex + 1} / {cards.length}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1)); }}
                      disabled={currentIndex === cards.length - 1}
                      className="p-4 bg-[#1a1a1a] border border-gray-800 rounded-2xl hover:border-indigo-500/50 disabled:opacity-20 transition-all"
                    >
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => toggleLearned(currentIndex)}
                    className={`mt-8 flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${progress.includes(currentIndex) ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {progress.includes(currentIndex) ? 'ĐÃ THUỘC TỪ NÀY' : 'ĐÁNH DẤU ĐÃ HỌC'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Styles for Flashcard Perspective */}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}
