import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp, BookOpen, AlertCircle, Clock, Zap,
  CheckCircle2, Activity, Sparkles, Loader2, BarChart2
} from 'lucide-react';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext';
import { analyzeEarlyWarning } from '../services/aiService';
import { daysDiffLocal } from '../utils/stringUtils';
import { motion, AnimatePresence } from 'framer-motion';

import { useSemesterNames, computeCPA, cpaColor } from '../utils/dashboardUtils';
import { SemesterSelector } from '../components/dashboard/SemesterSelector';
import { GroupGPACard } from '../components/dashboard/GroupGPACard';
import { LearningProgressCard } from '../components/dashboard/LearningProgressCard';
import { RadarChartCard } from '../components/dashboard/RadarChartCard';
import { GroupVelocityCard } from '../components/dashboard/GroupVelocityCard';
import { StatCard } from '../components/dashboard/StatCard';
import ProgressRing from '../components/ui/ProgressRing';

import {
  useMembers, useTasks, useSmeMap, useAuditLogs,
  useContributions, useSemesterLabels, useAttendance
} from '../hooks/useDomainQueries';

const EMPTY_GRADES: Record<string, any> = {};

export default function Dashboard() {
  const { currentUser, grades: allGrades, updateSemesterLabel, isCore, toast } = useApp();

  const { data: members = [] } = useMembers();
  const { data: tasks = [] } = useTasks();
  const { data: smeMap = {} } = useSmeMap();
  const { data: auditLogs = [] } = useAuditLogs();
  const { data: contributions = {} } = useContributions();
  const { data: semesterLabels = {} } = useSemesterLabels();
  const { data: attendance = [] } = useAttendance();

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Fallback for shrinking header when scroll-driven animations are unsupported
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const supportsScrollTimeline =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)');

    const handleScroll = () => {
      const y = scroller.scrollTop;
      setIsScrolled(y > 24);
      if (!supportsScrollTimeline && titleRef.current) {
        const progress = Math.min(1, y / 96);
        const scale = 1 - 0.1 * progress;
        titleRef.current.style.transform = `scale(${scale})`;
      }
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, []);

  const activeMembers = useMemo(
    () => members.filter((m: any) => m.status === 'active'),
    [members]
  );

  const myGrades = useMemo(
    () => (currentUser?.id ? allGrades[currentUser.id] || EMPTY_GRADES : EMPTY_GRADES),
    [allGrades, currentUser?.id]
  );
  const myTasks = useMemo(
    () =>
      tasks.filter(
        (t: any) =>
          t.userId === currentUser?.id ||
          (Array.isArray(t.assignees) && t.assignees.includes(currentUser?.id))
      ),
    [tasks, currentUser?.id]
  );

  const [semesterNames, updateSemesterName] = useSemesterNames(semesterLabels, updateSemesterLabel);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const handleAiAnalysis = async () => {
    if (!isCore) return;
    setIsAiAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await analyzeEarlyWarning(activeMembers, attendance, tasks, allGrades);
      setAiAnalysis(res);
    } catch (err: any) {
      console.error(err);
      toast?.(err?.message || 'Không thể phân tích sức khỏe nhóm lúc này.', 'error');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const myStats = useMemo(() => computeCPA(myGrades), [myGrades]);
  const creditPct = useMemo(
    () => Math.min(100, Math.round((myStats.credits / 133) * 1000) / 10),
    [myStats.credits]
  );

  const mySmeSubjects = useMemo(
    () =>
      Object.entries(smeMap)
        .filter(([, owner]) => owner === currentUser?.id || owner === currentUser?.fullName)
        .map(([id]) => subjectDatabase.find(s => s.id === id))
        .filter(Boolean),
    [smeMap, currentUser?.id, currentUser?.fullName]
  );

  const upcomingTasks = useMemo(
    () =>
      [...myTasks]
        .filter(t => !t.done)
        .sort((a, b) => daysDiffLocal(a.deadline) - daysDiffLocal(b.deadline))
        .slice(0, 5),
    [myTasks]
  );

  const topMembers = useMemo(
    () =>
      [...activeMembers]
        .map(m => ({ ...m, points: Number(contributions[m.id]) || 0 }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5),
    [activeMembers, contributions]
  );

  return (
    <div
      ref={scrollerRef}
      className="h-full text-[var(--text-primary)] overflow-y-auto custom-scrollbar pb-28 lg:pb-8"
    >
      {/* ── Apple Large-Title Shrinking Glass Header ── */}
      <header
        className={`sticky top-0 z-30 glass-nav border-b border-[var(--glass-border)] px-4 sm:px-6 transition-all duration-200 ${
          isScrolled ? 'py-2.5' : 'py-4'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">
              Chào, {currentUser?.fullName?.split(' ').pop() || 'Thành viên'}!
            </p>
            <h1
              ref={titleRef}
              className="shrinking-title text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight origin-left transition-transform"
            >
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Credit Progress Ring Widget */}
            <div className="hidden sm:flex items-center gap-2.5 pr-3 border-r border-[var(--border-default)]">
              <div className="text-right">
                <div className="text-xs font-black text-[#4285F4] tabular-nums">
                  {creditPct.toFixed(1)}%
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                  {myStats.credits}/133 TC
                </div>
              </div>
              <ProgressRing
                value={myStats.credits}
                max={133}
                size={42}
                thickness={4.5}
                color="#4285F4"
                label="Tiến độ tích lũy tín chỉ"
                valueText={`${myStats.credits} trên 133 tín chỉ (${creditPct.toFixed(1)}%)`}
              >
                <span className="text-[10px] font-black text-[var(--text-primary)]">
                  {myStats.credits}
                </span>
              </ProgressRing>
            </div>

            {/* Segmented Control Tabs */}
            <div
              role="tablist"
              aria-label="Chế độ xem Dashboard"
              className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-2xl border border-[var(--border-default)]"
            >
              {[
                { id: 'overview', label: 'Tổng quan', icon: BarChart2 },
                { id: 'analytics', label: 'Phân tích', icon: Sparkles },
                { id: 'activity', label: 'Hoạt động', icon: Activity },
              ].map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all spring-press min-h-[38px] ${
                      active
                        ? 'bg-[#4285F4] text-white shadow-md shadow-[#4285F4]/25'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.85} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
              className="p-4 sm:p-6 space-y-6"
            >
              {/* Quick Stats Row (4 Google Brand Semantic Colors) */}
              <motion.div
                variants={{
                  show: { transition: { staggerChildren: 0.07 } },
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
              >
                <StatCard
                  icon={TrendingUp}
                  label="CPA Hiện tại"
                  value={myStats.cpa}
                  valueClass={cpaColor(myStats.cpa)}
                  sub="Hệ 4.0 tích lũy"
                  color="green"
                  to="/profile"
                  navState={{ tab: 'grades' }}
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Tín chỉ"
                  value={myStats.credits}
                  sub="/ 133 TC chuẩn"
                  color="blue"
                  to="/roadmap"
                />
                <StatCard
                  icon={BookOpen}
                  label="Đang học"
                  value={myStats.learning}
                  sub="Môn trong kỳ"
                  color="yellow"
                  to="/subjects"
                />
                <StatCard
                  icon={AlertCircle}
                  label="Task chờ"
                  value={myTasks.filter((t: any) => !t.done).length}
                  sub="Cần xử lý"
                  color="red"
                  to="/tasks"
                />
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column: Tasks & GPA */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Upcoming Deadlines (Apple Inset Grouped List) */}
                  <div className="glass overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#EA4335]/15 flex items-center justify-center text-[#EA4335]">
                          <Clock className="w-4 h-4" strokeWidth={1.85} />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">
                          Việc cần làm ngay
                        </h3>
                      </div>
                      <span className="badge badge-red">Sắp đến hạn</span>
                    </div>

                    <div className="divide-y divide-[var(--border-default)]">
                      {upcomingTasks.length > 0 ? (
                        upcomingTasks.map((t: any) => {
                          const d = daysDiffLocal(t.deadline);
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--bg-subtle)]/70 transition-colors group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-[var(--text-primary)] truncate group-hover:text-[#4285F4] transition-colors">
                                  {t.task}
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
                                  <span className="badge badge-blue">
                                    {t.subjectId || t.code || 'Chung'}
                                  </span>
                                  <span className="tabular-nums">· Hạn: {t.deadline}</span>
                                </div>
                              </div>
                              <span
                                className={`badge shrink-0 tabular-nums ${
                                  d < 0
                                    ? 'badge-red'
                                    : d <= 3
                                      ? 'badge-yellow'
                                      : 'badge-gray'
                                }`}
                              >
                                {d < 0
                                  ? `TRỄ ${Math.abs(d)} NGÀY`
                                  : d === 0
                                    ? 'HÔM NAY'
                                    : `CÒN ${d} NGÀY`}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-5 py-10 text-center text-[var(--text-secondary)]">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#34A853] opacity-60" />
                          <p className="text-sm font-medium">
                            Tuyệt vời! Bạn không có nhiệm vụ nào đang tồn đọng.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Semester Summary Recharts AreaChart */}
                  <SemesterSelector
                    semGPA={myStats.semGPA}
                    semesterNames={semesterNames}
                    updateSemesterName={updateSemesterName}
                  />
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                  {/* SME subjects */}
                  {mySmeSubjects.length > 0 && (
                    <div className="glass p-5 border-[#4285F4]/30">
                      <h3 className="text-xs font-black text-[#4285F4] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4" strokeWidth={1.85} /> Môn phụ trách (SME)
                      </h3>
                      <div className="space-y-3">
                        {mySmeSubjects.map((s: any) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]"
                          >
                            <div className="w-9 h-9 bg-[#4285F4]/15 rounded-xl flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4 text-[#4285F4]" strokeWidth={1.85} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">
                                {s.code}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group At A Glance */}
                  <div className="glass p-5">
                    <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4">
                      Tổng quan Nhóm 2X18
                    </h3>
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--bg-subtle)]">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          Thành viên hoạt động
                        </span>
                        <span className="text-xs font-black text-[var(--text-primary)] tabular-nums">
                          {activeMembers.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 rounded-xl bg-[var(--bg-subtle)]">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          Ban điều hành (Core)
                        </span>
                        <span className="text-xs font-black text-[#4285F4] tabular-nums">
                          {
                            activeMembers.filter(
                              (m: any) => m.role === 'core' || m.role === 'super_admin'
                            ).length
                          }
                        </span>
                      </div>

                      <div className="pt-3 border-t border-[var(--border-default)]">
                        <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                          Top điểm cống hiến
                        </div>
                        <div className="space-y-2.5">
                          {topMembers.slice(0, 3).map((m, i) => {
                            const medalColors = [
                              'bg-[#FBBC05]/20 text-[var(--semantic-yellow-text)] border-[#FBBC05]/40',
                              'bg-[#4285F4]/15 text-[#4285F4] border-[#4285F4]/30',
                              'bg-[#34A853]/15 text-[#34A853] border-[#34A853]/30',
                            ];
                            return (
                              <div key={m.id} className="flex items-center gap-2.5">
                                <div
                                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-extrabold tabular-nums ${medalColors[i]}`}
                                >
                                  {i + 1}
                                </div>
                                <span className="text-xs font-medium text-[var(--text-primary)] flex-1 truncate">
                                  {(m.fullName || '').split(' ').slice(-2).join(' ')}
                                </span>
                                <span className="text-xs font-black text-[#4285F4] tabular-nums">
                                  {m.points} đ
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
              className="p-4 sm:p-6 space-y-6"
            >
              {/* AI Analysis Header (Core/Super Admin only) */}
              {isCore && (
                <div className="glass flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 border-[#4285F4]/30">
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4285F4]" />
                      AI Phân tích sức khỏe nhóm
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Phân tích chuyên sâu dựa trên Task, Điểm danh và Học lực (Dành riêng cho Core Team)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiAnalysis}
                    disabled={isAiAnalyzing}
                    className="px-4 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] disabled:opacity-60 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-[#4285F4]/25 spring-press min-h-[42px]"
                  >
                    {isAiAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    CHẠY PHÂN TÍCH
                  </button>
                </div>
              )}

              {isCore && aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="md:col-span-2 glass p-5">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                      Cảnh báo thành viên
                    </h4>
                    <div className="space-y-3">
                      {aiAnalysis.warnings?.length > 0 ? (
                        aiAnalysis.warnings.map((w: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3.5 bg-[#EA4335]/10 border border-[#EA4335]/25 rounded-2xl"
                          >
                            <AlertCircle
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                w.level === 'high' ? 'text-[#EA4335]' : 'text-[#FBBC05]'
                              }`}
                            />
                            <div>
                              <div className="text-xs font-bold text-[var(--text-primary)]">
                                {w.name || w.memberName}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                                {w.issue || w.reason}
                              </div>
                              {w.action && (
                                <div className="text-xs font-semibold text-[#4285F4] mt-1">
                                  Giải pháp: {w.action}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-[var(--text-secondary)] italic">
                          Chưa phát hiện dấu hiệu bất thường nào.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="glass p-5">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                      Gợi ý chiến lược từ AI
                    </h4>
                    <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed bg-[#4285F4]/10 p-3.5 rounded-2xl border border-[#4285F4]/25">
                      "{aiAnalysis.suggestion}"
                    </div>
                    <div className="mt-4">
                      <div className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase">
                        Trạng thái chung
                      </div>
                      <span
                        className={`badge ${
                          aiAnalysis.overallHealth === 'excellent' ||
                          aiAnalysis.overallHealth === 'good'
                            ? 'badge-green'
                            : aiAnalysis.overallHealth === 'warning'
                              ? 'badge-yellow'
                              : 'badge-red'
                        }`}
                      >
                        {aiAnalysis.overallHealth === 'excellent'
                          ? 'XUẤT SẮC'
                          : aiAnalysis.overallHealth === 'good'
                            ? 'ỔN ĐỊNH'
                            : aiAnalysis.overallHealth === 'warning'
                              ? 'CẦN CHÚ Ý'
                              : 'NGUY CẤP'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GroupGPACard myGrades={myGrades} allGrades={allGrades} members={activeMembers} />
                <LearningProgressCard
                  myGrades={myGrades}
                  allGrades={allGrades}
                  members={activeMembers}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RadarChartCard myGrades={myGrades} />
                <GroupVelocityCard allGrades={allGrades} members={activeMembers} />
              </div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
              className="p-4 sm:p-6 space-y-6"
            >
              <div className="glass-strong overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4]">
                      <Activity className="w-4 h-4" strokeWidth={1.85} />
                    </div>
                    <h3 className="font-bold text-[var(--text-primary)] text-sm">
                      Nhật ký hoạt động nhóm
                    </h3>
                  </div>
                  <span className="badge badge-blue">Gần đây</span>
                </div>
                <div className="divide-y divide-[var(--border-default)] max-h-[600px] overflow-y-auto custom-scrollbar">
                  {auditLogs.length > 0 ? (
                    auditLogs.slice(0, 30).map((log: any, i: number) => (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        key={log.id}
                        className="flex items-start gap-3.5 px-5 py-4 hover:bg-[var(--bg-subtle)]/70 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#4285F4]/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-4 h-4 text-[#4285F4]" strokeWidth={1.85} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              {log.action}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                              {new Date(log.time).toLocaleTimeString('vi', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              · {new Date(log.time).toLocaleDateString('vi')}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {log.target && (
                              <span className="text-[#4285F4] font-semibold">{log.target}</span>
                            )}
                            {log.detail && <span> — {log.detail}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="px-5 py-16 text-center text-[var(--text-secondary)]">
                      Chưa có hoạt động nào được ghi lại.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
