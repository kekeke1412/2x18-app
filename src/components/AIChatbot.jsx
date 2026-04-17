// src/components/AIChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minus, Sparkles, MessageCircle } from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { useApp } from '../context/AppContext';

export default function AIChatbot() {
  const { currentUser, myGrades, myTasks, calEvents, attendance } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Chào ${currentUser?.fullName || 'bạn'}! Tôi là 2X18 Bot. Tôi có thể giúp gì cho bạn hôm nay? 🚀` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      // Build context for AI
      const context = {
        userName: currentUser?.fullName,
        userRole: currentUser?.role,
        gpa: currentUser?.gpa,
        upcomingEvents: calEvents?.filter(e => new Date(e.date) >= new Date()).slice(0, 3),
        pendingTasks: myTasks?.filter(t => !t.done).slice(0, 3),
        recentAttendance: attendance?.slice(0, 3).map(s => `${s.title}: ${s.present?.includes(currentUser?.id) ? 'Có mặt' : 'Vắng'}`).join(', '),
      };

      const aiRes = await chatWithAI(userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', text: aiRes }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Xin lỗi, tôi gặp chút trục trặc. Bạn kiểm tra lại API Key nhé! 😅' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-20 z-50 w-12 h-12 bg-blue-600 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all group"
    >
      <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#121212]" />
    </button>
  );

  return (
    <div className={`fixed bottom-6 right-20 z-50 w-80 bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all overflow-hidden ${isMinimized ? 'h-14' : 'h-[450px]'}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-blue-600/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1">
              2X18 Bot <Sparkles className="w-3 h-3 text-blue-400" />
            </div>
            <div className="text-[10px] text-blue-400">Trực tuyến</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#121212]/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 px-3 py-2 rounded-2xl rounded-tl-none border border-gray-700 flex gap-1 items-center">
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-800 bg-[#1a1a1a]">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi tôi bất cứ điều gì..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
