import React, { useState, useRef, useEffect, useMemo, useId, useCallback } from 'react';
import {
  Bot,
  X,
  Send,
  Minus,
  Sparkles,
  Trash2,
  Clock,
  BookOpen,
  Maximize2,
  Minimize2,
  TrendingUp,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
  Award,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Plus,
  Search,
  History,
  Square,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ref, onValue, set, remove } from 'firebase/database';
import { auth, db } from '../firebase';
import { chatWithAI } from '../services/aiService';
import { useApp } from '../context/AppContext';
import {
  useMembers,
  useTasks,
  useCalEvents,
  useAttendance,
  useContributions,
  useVocab,
  useUserVocab,
  useDocs,
  useSmeMap,
  useReports,
} from '../hooks/useDomainQueries';
import { isImeComposing, localDateStr, safeExternalUrl } from '../utils/stringUtils';
import {
  safeSetHTML,
  renderLatexString,
  performAccessibleCopy,
} from '../utils/sanitizeHtml';

const MAX_INPUT_LENGTH = 4000;
const MIN_SEND_INTERVAL_MS = 1200;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning?: string;
  modelUsed?: string;
  feedback?: 'like' | 'dislike' | null;
  createdAt: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

// ── Safe KaTeX Math Component (Sanitized via safeSetHTML) ──────────────────
function SafeMathSpan({ latex, displayMode = false }: { latex: string; displayMode?: boolean }) {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const html = renderLatexString(latex, displayMode);
    void safeSetHTML(containerRef.current, html);
  }, [latex, displayMode]);

  return (
    <span
      ref={containerRef}
      className={displayMode ? 'block my-2 overflow-x-auto py-1 text-center' : 'inline-block mx-0.5'}
    />
  );
}

// ── Syntax-Highlighted Code Block with Accessible Copy Button ──────────────
function tokenizeCodeLine(line: string) {
  const tokenRegex =
    /(\/\/.*$|#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|try|catch|class|interface|type|def|print|np|plt|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;
  const parts = line.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('//') || part.startsWith('#')) {
      return (
        <span key={idx} className="text-[#9AA0A6] italic">
          {part}
        </span>
      );
    }
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("'") && part.endsWith("'")) ||
      (part.startsWith('`') && part.endsWith('`'))
    ) {
      return (
        <span key={idx} className="text-[#81C995]">
          {part}
        </span>
      );
    }
    if (/^\d+(?:\.\d+)?$/.test(part)) {
      return (
        <span key={idx} className="text-[#FDD663]">
          {part}
        </span>
      );
    }
    if (
      /^(const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|try|catch|class|interface|type|def|print|np|plt|true|false|null|undefined)$/.test(
        part
      )
    ) {
      return (
        <span key={idx} className="text-[#8AB4F8] font-semibold">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const snippetId = useId().replace(/:/g, '');
  const [copiedIcon, setCopiedIcon] = useState(false);

  const handleCopyClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const ok = await performAccessibleCopy(e.currentTarget, code);
    if (ok) {
      setCopiedIcon(true);
      setTimeout(() => setCopiedIcon(false), 2000);
    }
  };

  return (
    <div className="copyable my-2.5 rounded-2xl overflow-hidden border border-[var(--border-default)] bg-[#202124] text-[#E8EAED] shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#303134] border-b border-white/10 text-[11px]">
        <span className="font-mono font-bold text-[#8AB4F8] uppercase">
          {language || 'code'}
        </span>
        <span className="copy">
          <button
            type="button"
            className="copy-button"
            {...({ command: '--copy', commandfor: `code-${snippetId}` } as any)}
            aria-label={`Sao chép đoạn mã ${language || 'code'}`}
            onClick={handleCopyClick}
          >
            {copiedIcon ? (
              <Check className="w-3.5 h-3.5 text-[#34A853]" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>Sao chép</span>
          </button>
          <span className="tip" role="status" />
        </span>
      </div>
      <pre
        tabIndex={0}
        className="p-3.5 pr-12 text-xs font-mono leading-relaxed overflow-x-auto custom-scrollbar"
      >
        <code id={`code-${snippetId}`}>
          {code.split('\n').map((line, i) => (
            <div key={i}>{tokenizeCodeLine(line)}</div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// ── Inline Markdown + LaTeX + Status Badge Parser ──────────────────────────
function parseInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline code (`...`) or inline math ($...$)
  const tokens = text.split(/(`[^`]+`|\$[^$\n]+\$)/g);

  return tokens.map((part, pIdx) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={pIdx}
          className="bg-[var(--bg-subtle)] text-[#4285F4] px-1.5 py-0.5 rounded-md text-[12px] font-mono border border-[var(--border-default)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <SafeMathSpan key={pIdx} latex={part.slice(1, -1)} displayMode={false} />;
    }

    // Markdown links [label](url)
    const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
    return linkParts.map((lPart, lIdx) => {
      const linkMatch = lPart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const safeHref = safeExternalUrl(linkMatch[2]);
        if (safeHref) {
          return (
            <a
              key={`${pIdx}-${lIdx}`}
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4285F4] underline font-semibold hover:opacity-80"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return <span key={`${pIdx}-${lIdx}`}>{linkMatch[1]}</span>;
      }

      const boldParts = lPart.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return (
            <strong
              key={`${pIdx}-${lIdx}-${bIdx}`}
              className="font-extrabold text-[var(--text-primary)]"
            >
              {bPart.slice(2, -2)}
            </strong>
          );
        }

        const badgeParts = bPart.split(/(\[[A-ZÀ-Ỹ0-9\s/+-]+\])/g);
        return badgeParts.map((tPart, tIdx) => {
          if (/^\[(QUÁ HẠN|KHẨN CẤP|CẢNH BÁO|TRƯỢT|NGUY CƠ)\]$/i.test(tPart)) {
            return (
              <span key={`${pIdx}-${lIdx}-${bIdx}-${tIdx}`} className="badge badge-red mx-0.5">
                {tPart.slice(1, -1)}
              </span>
            );
          }
          if (/^\[(ĐÃ XONG|HOÀN THÀNH|XUẤT SẮC|TỐT|ĐẠT)\]$/i.test(tPart)) {
            return (
              <span key={`${pIdx}-${lIdx}-${bIdx}-${tIdx}`} className="badge badge-green mx-0.5">
                {tPart.slice(1, -1)}
              </span>
            );
          }
          if (/^\[(MỤC TIÊU|ĐANG HỌC|HÀNH ĐỘNG|ƯU TIÊN|FIRST PRINCIPLES)\]$/i.test(tPart)) {
            return (
              <span key={`${pIdx}-${lIdx}-${bIdx}-${tIdx}`} className="badge badge-blue mx-0.5">
                {tPart.slice(1, -1)}
              </span>
            );
          }
          if (/^\[(CHÚ Ý|GẤP|HÔM NAY|SẮP TỚI|VẾT GÃY)\]$/i.test(tPart)) {
            return (
              <span key={`${pIdx}-${lIdx}-${bIdx}-${tIdx}`} className="badge badge-yellow mx-0.5">
                {tPart.slice(1, -1)}
              </span>
            );
          }
          return <span key={`${pIdx}-${lIdx}-${bIdx}-${tIdx}`}>{tPart}</span>;
        });
      });
    });
  });
}

// Extract follow-up suggestions ([GỢI Ý]: q1 | q2 | q3) from the end of AI response
function extractFollowUpSuggestions(rawText: string): {
  cleanText: string;
  suggestions: string[];
} {
  if (!rawText) return { cleanText: '', suggestions: [] };
  const lines = rawText.split('\n');
  const suggestions: string[] = [];
  const keptLines: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(/^\[GỢI Ý\]:\s*(.+)$/i);
    if (match) {
      match[1]
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(s => suggestions.push(s));
    } else {
      keptLines.push(line);
    }
  }

  return {
    cleanText: keptLines.join('\n').trim(),
    suggestions: suggestions.slice(0, 3),
  };
}

// ── Rich Block Markdown Renderer (Code Blocks, Display Math, Tables, Lists) ─
function MarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;

  // Split by fenced code blocks ```lang ... ``` or display math $$ ... $$
  const segments = text.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-[var(--text-primary)]">
      {segments.map((seg, sIdx) => {
        if (!seg) return null;

        if (seg.startsWith('```') && seg.endsWith('```')) {
          const inner = seg.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const lang = firstNewline !== -1 ? inner.slice(0, firstNewline).trim() : '';
          const code = firstNewline !== -1 ? inner.slice(firstNewline + 1) : inner;
          return <CodeBlock key={sIdx} language={lang} code={code.replace(/\n$/, '')} />;
        }

        if (seg.startsWith('$$') && seg.endsWith('$$')) {
          return <SafeMathSpan key={sIdx} latex={seg.slice(2, -2)} displayMode={true} />;
        }

        const lines = seg.split('\n');
        const renderedBlocks: React.ReactNode[] = [];
        let tableBuffer: string[][] = [];

        const flushTable = (keyPrefix: string) => {
          if (!tableBuffer.length) return;
          const rows = tableBuffer;
          tableBuffer = [];
          const header = rows[0];
          const body = rows.slice(1);
          renderedBlocks.push(
            <div
              key={keyPrefix}
              className="my-2 overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)]"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[#4285F4]/10">
                    {header.map((cell, cIdx) => (
                      <th key={cIdx} className="px-3 py-2 font-extrabold text-[var(--text-primary)]">
                        {parseInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {body.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[var(--bg-surface)]/50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[var(--text-secondary)]">
                          {parseInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        };

        lines.forEach((line, idx) => {
          const trimmed = line.trim();

          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const cells = trimmed
              .split('|')
              .map(c => c.trim())
              .filter((_, i, arr) => i > 0 && i < arr.length - 1);
            const isDivider = cells.every(c => /^:?-+:?$/.test(c));
            if (!isDivider && cells.length > 0) {
              tableBuffer.push(cells);
            }
            return;
          } else {
            flushTable(`tbl-${sIdx}-${idx}`);
          }

          if (!trimmed) {
            renderedBlocks.push(<div key={`${sIdx}-${idx}`} className="h-1" />);
            return;
          }

          if (trimmed.startsWith('### ')) {
            renderedBlocks.push(
              <h4
                key={`${sIdx}-${idx}`}
                className="font-extrabold text-[#4285F4] text-xs uppercase tracking-wider mt-3 pb-1 border-b border-[var(--border-default)]"
              >
                {parseInline(trimmed.slice(4))}
              </h4>
            );
            return;
          }

          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            const content = trimmed.replace(/^#+\s*/, '');
            renderedBlocks.push(
              <h3
                key={`${sIdx}-${idx}`}
                className="font-black text-[var(--text-primary)] text-sm mt-3 pb-1 border-b border-[#4285F4]/30 flex items-center gap-2"
              >
                <span className="w-1.5 h-3.5 bg-[#4285F4] rounded-full inline-block" />
                {parseInline(content)}
              </h3>
            );
            return;
          }

          if (trimmed.startsWith('> ')) {
            renderedBlocks.push(
              <blockquote
                key={`${sIdx}-${idx}`}
                className="border-l-3 border-[#4285F4] bg-[#4285F4]/10 px-3 py-2 my-1.5 text-xs text-[var(--text-secondary)] rounded-r-xl italic"
              >
                {parseInline(trimmed.slice(2))}
              </blockquote>
            );
            return;
          }

          if (/^[-*•]\s+/.test(trimmed)) {
            const content = trimmed.replace(/^[-*•]\s+/, '');
            renderedBlocks.push(
              <div key={`${sIdx}-${idx}`} className="flex items-start gap-2 pl-1 py-0.5">
                <span className="text-[#4285F4] mt-1 shrink-0 text-[10px]">●</span>
                <div className="flex-1 min-w-0">{parseInline(content)}</div>
              </div>
            );
            return;
          }

          const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numberedMatch) {
            renderedBlocks.push(
              <div key={`${sIdx}-${idx}`} className="flex items-start gap-2 pl-1 py-0.5">
                <span className="text-[10px] font-extrabold text-[#4285F4] bg-[#4285F4]/15 border border-[#4285F4]/30 w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {numberedMatch[1]}
                </span>
                <div className="flex-1 min-w-0">{parseInline(numberedMatch[2])}</div>
              </div>
            );
            return;
          }

          renderedBlocks.push(
            <p key={`${sIdx}-${idx}`} className="leading-relaxed">
              {parseInline(line)}
            </p>
          );
        });

        flushTable(`tbl-end-${sIdx}`);
        return <React.Fragment key={sIdx}>{renderedBlocks}</React.Fragment>;
      })}
    </div>
  );
}

// ── Collapsible Chain-of-Thought Reasoning Drawer ──────────────────────────
function ReasoningBox({
  reasoning,
  isStreamingAnswer,
}: {
  reasoning?: string;
  isStreamingAnswer?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (!reasoning) return null;

  return (
    <div className="mb-2.5 rounded-2xl border border-[#4285F4]/30 bg-[#4285F4]/8 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full px-3 py-2 flex items-center justify-between text-[#4285F4] font-bold hover:bg-[#4285F4]/12 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#4285F4]" />
          <span>{isStreamingAnswer ? 'Đang suy nghĩ…' : 'Quá trình suy nghĩ'}</span>
        </span>
        <span className="text-[10px] flex items-center gap-1">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {isOpen ? 'Thu gọn' : 'Xem suy luận'}
        </span>
      </button>
      {isOpen && (
        <div className="px-3.5 py-2.5 border-t border-[#4285F4]/20 text-[var(--text-secondary)] whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto custom-scrollbar bg-[var(--bg-subtle)]">
          {reasoning}
        </div>
      )}
    </div>
  );
}

// ── LocalStorage + Firebase RTDB Helpers for Multi-Conversation History ────
function getLocalStorageKey(uid: string) {
  return `2x18_ai_chats_${uid}`;
}

function loadLocalSessions(uid: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(uid: string, sessions: ChatSession[]) {
  try {
    localStorage.setItem(getLocalStorageKey(uid), JSON.stringify(sessions.slice(0, 30)));
  } catch {
    // Ignore storage quota errors
  }
}

function createEmptySession(): ChatSession {
  const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: 'Cuộc trò chuyện mới',
    updatedAt: Date.now(),
    messages: [],
  };
}

export default function AIChatbot() {
  const {
    currentUser,
    isCore,
    isSuperAdmin,
    myGrades,
    myGradesEnriched,
    grades: allGrades,
    activeMembers,
  } = useApp();

  const isCoreUser = Boolean(
    isCore || isSuperAdmin || currentUser?.role === 'core' || currentUser?.role === 'super_admin'
  );
  const assistantName = isCoreUser ? '2X18 Core Advisor' : '2X18 Copilot';

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

  const activeOnlyMembers = useMemo(
    () =>
      (members.length > 0 ? members : activeMembers || []).filter(
        (m: any) => m.status === 'active'
      ),
    [members, activeMembers]
  );

  const firstName = currentUser?.fullName?.split(' ').filter(Boolean).slice(-1)[0] || 'bạn';
  const uid = auth.currentUser?.uid || currentUser?.uid || currentUser?.id || 'guest';

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const [selectedModelMode, setSelectedModelMode] = useState('auto');

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const cached = loadLocalSessions(uid);
    return cached.length > 0 ? cached : [createEmptySession()];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const cached = loadLocalSessions(uid);
    return cached[0]?.id || '';
  });

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{ message: string; retryPrompt: string } | null>(
    null
  );
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSendTimeRef = useRef<number>(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Subscribe to Firebase RTDB 2x18_ai_chats/{uid} when authenticated
  useEffect(() => {
    const firebaseUid = auth.currentUser?.uid;
    if (!firebaseUid) return;

    const chatsRef = ref(db, `2x18_ai_chats/${firebaseUid}`);
    const unsub = onValue(
      chatsRef,
      snapshot => {
        const val = snapshot.val();
        if (!val || typeof val !== 'object') return;
        const remoteList: ChatSession[] = Object.values(val)
          .filter((item: any) => item && typeof item.id === 'string')
          .map((item: any) => ({
            id: item.id,
            title: item.title || 'Cuộc trò chuyện',
            updatedAt: Number(item.updatedAt) || Date.now(),
            messages: Array.isArray(item.messages) ? item.messages : [],
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt);

        if (remoteList.length > 0) {
          setSessions(remoteList);
          saveLocalSessions(firebaseUid, remoteList);
          setActiveSessionId(prev =>
            remoteList.some(s => s.id === prev) ? prev : remoteList[0].id
          );
        }
      },
      () => {
        // Gracefully ignore permission errors if database.rules.json isn't deployed yet
      }
    );

    return () => unsub();
  }, [uid]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0] || createEmptySession();
  }, [sessions, activeSessionId]);

  const persistSession = useCallback(
    (updatedSession: ChatSession) => {
      setSessions(prev => {
        const exists = prev.some(s => s.id === updatedSession.id);
        const next = exists
          ? prev.map(s => (s.id === updatedSession.id ? updatedSession : s))
          : [updatedSession, ...prev];
        next.sort((a, b) => b.updatedAt - a.updatedAt);
        saveLocalSessions(uid, next);
        return next;
      });

      const firebaseUid = auth.currentUser?.uid;
      if (firebaseUid && updatedSession.messages.length > 0) {
        set(ref(db, `2x18_ai_chats/${firebaseUid}/${updatedSession.id}`), updatedSession).catch(
          () => {}
        );
      }
    },
    [uid]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages.length, isStreaming]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, isMinimized, activeSession.id]);

  const buildAiContext = useCallback(() => {
    const myUserTasks = tasks.filter(
      (t: any) =>
        t.userId === currentUser?.id ||
        (Array.isArray(t.assignees) && t.assignees.includes(currentUser?.id))
    );
    const userPresentCount = attendance.filter((s: any) =>
      (s.present || []).includes(currentUser?.id)
    ).length;
    const userAttRate = attendance?.length
      ? Math.round((userPresentCount / attendance.length) * 100)
      : 100;
    const myLearnedWords = Object.values((userVocab as any)[currentUser?.id] || {}).reduce(
      (sum: number, setProg: any) =>
        sum + Object.values(setProg || {}).filter(lv => Number(lv) >= 6).length,
      0
    );
    const nowLocalDate = localDateStr();

    if (isCoreUser) {
      return {
        isCore: true,
        currentUser,
        members: activeOnlyMembers,
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
    }

    return {
      isCore: false,
      currentUser,
      mssv: currentUser?.mssv,
      points: (contributions as any)[currentUser?.id] || 0,
      upcomingEvents: (calEvents || [])
        .filter((e: any) => e.date && String(e.date).slice(0, 10) >= nowLocalDate)
        .slice(0, 5),
      myTasks: myUserTasks,
      attendanceRate: userAttRate,
      attendanceSummary: {
        attended: userPresentCount,
        total: attendance.length,
      },
      vocabStats: {
        totalSets: Object.keys(vocab || {}).length,
        learnedWords: myLearnedWords,
      },
      myGradesEnriched,
      detailedGrades: myGradesEnriched,
      rawGrades: myGrades,
      smeMap: smeMap || {},
    };
  }, [
    tasks,
    currentUser,
    attendance,
    userVocab,
    isCoreUser,
    activeOnlyMembers,
    allGrades,
    contributions,
    smeMap,
    reports,
    calEvents,
    docs,
    myGradesEnriched,
    myGrades,
    vocab,
  ]);

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  const sendPrompt = async (promptText: string, baseMessages?: ChatMessage[]) => {
    const trimmed = promptText.trim();
    if (!trimmed || isStreaming) return;

    if (trimmed.length > MAX_INPUT_LENGTH) {
      setErrorBanner({
        message: `Tin nhắn vượt quá giới hạn ${MAX_INPUT_LENGTH} ký tự. Vui lòng rút gọn nội dung.`,
        retryPrompt: trimmed.slice(0, MAX_INPUT_LENGTH),
      });
      return;
    }

    const now = Date.now();
    if (now - lastSendTimeRef.current < MIN_SEND_INTERVAL_MS) {
      return;
    }
    lastSendTimeRef.current = now;
    setErrorBanner(null);

    const historyMessages = baseMessages ?? activeSession.messages;
    const userMessageObj: ChatMessage = {
      id: `u_${now}`,
      role: 'user',
      text: trimmed,
      createdAt: now,
    };
    const assistantMsgId = `a_${now + 1}`;
    const placeholderAssistantObj: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      reasoning: '',
      createdAt: now + 1,
    };

    const nextTitle =
      historyMessages.length === 0
        ? trimmed.slice(0, 42) + (trimmed.length > 42 ? '…' : '')
        : activeSession.title;

    const sessionWithUser: ChatSession = {
      ...activeSession,
      title: nextTitle,
      updatedAt: now,
      messages: [...historyMessages, userMessageObj, placeholderAssistantObj],
    };

    if (!baseMessages) {
      setInput('');
    }
    persistSession(sessionWithUser);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const context = buildAiContext();
      const apiHistory = historyMessages
        .filter(m => !m.isError && m.text.trim())
        .slice(-10)
        .map(m => ({ role: m.role, text: m.text }));

      const aiRes = await chatWithAI(trimmed, context, apiHistory, selectedModelMode, {
        stream: true,
        signal: controller.signal,
        onStreamUpdate: partial => {
          setSessions(prev =>
            prev.map(s => {
              if (s.id !== sessionWithUser.id) return s;
              return {
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: partial.text,
                        reasoning: partial.reasoning,
                        modelUsed: partial.modelUsed,
                      }
                    : m
                ),
              };
            })
          );
        },
      });

      const finalSession: ChatSession = {
        ...sessionWithUser,
        updatedAt: Date.now(),
        messages: sessionWithUser.messages.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                text: aiRes.text,
                reasoning: aiRes.reasoning,
                modelUsed: aiRes.modelUsed,
              }
            : m
        ),
      };
      persistSession(finalSession);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Keep whatever partial response was already streamed, or mark stopped
        setSessions(prev => {
          const current = prev.find(s => s.id === sessionWithUser.id);
          if (!current) return prev;
          const updated: ChatSession = {
            ...current,
            messages: current.messages.map(m =>
              m.id === assistantMsgId && !m.text.trim()
                ? { ...m, text: '*(Đã dừng tạo câu trả lời theo yêu cầu của bạn.)*' }
                : m
            ),
          };
          saveLocalSessions(uid, prev.map(s => (s.id === updated.id ? updated : s)));
          return prev.map(s => (s.id === updated.id ? updated : s));
        });
      } else {
        const friendlyMsg =
          err?.message ||
          'Không nhận được phản hồi từ dịch vụ AI. Vui lòng kiểm tra kết nối và bấm Thử lại.';
        setErrorBanner({ message: friendlyMsg, retryPrompt: trimmed });
        // Restore user draft if input is currently empty so user never loses what they typed
        setInput(prev => prev || trimmed);
        // Remove empty placeholder message
        const cleanedSession: ChatSession = {
          ...sessionWithUser,
          messages: sessionWithUser.messages.filter(m => m.id !== assistantMsgId),
        };
        persistSession(cleanedSession);
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleRegenerate = (assistantMsgIndex: number) => {
    if (isStreaming) return;
    // Find preceding user message
    const msgs = activeSession.messages;
    let userIdx = assistantMsgIndex - 1;
    while (userIdx >= 0 && msgs[userIdx].role !== 'user') userIdx--;
    if (userIdx < 0) return;

    const targetPrompt = msgs[userIdx].text;
    const priorMessages = msgs.slice(0, userIdx);
    void sendPrompt(targetPrompt, priorMessages);
  };

  const handleFeedback = (msgId: string, vote: 'like' | 'dislike') => {
    const updated: ChatSession = {
      ...activeSession,
      updatedAt: Date.now(),
      messages: activeSession.messages.map(m =>
        m.id === msgId ? { ...m, feedback: m.feedback === vote ? null : vote } : m
      ),
    };
    persistSession(updated);
  };

  const handleSaveEditAndResend = (msgIndex: number) => {
    const trimmed = editDraft.trim();
    if (!trimmed || isStreaming) return;
    const priorMessages = activeSession.messages.slice(0, msgIndex);
    setEditingMsgId(null);
    setEditDraft('');
    void sendPrompt(trimmed, priorMessages);
  };

  const handleCreateNewSession = () => {
    if (isStreaming) stopStreaming();
    const fresh = createEmptySession();
    setSessions(prev => {
      const next = [fresh, ...prev];
      saveLocalSessions(uid, next);
      return next;
    });
    setActiveSessionId(fresh.id);
    setShowHistoryDrawer(false);
    setErrorBanner(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    const firebaseUid = auth.currentUser?.uid;
    if (firebaseUid) {
      remove(ref(db, `2x18_ai_chats/${firebaseUid}/${sessionId}`)).catch(() => {});
    }
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId);
      const next = remaining.length > 0 ? remaining : [createEmptySession()];
      saveLocalSessions(uid, next);
      if (activeSessionId === sessionId) {
        setActiveSessionId(next[0].id);
      }
      return next;
    });
  };

  const handleRenameSession = (sessionId: string) => {
    const trimmed = renameDraft.trim();
    setRenamingSessionId(null);
    if (!trimmed) return;
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;
    persistSession({ ...target, title: trimmed, updatedAt: Date.now() });
  };

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some(m => m.text.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  // Welcome Suggestion Chips (4–6 chips tied to app features)
  const welcomeSuggestions = useMemo(() => {
    if (isCoreUser) {
      return [
        {
          id: 'health',
          icon: TrendingUp,
          color: '#4285F4',
          title: 'Báo cáo sức khỏe nhóm',
          prompt:
            'Hãy lập báo cáo tổng quan sức khỏe nhóm 2X18: CPA trung bình, tỉ lệ task trễ và tình hình chuyên cần?',
        },
        {
          id: 'risk',
          icon: AlertTriangle,
          color: '#EA4335',
          title: 'Cảnh báo rủi ro học lực',
          prompt:
            'Chỉ ra các thành viên có nguy cơ học tập (CPA < 2.5 hoặc nợ môn) và các task đang quá hạn cần giải quyết gấp?',
        },
        {
          id: 'assign',
          icon: Target,
          color: '#34A853',
          title: 'Phân bổ công việc & SME',
          prompt:
            'Dựa vào khối lượng task và thế mạnh SME môn học, hãy gợi ý phân bổ lại công việc và đề xuất buổi phụ đạo?',
        },
        {
          id: 'cleanroom',
          icon: Sparkles,
          color: '#FBBC05',
          title: 'Chẩn đoán Phòng sạch',
          prompt:
            'Phân tích Recipe Sputtering: buồng chân không nền 2.5x10^-6 Torr, Ar 25 sccm, công suất RF 150W lắng đọng màng SiO2 bị đục. Nguyên nhân và cách khắc phục theo quy trình NEC/HUS?',
        },
        {
          id: 'paper',
          icon: FileText,
          color: '#4285F4',
          title: 'Giải phẫu Paper IEEE',
          prompt:
            'Hướng dẫn giải phẫu một bài báo bán dẫn (IEEE TED/APL) thành Fabrication Blueprint: Vật liệu & Đế, Công đoạn nút thắt, Thông số Ion/Ioff?',
        },
        {
          id: 'taiwan',
          icon: Award,
          color: '#34A853',
          title: 'Học bổng Bán dẫn Đài Loan',
          prompt:
            'Phân tích tiêu chí học bổng và hướng nghiên cứu mũi nhọn của NYCU (ICST), NTHU (CoSR) và NTU (GSAT) cho thành viên 2X18?',
        },
      ];
    }

    return [
      {
        id: 'final_target',
        icon: Target,
        color: '#4285F4',
        title: 'Tính điểm thi Cuối kỳ',
        prompt:
          'Dựa vào điểm CC và GK hiện có của mình, hãy tính điểm thi cuối kỳ (CK) cần đạt ở từng môn để đạt B, B+ hoặc A!',
      },
      {
        id: 'urgent_tasks',
        icon: Clock,
        color: '#FBBC05',
        title: 'Task gấp & Lịch sắp tới',
        prompt:
          'Kiểm tra xem mình có nhiệm vụ nào đang quá hạn hoặc sắp đến hạn trong tuần này không? Gợi ý thứ tự ưu tiên giải quyết?',
      },
      {
        id: 'gpa_analysis',
        icon: BookOpen,
        color: '#34A853',
        title: 'Phân tích CPA & Thế mạnh',
        prompt:
          'Phân tích bảng điểm và CPA hiện tại của mình: đâu là nhóm môn thế mạnh và môn nào cần tập trung cải thiện?',
      },
      {
        id: 'cleanroom',
        icon: Sparkles,
        color: '#EA4335',
        title: 'Quy trình Phòng sạch HUS',
        prompt:
          'Giải thích quy trình phún xạ Sputtering Magnetron tại phòng sạch NEC/HUS và cách đo điện trở mặt bằng hệ 4 mũi nhọn (4-Point Probe)?',
      },
      {
        id: 'academic',
        icon: Zap,
        color: '#4285F4',
        title: 'Toán lý & Bắt lỗi tư duy',
        prompt:
          'Hướng dẫn phương pháp tách biến giải phương trình truyền nhiệt PDE (Boas) và các lỗi điều kiện biên thường gặp?',
      },
      {
        id: 'taiwan',
        icon: Award,
        color: '#34A853',
        title: 'Lộ trình Du học Đài Loan',
        prompt:
          'Tư vấn lộ trình chuẩn bị GPA, IELTS/TOCFL và hồ sơ nghiên cứu để săn học bổng bán dẫn NYCU, NTHU, NTU Đài Loan?',
      },
    ];
  }, [isCoreUser]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Mở trợ lý AI ${assistantName}`}
        title={`Mở ${assistantName}`}
        className="fixed bottom-20 lg:bottom-7 right-4 sm:right-6 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-[22px] bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-xl shadow-[#4285F4]/35 flex items-center justify-center transition-all spring-press group"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-canvas)] bg-[#34A853]" />
      </button>
    );
  }

  return (
    <section
      aria-label={`Khung trò chuyện ${assistantName}`}
      className={`fixed z-50 glass-strong flex flex-col transition-all duration-300 overflow-hidden ${
        isMinimized
          ? 'bottom-20 lg:bottom-6 right-4 sm:right-6 h-15 w-[310px]'
          : isExpanded
            ? 'inset-2 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[calc(100vw-48px)] sm:max-w-[740px] sm:h-[720px] sm:max-h-[88dvh]'
            : 'bottom-20 lg:bottom-6 right-3 sm:right-6 w-[calc(100vw-24px)] max-w-[420px] h-[590px] max-h-[80dvh]'
      }`}
    >
      {/* ── Top Glass Header ── */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between gap-2 shrink-0 bg-[var(--glass-nav-bg)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#4285F4] flex items-center justify-center shrink-0 shadow-sm text-white">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-[var(--text-primary)] flex items-center gap-1.5 truncate">
              <span className="truncate">{assistantName}</span>
              <span className={`badge ${isCoreUser ? 'badge-yellow' : 'badge-blue'}`}>
                {isCoreUser ? 'CORE' : 'AI'}
              </span>
            </div>
            <div className="text-[10px] flex items-center gap-1.5 font-semibold text-[var(--text-secondary)] truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
              <span className="truncate">
                {activeSession.title} · DeepSeek
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isMinimized && (
            <>
              <button
                type="button"
                onClick={handleCreateNewSession}
                aria-label="Cuộc trò chuyện mới"
                title="Cuộc trò chuyện mới"
                className="min-w-[34px] min-h-[34px] p-1.5 hover:bg-[var(--bg-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-[#4285F4] transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(v => !v)}
                aria-label="Lịch sử cuộc trò chuyện"
                aria-expanded={showHistoryDrawer}
                title="Lịch sử trò chuyện"
                className={`min-w-[34px] min-h-[34px] p-1.5 rounded-xl transition-colors flex items-center justify-center ${
                  showHistoryDrawer
                    ? 'bg-[#4285F4]/15 text-[#4285F4]'
                    : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <History className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(v => !v)}
                aria-label={isExpanded ? 'Thu nhỏ cửa sổ chat' : 'Mở rộng cửa sổ chat'}
                title={isExpanded ? 'Thu nhỏ khung' : 'Mở rộng khung'}
                className="hidden sm:flex min-w-[34px] min-h-[34px] p-1.5 hover:bg-[var(--bg-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors items-center justify-center"
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(v => !v)}
            aria-label={isMinimized ? 'Mở lại khung chat' : 'Thu gọn khung chat'}
            className="min-w-[34px] min-h-[34px] p-1.5 hover:bg-[var(--bg-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng khung chat"
            className="min-w-[34px] min-h-[34px] p-1.5 hover:bg-[#EA4335]/15 rounded-xl text-[var(--text-secondary)] hover:text-[#EA4335] transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Model Routing Bar ── */}
          <div className="px-3.5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] flex items-center justify-between text-[11px] shrink-0">
            <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#4285F4]" /> Chế độ suy luận:
            </span>
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-0.5 rounded-xl border border-[var(--border-default)]">
              {[
                { id: 'auto', label: 'Tự động ⚡' },
                { id: 'deepseek-chat', label: 'Nhanh' },
                { id: 'deepseek-reasoner', label: 'Sâu (CoT) 🧠' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedModelMode(opt.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedModelMode === opt.id
                      ? 'bg-[#4285F4] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Conversation History Drawer ── */}
          {showHistoryDrawer && (
            <div className="p-3.5 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    aria-label="Tìm kiếm lịch sử trò chuyện"
                    placeholder="Tìm cuộc trò chuyện..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] outline-none focus:border-[#4285F4]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewSession}
                  className="px-3 py-1.5 rounded-xl bg-[#4285F4] text-white text-xs font-bold flex items-center gap-1 shrink-0 spring-press"
                >
                  <Plus className="w-3.5 h-3.5" /> Mới
                </button>
              </div>

              <div className="space-y-1.5">
                {filteredSessions.map(sess => {
                  const isCurrent = sess.id === activeSession.id;
                  const isRenaming = renamingSessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${
                        isCurrent
                          ? 'bg-[#4285F4]/15 border-[#4285F4]/40 text-[#4285F4] font-bold'
                          : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[#4285F4]/30'
                      }`}
                    >
                      {isRenaming ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            aria-label="Tên cuộc trò chuyện"
                            value={renameDraft}
                            onChange={e => setRenameDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                if (isImeComposing(e)) return;
                                handleRenameSession(sess.id);
                              }
                              if (e.key === 'Escape') setRenamingSessionId(null);
                            }}
                            className="flex-1 px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[#4285F4] text-xs text-[var(--text-primary)] outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSession(sess.id)}
                            aria-label="Lưu tên"
                            className="p-1 text-[#34A853]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSessionId(sess.id);
                            setShowHistoryDrawer(false);
                          }}
                          className="flex-1 text-left truncate"
                        >
                          <div className="truncate">{sess.title}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-normal tabular-nums">
                            {sess.messages.length} tin nhắn ·{' '}
                            {new Date(sess.updatedAt).toLocaleDateString('vi-VN')}
                          </div>
                        </button>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingSessionId(sess.id);
                            setRenameDraft(sess.title);
                          }}
                          aria-label="Đổi tên cuộc trò chuyện"
                          className="p-1 text-[var(--text-secondary)] hover:text-[#4285F4]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess.id)}
                          aria-label="Xóa cuộc trò chuyện"
                          className="p-1 text-[var(--text-secondary)] hover:text-[#EA4335]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Main Messages Area / Gemini-style Welcome Screen ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {activeSession.messages.length === 0 ? (
              <div className="py-4 px-2 space-y-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4285F4]/12 border border-[#4285F4]/25 text-xs font-extrabold text-[#4285F4]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{assistantName}</span>
                  </div>
                  <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                    Xin chào, {isCoreUser ? `Core ${firstName}` : firstName}!
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {isCoreUser
                      ? 'Mình sẵn sàng hỗ trợ phân tích tiến độ toàn nhóm, chẩn đoán quy trình phòng sạch NEC/HUS, giải phẫu bài báo bán dẫn và hoạch định học bổng Đài Loan.'
                      : 'Mình có thể tính điểm mục tiêu cuối kỳ, rà soát bài tập toán lý & bán dẫn, nhắc việc gấp và gợi ý kế hoạch ôn tập cá nhân cho bạn.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {welcomeSuggestions.map(chip => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => void sendPrompt(chip.prompt)}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[#4285F4]/50 text-left transition-all spring-press group"
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${chip.color}20`, color: chip.color }}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.85} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[#4285F4] transition-colors">
                            {chip.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                            {chip.prompt}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              activeSession.messages.map((m, idx) => {
                const isUser = m.role === 'user';
                const isLastAssistant =
                  !isUser && idx === activeSession.messages.length - 1;
                const { cleanText, suggestions } = isUser
                  ? { cleanText: m.text, suggestions: [] }
                  : extractFollowUpSuggestions(m.text);

                return (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1.5 pl-1">
                        <div className="w-5 h-5 rounded-lg bg-[#4285F4] flex items-center justify-center text-white shrink-0">
                          <Bot className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                          {assistantName}
                        </span>
                        {m.modelUsed && (
                          <span className="badge badge-blue text-[9px] font-mono">
                            {m.modelUsed}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[92%] px-4 py-3 rounded-[22px] text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#4285F4] text-white rounded-tr-md font-medium shadow-sm'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] rounded-tl-md border border-[var(--border-default)]'
                      }`}
                    >
                      {isUser && editingMsgId === m.id ? (
                        <div className="space-y-2 min-w-[220px]">
                          <textarea
                            value={editDraft}
                            onChange={e => setEditDraft(e.target.value)}
                            aria-label="Chỉnh sửa tin nhắn"
                            rows={2}
                            className="w-full p-2 rounded-xl bg-white/15 text-white placeholder:text-white/70 text-xs outline-none border border-white/30"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-bold"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditAndResend(idx)}
                              className="px-2.5 py-1 rounded-lg bg-white text-[#4285F4] text-xs font-extrabold"
                            >
                              Gửi lại
                            </button>
                          </div>
                        </div>
                      ) : isUser ? (
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      ) : (
                        <>
                          {m.reasoning && (
                            <ReasoningBox
                              reasoning={m.reasoning}
                              isStreamingAnswer={isStreaming && isLastAssistant && !cleanText}
                            />
                          )}
                          {cleanText ? (
                            <MarkdownRenderer text={cleanText} />
                          ) : isStreaming && isLastAssistant ? (
                            <div className="space-y-2 py-1">
                              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                                <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-bounce" />
                                <span className="w-2 h-2 rounded-full bg-[#EA4335] animate-bounce [animation-delay:0.15s]" />
                                <span className="w-2 h-2 rounded-full bg-[#FBBC05] animate-bounce [animation-delay:0.3s]" />
                                <span className="w-2 h-2 rounded-full bg-[#34A853] animate-bounce [animation-delay:0.45s]" />
                                <span>Đang suy nghĩ…</span>
                              </div>
                              <div className="h-1.5 w-44 rounded-full google-thinking-bar" />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    {/* Action Toolbar below User or Assistant message */}
                    {isUser && editingMsgId !== m.id && !isStreaming && (
                      <div className="flex items-center gap-1 mt-1 pr-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMsgId(m.id);
                            setEditDraft(m.text);
                          }}
                          aria-label="Sửa tin nhắn này và gửi lại"
                          title="Sửa và gửi lại"
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#4285F4] hover:bg-[var(--bg-subtle)] flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                      </div>
                    )}

                    {!isUser && cleanText && (!isStreaming || !isLastAssistant) && (
                      <div className="flex items-center gap-1 mt-1.5 pl-1 flex-wrap">
                        <span className="copy relative inline-flex items-center">
                          <button
                            type="button"
                            aria-label="Sao chép câu trả lời"
                            title="Sao chép câu trả lời"
                            onClick={e => void performAccessibleCopy(e.currentTarget, cleanText)}
                            className="copy-button !px-2 !py-1 !text-[11px]"
                          >
                            <Copy className="w-3 h-3" aria-hidden="true" />
                            <span>Chép</span>
                          </button>
                          <span className="tip" role="status" />
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRegenerate(idx)}
                          aria-label="Tạo lại câu trả lời"
                          title="Tạo lại câu trả lời"
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#4285F4] hover:bg-[var(--bg-subtle)] flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Tạo lại</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, 'like')}
                          aria-label="Hữu ích"
                          aria-pressed={m.feedback === 'like'}
                          title="Hữu ích"
                          className={`p-1.5 rounded-lg transition-colors ${
                            m.feedback === 'like'
                              ? 'text-[#34A853] bg-[#34A853]/15'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, 'dislike')}
                          aria-label="Chưa tốt"
                          aria-pressed={m.feedback === 'dislike'}
                          title="Chưa tốt"
                          className={`p-1.5 rounded-lg transition-colors ${
                            m.feedback === 'dislike'
                              ? 'text-[#EA4335] bg-[#EA4335]/15'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Follow-up Suggestion Chips */}
                    {!isUser && suggestions.length > 0 && (!isStreaming || !isLastAssistant) && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
                        {suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => void sendPrompt(sug)}
                            className="px-3 py-1.5 rounded-full bg-[#4285F4]/10 hover:bg-[#4285F4]/20 border border-[#4285F4]/30 text-xs font-semibold text-[#4285F4] transition-all spring-press text-left"
                          >
                            ✨ {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Friendly Vietnamese Error Banner with Retry */}
            {errorBanner && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-[#EA4335]/12 border border-[#EA4335]/35 text-xs space-y-2"
              >
                <div className="flex items-start gap-2 text-[var(--semantic-red-text)] font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EA4335]" />
                  <span>{errorBanner.message}</span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void sendPrompt(errorBanner.retryPrompt)}
                    className="px-3 py-1.5 rounded-xl bg-[#EA4335] text-white font-bold flex items-center gap-1.5 spring-press"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử lại ngay</span>
                  </button>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ── Floating Glass Pill Input Area at Bottom ── */}
          <div className="p-3 pt-2 border-t border-[var(--border-default)] bg-[var(--glass-nav-bg)] shrink-0 pb-[max(env(safe-area-inset-bottom,12px),12px)]">
            <div className="flex items-end gap-2 px-3.5 py-2 rounded-[24px] bg-[var(--bg-subtle)] border border-[var(--border-default)] focus-within:border-[#4285F4] focus-within:bg-[var(--bg-surface)] transition-all shadow-sm">
              <div
                className="growable-textarea flex-1 min-w-0"
                data-replicated-value={input}
              >
                <textarea
                  ref={inputRef}
                  aria-label={`Nhập câu hỏi cho ${assistantName}`}
                  value={input}
                  maxLength={MAX_INPUT_LENGTH}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (isImeComposing(e)) return;
                      void sendPrompt(input);
                    }
                  }}
                  placeholder={`Hỏi ${assistantName} bất kỳ điều gì...`}
                  rows={1}
                  className="auto-fit-textarea bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none leading-snug max-h-32 overflow-y-auto"
                />
              </div>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  aria-label="Dừng trả lời"
                  title="Dừng trả lời"
                  className="w-9 h-9 rounded-full bg-[#EA4335] hover:bg-[#D93025] text-white flex items-center justify-center shrink-0 transition-all spring-press shadow-sm"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendPrompt(input)}
                  disabled={!input.trim()}
                  aria-label="Gửi tin nhắn"
                  title="Gửi (Enter)"
                  className="w-9 h-9 rounded-full bg-[#4285F4] hover:bg-[#3367D6] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-all spring-press shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-2 mt-1.5 text-[10px] text-[var(--text-muted)]">
              <span>Enter để gửi · Shift+Enter xuống dòng</span>
              <span className="tabular-nums">
                {input.length}/{MAX_INPUT_LENGTH}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
