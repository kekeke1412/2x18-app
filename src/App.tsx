// src/App.tsx
/* __AUTHOR__: Phạm Thiên - 2X18 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  BookOpen,
  ClipboardList,
  Map,
  Calendar,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Bell,
  Vote,
  Users,
  Trophy,
  Menu,
  X,
  CheckCircle,
  Info,
  AlertCircle as AlertCircleIcon,
  Trash2,
  FileText,
  Layers,
  MoreHorizontal,
} from 'lucide-react';

import { AppProvider, useApp } from './context/AppContext';
import { REQUIRED_FIELDS } from './constants/profileConstants';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './components/UserAvatar';
import GlassDialog from './components/ui/GlassDialog';
import ThemeToggle from './components/ui/ThemeToggle';

const AIChatbot = lazy(() => import('./components/AIChatbot'));
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

// ── Ambient Multi-Layer Liquid Background ──────────────────────────────────
function AmbientLiquidBackground() {
  return (
    <div className="liquid-ambient-bg" aria-hidden="true">
      <div
        className="liquid-blob w-80 h-80 -top-16 -left-16"
        style={{ background: 'rgba(66, 133, 244, 0.28)' }}
      />
      <div
        className="liquid-blob w-96 h-96 top-1/4 -right-24"
        style={{ background: 'rgba(52, 168, 83, 0.22)', animationDelay: '-7s' }}
      />
      <div
        className="liquid-blob w-80 h-80 -bottom-20 left-1/3"
        style={{ background: 'rgba(251, 188, 5, 0.18)', animationDelay: '-14s' }}
      />
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, rmToast } = useApp();
  if (!toasts?.length) return null;
  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-[#34A853] shrink-0" />,
    error: <AlertCircleIcon className="w-4 h-4 text-[#EA4335] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#4285F4] shrink-0" />,
  };
  const borders: Record<string, string> = {
    success: 'border-[#34A853]/40',
    error: 'border-[#EA4335]/40',
    info: 'border-[#4285F4]/40',
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-[999] flex flex-col gap-2 sm:max-w-sm w-auto sm:w-full pointer-events-none"
    >
      {toasts.map((t: any) => (
        <div
          key={t.id}
          className={`glass-strong flex items-start gap-3 border ${
            borders[t.type] || 'border-[var(--border-default)]'
          } rounded-2xl px-4 py-3 pointer-events-auto fade-in`}
        >
          {icons[t.type] || icons.info}
          <span className="text-sm font-medium text-[var(--text-primary)] flex-1 leading-snug">
            {t.msg}
          </span>
          <button
            type="button"
            onClick={() => rmToast(t.id)}
            aria-label="Đóng thông báo"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── UserProfileModal (Native <dialog> via GlassDialog) ─────────────────────
function UserProfileModal() {
  const { selectedProfileUser, setSelectedProfileUser } = useApp();
  if (!selectedProfileUser) return null;

  const user = selectedProfileUser;
  return (
    <GlassDialog
      open={Boolean(selectedProfileUser)}
      onClose={() => setSelectedProfileUser(null)}
      title={user.fullName || 'Hồ sơ thành viên'}
      subtitle={String(user.role || 'Member').toUpperCase()}
      variant="sheet"
      maxWidthClass="max-w-sm"
    >
      <div className="flex flex-col items-center text-center pb-4 border-b border-[var(--border-default)]">
        <UserAvatar user={user} size={76} className="shadow-lg mb-3" />
        <div className="flex items-center gap-1.5 justify-center">
          <h2 className="text-lg font-black text-[var(--text-primary)]">{user.fullName}</h2>
          {user.status === 'active' && <CheckCircle className="w-4 h-4 text-[#34A853]" />}
        </div>
        <span className="badge badge-blue mt-1 uppercase">{user.role || 'Member'}</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {user.mssv && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] text-sm">
            <div className="w-8 h-8 rounded-xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4] shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                MSSV
              </div>
              <div className="font-bold text-[var(--text-primary)] tabular-nums">{user.mssv}</div>
            </div>
          </div>
        )}
        {(user.email || user.mailSchool) && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] text-sm">
            <div className="w-8 h-8 rounded-xl bg-[#34A853]/15 flex items-center justify-center text-[#34A853] shrink-0">
              <AlertCircleIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                Email
              </div>
              <div className="font-semibold text-[var(--text-primary)] truncate">
                {user.mailSchool || user.email}
              </div>
            </div>
          </div>
        )}
        {user.gender && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] text-sm">
            <div className="w-8 h-8 rounded-xl bg-[#FBBC05]/20 flex items-center justify-center text-[#FBBC05] shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">
                Giới tính
              </div>
              <div className="font-semibold text-[var(--text-primary)]">{user.gender}</div>
            </div>
          </div>
        )}
      </div>
    </GlassDialog>
  );
}

// ── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('App Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-[var(--bg-canvas)] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-[#EA4335]/15 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-[#EA4335]" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">
            Phát hiện lỗi hiển thị
          </h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mb-6">
            Dữ liệu chưa tải kịp hoặc có lỗi xảy ra. Hãy thử làm mới trang.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#4285F4]/25 spring-press"
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
function NavItem({ to, icon: Icon, label, disabled, badge, onClick, danger, isCollapsed }: any) {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== '/dashboard' && pathname.startsWith(`${to}/`));

  if (disabled) {
    return (
      <li>
        <div
          title={isCollapsed ? `${label} (Đang khóa 🔒)` : undefined}
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
          } rounded-2xl text-[var(--text-muted)] opacity-50 cursor-not-allowed select-none relative group min-h-[42px]`}
        >
          <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          {!isCollapsed && <span className="text-sm font-medium flex-1 truncate">{label}</span>}
          {!isCollapsed && <span className="text-[10px]">🔒</span>}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        title={isCollapsed ? label : undefined}
        className={`sidebar-item flex items-center ${
          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'
        } rounded-2xl transition-all font-semibold text-sm relative group min-h-[42px] ${
          isActive
            ? danger
              ? 'active bg-[#EA4335]/15 text-[#EA4335]'
              : 'active bg-[#4285F4]/15 text-[#4285F4]'
            : danger
              ? 'text-[var(--text-secondary)] hover:bg-[#EA4335]/10 hover:text-[#EA4335]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 ${
            isActive ? (danger ? 'text-[#EA4335]' : 'text-[#4285F4]') : ''
          }`}
          strokeWidth={isActive ? 2.1 : 1.8}
        />
        {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
        {!isCollapsed && badge > 0 && (
          <span className="text-[10px] font-bold bg-[#EA4335] text-white px-1.5 py-0.5 rounded-full tabular-nums">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {isCollapsed && badge > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EA4335]" />
        )}
        {!isCollapsed && isActive && (
          <ChevronRight
            className={`w-3.5 h-3.5 shrink-0 ${
              danger ? 'text-[#EA4335]/70' : 'text-[#4285F4]/70'
            }`}
          />
        )}
      </Link>
    </li>
  );
}

// ── Desktop Collapsible Glass Sidebar ──────────────────────────────────────
function Sidebar({ onClose, isCollapsed = false, onToggleCollapse, onRequestLogout }: any) {
  const { currentUser, isCore, isSuperAdmin, unreadCount, isProfileComplete, trash } = useApp();
  const complete = isProfileComplete(currentUser);
  const trashCount = (trash || []).length;
  const requiredCount = REQUIRED_FIELDS.length;

  return (
    <aside
      className={`${
        isCollapsed ? 'w-[76px]' : 'w-64'
      } shrink-0 h-full glass-nav border-r border-[var(--glass-border)] flex flex-col relative z-20 transition-[width] duration-300 ease-in-out`}
    >
      {/* Logo & Collapse button */}
      <div
        className={`px-4 py-4 border-b border-[var(--border-default)] flex items-center ${
          isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/icon-192.jpg"
            alt="2X18"
            className="w-9 h-9 rounded-2xl object-cover shrink-0 shadow-sm border border-[var(--glass-border)]"
          />
          {!isCollapsed && (
            <div className="truncate">
              <div className="text-[var(--text-primary)] font-black text-base leading-none tracking-tight">
                2X18
              </div>
              <div className="text-[var(--text-secondary)] text-[10px] font-semibold mt-0.5">
                K70 CN Bán Dẫn · HUS
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isCollapsed && <ThemeToggle mode="compact" />}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              className="hidden lg:flex min-w-[36px] min-h-[36px] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-xl transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng menu"
              className="lg:hidden min-w-[38px] min-h-[38px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <nav
        aria-label="Điều hướng chính"
        className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar"
      >
        {!isCollapsed ? (
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-1.5">
            Học tập & Cá nhân
          </div>
        ) : (
          <div className="my-1.5 border-t border-[var(--border-default)] mx-1" />
        )}
        <ul className="space-y-0.5">
          <NavItem
            to="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/profile"
            icon={User}
            label="Hồ sơ & GPA"
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/subjects"
            icon={BookOpen}
            label="Môn học & SME"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/tasks"
            icon={ClipboardList}
            label="Tiến độ & Task"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/vocab"
            icon={Layers}
            label="Vocabulary"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/roadmap"
            icon={Map}
            label="Lộ trình"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/calendar"
            icon={Calendar}
            label="Lịch trình"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
        </ul>

        {!isCollapsed ? (
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-1.5 mt-4">
            Hoạt động Nhóm
          </div>
        ) : (
          <div className="my-2 border-t border-[var(--border-default)] mx-1" />
        )}
        <ul className="space-y-0.5">
          <NavItem
            to="/reports"
            icon={FileText}
            label="Báo cáo & Sự kiện"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/voting"
            icon={Vote}
            label="Bình chọn"
            badge={0}
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/attendance"
            icon={Users}
            label="Điểm danh"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/gamification"
            icon={Trophy}
            label="Vinh danh"
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
          <NavItem
            to="/notifications"
            icon={Bell}
            label="Thông báo"
            badge={unreadCount}
            disabled={!complete}
            onClick={onClose}
            isCollapsed={isCollapsed}
          />
        </ul>

        {(isCore || isSuperAdmin) && (
          <>
            {!isCollapsed ? (
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-1.5 mt-4">
                Quản trị Core
              </div>
            ) : (
              <div className="my-2 border-t border-[var(--border-default)] mx-1" />
            )}
            <ul className="space-y-0.5">
              <li>
                {!isCollapsed ? (
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[var(--text-secondary)] text-sm">
                    <ShieldCheck className="w-4 h-4 text-[#4285F4] shrink-0" />
                    <span className="font-semibold flex-1">Phân quyền</span>
                    <span className="badge badge-blue">{isSuperAdmin ? 'Super' : 'Core'}</span>
                  </div>
                ) : (
                  <div
                    title={`Quản trị (${isSuperAdmin ? 'Super' : 'Core'})`}
                    className="flex items-center justify-center p-2.5 rounded-2xl text-[#4285F4]"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
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

      {/* Profile incomplete warning (M-05: 11 required fields) */}
      {!complete && (
        <div
          className={`mx-2.5 mb-2 p-2.5 badge-yellow rounded-2xl ${
            isCollapsed ? 'flex justify-center' : ''
          }`}
        >
          {!isCollapsed ? (
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 text-[#FBBC05] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug font-semibold">
                Vào <strong>Hồ sơ</strong> điền đủ {requiredCount} trường bắt buộc để mở khóa toàn bộ
                tính năng
              </p>
            </div>
          ) : (
            <div title={`Vào Hồ sơ điền đủ ${requiredCount} trường cơ bản để mở khóa`}>
              <AlertTriangle className="w-4 h-4 text-[#FBBC05]" />
            </div>
          )}
        </div>
      )}

      {/* User info footer */}
      <div className="px-2.5 pb-3 pt-2 border-t border-[var(--border-default)]">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <UserAvatar user={currentUser} size={34} isMe />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold text-[var(--text-primary)] truncate">
                {currentUser?.fullName || 'Thành viên'}
              </div>
              <div className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase truncate">
                {currentUser?.role || 'member'}
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[#EA4335] hover:bg-[#EA4335]/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ThemeToggle mode="compact" />
            <UserAvatar user={currentUser} size={32} isMe />
            <button
              type="button"
              onClick={onRequestLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#EA4335] rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Mobile Floating Glass Bottom Tab Bar (Apple iOS Style) ─────────────────
function MobileBottomTabBar({ onOpenMoreSheet }: { onOpenMoreSheet: () => void }) {
  const { pathname } = useLocation();
  const { currentUser, isProfileComplete, unreadCount } = useApp();
  const complete = isProfileComplete(currentUser);

  const primaryTabs = [
    { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, locked: !complete },
    { to: '/tasks', label: 'Nhiệm vụ', icon: ClipboardList, locked: !complete },
    { to: '/subjects', label: 'Môn học', icon: BookOpen, locked: !complete },
    { to: '/profile', label: 'Hồ sơ', icon: User, locked: false },
  ];

  const isMoreActive = !primaryTabs.some(t => pathname === t.to);

  return (
    <nav
      aria-label="Thanh điều hướng nhanh"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom,8px),8px)] pt-1 pointer-events-none"
    >
      <div className="glass-nav pointer-events-auto mx-auto max-w-md rounded-[24px] px-2 py-1.5 flex items-center justify-around border border-[var(--glass-border)]">
        {primaryTabs.map(tab => {
          const Icon = tab.icon;
          const active = pathname === tab.to;
          if (tab.locked) {
            return (
              <div
                key={tab.to}
                title={`${tab.label} (Điền đủ Hồ sơ để mở khóa)`}
                className="flex flex-col items-center justify-center min-w-[56px] min-h-[46px] px-2 py-1 rounded-2xl text-[var(--text-muted)] opacity-45 select-none"
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-bold mt-0.5">{tab.label}</span>
              </div>
            );
          }
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-2xl transition-all spring-press ${
                active
                  ? 'bg-[#4285F4]/15 text-[#4285F4]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.75} />
              <span className="text-[10px] font-bold mt-0.5">{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMoreSheet}
          aria-label="Mở menu tính năng khác"
          className={`relative flex flex-col items-center justify-center min-w-[58px] min-h-[46px] px-2.5 py-1 rounded-2xl transition-all spring-press ${
            isMoreActive
              ? 'bg-[#4285F4]/15 text-[#4285F4]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2.2 : 1.75} />
          <span className="text-[10px] font-bold mt-0.5">Thêm</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#EA4335]" />
          )}
        </button>
      </div>
    </nav>
  );
}

// ── Page Transition Wrapper ────────────────────────────────────────────────
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

// ── Loading Screen ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] flex flex-col items-center justify-center gap-5">
      <img
        src="/icon-192.jpg"
        alt="Logo 2X18"
        className="w-20 h-20 rounded-3xl object-cover shadow-xl animate-pulse"
      />
      <div className="text-xs font-black text-[#4285F4] tracking-widest uppercase animate-pulse text-center px-4">
        2X18 — NÓI KHÔNG VỚI VÔ KỶ LUẬT
      </div>
    </div>
  );
}

// ── Protected Layout ───────────────────────────────────────────────────────
function AppLayout() {
  const {
    currentUser,
    isLoading,
    isCore,
    isSuperAdmin,
    unreadCount,
    isProfileComplete,
    trash,
    logout,
  } = useApp();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onSwNavigate = (event: any) => {
      if (typeof event?.detail === 'string' && event.detail.startsWith('/')) {
        navigate(event.detail);
      }
    };
    window.addEventListener('sw-navigate', onSwNavigate);
    return () => window.removeEventListener('sw-navigate', onSwNavigate);
  }, [navigate]);

  if (isLoading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/auth" replace />;

  const complete = isProfileComplete(currentUser);
  const trashCount = (trash || []).length;

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setMoreSheetOpen(false);
    logout();
    navigate('/auth', { replace: true });
  };

  const secondaryRoutes = [
    { to: '/vocab', label: 'Vocabulary & Flashcard', icon: Layers, color: '#4285F4' },
    { to: '/roadmap', label: 'Lộ trình học tập', icon: Map, color: '#34A853' },
    { to: '/calendar', label: 'Lịch trình & Sự kiện', icon: Calendar, color: '#FBBC05' },
    { to: '/reports', label: 'Báo cáo & Tài liệu', icon: FileText, color: '#4285F4' },
    { to: '/voting', label: 'Bình chọn nhóm', icon: Vote, color: '#34A853' },
    { to: '/attendance', label: 'Điểm danh họp nhóm', icon: Users, color: '#FBBC05' },
    { to: '/gamification', label: 'Bảng vinh danh', icon: Trophy, color: '#EA4335' },
    {
      to: '/notifications',
      label: 'Thông báo',
      icon: Bell,
      color: '#4285F4',
      badge: unreadCount,
    },
  ];

  return (
    <div className="relative flex h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden">
      <AmbientLiquidBackground />

      <div className="hidden lg:flex relative z-20">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          onRequestLogout={() => setShowLogoutConfirm(true)}
        />
      </div>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Mobile Glass Topbar */}
        <div className="lg:hidden flex items-center justify-between gap-3 px-4 py-2.5 glass-nav border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.jpg"
              alt="2X18"
              className="w-8 h-8 rounded-xl object-cover shadow-sm"
            />
            <div>
              <div className="font-black text-[var(--text-primary)] text-sm leading-none">
                2X18
              </div>
              <div className="text-[10px] font-semibold text-[var(--text-secondary)]">
                K70 Bán Dẫn
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle mode="compact" />
            {complete && (
              <Link
                to="/notifications"
                aria-label="Thông báo"
                className="relative min-w-[40px] min-h-[40px] rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-[#EA4335] text-white px-1.5 py-0.2 rounded-full tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMoreSheetOpen(true)}
              aria-label="Mở danh mục tính năng"
              className="min-w-[40px] min-h-[40px] rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route
                    path="/dashboard"
                    element={
                      <PageTransition>
                        <Dashboard />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <PageTransition>
                        <Profile />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/subjects"
                    element={
                      <PageTransition>
                        <Subjects />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <PageTransition>
                        <Tasks />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/roadmap"
                    element={
                      <PageTransition>
                        <Roadmap />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <PageTransition>
                        <CalendarPage />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/voting"
                    element={
                      <PageTransition>
                        <Voting />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <PageTransition>
                        <Notifications />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <PageTransition>
                        <Attendance />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/gamification"
                    element={
                      <PageTransition>
                        <Gamification />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/trash"
                    element={
                      <PageTransition>
                        <Trash />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PageTransition>
                        <Reports />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/vocab"
                    element={
                      <PageTransition>
                        <Vocab />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/vocab/:setId"
                    element={
                      <PageTransition>
                        <FlashcardSet />
                      </PageTransition>
                    }
                  />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Floating Glass Bottom Tab Bar */}
      <MobileBottomTabBar onOpenMoreSheet={() => setMoreSheetOpen(true)} />

      {/* Mobile Swipeable Bottom Sheet for Secondary Actions & Theme Settings */}
      <GlassDialog
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Danh mục & Cài đặt"
        subtitle="Kéo xuống hoặc chạm ra ngoài để đóng"
        variant="sheet"
      >
        <div className="space-y-5">
          {/* Theme selector */}
          <div>
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Giao diện Sáng / Tối
            </div>
            <ThemeToggle mode="segmented" />
          </div>

          {/* Feature Grid */}
          <div>
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Tiện ích nhóm 2X18
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {secondaryRoutes.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <button
                    key={item.to}
                    type="button"
                    disabled={!complete}
                    onClick={() => {
                      setMoreSheetOpen(false);
                      navigate(item.to);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all spring-press min-h-[54px] ${
                      !complete
                        ? 'opacity-45 cursor-not-allowed bg-[var(--bg-subtle)] border-[var(--border-default)]'
                        : active
                          ? 'bg-[#4285F4]/15 border-[#4285F4]/40 text-[#4285F4]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[#4285F4]/40'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.85} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{item.label}</div>
                      {item.badge ? (
                        <span className="text-[10px] font-extrabold text-[#EA4335]">
                          {item.badge} mới
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}

              {(isCore || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    setMoreSheetOpen(false);
                    navigate('/trash');
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl border bg-[#EA4335]/10 border-[#EA4335]/30 text-[#EA4335] text-left transition-all spring-press min-h-[54px]"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#EA4335]/20 flex items-center justify-center shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">Thùng rác</div>
                    <div className="text-[10px] font-semibold opacity-80">{trashCount} mục</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Account Card */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar user={currentUser} size={38} isMe />
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[var(--text-primary)] truncate">
                  {currentUser?.fullName || 'Thành viên'}
                </div>
                <div className="text-xs text-[var(--text-secondary)] uppercase font-semibold">
                  {currentUser?.role || 'member'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMoreSheetOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#EA4335]/15 text-[#EA4335] text-xs font-bold flex items-center gap-1.5 spring-press min-h-[40px]"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </GlassDialog>

      {/* Logout Confirmation Dialog */}
      <GlassDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Đăng xuất khỏi 2X18?"
        subtitle="Phiên làm việc hiện tại sẽ kết thúc"
        variant="modal"
        maxWidthClass="max-w-sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-[var(--text-secondary)]">
            Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng quản lý nhóm 2X18 không?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-2xl transition-colors spring-press min-h-[44px]"
            >
              Ở lại
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="flex-1 py-2.5 bg-[#EA4335] hover:bg-[#D93025] text-white font-bold rounded-2xl transition-colors shadow-md shadow-[#EA4335]/25 spring-press min-h-[44px]"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </GlassDialog>

      <Suspense fallback={null}>
        <AIChatbot />
      </Suspense>
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
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Auth />
      <ToastContainer />
    </Suspense>
  );
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
