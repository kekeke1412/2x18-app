// src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

// Google Logo SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const Spinner = () => (
  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
);

// ── Main Auth Component ────────────────────────────────────────────────────
export default function Auth() {
  const navigate  = useNavigate();
  const { loginWithGoogle } = useApp();

  const [loading, setLoading] = useState(false);
  const [pendingInfo, setPendingInfo] = useState(null); // null = closed, object = open modal

  // ── Google Login ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result?.status === 'pending') {
        setPendingInfo({ name: result?.name, email: result?.email });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // error toast already shown in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* ── Left panel: Info/Hero ── */}
      <div className="flex-1 bg-[#0a0a0f] p-8 lg:p-16 flex flex-col justify-between border-r border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none"/>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/30">2X</div>
            <span className="text-xl font-black text-white tracking-tight">2X18 HUS K70</span>
          </div>

          <motion.div 
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
            }}
            className="space-y-8"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <h2 className="text-3xl font-black text-white leading-tight mb-3">
                Quản lý nhóm học tập<br/>
                <span className="text-blue-400">thông minh hơn</span>
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Theo dõi GPA, điểm danh, tài liệu và tiến độ học tập của các thành viên — tất cả trong một nơi.
              </p>
            </motion.div>

          {[
            { icon:'📊', title:'Tracking GPA realtime', desc:'So sánh CPA cá nhân với nhóm theo từng học kỳ.' },
            { icon:'🎯', title:'Hệ thống SME & Tài liệu', desc:'Phân công chuyên gia, chia sẻ tài liệu qua Google Drive.' },
            { icon:'🏅', title:'Chiến Tích & Huy Hiệu', desc:'Gamification — cộng điểm cống hiến mỗi khi đóng góp.' },
          ].map(f => (
            <motion.div 
              key={f.title} 
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl shrink-0">{f.icon}</div>
              <div>
                <div className="text-white font-bold text-sm mb-1">{f.title}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{f.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="text-gray-700 text-xs">© 2X18 HUS K70 · Bán dẫn &amp; Công nghệ bán dẫn</div>
    </div>

      {/* ── Right panel ── */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Đăng nhập</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Sử dụng tài khoản Google để tham gia hệ thống quản lý học tập của nhóm.
            </p>
          </div>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-800 font-semibold text-sm rounded-xl border border-gray-200 transition-all shadow-sm">
            {loading ? <Spinner/> : <GoogleLogo/>}
            <span>{loading ? 'Đang xử lý...' : 'Tiếp tục với Google'}</span>
          </button>

          <p className="text-center text-xs text-gray-600">
            Bằng cách đăng nhập, bạn đồng ý với các quy định chung của tập thể lớp K70 CÔNG NGHỆ BÁN DẪN.
          </p>
        </motion.div>
      </motion.div>

      {/* ── Pending overlay modal (Google login khi chưa được duyệt) ── */}
      <AnimatePresence>
        {pendingInfo && (
          <div
            key="pending-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPendingInfo(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#111118] border border-amber-500/25 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              {/* Amber accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"/>
              <div className="p-7 space-y-5 text-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/25 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-400"/>
                </div>
                {/* Title */}
                <div>
                  <h2 className="text-xl font-black text-white mb-1.5">Đang chờ xét duyệt</h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Tài khoản của bạn đang chờ <strong className="text-white">Core Team hoặc Super Admin</strong> phê duyệt.
                  </p>
                </div>
                {/* Info card */}
                {(pendingInfo.name || pendingInfo.email) && (
                  <div className="bg-[#1a1a22] border border-gray-800 rounded-2xl overflow-hidden text-left">
                    {[
                      pendingInfo.name  && ['Họ tên', pendingInfo.name],
                      pendingInfo.email && ['Email',  pendingInfo.email],
                    ].filter(Boolean).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-800/60 last:border-0">
                        <span className="text-xs text-gray-500">{k}</span>
                        <span className="text-sm font-semibold text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Status pill */}
                <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"/>
                  <span className="text-sm font-medium text-amber-300">Đang chờ phê duyệt...</span>
                </div>
                {/* Zalo hint */}
                <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-2 text-left">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Cần gấp? Nhắn vào <strong className="text-white">Zalo nhóm 2X18</strong> để được duyệt sớm hơn.
                  </p>
                </div>
                {/* Close button */}
                <button
                  onClick={() => setPendingInfo(null)}
                  className="w-full h-10 flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 hover:bg-white/5 text-gray-300 font-medium text-sm rounded-xl transition-all">
                  <ChevronLeft className="w-4 h-4"/> Quay lại
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
