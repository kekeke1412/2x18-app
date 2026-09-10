// @ts-nocheck
// src/components/AIChatbot.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot, X, Send, Minus, Sparkles, MessageCircle, Trash2,
  AlertCircle, Clock, BookOpen, Star, Maximize2, Minimize2,
  TrendingUp, AlertTriangle, Target, ShieldCheck, CheckCircle2,
  ChevronDown, ChevronUp, Zap, FileText, Award
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { useApp } from '../context/AppContext';
import {
  useMembers, useTasks, useCalEvents, useAttendance,
  useContributions, useVocab, useUserVocab, useDocs,
  useSmeMap, useReports
} from '../hooks/useDomainQueries';

// ── Markdown Parser Cao Cấp Cho AIChatbot ──────────────────────────────────
function parseInline(text) {
  if (!text) return null;

  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={pIdx} className="bg-[#2a2a2a] text-blue-300 px-1 py-0.5 rounded text-[12px] font-mono border border-gray-700">
          {part.slice(1, -1)}
        </code>
      );
    }

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
        if (/^\[(MỤC TIÊU|ĐANG HỌC|HÀNH ĐỘNG|ƯU TIÊN|FIRST PRINCIPLES)\]$/i.test(tPart)) {
          return (
            <span key={`${pIdx}-${bIdx}-${tIdx}`} className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {tPart.slice(1, -1)}
            </span>
          );
        }
        if (/^\[(CHÚ Ý|GẤP|HÔM NAY|SẮP TỚI|VẾT GÃY)\]$/i.test(tPart)) {
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

        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="border-l-2 border-blue-500 bg-blue-500/10 px-2.5 py-1.5 my-1 text-xs text-blue-200 rounded-r-lg italic">
              {parseInline(trimmed.slice(2))}
            </div>
          );
        }

        if (/^[-*•]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-blue-400 mt-1 shrink-0 text-[10px]">●</span>
              <div className="flex-1 min-w-0">{parseInline(content)}</div>
            </div>
          );
        }

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

        return (
          <p key={idx} className="leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};

// ── Khối Chuỗi Suy Luận (Chain-of-Thought) cho DeepSeek-V4-Pro ─────────────
const ReasoningBox = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!reasoning) return null;

  return (
    <div className="mb-2.5 rounded-xl border border-purple-500/30 bg-purple-950/20 text-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-purple-300 font-semibold hover:bg-purple-900/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>Chuỗi suy luận (Deep Reasoning CoT)</span>
        </span>
        <span className="text-[10px] text-purple-400/80 flex items-center gap-0.5">
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isOpen ? 'Thu gọn' : 'Xem chi tiết'}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 py-2.5 border-t border-purple-500/20 text-gray-300 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto custom-scrollbar bg-black/40">
          {reasoning}
        </div>
      )}
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

  // Bộ chọn mô hình kép: auto, deepseek-v4-pro, deepseek-v4-flash
  const [selectedModelMode, setSelectedModelMode] = useState('auto');

  // Câu chào mừng tự động tùy biến
  const initialWelcome = useMemo(() => {
    if (isCoreUser) {
      return `Chào Core ${firstName}! Mình là 2X18 Core Advisor (Hệ thống định tuyến kép DeepSeek-V4-Flash & V4-Pro) 🤖👑\n\nMình được tích hợp **tri thức phòng sạch NEC/HUS**, **toán lý Boas & Griffiths**, **bán dẫn Sze**, và **học bổng Đài Loan (NYCU, NTHU, NTU)**.\n\nBạn có thể hỏi về **sức khỏe nhóm**, **chẩn đoán phòng sạch**, **giải phẫu bài báo**, hay **chiến lược học bổng**!`;
    }
    return `Chào ${firstName}! Mình là 2X18 Copilot (Dual-Model DeepSeek-V4) 🤖✨\n\nMình là Cố vấn học thuật cá nhân của bạn — sẵn sàng **rà soát bài tập bắt lỗi tư duy**, **tính điểm thi CK**, **hỗ trợ thông số lab phòng sạch** và **lập lộ trình du học Đài Loan**!`;
  }, [isCoreUser, firstName]);

  const [messages, setMessages] = useState([{ role: 'assistant', text: initialWelcome }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', text: initialWelcome }];
      }
      return prev;
    });
  }, [initialWelcome]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
          myGradesEnriched,
          rawGrades: myGrades,
          myTasks: myUserTasks,
        };
      } else {
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

      const history = messages
        .slice(1)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10);

      const aiRes = await chatWithAI(userMsg, context, history, selectedModelMode);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: aiRes.text,
          reasoning: aiRes.reasoning,
          modelUsed: aiRes.modelUsed
        }
      ]);
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

  if (!isOpen) return (
    <button
      onClick={() => setIsOpen(true)}
      className={`fixed bottom-8 right-6 md:right-20 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white hover:scale-110 transition-all group active:scale-95 ${
        isCoreUser
          ? 'bg-gradient-to-tr from-purple-600 to-blue-600 shadow-[0_10px_35px_-8px_rgba(147,51,234,0.5)]'
          : 'bg-blue-600 shadow-[0_10px_35px_-8px_rgba(37,99,235,0.5)]'
      }`}
      title={isCoreUser ? 'Mở 2X18 Core Advisor' : 'Mở 2X18 Copilot'}
    >
      <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121212] bg-green-400" />
    </button>
  );

  // 4 Module Tác chiến Chuyên Sâu
  const tacticalModules = [
    {
      id: 'cleanroom',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      label: '🔬 Phòng Sạch & Recipe',
      prompt: 'Phân tích Recipe Sputtering: buồng chân không nền 2.5x10^-6 Torr, Ar 25 sccm, công suất RF 150W lắng đọng màng SiO2 bị đục và điện trở cao. Hãy chẩn đoán nguyên nhân và cách khắc phục theo quy trình NEC/HUS?'
    },
    {
      id: 'academic',
      icon: <Target className="w-3.5 h-3.5 text-blue-400" />,
      label: '📐 Toán Lý & Bắt Lỗi',
      prompt: 'Rà soát bài giải phương trình truyền nhiệt PDEs theo phương pháp tách biến (Boas) và định lý thặng dư tích phân đường phức. Hãy chỉ ra các vết gãy tư duy thường gặp!'
    },
    {
      id: 'paper',
      icon: <FileText className="w-3.5 h-3.5 text-green-400" />,
      label: '📄 Giải Phẫu Paper',
      prompt: 'Hãy hướng dẫn cách giải phẫu một bài báo bán dẫn (IEEE TED/APL) thành Fabrication Blueprint: Vật liệu & Đế, Công đoạn nút thắt, Thông số Ion/Ioff và khả năng tái lập tại Lab HUS vs TSRI Đài Loan?'
    },
    {
      id: 'taiwan',
      icon: <Award className="w-3.5 h-3.5 text-purple-400" />,
      label: '🎓 Du Học Đài Loan',
      prompt: 'Phân tích tiêu chí học bổng và các hướng nghiên cứu mũi nhọn của NYCU (ICST), NTHU (CoSR) và NTU (GSAT) cho sinh viên 2X18 có định hướng ngành bán dẫn?'
    }
  ];

  // Quick Action thông thường theo vai trò
  const roleActions = isCoreUser
    ? [
        { id: 'health', icon: <TrendingUp className="w-3 h-3 text-blue-400" />, label: '📊 Sức khỏe nhóm', prompt: 'Hãy lập báo cáo tổng quan sức khỏe nhóm 2X18: CPA trung bình, tỉ lệ task trễ và tình hình chuyên cần?' },
        { id: 'risk', icon: <AlertTriangle className="w-3 h-3 text-red-400" />, label: '⚠️ Cảnh báo rủi ro', prompt: 'Chỉ ra các thành viên có nguy cơ học tập (CPA < 2.5 hoặc nợ môn) và các task đang quá hạn cần giải quyết gấp?' },
        { id: 'assign', icon: <Target className="w-3 h-3 text-purple-400" />, label: '🎯 Phân bổ & SME', prompt: 'Dựa vào khối lượng task và thế mạnh SME môn học, hãy gợi ý phân bổ lại công việc và đề xuất buổi phụ đạo?' }
      ]
    : [
        { id: 'final_target', icon: <Target className="w-3 h-3 text-blue-400" />, label: '🎯 Điểm thi CK cần đạt', prompt: 'Dựa vào điểm CC và GK hiện có, hãy tính cho mình điểm thi cuối kỳ (CK) cần đạt ở từng môn để đạt B, B+ hoặc A!' },
        { id: 'urgent_tasks', icon: <Clock className="w-3 h-3 text-amber-400" />, label: '⏳ Task gấp hôm nay', prompt: 'Kiểm tra xem mình có task nào đang quá hạn hoặc cần hoàn thành gấp hôm nay không? Gợi ý thứ tự giải quyết?' },
        { id: 'gpa_analysis', icon: <BookOpen className="w-3 h-3 text-green-400" />, label: '📊 Phân tích GPA', prompt: 'Phân tích bảng điểm và CPA của mình: đâu là môn thế mạnh và môn nào có nguy cơ kéo điểm xuống?' }
      ];

  return (
    <div
      className={`fixed bottom-8 right-6 md:right-20 z-50 bg-[#121212]/95 border border-gray-800/80 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col transition-all duration-300 backdrop-blur-2xl overflow-hidden ${
        isMinimized
          ? 'h-16 w-[320px]'
          : isExpanded
            ? 'w-[calc(100vw-32px)] max-w-[640px] h-[660px] max-h-[90vh]'
            : 'w-[calc(100vw-48px)] max-w-[360px] h-[550px] max-h-[82vh]'
      }`}
    >
      {/* ── Header ── */}
      <div className={`px-3.5 py-2.5 border-b border-gray-800 flex items-center justify-between shrink-0 ${
        isCoreUser ? 'bg-purple-950/25' : 'bg-blue-950/25'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            isCoreUser ? 'bg-gradient-to-tr from-purple-600 to-blue-600' : 'bg-blue-600'
          }`}>
            <Bot className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{isCoreUser ? '2X18 Core Advisor' : '2X18 Copilot'}</span>
              {isCoreUser ? (
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold">
                  👑 CORE
                </span>
              ) : (
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                  🎓 COPILOT
                </span>
              )}
            </div>
            <div className="text-[10px] flex items-center gap-1 font-semibold text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-green-400" />
              {isCoreUser ? 'Đang truy cập toàn đoàn 16 thành viên' : 'Dữ liệu học tập cá nhân'}
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
          {/* ── Model Routing Selector Bar ── */}
          <div className="px-3 py-1.5 bg-[#171717] border-b border-gray-800/70 flex items-center justify-between text-[11px] shrink-0">
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" /> Định tuyến mô hình:
            </span>
            <div className="flex items-center gap-1 bg-[#0e0e0e] p-0.5 rounded-lg border border-gray-800">
              <button
                onClick={() => setSelectedModelMode('auto')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  selectedModelMode === 'auto'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Tự động nhận diện câu hỏi để điều hướng"
              >
                Auto ⚡
              </button>
              <button
                onClick={() => setSelectedModelMode('deepseek-v4-flash')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  selectedModelMode === 'deepseek-v4-flash'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="deepseek-v4-flash: Tốc độ cao, tối ưu tiến độ & học bổng"
              >
                v4-flash
              </button>
              <button
                onClick={() => setSelectedModelMode('deepseek-v4-pro')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  selectedModelMode === 'deepseek-v4-pro'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="deepseek-v4-pro: Chuỗi suy luận CoT chuyên sâu Toán lý & Phòng sạch"
              >
                v4-pro 🧠
              </button>
            </div>
          </div>

          {/* ── Messages Container ── */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar bg-[#0a0a0a]">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1 pl-1">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      isCoreUser ? 'bg-purple-600' : 'bg-blue-600'
                    }`}>
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      {isCoreUser ? '2X18 Core Advisor' : '2X18 Copilot'}
                    </span>
                    {m.modelUsed && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                        m.modelUsed.includes('pro') || m.modelUsed.includes('reasoner')
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {m.modelUsed.includes('pro') || m.modelUsed.includes('reasoner') ? '🧠 v4-pro' : '⚡ v4-flash'}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm font-medium shadow-md shadow-blue-600/20'
                      : 'bg-[#181818] text-gray-200 rounded-tl-sm border border-gray-800/90 shadow-sm'
                  }`}
                >
                  {/* Hiển thị chuỗi suy luận CoT nếu có */}
                  {m.reasoning && <ReasoningBox reasoning={m.reasoning} />}

                  <MarkdownText text={m.text} />
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1 pl-1">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                    isCoreUser ? 'bg-purple-600' : 'bg-blue-600'
                  }`}>
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Đang suy luận...</span>
                </div>
                <div className="bg-[#181818] border border-gray-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  <span className="text-[11px] text-gray-400 ml-1">Đang xử lý dữ liệu qua DeepSeek...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── Bộ 4 Module Tác Chiến & Quick Actions ── */}
          <div className="px-3 py-1.5 bg-[#111111] border-t border-gray-800/70 overflow-x-auto no-scrollbar shrink-0 flex flex-col gap-1.5">
            {/* Hàng 1: 4 Module chuyên sâu */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {tacticalModules.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSend(m.prompt)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 hover:border-gray-700 rounded-lg text-[10.5px] font-semibold text-gray-300 hover:text-white whitespace-nowrap transition-all active:scale-95"
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Hàng 2: Quick prompts theo vai trò */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {roleActions.map(act => (
                <button
                  key={act.id}
                  onClick={() => handleSend(act.prompt)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-[#151515] hover:bg-[#222222] border border-gray-800/80 rounded-md text-[10px] text-gray-400 hover:text-gray-200 whitespace-nowrap transition-all"
                >
                  {act.icon}
                  <span>{act.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Input Form ── */}
          <div className="p-3 border-t border-gray-800 bg-[#141414] shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isCoreUser ? "Hỏi về lab phòng sạch, giải phẫu bài báo, học bổng Đài Loan, toán lý..." : "Hỏi về bài tập, recipe phòng sạch, điểm thi CK, du học..."}
                className="flex-1 bg-[#090909] border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
