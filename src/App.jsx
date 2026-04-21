// src/App.jsx
import React, { useState } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Navigate,
  Link, useLocation, useNavigate
} from 'react-router-dom';
import {
  LayoutDashboard, User, BookOpen, ClipboardList, Map, Calendar,
  LogOut, ShieldCheck, ChevronRight, AlertTriangle, Bell,
  Vote, Users, Trophy, Menu, X, CheckCircle, Info, AlertCircle as AlertCircleIcon,
  Trash2, FileText, Layers
} from 'lucide-react';

import { AppProvider, useApp } from './context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './components/UserAvatar';
import Auth          from './pages/Auth';
import Profile       from './pages/Profile';
import Subjects      from './pages/Subjects';
import Dashboard     from './pages/Dashboard';
import Tasks         from './pages/Tasks';
import Roadmap       from './pages/Roadmap';
import CalendarPage  from './pages/CalendarPage';
import Voting        from './pages/Voting';
import Notifications from './pages/Notifications';
import Attendance    from './pages/Attendance';
import Gamification  from './pages/Gamification';
import Trash         from './pages/Trash';
import Reports       from './pages/Reports';
import Vocab         from './pages/Vocab';
import FlashcardSet  from './pages/FlashcardSet';
import AIChatbot     from './components/AIChatbot';

// ── Toast ──────────────────────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, rmToast } = useApp();
  if (!toasts?.length) return null;
  const icons = {
    success: <CheckCircle     className="w-4 h-4 text-green-400 shrink-0"/>,
    error:   <AlertCircleIcon className="w-4 h-4 text-red-400   shrink-0"/>,
    info:    <Info            className="w-4 h-4 text-blue-400  shrink-0"/>,
  };
  const borders = { success:'border-green-500/30', error:'border-red-500/30', info:'border-blue-500/30' };
  return (
    <div className="fixed bottom-5 right-5 z-[999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 bg-[#1e1e1e] border ${borders[t.type]||'border-gray-700'} rounded-2xl px-4 py-3 shadow-2xl pointer-events-auto fade-in`}>
          {icons[t.type]||icons.info}
          <span className="text-sm text-gray-200 flex-1 leading-snug">{t.msg}</span>
          <button onClick={()=>rmToast(t.id)} className="text-gray-600 hover:text-white shrink-0">
            <X className="w-3.5 h-3.5"/>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Đã xảy ra lỗi ứng dụng</h2>
          <p className="text-gray-400 text-sm max-w-md mb-6">
            Hệ thống gặp sự cố khi hiển thị trang này. Thử làm mới trang hoặc quay lại sau.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
          >
            LÀM MỚI TRANG
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── NavItem ────────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, disabled, badge, onClick, danger }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  if (disabled) return (
    <li>
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 cursor-not-allowed select-none">
        <Icon className="w-4 h-4 shrink-0"/>
        <span className="text-sm font-medium flex-1">{label}</span>
        <span className="text-[10px] opacity-40">🔒</span>
      </div>
    </li>
  );

  return (
    <li>
      <Link to={to} onClick={onClick}
        className={`sidebar-item flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
          isActive
            ? danger
              ? 'active bg-red-600/15 text-red-400'
              : 'active bg-blue-600/15 text-blue-400'
            : danger
              ? 'text-gray-600 hover:bg-red-500/10 hover:text-red-400'
              : 'text-gray-400 hover:bg-[#252525] hover:text-gray-200'
        }`}>
        <Icon className={`w-4 h-4 shrink-0 ${isActive?(danger?'text-red-400':'text-blue-400'):''}`}/>
        <span className="flex-1">{label}</span>
        {badge>0 && (
          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
            {badge>99?'99+':badge}
          </span>
        )}
        {isActive && <ChevronRight className={`w-3 h-3 shrink-0 ${danger?'text-red-400/50':'text-blue-400/50'}`}/>}
      </Link>
    </li>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ onClose }) {
  const { currentUser, isCore, isSuperAdmin, logout, unreadCount, isProfileComplete, trash } = useApp();
  const navigate = useNavigate();
  const complete  = isProfileComplete(currentUser);
  const initials  = (currentUser?.fullName||'NT').split(' ').filter(Boolean).map(w=>w[0]).slice(-2).join('').toUpperCase();
  const trashCount = (trash||[]).length;

  const handleLogout = () => { logout(); navigate('/auth',{replace:true}); onClose?.(); };

  return (
    <aside className="w-60 shrink-0 h-full bg-[#1a1a1a] border-r border-gray-800/60 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm">2X</div>
          <div>
            <div className="text-white font-black text-base leading-none">2X18</div>
            <div className="text-gray-500 text-[10px] mt-0.5">HUS K70</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-white">
            <X className="w-5 h-5"/>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto custom-scrollbar">
        {/* Chính */}
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4 mb-1.5">Chính</div>
        <ul className="space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard"      disabled={!complete} onClick={onClose}/>
          <NavItem to="/profile"   icon={User}            label="Hồ sơ & GPA"                        onClick={onClose}/>
          <NavItem to="/subjects"  icon={BookOpen}        label="Môn học & SME"  disabled={!complete} onClick={onClose}/>
          <NavItem to="/tasks"     icon={ClipboardList}   label="Tiến độ & Task" disabled={!complete} onClick={onClose}/>
          <NavItem to="/vocab"     icon={Layers}          label="Vocabulary"      disabled={!complete} onClick={onClose}/>
          <NavItem to="/roadmap"   icon={Map}             label="Lộ trình"       disabled={!complete} onClick={onClose}/>
          <NavItem to="/calendar"  icon={Calendar}        label="Lịch trình"     disabled={!complete} onClick={onClose}/>
        </ul>

        {/* Nhóm */}
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4 mb-1.5 mt-4">Nhóm</div>
        <ul className="space-y-0.5">
          <NavItem to="/reports"       icon={FileText} label="Báo cáo & Sự kiện"            disabled={!complete} onClick={onClose}/>
          <NavItem to="/voting"        icon={Vote}   label="Bình chọn" badge={0}           disabled={!complete} onClick={onClose}/>
          <NavItem to="/attendance"    icon={Users}  label="Điểm danh"                     disabled={!complete} onClick={onClose}/>
          <NavItem to="/gamification"  icon={Trophy} label="Vinh danh"                     disabled={!complete} onClick={onClose}/>
          <NavItem to="/notifications" icon={Bell}   label="Thông báo" badge={unreadCount} disabled={!complete} onClick={onClose}/>
        </ul>

        {/* Core */}
        {(isCore||isSuperAdmin) && (
          <>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-4 mb-1.5 mt-4">Core</div>
            <ul className="space-y-0.5">
              <li>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 text-sm">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0"/>
                  <span className="font-medium flex-1">Quản trị</span>
                  <span className="badge badge-blue">{isSuperAdmin?'Super':'Core'}</span>
                </div>
              </li>
              <NavItem
                to="/trash"
                icon={Trash2}
                label="Thùng rác"
                badge={trashCount}
                danger
                onClick={onClose}
              />
            </ul>
          </>
        )}
      </nav>

      {/* Profile incomplete warning */}
      {!complete && (
        <div className="mx-3 mb-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"/>
            <p className="text-[10px] text-amber-400 leading-tight">
              Vào <strong>Hồ sơ</strong> điền đủ 5 trường cơ bản để mở khóa
            </p>
          </div>
        </div>
      )}

      {/* User info */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-800/60">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#222]">
          <UserAvatar user={currentUser} size={32} isMe />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-gray-200 truncate">{currentUser?.fullName||'Thành viên'}</div>
            <div className="text-[10px] text-gray-500 truncate">{currentUser?.role||'member'}</div>
          </div>
          <button onClick={handleLogout} title="Đăng xuất" className="p-1">
            <LogOut className="w-4 h-4 text-gray-600 hover:text-red-400 transition-colors"/>
          </button>
        </div>
      </div>
    </aside>
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

// ── Protected Layout ───────────────────────────────────────────────────────
function AppLayout() {
  const { currentUser, isLoading } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg animate-pulse">2X</div>
    </div>
  );

  if (!currentUser) return <Navigate to="/auth" replace/>;

  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden">
      <div className="hidden lg:flex"><Sidebar/></div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setSidebarOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-60 z-50">
            <Sidebar onClose={()=>setSidebarOpen(false)}/>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-gray-800/60 shrink-0">
          <button onClick={()=>setSidebarOpen(true)} className="p-1.5 hover:bg-[#252525] rounded-lg">
            <Menu className="w-5 h-5 text-gray-400"/>
          </button>
          <div className="font-black text-blue-400 text-lg">2X18</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/dashboard"     element={<PageTransition><Dashboard   /></PageTransition>}/>
                <Route path="/profile"       element={<PageTransition><Profile     /></PageTransition>}/>
                <Route path="/subjects"      element={<PageTransition><Subjects    /></PageTransition>}/>
                <Route path="/tasks"         element={<PageTransition><Tasks       /></PageTransition>}/>
                <Route path="/roadmap"       element={<PageTransition><Roadmap     /></PageTransition>}/>
                <Route path="/calendar"      element={<PageTransition><CalendarPage/></PageTransition>}/>
                <Route path="/voting"        element={<PageTransition><Voting      /></PageTransition>}/>
                <Route path="/notifications" element={<PageTransition><Notifications/></PageTransition>}/>
                <Route path="/attendance"    element={<PageTransition><Attendance  /></PageTransition>}/>
                <Route path="/gamification"  element={<PageTransition><Gamification/></PageTransition>}/>
                <Route path="/trash"         element={<PageTransition><Trash       /></PageTransition>}/>
                <Route path="/reports"       element={<PageTransition><Reports     /></PageTransition>}/>
                <Route path="/vocab"         element={<PageTransition><Vocab       /></PageTransition>}/>
                <Route path="/vocab/:setId"  element={<PageTransition><FlashcardSet/></PageTransition>}/>
                <Route path="*"              element={<Navigate to="/dashboard" replace/>}/>
              </Routes>
            </AnimatePresence>
          </ErrorBoundary>
        </div>
      </main>

      <AIChatbot/>
      <ToastContainer/>
    </div>
  );
}

// ── Auth Wrapper ───────────────────────────────────────────────────────────
function AuthWrapper() {
  const { currentUser, isLoading } = useApp();
  if (isLoading) return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg animate-pulse">2X</div>
    </div>
  );
  if (currentUser) return <Navigate to="/dashboard" replace/>;
  return <Auth/>;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthWrapper/>}/>
          <Route path="/*"    element={<AppLayout  />}/>
        </Routes>
      </Router>
    </AppProvider>
  );
}
