// @ts-nocheck
// src/App.jsx
/* __AUTHOR__: Phạm Thiên - 2X18 */
import React, { useState, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Navigate,
  Link, useLocation, useNavigate
} from 'react-router-dom';
import {
  LayoutDashboard, User, BookOpen, ClipboardList, Map, Calendar,
  LogOut, ShieldCheck, ChevronRight, ChevronLeft, AlertTriangle, Bell,
  Vote, Users, Trophy, Menu, X, CheckCircle, Info, AlertCircle as AlertCircleIcon,
  Trash2, FileText, Layers
} from 'lucide-react';

import { AppProvider, useApp } from './context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './components/UserAvatar';
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Subjects = lazy(() => import('./pages/Subjects'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Voting = lazy(() => import('./pages/Voting'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Gamification = lazy(() => import('./pages/Gamification'));
const Trash = lazy(() => import('./pages/Trash'));
const Reports = lazy(() => import('./pages/Reports'));
const Vocab = lazy(() => import('./pages/Vocab'));
const FlashcardSet = lazy(() => import('./pages/FlashcardSet'));
import AIChatbot from './components/AIChatbot';

// ── Toast ──────────────────────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, rmToast } = useApp();
  if (!toasts?.length) return null;
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />,
    error: <AlertCircleIcon className="w-4 h-4 text-red-400   shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400  shrink-0" />,
  };
  const borders = { success: 'border-green-500/30', error: 'border-red-500/30', info: 'border-blue-500/30' };
  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 bg-[#1e1e1e] border ${borders[t.type] || 'border-gray-700'} rounded-2xl px-4 py-3 shadow-2xl pointer-events-auto fade-in`}>
          {icons[t.type] || icons.info}
          <span className="text-sm text-gray-200 flex-1 leading-snug">{t.msg}</span>
          <button onClick={() => rmToast(t.id)} className="text-gray-600 hover:text-white shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── UserProfileModal ───────────────────────────────────────────────────────
function UserProfileModal() {
  const { selectedProfileUser, setSelectedProfileUser } = useApp();
  if (!selectedProfileUser) return null;

  const user = selectedProfileUser;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => setSelectedProfileUser(null)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-24 bg-gradient-to-r from-blue-600/40 to-purple-600/40">
          <button onClick={() => setSelectedProfileUser(null)} className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white/80 hover:text-white backdrop-blur-md transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-14 relative">
          <div className="absolute -top-12 left-6 border-4 border-[#1e1e1e] rounded-full">
            <UserAvatar user={user} size={80} className="shadow-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-black text-white leading-none">{user.fullName}</h2>
              {user.status === 'active' && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
            <div className="text-sm font-bold text-blue-400 uppercase tracking-widest">{user.role || 'Member'}</div>
          </div>

          <div className="mt-6 space-y-3">
            {user.mssv && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-xl bg-[#252525] flex items-center justify-center text-gray-500 shrink-0"><Info className="w-4 h-4" /></div>
                <div><div className="text-[10px] text-gray-500 uppercase font-bold">MSSV</div><div>{user.mssv}</div></div>
              </div>
            )}
            {(user.email || user.mailSchool) && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-xl bg-[#252525] flex items-center justify-center text-gray-500 shrink-0"><AlertCircleIcon className="w-4 h-4" /></div>
                <div className="min-w-0"><div className="text-[10px] text-gray-500 uppercase font-bold">Email</div><div className="truncate">{user.mailSchool || user.email}</div></div>
              </div>
            )}
            {user.gender && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-xl bg-[#252525] flex items-center justify-center text-gray-500 shrink-0"><User className="w-4 h-4" /></div>
                <div><div className="text-[10px] text-gray-500 uppercase font-bold">Giới tính</div><div>{user.gender}</div></div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("App Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Phát hiện lỗi hiển thị</h2>
          <p className="text-gray-400 text-sm max-w-md mb-6">Dữ liệu chưa tải kịp hoặc có lỗi xảy ra. Hãy thử làm mới trang.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
            LÀM MỚI TRANG
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── NavItem ────────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, disabled, badge, onClick, danger, isCollapsed }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  if (disabled) return (
    <li>
      <div
        title={isCollapsed ? `${label} (Đang khóa 🔒)` : undefined}
        className={`flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-xl text-gray-700 cursor-not-allowed select-none relative group`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium flex-1 truncate">{label}</span>}
        {!isCollapsed && <span className="text-[10px] opacity-40">🔒</span>}
        {isCollapsed && (
          <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-[#252525] text-gray-400 text-xs font-semibold rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5">
            <span>{label}</span>
            <span className="text-[10px]">🔒</span>
          </div>
        )}
      </div>
    </li>
  );

  return (
    <li>
      <Link to={to} onClick={onClick}
        title={isCollapsed ? label : undefined}
        className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'} rounded-xl transition-all font-medium text-sm relative group ${isActive
            ? danger
              ? 'active bg-red-600/15 text-red-400'
              : 'active bg-blue-600/15 text-blue-400'
            : danger
              ? 'text-gray-600 hover:bg-red-500/10 hover:text-red-400'
              : 'text-gray-400 hover:bg-[#252525] hover:text-gray-200'
          }`}>
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? (danger ? 'text-red-400' : 'text-blue-400') : ''}`} />
        {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
        {!isCollapsed && badge > 0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {isCollapsed && badge > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#1a1a1a]" />
        )}
        {!isCollapsed && isActive && <ChevronRight className={`w-3 h-3 shrink-0 ${danger ? 'text-red-400/50' : 'text-blue-400/50'}`} />}
        {isCollapsed && (
          <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-[#252525] text-white text-xs font-semibold rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5">
            <span>{label}</span>
            {badge > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ onClose, isCollapsed = false, onToggleCollapse }) {
  const { currentUser, isCore, isSuperAdmin, logout, unreadCount, isProfileComplete, trash } = useApp();
  const navigate = useNavigate();
  const complete = isProfileComplete(currentUser);
  const trashCount = (trash || []).length;
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => { setShowLogoutConfirm(true); };
  const confirmLogout = () => { logout(); navigate('/auth', { replace: true }); onClose?.(); };

  return (
    <>
      <aside className={`${isCollapsed ? 'w-[72px]' : 'w-60'} shrink-0 h-full bg-[#1a1a1a] border-r border-gray-800/60 flex flex-col relative z-10 transition-[width] duration-300 ease-in-out`}>
        {/* Logo & Collapse button */}
        <div className={`px-4 py-4 border-b border-gray-800/60 flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/icon-192.jpg" alt="2X" className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-md" />
            {!isCollapsed && (
              <div className="truncate">
                <div className="text-white font-black text-base leading-none">2X18</div>
                <div className="text-gray-500 text-[10px] mt-0.5">K70 CNBD</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
                className="hidden lg:flex p-1.5 text-gray-400 hover:text-white hover:bg-[#252525] rounded-lg transition-colors"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar">
          {/* Chính */}
          {!isCollapsed ? (
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5">Chính</div>
          ) : (
            <div className="my-1.5 border-t border-gray-800/60 mx-1" />
          )}
          <ul className="space-y-0.5">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/profile" icon={User} label="Hồ sơ & GPA" onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/subjects" icon={BookOpen} label="Môn học & SME" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/tasks" icon={ClipboardList} label="Tiến độ & Task" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/vocab" icon={Layers} label="Vocabulary" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/roadmap" icon={Map} label="Lộ trình" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/calendar" icon={Calendar} label="Lịch trình" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
          </ul>

          {/* Nhóm */}
          {!isCollapsed ? (
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5 mt-4">Nhóm</div>
          ) : (
            <div className="my-2 border-t border-gray-800/60 mx-1" />
          )}
          <ul className="space-y-0.5">
            <NavItem to="/reports" icon={FileText} label="Báo cáo & Sự kiện" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/voting" icon={Vote} label="Bình chọn" badge={0} disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/attendance" icon={Users} label="Điểm danh" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/gamification" icon={Trophy} label="Vinh danh" disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
            <NavItem to="/notifications" icon={Bell} label="Thông báo" badge={unreadCount} disabled={!complete} onClick={onClose} isCollapsed={isCollapsed} />
          </ul>

          {/* Core */}
          {(isCore || isSuperAdmin) && (
            <>
              {!isCollapsed ? (
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5 mt-4">Core</div>
              ) : (
                <div className="my-2 border-t border-gray-800/60 mx-1" />
              )}
              <ul className="space-y-0.5">
                <li>
                  {!isCollapsed ? (
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 text-sm">
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium flex-1">Quản trị</span>
                      <span className="badge badge-blue">{isSuperAdmin ? 'Super' : 'Core'}</span>
                    </div>
                  ) : (
                    <div title={`Quản trị (${isSuperAdmin ? 'Super' : 'Core'})`} className="flex items-center justify-center p-2.5 rounded-xl text-gray-500 text-sm relative group">
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-[#252525] text-white text-xs font-semibold rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 pointer-events-none items-center gap-1.5">
                        <span>Quản trị ({isSuperAdmin ? 'Super' : 'Core'})</span>
                      </div>
                    </div>
                  )}
                </li>
                <NavItem
                  to="/trash"
                  icon={Trash2}
                  label="Thùng rác"
                  badge={trashCount}
                  danger
                  onClick={onClose}
                  isCollapsed={isCollapsed}
                />
              </ul>
            </>
          )}
        </nav>

        {/* Profile incomplete warning */}
        {!complete && (
          <div className={`mx-2 mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl ${isCollapsed ? 'flex justify-center' : ''}`}>
            {!isCollapsed ? (
              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400 leading-tight">
                  Vào <strong>Hồ sơ</strong> điền đủ 5 trường cơ bản để mở khóa
                </p>
              </div>
            ) : (
              <div title="Vào Hồ sơ điền đủ 5 trường cơ bản để mở khóa" className="relative group">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div className="hidden lg:group-hover:flex absolute left-full ml-3 bottom-0 px-2.5 py-1 bg-[#252525] text-amber-400 text-xs rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 pointer-events-none">
                  Điền đủ 5 trường để mở khóa
                </div>
              </div>
            )}
          </div>
        )}

        {/* User info */}
        <div className="px-2.5 pb-3 pt-2 border-t border-gray-800/60">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#222]">
              <UserAvatar user={currentUser} size={32} isMe />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-200 truncate">{currentUser?.fullName || 'Thành viên'}</div>
                <div className="text-[10px] text-gray-500 truncate">{currentUser?.role || 'member'}</div>
              </div>
              <button onClick={handleLogout} title="Đăng xuất" className="p-1">
                <LogOut className="w-4 h-4 text-gray-600 hover:text-red-400 transition-colors" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <UserAvatar user={currentUser} size={32} isMe />
                <div className="hidden lg:group-hover:flex absolute left-full ml-3 bottom-0 px-2.5 py-1.5 bg-[#252525] text-white text-xs rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 flex-col pointer-events-none">
                  <span className="font-bold">{currentUser?.fullName || 'Thành viên'}</span>
                  <span className="text-[10px] text-gray-400">{currentUser?.role || 'member'}</span>
                </div>
              </div>
              <button onClick={handleLogout} title="Đăng xuất" className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#252525] rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1e1e1e] border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <LogOut className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Đăng xuất?</h3>
              <p className="text-sm text-gray-400 mb-6">Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-[#252525] hover:bg-gray-700 text-white font-bold rounded-xl transition-colors">Không</button>
                <button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-900/20">Có, Đăng xuất</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Page Transition Wrapper ────────────────────────────────────────────────
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

// ── Loading Screen ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-5">
      <img src="/icon-192.jpg" alt="Logo" className="w-24 h-24 rounded-3xl object-cover animate-pulse" />
      <div className="text-sm font-black text-blue-400 tracking-widest uppercase animate-pulse text-center px-4">
        2X18 - NÓI KHÔNG VỚI VÔ KỶ LUẬT
      </div>
    </div>
  );
}

// ── Protected Layout ───────────────────────────────────────────────────────
function AppLayout() {
  const { currentUser, isLoading } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!currentUser) return <Navigate to="/auth" replace />;

  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebarCollapse} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} isCollapsed={false} />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-gray-800/60 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-[#252525] rounded-lg">
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
          <div className="font-black text-blue-400 text-lg">2X18</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
                <Route path="/subjects" element={<PageTransition><Subjects /></PageTransition>} />
                <Route path="/tasks" element={<PageTransition><Tasks /></PageTransition>} />
                <Route path="/roadmap" element={<PageTransition><Roadmap /></PageTransition>} />
                <Route path="/calendar" element={<PageTransition><CalendarPage /></PageTransition>} />
                <Route path="/voting" element={<PageTransition><Voting /></PageTransition>} />
                <Route path="/notifications" element={<PageTransition><Notifications /></PageTransition>} />
                <Route path="/attendance" element={<PageTransition><Attendance /></PageTransition>} />
                <Route path="/gamification" element={<PageTransition><Gamification /></PageTransition>} />
                <Route path="/trash" element={<PageTransition><Trash /></PageTransition>} />
                <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
                <Route path="/vocab" element={<PageTransition><Vocab /></PageTransition>} />
                <Route path="/vocab/:setId" element={<PageTransition><FlashcardSet /></PageTransition>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <AIChatbot />
      <ToastContainer />
      <UserProfileModal />
    </div>
  );
}

// ── Auth Wrapper ───────────────────────────────────────────────────────────
function AuthWrapper() {
  const { currentUser, isLoading } = useApp();
  if (isLoading) return <LoadingScreen />;
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<LoadingScreen />}><Auth /><ToastContainer /></Suspense>;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthWrapper />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}
