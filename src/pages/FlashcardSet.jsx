// src/pages/FlashcardSet.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, Edit3, Sparkles, 
  Volume2, CheckCircle2, Circle, ArrowLeft, ArrowRight,
  Maximize2, RotateCcw, Save, Trash, X, Loader2, Book, Layers,
  Trophy, AlertTriangle, CheckCircle, HelpCircle, FileEdit, Zap,
  RefreshCw
} from 'lucide-react';
import { useApp, toArr } from '../context/AppContext';
import { suggestDefinitions } from '../services/vocabService';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

export default function FlashcardSet() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { vocab = {}, currentUser, editVocabSet, markWordLearned, userVocab = {} } = useApp();
  
  const set = vocab[setId];
  const progress = useMemo(() => userVocab[currentUser?.id]?.[setId] || [], [userVocab, currentUser, setId]);
  
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'study' | 'quiz'
  const [cards, setCards] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Study (Swipe + Flip) State
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyResults, setStudyResults] = useState({ remembered: 0, forgotten: 0 });
  const [studyComplete, setStudyComplete] = useState(false);

  // Quiz State
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(null);

  const speak = (text, lang = 'en') => {
    if (!text) return;
    setIsSpeaking(text);
    const utterance = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`);
    utterance.play().finally(() => setIsSpeaking(null));
  };

  useEffect(() => {
    if (set) {
      setCards(toArr(set.terms));
    }
  }, [set]);

  if (!set) return <div className="p-10 text-center text-gray-500 font-bold">Học phần không tồn tại.</div>;

  const handleSave = () => { editVocabSet({ ...set, terms: cards }); setIsEditing(false); };
  const handleAddCard = () => { setCards([...cards, { word: '', definition: '', type: '', ipa: '', example: '', exampleVi: '' }]); };
  const handleRemoveCard = (idx) => { setCards(cards.filter((_, i) => i !== idx)); };

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
    } catch (err) { console.error(err); } finally { setIsAiLoading(false); }
  };

  const toggleLearned = (idx) => {
    const isLearned = progress.includes(idx);
    markWordLearned(setId, idx, !isLearned);
  };

  // ── STUDY LOGIC (Combined Flip + Swipe) ──────────────────────────────────
  const startStudy = () => {
    setStudyIndex(0);
    setIsFlipped(false);
    setStudyResults({ remembered: 0, forgotten: 0 });
    setStudyComplete(false);
    setActiveTab('study');
  };

  const handleSwipeAction = (direction) => {
    const isRight = direction === 'right';
    if (isRight) {
      setStudyResults(prev => ({ ...prev, remembered: prev.remembered + 1 }));
      markWordLearned(setId, studyIndex, true);
    } else {
      setStudyResults(prev => ({ ...prev, forgotten: prev.forgotten + 1 }));
    }

    if (studyIndex < cards.length - 1) {
      setStudyIndex(studyIndex + 1);
      setIsFlipped(false);
    } else {
      setStudyComplete(true);
    }
  };

  // ── QUIZ LOGIC ───────────────────────────────────────────────────────────
  const startQuiz = () => {
    if (cards.length < 4) { alert('Cần ít nhất 4 từ vựng!'); return; }
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
    return shuffled.map((term) => {
      const typeRand = Math.random();
      let type = 'choice';
      if (typeRand < 0.3) type = 'choice';
      else if (typeRand < 0.5) type = 'tf';
      else if (typeRand < 0.8) type = 'fill';
      else type = 'written';

      if (type === 'choice') {
        const distractors = terms.filter(t => t.word !== term.word).sort(() => Math.random() - 0.5).slice(0, 3).map(t => t.definition);
        const options = [...distractors, term.definition].sort(() => Math.random() - 0.5);
        return { type, question: `"${term.word}" có nghĩa là gì?`, answer: term.definition, options, term };
      } else if (type === 'tf') {
        const isMatch = Math.random() > 0.5;
        const shownDef = isMatch ? term.definition : (terms.find(t => t.word !== term.word)?.definition || '...');
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
    setQuizFeedback({ correct: isCorrect, message: isCorrect ? 'Chính xác! 🎉' : `Sai rồi! Đáp án: ${current.answer}` });
    setTimeout(() => {
      setQuizFeedback(null); setUserAnswer('');
      if (quizIndex < quizQuestions.length - 1) setQuizIndex(quizIndex + 1);
      else setQuizComplete(true);
    }, 1200);
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
            { id: 'study', label: 'Học tập', icon: Zap },
            { id: 'quiz', label: 'Kiểm tra', icon: HelpCircle },
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => { setActiveTab(t.id); if (t.id === 'study') startStudy(); if (t.id === 'quiz') setQuizStarted(false); }}
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
              <AnimatePresence>
                {cards.map((card, idx) => (
                  <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`bg-[#1a1a1a] border rounded-2xl p-5 transition-all ${isEditing ? 'border-indigo-500/30' : 'border-gray-800 hover:border-gray-700'}`}>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-600 tracking-widest uppercase">Thẻ #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleAiSuggest(idx)} disabled={isAiLoading === idx} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20">
                              {isAiLoading === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI SUGGEST
                            </button>
                            <button onClick={() => handleRemoveCard(idx)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 flex gap-2">
                            <input 
                              placeholder="Thuật ngữ" 
                              value={card.word} 
                              onChange={e => { const n = [...cards]; n[idx].word = e.target.value; setCards(n); }} 
                              className="flex-1 bg-[#121212] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none" 
                            />
                            <select 
                              value={card.type} 
                              onChange={e => { const n = [...cards]; n[idx].type = e.target.value; setCards(n); }}
                              className="w-24 bg-[#121212] border border-gray-800 rounded-xl px-2 py-2.5 text-xs font-bold focus:border-indigo-500 outline-none text-indigo-400"
                            >
                              <option value="">Loại</option>
                              <option value="n">n</option>
                              <option value="v">v</option>
                              <option value="adj">adj</option>
                              <option value="adv">adv</option>
                              <option value="phrase">phrase</option>
                            </select>
                          </div>
                          <input 
                            placeholder="Định nghĩa (Ví dụ: Vật lý học)" 
                            value={card.definition} 
                            onChange={e => { const n = [...cards]; n[idx].definition = e.target.value; setCards(n); }} 
                            className="flex-1 bg-[#121212] border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none" 
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input placeholder="Phiên âm (Ví dụ: /ˈfɪz.ɪks/)" value={card.ipa} onChange={e => { const n = [...cards]; n[idx].ipa = e.target.value; setCards(n); }} className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none" />
                          <input placeholder="Câu ví dụ..." value={card.example} onChange={e => { const n = [...cards]; n[idx].example = e.target.value; setCards(n); }} className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none" />
                          <input placeholder="Dịch nghĩa ví dụ..." value={card.exampleVi} onChange={e => { const n = [...cards]; n[idx].exampleVi = e.target.value; setCards(n); }} className="bg-[#121212] border border-gray-800 rounded-xl px-4 py-2 text-[11px] focus:border-indigo-500 outline-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-black text-indigo-400">{card.word}</h4>
                            <button 
                              onClick={() => speak(card.word)} 
                              className={`p-1.5 rounded-lg transition-all ${isSpeaking === card.word ? 'text-indigo-400 bg-indigo-500/20' : 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                            >
                              <Volume2 className={`w-4 h-4 ${isSpeaking === card.word ? 'animate-pulse' : ''}`} />
                            </button>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-indigo-500/20">{card.type || 'n/a'}</span>
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
                        <button onClick={() => toggleLearned(idx)} className={`p-2 rounded-full transition-all ${progress.includes(idx) ? 'text-green-500 bg-green-500/10' : 'text-gray-700 hover:text-gray-500 bg-gray-800/50'}`}>
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isEditing && (
                <button onClick={handleAddCard} className="w-full py-5 bg-[#1a1a1a] border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 font-bold hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex flex-col items-center gap-2">
                  <Plus className="w-6 h-6" /><span>THÊM THẺ MỚI</span>
                </button>
              )}
            </div>
          )}

          {/* ── STUDY MODE (Flip + Swipe) ──────────────────────────────────── */}
          {activeTab === 'study' && (
            <div className="flex flex-col items-center justify-center h-full pt-4">
              {studyComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-[#1a1a1a] p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">Hoàn thành!</h2>
                  <div className="grid grid-cols-2 gap-4 my-8">
                    <div className="p-4 bg-green-600/10 border border-green-500/20 rounded-2xl">
                      <div className="text-2xl font-black text-green-500">{studyResults.remembered}</div>
                      <div className="text-[10px] text-green-700 font-black uppercase">Đã nhớ</div>
                    </div>
                    <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl">
                      <div className="text-2xl font-black text-red-500">{studyResults.forgotten}</div>
                      <div className="text-[10px] text-red-700 font-black uppercase">Chưa nhớ</div>
                    </div>
                  </div>
                  <button onClick={startStudy} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> HỌC LẠI
                  </button>
                </motion.div>
              ) : (
                <div className="w-full max-w-lg">
                  <div className="flex justify-between items-center mb-6 px-4">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Tiến độ: {studyIndex + 1} / {cards.length}
                    </div>
                    <div className="flex gap-2">
                       <div className="px-2 py-1 bg-green-500/10 rounded text-green-500 text-[10px] font-bold">{studyResults.remembered} R</div>
                       <div className="px-2 py-1 bg-red-500/10 rounded text-red-500 text-[10px] font-bold">{studyResults.forgotten} L</div>
                    </div>
                  </div>

                  <div className="relative aspect-[3/4] md:aspect-[3/2.2] perspective">
                    <AnimatePresence mode="wait">
                      <StudyCard 
                        key={studyIndex}
                        card={cards[studyIndex]}
                        isFlipped={isFlipped}
                        onFlip={() => setIsFlipped(!isFlipped)}
                        onSwipe={handleSwipeAction}
                        onSpeak={speak}
                        isSpeaking={isSpeaking}
                      />
                    </AnimatePresence>
                  </div>
                  
                  <div className="mt-8 flex justify-center gap-6">
                    <button onClick={() => handleSwipeAction('left')} className="p-4 bg-red-600/10 text-red-500 border border-red-500/30 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-900/20">
                      <X className="w-6 h-6" />
                    </button>
                    <button onClick={() => setIsFlipped(!isFlipped)} className="px-8 py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded-2xl font-black text-xs uppercase tracking-widest">
                      LẬT THẺ
                    </button>
                    <button onClick={() => handleSwipeAction('right')} className="p-4 bg-green-600/10 text-green-500 border border-green-500/30 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-900/20">
                      <CheckCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-gray-600 mt-6 font-bold uppercase tracking-[0.2em]">Kéo sang trái/phải hoặc dùng nút để đánh giá</p>
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
                  <button onClick={startQuiz} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">BẮT ĐẦU</button>
                </div>
              ) : quizComplete ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-[#1a1a1a] p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full">
                  <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">Kết quả!</h2>
                  <div className="text-5xl font-black text-indigo-400 mb-8">{Math.round((quizScore / quizQuestions.length) * 100)}%</div>
                  <button onClick={startQuiz} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all">LÀM LẠI</button>
                </motion.div>
              ) : (
                <div className="w-full max-w-2xl bg-[#1a1a1a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="h-1 bg-gray-800 w-full relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(quizIndex / quizQuestions.length) * 100}%` }} className="h-full bg-indigo-500" />
                  </div>
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Câu {quizIndex + 1} / {quizQuestions.length}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-8 leading-relaxed">{quizQuestions[quizIndex].question}</h3>
                    {quizQuestions[quizIndex].type === 'choice' && (
                      <div className="grid grid-cols-1 gap-3">
                        {quizQuestions[quizIndex].options.map((opt, i) => (
                          <button key={i} onClick={() => handleQuizAnswer(opt)} className="p-4 text-left border border-gray-800 rounded-2xl text-sm font-medium hover:border-indigo-500 transition-all bg-[#121212]">{opt}</button>
                        ))}
                      </div>
                    )}
                    {quizQuestions[quizIndex].type === 'tf' && (
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleQuizAnswer('true')} className="p-6 bg-green-600/10 border border-green-500/20 rounded-2xl text-green-500 font-black">ĐÚNG</button>
                        <button onClick={() => handleQuizAnswer('false')} className="p-6 bg-red-600/10 border border-red-500/20 rounded-2xl text-red-500 font-black">SAI</button>
                      </div>
                    )}
                    {(quizQuestions[quizIndex].type === 'written' || quizQuestions[quizIndex].type === 'fill') && (
                      <div className="space-y-4">
                        <input autoFocus placeholder="Trả lời..." value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuizAnswer(userAnswer)} className="w-full bg-[#121212] border border-gray-800 rounded-2xl p-5 text-lg font-bold outline-none focus:border-indigo-500" />
                        <button onClick={() => handleQuizAnswer(userAnswer)} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl">KIỂM TRA</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective { perspective: 1200px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}

function StudyCard({ card, isFlipped, onFlip, onSwipe, onSpeak, isSpeaking }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const bgColor = useTransform(x, [-100, 0, 100], ['#ef4444', '#1a1a1a', '#22c55e']);

  const handleDragEnd = (e, info) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  return (
    <motion.div 
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onClick={onFlip}
      className="absolute inset-0 cursor-grab active:cursor-grabbing preserve-3d transition-transform duration-700"
    >
      <div className={`w-full h-full relative preserve-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front */}
        <motion.div 
          style={{ backgroundColor: bgColor }}
          className="absolute inset-0 backface-hidden border-2 border-gray-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl"
        >
          <div className="absolute top-8 left-8 text-[10px] font-black text-gray-500 uppercase tracking-widest">Thuật ngữ</div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">{card.word}</h2>
          <div className="flex items-center gap-3 mt-4">
            <button 
              onClick={(e) => { e.stopPropagation(); onSpeak(card.word); }} 
              className={`p-3 rounded-2xl transition-all ${isSpeaking === card.word ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              <Volume2 className={`w-6 h-6 ${isSpeaking === card.word ? 'animate-pulse' : ''}`} />
            </button>
            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-white/10">{card.type || 'n/a'}</span>
            <span className="text-sm text-indigo-400 font-mono italic bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">{card.ipa}</span>
          </div>
          <div className="absolute bottom-10 flex items-center gap-3 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">
            <Zap className="w-3 h-3" /> CHẠM ĐỂ LẬT
          </div>
        </motion.div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e1e2d] border-2 border-indigo-500/30 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />
          <div className="absolute top-8 left-8 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Định nghĩa</div>
          <p className="text-2xl md:text-3xl font-bold text-gray-100 leading-snug">{card.definition}</p>
          {card.example && (
            <div className="mt-8 p-6 bg-black/40 rounded-3xl border border-white/5 max-w-full backdrop-blur-sm">
              <p className="text-xs text-gray-400 italic mb-2 leading-relaxed">"{card.example}"</p>
              <p className="text-[10px] text-indigo-400/80 font-bold">→ {card.exampleVi}</p>
            </div>
          )}
          <div className="absolute bottom-10 flex items-center gap-3 text-[10px] font-black text-indigo-500/40 uppercase tracking-[0.3em]">
             CHẠM ĐỂ QUAY LẠI
          </div>
        </div>
      </div>
    </motion.div>
  );
}
