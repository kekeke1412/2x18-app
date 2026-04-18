// src/pages/FlashcardSet.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, Edit3, Sparkles, 
  Volume2, CheckCircle2, Circle, ArrowLeft, ArrowRight,
  Maximize2, RotateCcw, Save, Trash, X, Loader2, Book, Layers,
  Trophy, AlertTriangle, CheckCircle, HelpCircle, FileEdit, Zap
} from 'lucide-react';
import { useApp, toArr } from '../context/AppContext';
import { suggestDefinitions } from '../services/vocabService';
import { motion, AnimatePresence } from 'framer-motion';

export default function FlashcardSet() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { vocab = {}, currentUser, editVocabSet, markWordLearned, userVocab = {} } = useApp();
  
  const set = vocab[setId];
  const progress = useMemo(() => userVocab[currentUser?.id]?.[setId] || [], [userVocab, currentUser, setId]);
  
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'flashcards' | 'quiz' | 'swipe'
  const [cards, setCards] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Swipe State
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeResults, setSwipeResults] = useState({ remembered: 0, forgotten: 0 });
  const [swipeComplete, setSwipeComplete] = useState(false);

  // Quiz State
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null); // { correct: bool, message: string }

  // Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (set) {
      setCards(toArr(set.terms));
    }
  }, [set]);

  if (!set) return <div className="p-10 text-center text-gray-500 font-bold">Học phần không tồn tại hoặc đã bị xóa.</div>;

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

  // ── SWIPE LOGIC ──────────────────────────────────────────────────────────
  const startSwipe = () => {
    setSwipeIndex(0);
    setSwipeResults({ remembered: 0, forgotten: 0 });
    setSwipeComplete(false);
    setActiveTab('swipe');
  };

  const handleSwipe = (direction) => {
    const isRight = direction === 'right';
    if (isRight) {
      setSwipeResults(prev => ({ ...prev, remembered: prev.remembered + 1 }));
      // Mark as learned on swipe right
      markWordLearned(setId, swipeIndex, true);
    } else {
      setSwipeResults(prev => ({ ...prev, forgotten: prev.forgotten + 1 }));
    }

    if (swipeIndex < cards.length - 1) {
      setSwipeIndex(swipeIndex + 1);
    } else {
      setSwipeComplete(true);
    }
  };

  // ── QUIZ LOGIC ───────────────────────────────────────────────────────────
  const startQuiz = () => {
    if (cards.length < 4) {
      alert('Cần ít nhất 4 từ vựng để bắt đầu kiểm tra!');
      return;
    }
    const questions = generateQuiz(cards);
    setQuizQuestions(questions);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizComplete(false);
    setQuizStarted(true);
    setQuizFeedback(null);
    setUserAnswer('');
    setActiveTab('quiz');
  };

  const generateQuiz = (terms) => {
    const shuffled = [...terms].sort(() => Math.random() - 0.5);
    return shuffled.map((term, i) => {
      const typeRand = Math.random();
      let type = 'choice';
      if (typeRand < 0.3) type = 'choice';
      else if (typeRand < 0.5) type = 'tf';
      else if (typeRand < 0.8) type = 'fill';
      else type = 'written';

      if (type === 'choice') {
        const distractors = terms
          .filter(t => t.word !== term.word)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(t => t.definition);
        const options = [...distractors, term.definition].sort(() => Math.random() - 0.5);
        return { type, question: `"${term.word}" có nghĩa là gì?`, answer: term.definition, options, term };
      } else if (type === 'tf') {
        const isMatch = Math.random() > 0.5;
        const shownDef = isMatch ? term.definition : (terms.find(t => t.word !== term.word)?.definition || 'Không rõ');
        return { type, question: `"${term.word}" nghĩa là "${shownDef}"?`, answer: isMatch ? 'true' : 'false', term };
      } else if (type === 'fill') {
        const blanked = term.example ? term.example.replace(new RegExp(term.word, 'gi'), '_____') : `Nghĩa: ${term.definition}`;
        return { type, question: `Điền từ còn thiếu: ${blanked}`, answer: term.word, term };
      } else {
        return { type, question: `Hãy ghi lại thuật ngữ cho nghĩa: "${term.definition}"`, answer: term.word, term };
      }
    });
  };

  const handleQuizAnswer = (ans) => {
    if (quizFeedback) return;
    
    const current = quizQuestions[quizIndex];
    const isCorrect = ans.toLowerCase().trim() === current.answer.toLowerCase().trim();
    
    if (isCorrect) setQuizScore(prev => prev + 1);
    setQuizFeedback({ 
      correct: isCorrect, 
      message: isCorrect ? 'Chính xác! 🎉' : `Sai rồi! Đáp án đúng là: ${current.answer}` 
    });

    setTimeout(() => {
      setQuizFeedback(null);
      setUserAnswer('');
      if (quizIndex < quizQuestions.length - 1) {
        setQuizIndex(quizIndex + 1);
      } else {
        setQuizComplete(true);
      }
    }, 1500);
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
      {!isEditing && (
        <div className="px-6 py-1 bg-[#1a1a1a]/60 border-b border-gray-800/40 flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'list', label: 'Danh sách', icon: Layers },
            { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: RotateCcw },
            { id: 'swipe', label: 'Swipe để học', icon: Zap },
            { id: 'quiz', label: 'Kiểm tra', icon: HelpCircle },
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => {
                setActiveTab(t.id);
                if (t.id === 'swipe') startSwipe();
                if (t.id === 'quiz') setQuizStarted(false);
              }}
              className={`flex items-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === t.id ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
              {activeTab === t.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto h-full">
          
          {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
          {activeTab === 'list' && (
            <div className="space-y-4 pb-20">
              {cards.length === 0 && !isEditing && (
                <div className="text-center py-20 bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-800">
                  <Book className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm font-bold">Học phần này chưa có từ vựng.</p>
                  <button onClick={() => { setIsEditing(true); handleAddCard(); }} className="mt-4 text-indigo-400 text-xs font-black uppercase underline">Thêm từ mới ngay</button>
                </div>
              )}

              <AnimatePresence>
                {cards.map((card, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={idx} 
                    className={`bg-[#1a1a1a] border rounded-2xl p-5 transition-all ${isEditing ? 'border-indigo-500/30' : 'border-gray-800 hover:border-gray-700'}`}
                  >
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
                            onChange={e => { const n = [...cards]; n[idx].word = e.target.value; setCards(n); }}
                            className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none"
                          />
                          <input 
                            placeholder="Định nghĩa (Ví dụ: Vật lý học)"
                            value={card.definition}
                            onChange={e => { const n = [...cards]; n[idx].definition = e.target.value; setCards(n); }}
                            className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input placeholder="Phiên âm" value={card.ipa} onChange={e => { const n = [...cards]; n[idx].ipa = e.target.value; setCards(n); }} className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none" />
                          <input placeholder="Câu ví dụ..." value={card.example} onChange={e => { const n = [...cards]; n[idx].example = e.target.value; setCards(n); }} className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none" />
                          <input placeholder="Dịch nghĩa ví dụ..." value={card.exampleVi} onChange={e => { const n = [...cards]; n[idx].exampleVi = e.target.value; setCards(n); }} className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none" />
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
                  </motion.div>
                ))}
              </AnimatePresence>

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
            <div className="flex flex-col items-center justify-center h-full pt-10">
              {cards.length === 0 ? (
                <p className="text-gray-500 font-bold">Chưa có thuật ngữ nào để hiển thị thẻ.</p>
              ) : (
                <>
                  <motion.div 
                    key={currentIndex}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-full max-w-lg aspect-[3/2] cursor-pointer perspective"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div className={`w-full h-full duration-700 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                      {/* Mặt trước */}
                      <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="absolute top-6 left-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Thuật ngữ</div>
                        <h2 className="text-4xl font-black text-white tracking-tight">{cards[currentIndex].word}</h2>
                        <p className="text-sm text-gray-500 font-mono italic mt-4">{cards[currentIndex].ipa}</p>
                        <div className="absolute bottom-6 flex items-center gap-2 text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">CHẠM ĐỂ XEM ĐỊNH NGHĨA</div>
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
                        <div className="absolute bottom-6 flex items-center gap-2 text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">CHẠM ĐỂ QUAY LẠI</div>
                      </div>
                    </div>
                  </motion.div>

                  <div className="mt-12 flex items-center gap-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentIndex(Math.max(0, currentIndex - 1)); }}
                      disabled={currentIndex === 0}
                      className="p-4 bg-[#1a1a1a] border border-gray-800 rounded-2xl hover:border-indigo-500/50 disabled:opacity-20 transition-all"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-sm font-black text-gray-500 tracking-widest">{currentIndex + 1} / {cards.length}</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1)); }}
                      disabled={currentIndex === cards.length - 1}
                      className="p-4 bg-[#1a1a1a] border border-gray-800 rounded-2xl hover:border-indigo-500/50 disabled:opacity-20 transition-all"
                    >
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── SWIPE MODE ─────────────────────────────────────────────────── */}
          {activeTab === 'swipe' && (
            <div className="flex flex-col items-center justify-center h-full pt-10">
              {swipeComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-[#1a1a1a] p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">Hoàn thành!</h2>
                  <p className="text-gray-400 text-sm mb-8 font-bold">Kết quả ôn tập của bạn</p>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-green-600/10 border border-green-500/20 rounded-2xl">
                      <div className="text-2xl font-black text-green-500">{swipeResults.remembered}</div>
                      <div className="text-[10px] text-green-700 font-black uppercase">Đã nhớ</div>
                    </div>
                    <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl">
                      <div className="text-2xl font-black text-red-500">{swipeResults.forgotten}</div>
                      <div className="text-[10px] text-red-700 font-black uppercase">Chưa nhớ</div>
                    </div>
                  </div>
                  <button onClick={startSwipe} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-900/30">HỌC LẠI</button>
                </motion.div>
              ) : (
                <div className="relative w-full max-w-lg aspect-[3/4] md:aspect-[3/2]">
                  <AnimatePresence>
                    <motion.div 
                      key={swipeIndex}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(e, info) => {
                        if (info.offset.x > 100) handleSwipe('right');
                        else if (info.offset.x < -100) handleSwipe('left');
                      }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ x: swipeResults.remembered + swipeResults.forgotten > 0 ? (swipeResults.remembered > 0 ? 500 : -500) : 0, opacity: 0 }}
                      className="absolute inset-0 bg-[#1a1a1a] border-2 border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-2xl cursor-grab active:cursor-grabbing"
                    >
                      <div className="absolute top-6 left-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Ôn tập ({swipeIndex + 1}/{cards.length})</div>
                      <h2 className="text-4xl font-black text-white">{cards[swipeIndex].word}</h2>
                      <p className="text-sm text-gray-500 font-mono italic mt-4">{cards[swipeIndex].ipa}</p>
                      <div className="mt-8 p-5 bg-indigo-600/5 rounded-2xl border border-indigo-500/10">
                        <p className="text-lg font-bold text-gray-300">{cards[swipeIndex].definition}</p>
                      </div>
                      
                      <div className="absolute bottom-10 left-0 w-full px-10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2 text-red-500"><ArrowLeft className="w-4 h-4"/> CHƯA NHỚ</div>
                        <div className="flex items-center gap-2 text-green-500">ĐÃ NHỚ <ArrowRight className="w-4 h-4"/></div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* ── QUIZ MODE ──────────────────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <div className="flex flex-col items-center justify-center h-full">
              {!quizStarted ? (
                <div className="text-center bg-[#1a1a1a] p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full">
                  <Zap className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">Kiểm tra năng lực</h2>
                  <p className="text-gray-400 text-sm mb-8 font-bold">Trắc nghiệm, đúng sai, tự luận & điền từ</p>
                  <button onClick={startQuiz} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">BẮT ĐẦU NGAY</button>
                </div>
              ) : quizComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-[#1a1a1a] p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">Kết quả!</h2>
                  <p className="text-gray-400 text-sm mb-8 font-bold">Bạn đã trả lời đúng {quizScore} / {quizQuestions.length} câu</p>
                  <div className="text-5xl font-black text-indigo-400 mb-8">{Math.round((quizScore / quizQuestions.length) * 100)}%</div>
                  <button onClick={startQuiz} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">LÀM LẠI</button>
                </motion.div>
              ) : (
                <div className="w-full max-w-2xl bg-[#1a1a1a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                  {/* Progress bar */}
                  <div className="h-1 bg-gray-800 w-full relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(quizIndex / quizQuestions.length) * 100}%` }} className="h-full bg-indigo-500" />
                  </div>
                  
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Câu hỏi {quizIndex + 1} / {quizQuestions.length}</span>
                      <div className="flex items-center gap-2 bg-indigo-600/10 px-3 py-1 rounded-full">
                        <Star className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400">{quizScore} ĐIỂM</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-8 leading-relaxed">
                      {quizQuestions[quizIndex].question}
                    </h3>

                    {/* Choice Type */}
                    {quizQuestions[quizIndex].type === 'choice' && (
                      <div className="grid grid-cols-1 gap-3">
                        {quizQuestions[quizIndex].options.map((opt, i) => (
                          <button 
                            key={i} 
                            onClick={() => handleQuizAnswer(opt)}
                            className={`p-4 text-left border rounded-2xl text-sm font-medium transition-all ${quizFeedback?.message.includes(opt) ? 'bg-green-600/20 border-green-500 text-green-500' : 'bg-[#121212] border-gray-800 hover:border-indigo-500'}`}
                          >
                            <span className="text-gray-500 mr-3 font-black">{String.fromCharCode(65 + i)}.</span> {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* True/False Type */}
                    {quizQuestions[quizIndex].type === 'tf' && (
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleQuizAnswer('true')} className="p-6 bg-green-600/10 border border-green-500/20 rounded-2xl text-green-500 font-black text-sm hover:bg-green-600 hover:text-white transition-all">ĐÚNG</button>
                        <button onClick={() => handleQuizAnswer('false')} className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-500 font-black text-sm hover:bg-red-600 hover:text-white transition-all">SAI</button>
                      </div>
                    )}

                    {/* Written / Fill Type */}
                    {(quizQuestions[quizIndex].type === 'written' || quizQuestions[quizIndex].type === 'fill') && (
                      <div className="space-y-4">
                        <input 
                          autoFocus
                          placeholder="Nhập câu trả lời..."
                          value={userAnswer}
                          onChange={e => setUserAnswer(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleQuizAnswer(userAnswer)}
                          className="w-full bg-[#121212] border border-gray-800 rounded-2xl p-5 text-lg font-bold text-white focus:border-indigo-500 outline-none"
                        />
                        <button onClick={() => handleQuizAnswer(userAnswer)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">KIỂM TRA</button>
                      </div>
                    )}

                    {/* Feedback Overlay */}
                    <AnimatePresence>
                      {quizFeedback && (
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }} 
                          exit={{ y: 20, opacity: 0 }}
                          className={`mt-8 p-4 rounded-2xl flex items-center gap-3 ${quizFeedback.correct ? 'bg-green-600/20 text-green-500' : 'bg-red-600/20 text-red-500'}`}
                        >
                          {quizFeedback.correct ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                          <span className="text-sm font-bold">{quizFeedback.message}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
