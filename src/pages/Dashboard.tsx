import React, { useMemo, useState } from 'react';
import {
  TrendingUp, BookOpen, AlertCircle, Clock, Zap,
  CheckCircle2, Activity, Sparkles, Loader2, BarChart2
} from 'lucide-react';
import { subjectDatabase } from '../data';
import { useApp } from '../context/AppContext';
import { analyzeEarlyWarning } from '../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';

import { useSemesterNames, computeCPA, cpaColor } from '../utils/dashboardUtils';
import { SemesterSelector } from '../components/dashboard/SemesterSelector';
import { GroupGPACard } from '../components/dashboard/GroupGPACard';
import { LearningProgressCard } from '../components/dashboard/LearningProgressCard';
import { RadarChartCard } from '../components/dashboard/RadarChartCard';
import { GroupVelocityCard } from '../components/dashboard/GroupVelocityCard';
import { StatCard } from '../components/dashboard/StatCard';

import {
  useMembers, useTasks, useSmeMap, useAuditLogs,
  useContributions, useSemesterLabels, useAttendance
} from '../hooks/useDomainQueries';

export default function Dashboard() {
  const { currentUser, grades: allGrades, updateSemesterLabel } = useApp();
  
  const { data: members = [] } = useMembers();
  const { data: tasks = [] } = useTasks();
  const { data: smeMap = {} } = useSmeMap();
  const { data: auditLogs = [] } = useAuditLogs();
  const { data: contributions = {} } = useContributions();
  const { data: semesterLabels = {} } = useSemesterLabels();
  const { data: attendance = [] } = useAttendance();

  const myGrades = allGrades[currentUser?.id] || {};
  const myTasks = tasks.filter((t: any) => t.assignees?.includes(currentUser?.id));

  const [semesterNames, updateSemesterName] = useSemesterNames(semesterLabels, updateSemesterLabel);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const handleAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await analyzeEarlyWarning(members, attendance, tasks);
      setAiAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const myStats = useMemo(() => computeCPA(myGrades), [myGrades]);

  const mySmeSubjects = useMemo(() =>
    Object.entries(smeMap)
      .filter(([, name]) => name === currentUser?.fullName)
      .map(([id]) => subjectDatabase.find(s => s.id === id))
      .filter(Boolean),
    [smeMap, currentUser?.id]
  );

  const upcomingTasks = useMemo(() =>
    [...myTasks].filter(t => !t.done)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5),
    [myTasks]
  );

  const topMembers = useMemo(() =>
    [...members]
      .map(m => ({ ...m, points: Number(contributions[m.id]) || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5),
    [members, contributions]
  );

  const daysDiff = d => Math.ceil((new Date(d).getTime() - new Date().getTime()) / 86400000);

  return (
    <div className="h-full bg-[#121212] text-gray-200 overflow-y-auto custom-scrollbar">
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-30 bg-[#121212]/80 backdrop-blur-md border-b border-gray-800/60 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-white">Dashboard</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Chào, {currentUser?.fullName?.split(' ').pop()}!</p>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-gray-800">
            {[
              { id: 'overview', label: 'Tổng quan', icon: BarChart2 },
              { id: 'analytics', label: 'Phân tích', icon: Sparkles },
              { id: 'activity', label: 'Hoạt động', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-gray-800">
            <div className="text-right">
              <div className="text-sm font-black text-blue-400">
                {((myStats.credits / 133) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Tiến độ tín chỉ</div>
            </div>
            
            {/* Vòng tròn tiến độ siêu nhỏ */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-800" />
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - myStats.credits / 133)}`}
                  strokeLinecap="round"
                  className="text-blue-500 transition-all duration-1000 ease-out" />
              </svg>
              <span className="absolute text-[9px] font-black text-gray-300">{myStats.credits}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="p-6 space-y-6"
            >
              {/* Quick Stats Row */}
              <motion.div
                variants={{
                  show: { transition: { staggerChildren: 0.1 } }
                }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <StatCard icon={TrendingUp} label="CPA Hiện tại" value={myStats.cpa} valueClass={cpaColor(myStats.cpa)} sub="Hệ 4.0" color="green" to="/profile" navState={{ tab: 'grades' }} />
                <StatCard icon={CheckCircle2} label="Tín chỉ" value={myStats.credits} sub="/ 133 TC" color="blue" to="/roadmap" />
                <StatCard icon={BookOpen} label="Đang học" value={myStats.learning} sub="Môn học" color="purple" to="/subjects" />
                <StatCard icon={AlertCircle} label="Task chờ" value={myTasks.filter(t => !t.done).length} sub="Cần xử lý" color="red" to="/tasks" />
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column: Tasks & GPA */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Upcoming Deadlines */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="px-5 py-4 border-b border-gray-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-400" />
                        <h3 className="font-bold text-white text-sm">Việc cần làm ngay</h3>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sắp đến hạn</span>
                    </div>
                    <div className="divide-y divide-gray-800/40">
                      {upcomingTasks.length > 0 ? upcomingTasks.map(t => {
                        const d = daysDiff(t.deadline);
                        return (
                          <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#222] transition-colors group">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-gray-200 truncate group-hover:text-blue-400 transition-colors">{t.task}</div>
                              <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-gray-800 rounded text-blue-400 font-bold">{t.subjectId}</span>
                                <span>· {t.deadline}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${d <= 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : d <= 3 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-gray-800 text-gray-500'}`}>
                              {d <= 0 ? 'TRỄ HẠN' : d === 0 ? 'HÔM NAY' : `CÒN ${d} NGÀY`}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="px-5 py-10 text-center text-gray-600">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Tuyệt vời! Bạn không có task nào đang chờ.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Semester Summary */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <SemesterSelector semGPA={myStats.semGPA} semesterNames={semesterNames} updateSemesterName={updateSemesterName} />
                  </motion.div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                  {/* SME subjects */}
                  {mySmeSubjects.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-2xl p-5"
                    >
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Môn phụ trách (SME)
                      </h3>
                      <div className="space-y-3">
                        {mySmeSubjects.map(s => (
                          <div key={s.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white truncate">{s.name}</div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase">{s.code}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Group At A Glance */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5"
                  >
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Nhóm 2X18</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Thành viên</span>
                        <span className="text-xs font-black text-white">{members.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Phân hệ Core</span>
                        <span className="text-xs font-black text-white">{members.filter(m => m.role === 'core' || m.role === 'super_admin').length}</span>
                      </div>
                      <div className="pt-4 border-t border-gray-800/60">
                        <div className="text-[10px] font-bold text-gray-600 uppercase mb-3">Top cống hiến</div>
                        <div className="space-y-3">
                          {topMembers.slice(0, 3).map((m, i) => (
                            <div key={m.id} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">{i + 1}</div>
                              <span className="text-xs text-gray-400 flex-1 truncate">{m.fullName.split(' ').pop()}</span>
                              <span className="text-xs font-black text-blue-400">{m.points}đ</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="p-6 space-y-6"
            >
              {/* AI Analysis Header */}
              <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    AI Phân tích sức khỏe nhóm
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Phân tích chuyên sâu dựa trên Task và Điểm danh</p>
                </div>
                <button
                  onClick={handleAiAnalysis}
                  disabled={isAiAnalyzing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
                >
                  {isAiAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  CHẠY PHÂN TÍCH
                </button>
              </div>

              {aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="md:col-span-2 bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Cảnh báo thành viên</h4>
                    <div className="space-y-3">
                      {aiAnalysis.warnings?.length > 0 ? aiAnalysis.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                          <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${w.level === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                          <div>
                            <div className="text-xs font-bold text-gray-200">{w.memberName}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{w.reason}</div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-xs text-gray-600 italic">Chưa phát hiện dấu hiệu bất thường nào.</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Gợi ý từ AI</h4>
                    <div className="text-xs text-blue-400 font-medium leading-relaxed bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                      "{aiAnalysis.suggestion}"
                    </div>
                    <div className="mt-4">
                      <div className="text-[10px] font-bold text-gray-600 mb-2 uppercase">Trạng thái chung</div>
                      <div className={`text-xs font-black uppercase tracking-widest ${aiAnalysis.overallHealth === 'good' ? 'text-green-400' :
                        aiAnalysis.overallHealth === 'warning' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {aiAnalysis.overallHealth === 'good' ? 'ỔN ĐỊNH' :
                          aiAnalysis.overallHealth === 'warning' ? 'CẦN CHÚ Ý' : 'NGUY CẤP'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GroupGPACard myGrades={myGrades} allGrades={allGrades} members={members} />
                <LearningProgressCard myGrades={myGrades} allGrades={allGrades} members={members} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RadarChartCard myGrades={myGrades} />
                <GroupVelocityCard allGrades={allGrades} members={members} />
              </div>
            </motion.div>
          )}
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="p-6 space-y-6"
            >
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-white text-sm">Nhật ký hoạt động</h3>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gần đây</span>
                </div>
                <div className="divide-y divide-gray-800/40 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {auditLogs.length > 0 ? (
                    auditLogs.slice(0, 30).map((log, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={log.id}
                        className="flex items-start gap-4 px-6 py-4 hover:bg-[#1e1e1e] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-sm font-bold text-gray-200">{log.action}</span>
                            <span className="text-[10px] text-gray-600 whitespace-nowrap">
                              {new Date(log.time).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })} · {new Date(log.time).toLocaleDateString('vi')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.target && <span className="text-blue-400 font-semibold">{log.target}</span>}
                            {log.detail && <span> — {log.detail}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="px-5 py-20 text-center text-gray-600">
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
