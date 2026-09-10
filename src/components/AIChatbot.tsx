// @ts-nocheck
// src/components/AIChatbot.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot, X, Send, Minus, Sparkles, MessageCircle, Trash2,
  AlertCircle, Clock, BookOpen, Star, Maximize2, Minimize2,
  TrendingUp, AlertTriangle, Target, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { useApp } from '../context/AppContext';
import {
  useMembers, useTasks, useCalEvents, useAttendance,
  useContributions, useVocab, useUserVocab, useDocs,
  useSmeMap, useReports
} from '../hooks/useDomainQueries';

// ── Markdown Parser Cao Cấp Cho AIChatbot ──────────────────────────────────
// Hỗ trợ tiêu đề, danh sách, in đậm, khối trích dẫn, badge trạng thái và bảng đơn giản
function parseInline(text) {
  if (!text) return null;

  // Tách text theo mã inline code: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={pIdx} className="bg-[#2a2a2a] text-blue-300 px-1 py-0.5 rounded text-[12px] font-mono border border-gray-700">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Tách bold: **bold**
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        const inner = bPart.slice(2, -2);
        return <strong key={`${pIdx}-${bIdx}`} className="font-bold text-white tracking-wide">{inner}</strong>;
      }

      // Xử lý các huy hiệu trạng thái [QUÁ HẠN], [CẢNH BÁO], v.v.
      const badgeParts = bPart.split(/(\[[A-ZÀ-Ỹ0-9\s/+-]+\])/g);
      return badgeParts.map((tPart, tIdx) => {
        if (/^\[(QUÁ HẠN|KHẨN CẤP|CẢNH BÁO|TRƯỢT|NGUY CƠ)\]$/i.test(tPart)) {
          return (
            <span key={`${pIdx}-${bIdx}-${tIdx}`} className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {tPart.slice(1, -1)}
            </span>
          );
        }
        if (/^\[(ĐÃ XONG|HOÀN THÀNH|XUẤT SẮC|TỐT|ĐẠT)\]$/i.test(tPart)) {
          return (
            <span key={`${pIdx}-${bIdx}-${tIdx}`} className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
              {tPart.slice(1, -1)}
            </span>
          );
        }
        if (/^\[(MỤC TIÊU|ĐANG HỌC|HÀNH ĐỘNG|ƯU TIÊN)\]$/i.test(tPart)) {
          return (
            <span key={`${pIdx}-${bIdx}-${tIdx}`} className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {tPart.slice(1, -1)}
            </span>
          );
        }
        if (/^\[(CHÚ Ý|GẤP|HÔM NAY|SẮP TỚI)\]$/i.test(tPart)) {
          return (
            <span key={`${pIdx}-${bIdx}-${tIdx}`} className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {tPart.slice(1, -1)}
            </span>
          );
        }
        return <span key={`${pIdx}-${bIdx}-${tIdx}`}>{tPart}</span>;
      });
    });
  });
}

const MarkdownText = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-gray-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Tiêu đề H3 / H2 / H1
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-blue-300 text-[13px] uppercase tracking-wider mt-2.5 pb-0.5 border-b border-gray-800">
              {parseInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const content = trimmed.replace(/^#+\s*/, '');
          return (
            <h3 key={idx} className="font-black text-white text-[14px] mt-3 pb-1 border-b border-blue-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm inline-block" />
              {parseInline(content)}
            </h3>
          );
        }

        // Khối trích dẫn (Blockquote)
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="border-l-2 border-blue-500 bg-blue-500/10 px-2.5 py-1.5 my-1 text-xs text-blue-200 rounded-r-lg italic">
              {parseInline(trimmed.slice(2))}
            </div>
          );
        }

        // Danh sách gạch đầu dòng (•, -, *)
        if (/^[-*•]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-blue-400 mt-1 shrink-0 text-[10px]">●</span>
              <div className="flex-1 min-w-0">{parseInline(content)}</div>
            </div>
          );
        }

        // Danh sách có đánh số (1., 2., ...)
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-[11px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/25 w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                {numberedMatch[1]}
              </span>
              <div className="flex-1 min-w-0">{parseInline(numberedMatch[2])}</div>
            </div>
          );
        }

        // Bảng đơn giản (Table row chứa '|')
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
          const isDivider = cells.every(c => /^:?-+:?$/.test(c));
          if (isDivider) return <div key={idx} className="border-b border-gray-700 my-0.5" />;

          return (
            <div key={idx} className="grid grid-flow-col auto-cols-fr gap-1 bg-[#141414] px-2 py-1 rounded text-xs border border-gray-800 font-mono">
              {cells.map((cell, cIdx) => (
                <div key={cIdx} className="truncate">{parseInline(cell)}</div>
              ))}
            </div>
          );
        }

        // Đoạn văn thông thường
        return (
          <p key={idx} className="leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};

export default function AIChatbot() {
  const {
    currentUser, isCore, isSuperAdmin,
    myGrades, myGradesEnriched,
    grades: allGrades, activeMembers
  } = useApp();

  const isCoreUser = isCore || isSuperAdmin || currentUser?.role === 'core' || currentUser?.role === 'super_admin';

  // Domain queries
  const { data: members = [] } = useMembers();
  const { data: tasks = [] } = useTasks();
  const { data: calEvents = [] } = useCalEvents();
  const { data: attendance = [] } = useAttendance();
  const { data: contributions = {} } = useContributions();
  const { data: vocab = {} } = useVocab();
  const { data: userVocab = {} } = useUserVocab();
  const { data: docs = {} } = useDocs();
  const { data: smeMap = {} } = useSmeMap();
  const { data: reports = [] } = useReports();

  const firstName = currentUser?.fullName?.split(' ').filter(Boolean).slice(-1)[0] || 'bạn';

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  // Câu chào mừng tự động tùy biến theo vai trò
  const initialWelcome = useMemo(() => {
    if (isCoreUser) {
      return `Chào Core ${firstName}! Mình là 2X18 Core Bot 🤖👑\n\nMình được cấp quyền xem **toàn bộ dữ liệu** của các thành viên (Học lực, CPA, Task, Chuyên cần, SME).\nBạn có thể yêu cầu mình **đánh giá sức khỏe nhóm**, **tìm thành viên cần hỗ trợ**, hoặc **phân bổ công việc & SME**!`;
    }
    return `Chào ${firstName}! Mình là 2X18 Bot 🤖✨\n\nMình là Cố vấn học tập riêng của bạn — được nạp đầy đủ **bảng điểm**, **deadline task** và **chuyên cần** của bạn.\nHỏi mình về **mục tiêu điểm thi CK**, **task gấp hôm nay**, hay **chiến lược ôn thi** nhé!`;
  }, [isCoreUser, firstName]);

  const [messages, setMessages] = useState([{ role: 'assistant', text: initialWelcome }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Cập nhật câu chào đầu tiên nếu role thay đổi khi mới vào app
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', text: initialWelcome }];
      }
      return prev;
    });
  }, [initialWelcome]);

  // Tự cuộn xuống dưới khi có tin nhắn mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus ô nhập khi mở chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (overridePrompt = null) => {
    const userMsg = (overridePrompt || input).trim();
    if (!userMsg || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const myUserTasks = tasks.filter(t => t.userId === currentUser?.id || t.assignees?.includes(currentUser?.id));
      const userPresentCount = attendance.filter(s => (s.present || []).includes(currentUser?.id)).length;
      const userAttRate = attendance?.length ? Math.round((userPresentCount / attendance.length) * 100) : 100;

      let context = {};

      if (isCoreUser) {
        // ── CORE DATA PAYLOAD (Bao quát toàn bộ dữ liệu mọi người) ──
        context = {
          isCore: true,
          currentUser,
          members: members.length > 0 ? members : activeMembers,
          allGrades: allGrades || {},
          allTasks: tasks || [],
          attendance: attendance || [],
          contributions: contributions || {},
          smeMap: smeMap || {},
          reports: reports || [],
          calEvents: calEvents || [],
          docs: docs || {},
          // Dữ liệu cá nhân của chính người Core để hỗ trợ khi Core hỏi về mình
          myGradesEnriched,
          rawGrades: myGrades,
          myTasks: myUserTasks,
        };
      } else {
        // ── MEMBER DATA PAYLOAD (Bảo mật tuyệt đối, CHỈ dữ liệu cá nhân) ──
        context = {
          isCore: false,
          currentUser,
          mssv: currentUser?.mssv,
          personalInfo: {
            gender: currentUser?.gender,
            dob: currentUser?.dob,
            pob: currentUser?.pob,
            phone: currentUser?.phone,
          },
          points: contributions[currentUser?.id] || 0,
          upcomingEvents: (calEvents || [])
            .filter(e => new Date(e.date) >= new Date())
            .slice(0, 5),
          myTasks: myUserTasks,
          attendanceRate: userAttRate,
          attendanceSummary: {
            attended: userPresentCount,
            total: attendance.length
          },
          vocabStats: {
            totalSets: Object.keys(vocab || {}).length,
            learnedWords: Object.values(userVocab[currentUser?.id] || {}).flat().length
          },
          detailedGrades: myGradesEnriched,
          rawGrades: myGrades,
          smeMap: smeMap || {},
          allDocuments: docs
        };
      }

      // Giữ tối đa 10 lượt hội thoại gần nhất
      const history = messages
        .slice(1)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10);

      const aiRes = await chatWithAI(userMsg, context, history);
      setMessages(prev => [...prev, { role: 'assistant', text: aiRes }]);
    } catch (err) {
      console.error('[AIChatbot Error]', err);
      let errMsg = 'Ối, mình gặp sự cố kết nối với hệ thống AI rồi 😅 Bạn thử lại sau giây lát nhé!';
      if (err.message === 'MISSING_API_KEY') {
        errMsg = 'Hệ thống AI chưa được cấu hình API Key. Vui lòng liên hệ Admin 🔑';
        setHasApiKey(false);
      }
      setMessages(prev => [...prev, { role: 'assistant', text: errMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: `Xong! Mình đã làm mới lịch sử trò chuyện 🗑️ Tiếp tục nào, ${firstName}!`,
    }]);
  };

  // Nút mở chat ở góc phải
  if (!isOpen) return (
    <button
      onClick={() => setIsOpen(true)}
      className={`fixed bottom-8 right-6 md:right-20 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all group active:scale-95 ${
        isCoreUser
          ? 'bg-gradient-to-tr from-purple-600 to-blue-600 shadow-[0_10px_35px_-8px_rgba(147,51,234,0.5)]'
          : 'bg-blue-600 shadow-[0_10px_35px_-8px_rgba(37,99,235,0.5)]'
      }`}
      title={isCoreUser ? 'Mở 2X18 Core Bot' : 'Mở 2X18 Bot'}
    >
      <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121212] bg-green-400" />
    </button>
  );

  // Bộ Quick Actions phân quyền thông minh
  const quickActions = isCoreUser
    ? [
        { id: 'health', icon: <TrendingUp className="w-3.5 h-3.5 text-blue-400" />, label: '📊 Sức khỏe nhóm', prompt: 'Hãy lập báo cáo tổng quan sức khỏe nhóm 2X18: CPA trung bình, tỉ lệ task trễ và tình hình chuyên cần?' },
        { id: 'risk', icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />, label: '⚠️ Cảnh báo rủi ro', prompt: 'Chỉ ra các thành viên có nguy cơ học tập (CPA < 2.5 hoặc nợ môn) và các task đang quá hạn cần giải quyết gấp?' },
        { id: 'assign', icon: <Target className="w-3.5 h-3.5 text-purple-400" />, label: '🎯 Phân bổ & SME', prompt: 'Dựa vào khối lượng task và thế mạnh SME môn học, hãy gợi ý phân bổ lại công việc và đề xuất buổi phụ đạo?' },
        { id: 'my_grades', icon: <BookOpen className="w-3.5 h-3.5 text-green-400" />, label: '👤 Cá nhân tôi', prompt: 'Phân tích tình hình học tập và điểm số các môn của riêng cá nhân tôi!' }
      ]
    : [
        { id: 'final_target', icon: <Target className="w-3.5 h-3.5 text-blue-400" />, label: '🎯 Mục tiêu thi CK', prompt: 'Dựa vào điểm CC và GK hiện có, hãy tính cho mình điểm thi cuối kỳ (CK) cần đạt ở từng môn để đạt B, B+ hoặc A!' },
        { id: 'urgent_tasks', icon: <Clock className="w-3.5 h-3.5 text-amber-400" />, label: '⏳ Task ưu tiên', prompt: 'Kiểm tra xem mình có task nào đang quá hạn hoặc cần hoàn thành gấp hôm nay không? Gợi ý thứ tự giải quyết?' },
        { id: 'gpa_analysis', icon: <BookOpen className="w-3.5 h-3.5 text-green-400" />, label: '📊 Phân tích GPA', prompt: 'Phân tích bảng điểm và CPA của mình: đâu là môn thế mạnh và môn nào có nguy cơ kéo điểm xuống?' },
        { id: 'study_strategy', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />, label: '💡 Kế hoạch ôn tập', prompt: 'Cho mình lời khuyên cụ thể để cải thiện kết quả học tập kỳ này và mình nên liên hệ SME nào khi cần giúp đỡ?' }
      ];

  return (
    <div
      className={`fixed bottom-8 right-6 md:right-20 z-50 bg-[#141414]/95 border border-gray-800/80 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col transition-all duration-300 backdrop-blur-2xl overflow-hidden ${
        isMinimized
          ? 'h-16 w-[320px]'
          : isExpanded
            ? 'w-[calc(100vw-32px)] max-w-[620px] h-[640px] max-h-[88vh]'
            : 'w-[calc(100vw-48px)] max-w-[360px] h-[540px] max-h-[82vh]'
      }`}
    >
      {/* ── Header ── */}
      <div className={`px-3.5 py-2.5 border-b border-gray-800 flex items-center justify-between shrink-0 ${
        isCoreUser ? 'bg-purple-950/20' : 'bg-blue-950/20'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isCoreUser ? 'bg-gradient-to-tr from-purple-600 to-blue-600' : 'bg-blue-600'
          }`}>
            <Bot className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{isCoreUser ? '2X18 Core Bot' : '2X18 Bot'}</span>
              {isCoreUser ? (
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold flex items-center gap-0.5">
                  👑 CORE
                </span>
              ) : (
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold flex items-center gap-0.5">
                  🎓 COACH
                </span>
              )}
            </div>
            <div className="text-[10px] flex items-center gap-1 font-semibold text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-green-400" />
              {isCoreUser ? 'Đang truy cập dữ liệu toàn đoàn' : 'Dữ liệu học tập cá nhân'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isMinimized && (
            <>
              <button
                onClick={() => setIsExpanded(v => !v)}
                title={isExpanded ? 'Thu nhỏ khung' : 'Mở rộng khung nhìn'}
                className="p-1.5 hover:bg-gray-800/80 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={clearChat}
                title="Làm mới hội thoại"
                className="p-1.5 hover:bg-gray-800/80 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setIsMinimized(v => !v)}
            className="p-1.5 hover:bg-gray-800/80 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Messages Container ── */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar bg-[#0d0d0d]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5 ${
                    isCoreUser ? 'bg-purple-600' : 'bg-blue-600'
                  }`}>
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm font-medium shadow-md shadow-blue-600/20'
                      : 'bg-[#1a1a1a] text-gray-200 rounded-tl-sm border border-gray-800/90 shadow-sm'
                  }`}
                >
                  <MarkdownText text={m.text} />
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5 ${
                  isCoreUser ? 'bg-purple-600' : 'bg-blue-600'
                }`}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-[#1a1a1a] border border-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  <span className="text-[11px] text-gray-400 ml-1">Đang phân tích dữ liệu...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── Quick Action Buttons ── */}
          <div className="px-3 py-2 flex gap-1.5 bg-[#111111] border-t border-gray-800/60 overflow-x-auto no-scrollbar shrink-0">
            {quickActions.map(act => (
              <button
                key={act.id}
                onClick={() => { handleSend(act.prompt); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#282828] border border-gray-800 hover:border-gray-700 rounded-xl text-[11px] font-semibold text-gray-300 hover:text-white whitespace-nowrap transition-all active:scale-95"
              >
                {act.icon}
                <span>{act.label}</span>
              </button>
            ))}
          </div>

          {/* ── Input Form ── */}
          <div className="p-3 border-t border-gray-800 bg-[#161616] shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isCoreUser ? "Hỏi về học lực nhóm, task hoặc cá nhân..." : "Hỏi về mục tiêu điểm, task hôm nay..."}
                className="flex-1 bg-[#0c0c0c] border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 ${
                  isCoreUser ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
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
