// src/components/AIChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minus, Sparkles, MessageCircle, Trash2 } from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { useApp } from '../context/AppContext';

export default function AIChatbot() {
  const { currentUser, myGrades, myTasks, calEvents, attendance } = useApp();

  const firstName = currentUser?.fullName?.split(' ').filter(Boolean).slice(-1)[0] || 'bạn';

  const [isOpen,      setIsOpen]      = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages,    setMessages]    = useState([
    {
      role: 'assistant',
      text: `Chào ${firstName}! Mình là 2X18 Bot 🤖✨\nMình biết lịch, task và điểm danh của bạn — hỏi gì cũng được nhé!`,
    },
  ]);
  const [input,     setInput]     = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      // Build rich context from app state
      const context = {
        userName:         currentUser?.fullName,
        userRole:         currentUser?.role,
        upcomingEvents:   (calEvents || [])
          .filter(e => new Date(e.date) >= new Date())
          .slice(0, 3),
        pendingTasks:     (myTasks || [])
          .filter(t => !t.done)
          .slice(0, 5),
        recentAttendance: (attendance || [])
          .slice(0, 3)
          .map(s => `${s.sessionTitle || s.title || 'Buổi họp'}: ${(s.present || []).includes(currentUser?.id) ? 'Có mặt' : 'Vắng'}`)
          .join(', '),
      };

      // Pass previous conversation as history for multi-turn awareness
      // Gemini expects { role: 'user'|'model', parts: [{ text: '...' }] }
      // But we pass simple { role, text } to aiService which converts it
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10); // last 10 exchanges max

      const aiRes = await chatWithAI(userMsg, context, history);
      setMessages(prev => [...prev, { role: 'assistant', text: aiRes }]);
    } catch (err) {
      console.error('[AIChatbot]', err);
      let errMsg = 'Ối, mình gặp lỗi rồi 😅 Bạn thử lại nhé!';
      if (err.message === 'MISSING_API_KEY') {
        errMsg = 'Bạn chưa cấu hình Gemini API Key! Vui lòng vào mục Hồ sơ để thiết lập nhé 🔑';
      }
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: errMsg },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: `Xong! Mình đã xóa lịch sử trò chuyện 🗑️ Hỏi tiếp nào, ${firstName}!`,
    }]);
  };

  if (!isOpen) return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-20 z-50 w-12 h-12 bg-blue-600 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all group"
      title="Mở 2X18 Bot"
    >
      <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform"/>
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#121212]"/>
    </button>
  );

  return (
    <div className={`fixed bottom-6 right-20 z-50 w-80 bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
      isMinimized ? 'h-14' : 'h-[480px]'
    }`}>

      {/* ── Header ── */}
      <div className="px-3 py-2.5 border-b border-gray-800 flex items-center justify-between bg-blue-600/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Bot className="w-[18px] h-[18px] text-white"/>
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1">
              2X18 Bot <Sparkles className="w-3 h-3 text-blue-400"/>
            </div>
            <div className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
              Trực tuyến
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button
              onClick={clearChat}
              title="Xóa lịch sử"
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          )}
          <button
            onClick={() => setIsMinimized(v => !v)}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors">
            <Minus className="w-4 h-4"/>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-[#0f0f0f]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white"/>
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-[#1e1e1e] text-gray-200 rounded-tl-sm border border-gray-800'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white"/>
                </div>
                <div className="bg-[#1e1e1e] border border-gray-800 px-3 py-2.5 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"/>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]"/>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]"/>
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>

          {/* ── Suggested prompts (only when empty) ── */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-[#0f0f0f]">
              {[
                'Task của mình hôm nay?',
                'Lịch sắp tới?',
                'Cách nâng GPA?',
              ].map(prompt => (
                <button key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="text-[11px] text-blue-400 border border-blue-500/30 bg-blue-500/5 px-2.5 py-1 rounded-full hover:bg-blue-500/15 transition-colors">
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* ── Input ── */}
          <div className="p-3 border-t border-gray-800 bg-[#1a1a1a] shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Hỏi mình bất cứ điều gì..."
                className="flex-1 bg-[#111] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4"/>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
