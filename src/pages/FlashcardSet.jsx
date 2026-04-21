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
  const { 
    vocab = {}, currentUser, isSuperAdmin, isCore, editVocabSet, markWordLearned, incrementWordLevel,
    userVocab = {}, addQuizResult, quizHistory = {}, toast 
  } = useApp();
  
  const set = vocab[setId] || { title: '', description: '', cards: [] };
  // progress is now { wordIndex: level }
  const progress = useMemo(() => userVocab[currentUser?.id]?.[setId] || {}, [userVocab, currentUser, setId]);
  const masteredCount = useMemo(() => Object.values(progress).filter(lv => Number(lv) === 6).length, [progress]);
  
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'study' | 'quiz'
  const [cards, setCards] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hideMastered, setHideMastered] = useState(false);
  const [exampleSource, setExampleSource] = useState('');
  const [description, setDescription] = useState('');
  
  const isOwner = set?.authorId === currentUser?.id || isSuperAdmin || isCore;

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
  const [isChecking, setIsChecking] = useState(false);
  const [quizDetails, setQuizDetails] = useState([]); // { question, userAns, correctAns, isCorrect }
  const myHistory = useMemo(() => quizHistory[currentUser?.id] || [], [quizHistory, currentUser]);
  const currentSetHistory = useMemo(() => 
    myHistory.filter(h => h.setId === setId).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)),
  [myHistory, setId]);

  const speak = (text, lang = 'en') => {
    if (!text) return;
    setIsSpeaking(text);
    
    // Sử dụng client=gtx thường ổn định hơn trên web
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=gtx`;
    const audio = new Audio(url);
    
    audio.play()
      .then(() => {
        console.log('[TTS] Playing:', text);
      })
      .catch(err => {
        console.error('[TTS] Error:', err);
        // Fallback sang SpeechSynthesis nếu Google API bị chặn
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = lang;
        window.speechSynthesis.speak(msg);
      })
      .finally(() => {
        setIsSpeaking(null);
      });
  };

  useEffect(() => {
    if (set) {
      setCards(toArr(set.terms));
      setExampleSource(set.exampleSource || '');
      setDescription(set.description || '');
    }
  }, [set]);

  if (!set) return <div className="p-10 text-center text-gray-500 font-bold">Học phần không tồn tại.</div>;

  const handleSave = () => { 
    editVocabSet({ ...set, terms: cards, exampleSource, description }); 
    setIsEditing(false); 
  };
  const handleAddCard = () => { setCards([...cards, { word: '', definition: '', type: 'n', level: 'B1', ipa: '', example: '', exampleVi: '' }]); };
  const handleRemoveCard = (idx) => { 
    if (window.confirm('Bạn có chắc chắn muốn xóa thẻ này?')) {
      setCards(cards.filter((_, i) => i !== idx)); 
    }
  };

  const handleAiSuggest = async (idx) => {
    const word = cards[idx].word;
    if (!word.trim()) return;
    setIsAiLoading(idx);
    try {
      const suggestions = await suggestDefinitions([word], exampleSource);
      if (suggestions && suggestions.length > 0) {
        const s = suggestions[0];
        const newCards = [...cards];
        newCards[idx] = { ...newCards[idx], ...s };
        setCards(newCards);
      }
    } catch (err) { 
      console.error(err); 
      toast(err.message || 'AI không phản hồi. Kiểm tra API Key.', 'error');
    } finally { 
      setIsAiLoading(false); 
    }
  };

  const currentLevels = (userVocab[currentUser?.id] || {})[setId] || {};

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
    setQuizDetails([]);
    setActiveTab('quiz');
  };

  const generateQuiz = (terms) => {
    // Chỉ kiểm tra những từ chưa Nhớ sâu (Lv 6) hoặc kiểm tra ngẫu nhiên nếu đã nhớ hết
    const pool = terms.map((t, i) => ({ ...t, originalIndex: i }));
    const available = pool.filter(t => (Number(progress[t.originalIndex]) || 0) < 6);
    const toQuiz = available.length >= 4 ? available : pool;

    const shuffled = [...toQuiz].sort(() => Math.random() - 0.5);
    return shuffled.map((term) => {
      const typeRand = Math.random();
      let type = 'choice';
      if (typeRand < 0.3) type = 'choice';
      else if (typeRand < 0.5) type = 'tf';
      else if (typeRand < 0.8) type = 'fill';
      else type = 'written';

      // Chuẩn hóa từ và định nghĩa để tránh lộ đáp án
      const cleanWord = (term.word || '').trim();
      const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedWord, 'gi');

      if (type === 'choice') {
        const distractors = terms.filter(t => t.word !== term.word).sort(() => Math.random() - 0.5).slice(0, 3).map(t => t.definition);
        const options = [...distractors, term.definition].sort(() => Math.random() - 0.5);
        return { type, question: `"${term.word}" có nghĩa là gì?`, answer: term.definition, options, term, wordIndex: term.originalIndex };
      } else if (type === 'tf') {
        const isMatch = Math.random() > 0.5;
        const shownDef = isMatch ? term.definition : (terms.find(t => t.word !== term.word)?.definition || '...');
        return { type, question: `"${term.word}" nghĩa là "${shownDef}"?`, answer: isMatch ? 'true' : 'false', term, wordIndex: term.originalIndex };
      } else if (type === 'fill') {
        // Ưu tiên dùng example, nếu không có thì dùng định nghĩa nhưng phải che từ đi
        const sourceText = term.example || `Nghĩa: ${term.definition}`;
        const blanked = sourceText.replace(regex, '_____');
        return { type, question: `Điền từ còn thiếu: ${blanked}`, answer: cleanWord, term, wordIndex: term.originalIndex };
      } else {
        // Đối với câu hỏi tự luận, cũng phải che từ đi nếu nó xuất hiện trong định nghĩa
        const hiddenDef = (term.definition || '').replace(regex, '_____');
        return { type, question: `Hãy ghi lại thuật ngữ cho nghĩa: "${hiddenDef}"`, answer: cleanWord, term, wordIndex: term.originalIndex };
      }
    });
  };

  const handleQuizAnswer = (ans) => {
    if (quizFeedback || isChecking) return;
    setIsChecking(true);
    const current = quizQuestions[quizIndex];
    const isCorrect = ans.toLowerCase().trim() === current.answer.toLowerCase().trim();
    
    // Set feedback immediately for animation
    setQuizFeedback({ 
      correct: isCorrect, 
      message: isCorrect ? 'Chính xác! 🎉' : `Sai rồi! Đáp án: ${current.answer}`,
      selected: ans
    });

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      // Tự động tăng bậc khi đúng
      incrementWordLevel(setId, current.wordIndex);
    }
    
    // Record details
    setQuizDetails(prev => [...prev, {
      question: current.question,
      userAns: ans,
      correctAns: current.answer,
      isCorrect
    }]);

    // Delay before next question to show animation
    setTimeout(() => {
      if (quizIndex < quizQuestions.length - 1) {
        setQuizIndex(quizIndex + 1);
        setQuizFeedback(null); 
        setUserAnswer('');
        setIsChecking(false);
      } else {
        const finalScore = isCorrect ? quizScore + 1 : quizScore;
        const result = {
          setId,
          setTitle: set.title,
          score: finalScore,
          total: quizQuestions.length,
          percentage: Math.round((finalScore / quizQuestions.length) * 100),
        };
        addQuizResult(result);
        setQuizComplete(true);
        setIsChecking(false);
      }
    }, 1500); // Slightly longer for better feedback visibility
  };

  // Keyboard shortcuts for Quiz
  useEffect(() => {
    if (activeTab === 'quiz' && quizStarted && !quizComplete && !quizFeedback) {
      const handleKeyDown = (e) => {
        const current = quizQuestions[quizIndex];
        if (!current) return;

        if (current.type === 'choice') {
          if (e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key) - 1;
            if (current.options[idx]) handleQuizAnswer(current.options[idx]);
          }
        } else if (current.type === 'tf') {
          if (e.key === '1') handleQuizAnswer('true');
          if (e.key === '2') handleQuizAnswer('false');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeTab, quizStarted, quizComplete, quizFeedback, quizIndex, quizQuestions]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden"
    >
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#1a1a1a] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link to="/vocab" className="p-2 hover:bg-gray-800 rounded-xl transition-colors shrink-0">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-black text-white truncate">{set.title}</h1>
            <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
              {cards.length} THUẬT NGỮ · ĐÃ NHỚ SÂU {masteredCount}/{cards.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'list' && !isEditing && (
            <button 
              onClick={() => setHideMastered(!hideMastered)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${hideMastered ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-[#1a1a1a] text-gray-400 border border-gray-800'}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> <span className="hidden md:inline">{hideMastered ? 'HIỆN TẤT CẢ' : 'ẨN TỪ ĐÃ THUỘC'}</span>
            </button>
          )}
          {activeTab === 'list' && isOwner && (
            <>
              {isEditing ? (
                <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-green-900/20">
                  <Save className="w-3.5 h-3.5" /> LƯU THAY ĐỔI
                </button>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all border border-indigo-500/30">
                  <Edit3 className="w-3.5 h-3.5" /> CHỈNH SỬA
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="px-6 py-2 bg-[#1a1a1a] border-b border-gray-800/60 flex items-center gap-3">
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest shrink-0">Nguồn AI:</label>
          <input 
            type="text"
            placeholder="Tên sách/Tác giả..."
            value={exampleSource}
            onChange={e => setExampleSource(e.target.value)}
            className="flex-1 bg-black/20 border border-gray-800/40 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-indigo-500/50 transition-all"
          />
          <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest shrink-0 ml-3">Mô tả:</label>
          <input 
            type="text"
            placeholder="Ghi chú về học phần này..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="flex-1 bg-black/20 border border-gray-800/40 rounded-lg px-3 py-1.5 text-[11px] outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      )}

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
              <AnimatePresence mode="popLayout">
                {cards.filter((_, i) => !hideMastered || (Number(progress[i]) || 0) < 6).map((card, idx) => (
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
                              <option value="phr v">phr v</option>
                              <option value="idiom">idiom</option>
                              <option value="colloc">colloc</option>
                            </select>
                            <select 
                              value={card.level} 
                              onChange={e => { const n = [...cards]; n[idx].level = e.target.value; setCards(n); }}
                              className="w-16 bg-[#121212] border border-gray-800 rounded-xl px-2 py-2.5 text-xs font-black focus:border-indigo-500 outline-none text-amber-400"
                            >
                              <option value="">Lvl</option>
                              <option value="A1">A1</option>
                              <option value="A2">A2</option>
                              <option value="B1">B1</option>
                              <option value="B2">B2</option>
                              <option value="C1">C1</option>
                              <option value="C2">C2</option>
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
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                            <h4 className="text-lg font-black text-indigo-400 break-words">{card.word}</h4>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => speak(card.word)} 
                                className={`p-1.5 rounded-lg transition-all ${isSpeaking === card.word ? 'text-indigo-400 bg-indigo-500/20' : 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                              >
                                <Volume2 className={`w-4 h-4 ${isSpeaking === card.word ? 'animate-pulse' : ''}`} />
                              </button>
                              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-indigo-500/20">{card.type || 'n/a'}</span>
                              {card.level && <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-amber-500/20">{card.level}</span>}
                            </div>
                            <span className="text-xs text-gray-500 font-mono italic break-all">{card.ipa}</span>
                          </div>
                          <p className="text-sm text-gray-200 font-medium mb-3 leading-relaxed">{card.definition}</p>
                          {card.example && (
                            <div className="pl-3 border-l-2 border-indigo-500/20 py-1">
                              <p className="text-xs text-gray-400 italic mb-1">"{card.example}"</p>
                              <p className="text-[10px] text-gray-600">→ {card.exampleVi}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          {Number(progress[idx]) === 6 ? (
                            <div className="flex flex-col items-center gap-1 bg-green-500/10 p-3 rounded-2xl border border-green-500/20">
                              <CheckCircle2 className="w-6 h-6 text-green-500" />
                              <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">Nhớ sâu</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 bg-gray-800/40 p-3 rounded-2xl border border-gray-800/60 min-w-[56px]">
                              <span className="text-xl font-black text-gray-400 leading-none">{Number(progress[idx]) || 0}</span>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Bậc</span>
                            </div>
                          )}
                        </div>
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

          {/* ── QUIZ & HISTORY MODE ────────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <div className="flex flex-col items-center gap-8 h-full">
              {!quizStarted ? (
                <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-[2.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
                    {/* Background Decorative Elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all duration-700" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl group-hover:bg-purple-600/20 transition-all duration-700" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 rotate-3 group-hover:rotate-6 transition-transform">
                        <Zap className="w-10 h-10 text-white" />
                      </div>
                      
                      <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Kiểm tra năng lực</h2>
                      <p className="text-gray-400 text-sm max-w-sm mb-10 leading-relaxed font-medium">
                        Thử thách bản thân với {cards.length} thuật ngữ trong học phần này. Hệ thống sẽ tự động tạo các dạng câu hỏi khác nhau.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 w-full mb-10">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Số lượng</div>
                          <div className="text-xl font-black text-white">{cards.length} câu</div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                          <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1">Thời gian dự kiến</div>
                          <div className="text-xl font-black text-white">~{Math.ceil(cards.length * 0.5)} phút</div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={startQuiz} 
                        className="group/btn relative w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-900/40 active:scale-95 overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                          BẮT ĐẦU NGAY <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Dashboard lịch sử mini */}
                  <div className="mt-12 space-y-8">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em]">Thành tích gần đây</h3>
                      {currentSetHistory.length > 0 && (
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                          TB: {Math.round(currentSetHistory.reduce((a,b)=>a+b.percentage,0)/currentSetHistory.length)}%
                        </div>
                      )}
                    </div>
                    <HistoryDashboard history={currentSetHistory} />
                  </div>
                </div>
              ) : quizComplete ? (
                <div className="w-full max-w-2xl animate-in zoom-in-95 fade-in duration-500 pb-20">
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-[2.5rem] p-10 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center text-center mb-10">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                      className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-yellow-500/20"
                    >
                      <Trophy className="w-12 h-12 text-yellow-500" />
                    </motion.div>
                    
                    <h2 className="text-3xl font-black text-white mb-2">Tuyệt vời!</h2>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mb-8">Bạn đã hoàn thành bài kiểm tra</p>
                    
                    <div className="relative mb-10">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-violet-600"
                      >
                        {Math.round((quizScore / quizQuestions.length) * 100)}%
                      </motion.div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">ĐÚNG {quizScore} / {quizQuestions.length} CÂU</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                      <button 
                        onClick={startQuiz} 
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-900/40 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" /> THỬ LẠI
                      </button>
                      <button 
                        onClick={() => setQuizStarted(false)} 
                        className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> HOÀN TẤT
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <FileEdit className="w-4 h-4 text-indigo-400" /> CHI TIẾT KẾT QUẢ
                      </h3>
                    </div>
                    
                    <div className="bg-[#1a1a1a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                      <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {quizDetails.map((item, idx) => (
                          <div key={idx} className="p-6 flex gap-6 hover:bg-white/[0.02] transition-colors">
                            <div className={`mt-1 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {item.isCorrect ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-200 mb-3 leading-relaxed">{item.question}</p>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-wider">Của bạn:</span>
                                  <span className={`text-xs font-bold ${item.isCorrect ? 'text-green-500' : 'text-red-500 line-through'}`}>{item.userAns || '(Trống)'}</span>
                                </div>
                                {!item.isCorrect && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">Đúng nhất:</span>
                                    <span className="text-xs font-black text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">{item.correctAns}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2 mb-6 text-center">Tiến trình học tập đã được cập nhật</h4>
                    <HistoryDashboard history={currentSetHistory} />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl flex flex-col h-full relative">
                  {/* Header & Progress */}
                  <div className="mb-10 px-2 flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                          <HelpCircle className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-sm font-black text-white uppercase tracking-widest">
                          Câu {quizIndex + 1} <span className="text-gray-500">/ {quizQuestions.length}</span>
                        </span>
                      </div>
                      <div className="text-[10px] font-black text-indigo-500/80 bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10">
                        {Math.round((quizIndex / quizQuestions.length) * 100)}% HOÀN THÀNH
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden w-full relative">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(quizIndex / quizQuestions.length) * 100}%` }} 
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                      />
                    </div>
                  </div>

                  {/* Question Container */}
                  <div className="flex-1 relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={quizIndex}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col"
                      >
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12">
                          <Book className="w-40 h-40" />
                        </div>

                        <div className="relative z-10 flex-1 flex flex-col">
                          <h3 className="text-xl md:text-2xl font-bold text-white mb-10 leading-relaxed">
                            {quizQuestions[quizIndex].question}
                          </h3>

                          {/* Multiple Choice */}
                          {quizQuestions[quizIndex].type === 'choice' && (
                            <div className="grid grid-cols-1 gap-4">
                              {quizQuestions[quizIndex].options.map((opt, i) => {
                                const isSelected = quizFeedback?.selected === opt;
                                const isCorrect = opt === quizQuestions[quizIndex].answer;
                                const showResult = quizFeedback !== null;
                                
                                return (
                                  <motion.button 
                                    key={i} 
                                    whileHover={!showResult ? { x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' } : {}}
                                    whileTap={!showResult ? { scale: 0.98 } : {}}
                                    onClick={() => handleQuizAnswer(opt)} 
                                    className={`group relative p-5 text-left border rounded-2xl text-sm font-medium transition-all flex items-center justify-between ${
                                      showResult
                                        ? isCorrect
                                          ? 'border-green-500 bg-green-500/10 text-green-400'
                                          : isSelected
                                            ? 'border-red-500 bg-red-500/10 text-red-400'
                                            : 'border-gray-800 opacity-40'
                                        : 'border-gray-800 bg-[#121212] hover:border-indigo-500/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border transition-colors ${
                                        showResult 
                                          ? isCorrect ? 'bg-green-500 border-green-500 text-white' : isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'
                                          : 'bg-gray-800 border-gray-700 text-gray-400 group-hover:border-indigo-500 group-hover:text-indigo-400'
                                      }`}>
                                        {i + 1}
                                      </div>
                                      <span className="flex-1">{opt}</span>
                                    </div>
                                    
                                    {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-500 animate-in zoom-in duration-300" />}
                                    {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-red-500 animate-in zoom-in duration-300" />}
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}

                          {/* True/False */}
                          {quizQuestions[quizIndex].type === 'tf' && (
                            <div className="grid grid-cols-2 gap-6 mt-4">
                              {['true', 'false'].map((val) => {
                                const isSelected = quizFeedback?.selected === val;
                                const isCorrect = val === quizQuestions[quizIndex].answer;
                                const showResult = quizFeedback !== null;
                                const label = val === 'true' ? 'ĐÚNG' : 'SAI';
                                const colorClass = val === 'true' ? 'green' : 'red';
                                
                                return (
                                  <motion.button 
                                    key={val}
                                    whileHover={!showResult ? { scale: 1.02 } : {}}
                                    whileTap={!showResult ? { scale: 0.98 } : {}}
                                    onClick={() => handleQuizAnswer(val)} 
                                    className={`h-32 flex flex-col items-center justify-center gap-3 border-2 rounded-3xl font-black transition-all ${
                                      showResult
                                        ? isCorrect
                                          ? 'border-green-500 bg-green-500/10 text-green-400'
                                          : isSelected
                                            ? 'border-red-500 bg-red-500/10 text-red-400'
                                            : 'border-gray-800 opacity-40'
                                        : `border-gray-800 bg-[#121212] hover:border-${colorClass}-500/50 hover:text-${colorClass}-400`
                                    }`}
                                  >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${colorClass}-500/10 text-${colorClass}-500`}>
                                      {val === 'true' ? <CheckCircle2 className="w-7 h-7" /> : <X className="w-7 h-7" />}
                                    </div>
                                    {label}
                                    <div className="text-[10px] font-black opacity-30 tracking-widest">{val === 'true' ? 'Phím 1' : 'Phím 2'}</div>
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}

                          {/* Written / Fill */}
                          {(quizQuestions[quizIndex].type === 'written' || quizQuestions[quizIndex].type === 'fill') && (
                            <div className="space-y-6">
                              <div className="relative">
                                <input 
                                  autoFocus 
                                  placeholder="Nhập câu trả lời của bạn..." 
                                  value={userAnswer} 
                                  onChange={e => setUserAnswer(e.target.value)} 
                                  onKeyDown={e => e.key === 'Enter' && handleQuizAnswer(userAnswer)} 
                                  disabled={isChecking || quizFeedback}
                                  className={`w-full bg-[#121212] border-2 rounded-2xl p-6 text-xl font-bold outline-none transition-all ${
                                    quizFeedback 
                                      ? (quizFeedback.correct ? 'border-green-500 bg-green-500/5 text-green-400' : 'border-red-500 bg-red-500/5 text-red-400') 
                                      : 'border-gray-800 focus:border-indigo-500 shadow-inner shadow-black/40'
                                  }`} 
                                />
                                {quizFeedback && (
                                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                    {quizFeedback.correct ? (
                                      <CheckCircle className="w-8 h-8 text-green-500 animate-bounce" />
                                    ) : (
                                      <X className="w-8 h-8 text-red-500 animate-shake" />
                                    )}
                                  </div>
                                ) }
                              </div>

                              <button 
                                onClick={() => handleQuizAnswer(userAnswer)} 
                                disabled={isChecking || quizFeedback}
                                className={`w-full py-5 font-black rounded-2xl transition-all flex items-center justify-center gap-3 text-lg shadow-xl active:scale-95 ${
                                  quizFeedback 
                                    ? (quizFeedback.correct ? 'bg-green-600 shadow-green-900/40' : 'bg-red-600 shadow-red-900/40') 
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40'
                                } text-white`}
                              >
                                {isChecking ? (
                                  <><Loader2 className="w-6 h-6 animate-spin" /> Đang kiểm tra...</>
                                ) : quizFeedback ? (
                                  quizFeedback.correct ? 'CHÍNH XÁC!' : 'SAI MẤT RỒI!'
                                ) : (
                                  'KIỂM TRA'
                                )}
                              </button>
                              
                              {!quizFeedback && (
                                <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                                  Nhấn Enter để gửi câu trả lời
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Visual Feedback Overlays */}
                        <AnimatePresence>
                          {quizFeedback && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 1.5 }}
                              className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px]"
                            >
                              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl ${quizFeedback.correct ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}>
                                {quizFeedback.correct ? <CheckCircle className="w-16 h-16 text-white" /> : <X className="w-16 h-16 text-white" />}
                              </div>
                              {!quizFeedback.correct && (
                                <motion.div 
                                  initial={{ y: 20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  className="mt-6 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10"
                                >
                                  <p className="text-white text-sm font-bold">Đáp án đúng: <span className="text-green-400">{quizQuestions[quizIndex].answer}</span></p>
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </AnimatePresence>
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
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}} />
    </motion.div>
  );
}

function QuizHistoryChart({ data }) {
  const height = 150;
  const width = 500;
  const padding = 20;
  
  const maxValue = 100;
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.percentage / maxValue) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const areaPath = `${linePath} L ${points[points.length-1].x},${height-padding} L ${points[0].x},${height-padding} Z`;

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-auto overflow-visible">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = height - padding - (v / 100) * (height - padding * 2);
          return (
            <g key={v}>
              <line x1={padding} y1={y} x2={width-padding} y2={y} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="4 4" />
              <text x={0} y={y + 3} fontSize="8" fill="#4b5563" fontWeight="bold">{v}%</text>
            </g>
          );
        })}

        {/* Area */}
        <motion.path 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
          d={areaPath} fill="url(#areaGrad)" 
        />
        
        {/* Line */}
        <motion.path 
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
          d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
        />

        {/* Points */}
        {points.map((p, i) => (
          <motion.circle 
            key={i} 
            initial={{ r: 0 }} animate={{ r: 4 }} transition={{ delay: 1 + i * 0.1 }}
            cx={p.x} cy={p.y} fill="#1a1a1a" stroke="#6366f1" strokeWidth="2" 
          />
        ))}
      </svg>
    </div>
  );
}

function HistoryDashboard({ history }) {
  return (
    <>
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-3xl p-8 shadow-2xl w-full">
        <div className="flex items-center justify-between mb-8">
           <div>
             <h3 className="text-lg font-black text-white">Tiến trình học tập</h3>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sự thay đổi điểm số qua các lần kiểm tra</p>
           </div>
           <div className="text-right">
             <div className="text-3xl font-black text-indigo-400">
               {history.length > 0 ? `${Math.round(history.reduce((a,b)=>a+b.percentage,0)/history.length)}%` : '--'}
             </div>
             <div className="text-[9px] text-indigo-500/60 font-black uppercase tracking-wider">Tỉ lệ TB</div>
           </div>
        </div>
        
        {history.length > 1 ? (
          <QuizHistoryChart data={history} />
        ) : (
          <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl text-gray-600 gap-2">
            <Trophy className="w-6 h-6 opacity-20" />
            <span className="text-xs font-bold">Cần hoàn thành ít nhất 2 lần kiểm tra để vẽ đồ thị</span>
          </div>
        )}
      </div>

      <div className="space-y-4 w-full">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">Lịch sử làm bài gần đây</h4>
        {history.length > 0 ? (
          [...history].reverse().slice(0, 5).map((h, i) => (
            <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm ${
                  h.percentage >= 80 ? 'bg-green-500/20 text-green-500' :
                  h.percentage >= 50 ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-red-500/20 text-red-500'
                }`}>
                  {h.percentage}%
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-200">Đúng {h.score}/{h.total} câu</div>
                  <div className="text-[10px] text-gray-600 font-medium mt-0.5">{new Date(h.timestamp).toLocaleString('vi-VN')}</div>
                </div>
              </div>
              <div className="shrink-0 text-[10px] text-gray-600 font-black uppercase tracking-widest">#{history.length - i}</div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-gray-600 text-xs font-bold italic">Chưa có lịch sử làm bài nào cho học phần này.</div>
        )}
      </div>
    </>
  );
}

function StudyCard({ card, isFlipped, onFlip, onSwipe, onSpeak, isSpeaking }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0, 1, 1, 1, 0]);
  const bgColor = useTransform(x, [-100, 0, 100], ['#ef4444', '#1a1a1a', '#22c55e']);
  
  // Labels when dragging
  const labelOpacityRight = useTransform(x, [50, 100], [0, 1]);
  const labelOpacityLeft = useTransform(x, [-50, -100], [0, 1]);

  const handleDragEnd = (e, info) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  return (
    <motion.div 
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      onClick={onFlip}
      className="absolute inset-0 cursor-grab active:cursor-grabbing preserve-3d transition-transform duration-700"
    >
      <div className={`w-full h-full relative preserve-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Visual Labels for Dragging */}
        <motion.div style={{ opacity: labelOpacityRight }} className="absolute top-1/2 left-10 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-green-500 text-white px-6 py-3 rounded-2xl font-black text-2xl shadow-xl border-4 border-white/20 rotate-[-15deg]">NHỚ</div>
        </motion.div>
        <motion.div style={{ opacity: labelOpacityLeft }} className="absolute top-1/2 right-10 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black text-2xl shadow-xl border-4 border-white/20 rotate-[15deg]">QUÊN</div>
        </motion.div>

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
            {card.level && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md font-black border border-amber-500/40">{card.level}</span>}
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
