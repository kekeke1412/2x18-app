// src/pages/Auth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Clock, CheckCircle, ChevronLeft, User, Mail, Phone, Hash } from 'lucide-react';
import { useApp } from '../context/AppContext';

const DEMO_USER = {
  id: 'u1', email: 'admin@hus.edu.vn', password: '123456',
  fullName: 'Phạm Bá Hưng', role: 'super_admin', mssv: '25000723',
  phone: '0912345001', mailSchool: 'hung.pb@hus.edu.vn', gender: 'Nam', avatar: 'PH',
};

// Input field component (defined outside to prevent focus loss)
const FInput = ({ label, icon: Icon, hint, ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3"/>}
        {label}
      </label>
    )}
    <input
      {...props}
      className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white
                 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1
                 focus:ring-blue-500/30 transition-all"
    />
    {hint && <span className="text-[10px] text-gray-600">{hint}</span>}
  </div>
);

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [tab,        setTab]       = useState('login');
  const [showPass,   setShowPass]  = useState(false);
  const [showPass2,  setShowPass2] = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState('');
  const [pending,    setPending]   = useState(null);

  // Login form state
  const [lf, setLf] = useState({ email: '', password: '' });
  const setL = (k, v) => setLf(p => ({ ...p, [k]: v }));

  // Register form state
  const [rf, setRf] = useState({
    ho: '', ten: '', mssv: '', email: '', phone: '',
    password: '', password2: '', reason: '',
  });
  const setR = (k, v) => setRf(p => ({ ...p, [k]: v }));

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError('');
    if (!lf.email || !lf.password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    if (lf.password === DEMO_USER.password) {
      login(DEMO_USER);
      navigate('/dashboard', { replace: true });
    } else {
      setError('Mật khẩu không đúng. (Demo: 123456)');
      setLoading(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    setError('');
    const { ho, ten, mssv, email, phone, password, password2 } = rf;
    if (!ho.trim() || !ten.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    if (!mssv.trim())              { setError('Vui lòng nhập MSSV.'); return; }
    if (!email.includes('@'))      { setError('Email HUS không hợp lệ.'); return; }
    if (!phone.trim())             { setError('Vui lòng nhập số điện thoại.'); return; }
    if (password.length < 8)       { setError('Mật khẩu tối thiểu 8 ký tự.'); return; }
    if (password !== password2)    { setError('Mật khẩu xác nhận không khớp.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setPending({ name: `${ho.trim()} ${ten.trim()}`, mssv: mssv.trim(), email: email.trim() });
    setTab('pending');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] p-4">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none"/>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 font-black text-xl shadow-2xl shadow-blue-900/40">
            2X
          </div>
          <h1 className="text-2xl font-black text-white">2X18 CORE</h1>
          <p className="text-gray-500 text-xs mt-1">Nhóm học tập bán dẫn · HUS K2024</p>
        </div>

        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Tab bar */}
          {tab !== 'pending' && (
            <div className="flex border-b border-gray-800">
              {[['login','Đăng nhập'],['register','Đăng ký']].map(([t, l]) => (
                <button key={t} onClick={() => { setTab(t); setError(''); }}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-all ${
                    tab === t
                      ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          )}

          <div className="p-6">
            {/* Error banner */}
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl font-medium fade-in">
                {error}
              </div>
            )}

            {/* ── LOGIN TAB ──────────────────────────────────── */}
            {tab === 'login' && (
              <div className="space-y-4">
                <FInput
                  label="Email" type="email" placeholder="Nhập email bất kỳ..."
                  value={lf.email} onChange={e => setL('email', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={lf.password}
                      onChange={e => setL('password', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 pr-10
                                 text-sm text-white placeholder-gray-600 focus:outline-none
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    <button onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                <button onClick={handleLogin} disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold
                             py-2.5 rounded-xl flex items-center justify-center gap-2
                             shadow-lg shadow-blue-900/20 transition-all">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <><span>Đăng nhập</span><ArrowRight className="w-4 h-4"/></>
                  }
                </button>
                <p className="text-center text-[11px] text-gray-600 pt-1">
                  Demo: email bất kỳ · mật khẩu <span className="font-mono text-blue-400 font-bold">123456</span>
                </p>
              </div>
            )}

            {/* ── REGISTER TAB ──────────────────────────────── */}
            {tab === 'register' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FInput label="Họ *" placeholder="Nguyễn" value={rf.ho} onChange={e => setR('ho', e.target.value)}/>
                  <FInput label="Tên *" placeholder="Văn A" value={rf.ten} onChange={e => setR('ten', e.target.value)}/>
                </div>

                <FInput
                  label="MSSV *" icon={Hash}
                  placeholder="25000001"
                  value={rf.mssv} onChange={e => setR('mssv', e.target.value)}
                />

                <FInput
                  label="Email HUS *" icon={Mail}
                  type="email" placeholder="email@hus.edu.vn"
                  value={rf.email} onChange={e => setR('email', e.target.value)}
                />

                <FInput
                  label="Số điện thoại *" icon={Phone}
                  type="tel" placeholder="0912 345 678"
                  value={rf.phone} onChange={e => setR('phone', e.target.value)}
                />

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">
                    Mật khẩu * <span className="text-gray-600 font-normal">(≥ 8 ký tự)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} placeholder="••••••••"
                      value={rf.password} onChange={e => setR('password', e.target.value)}
                      className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 pr-10
                                 text-sm text-white placeholder-gray-600 focus:outline-none
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    <button onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Xác nhận mật khẩu *</label>
                  <div className="relative">
                    <input
                      type={showPass2 ? 'text' : 'password'} placeholder="••••••••"
                      value={rf.password2} onChange={e => setR('password2', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRegister()}
                      className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 pr-10
                                 text-sm text-white placeholder-gray-600 focus:outline-none
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    <button onClick={() => setShowPass2(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass2 ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                {/* Reason */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">
                    Lý do tham gia <span className="text-gray-600 font-normal">(Core xét duyệt)</span>
                  </label>
                  <textarea rows={3}
                    placeholder="VD: Mình đang học Vật lý bán dẫn năm 1, muốn học nhóm và chia sẻ tài liệu cùng mọi người..."
                    value={rf.reason} onChange={e => setR('reason', e.target.value)}
                    className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 text-sm
                               text-white placeholder-gray-600 focus:outline-none focus:border-blue-500
                               transition-all resize-none"
                  />
                </div>

                {/* Role info */}
                <div className="flex gap-2 items-start p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                  <User className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5"/>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Tài khoản mới sẽ là <strong className="text-gray-300">Thành viên</strong> sau khi được Core duyệt.
                    Nâng lên <strong className="text-blue-400">Core</strong> do Super Admin phân công.
                  </p>
                </div>

                <button onClick={handleRegister} disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold
                             py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <><span>Gửi đơn đăng ký</span><ArrowRight className="w-4 h-4"/></>
                  }
                </button>
              </div>
            )}

            {/* ── PENDING STATE ──────────────────────────────── */}
            {tab === 'pending' && pending && (
              <div className="text-center py-2 fade-in space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-400"/>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Đơn đã gửi thành công!</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Core nhóm 2X18 sẽ xét duyệt và phản hồi trong vòng{' '}
                    <strong className="text-white">1–2 ngày</strong>.
                  </p>
                </div>

                {/* Info recap */}
                <div className="bg-[#252525] border border-gray-700 rounded-xl p-3 text-left space-y-1.5">
                  <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-2">
                    Thông tin đã gửi
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Họ tên</span>
                    <span className="text-white font-bold">{pending.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">MSSV</span>
                    <span className="text-gray-300">{pending.mssv}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-300">{pending.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl py-2.5">
                  <CheckCircle className="w-4 h-4"/> Đơn đăng ký đã được ghi nhận
                </div>

                <button onClick={() => { setTab('login'); setError(''); setPending(null); }}
                  className="w-full flex items-center justify-center gap-2 border border-gray-700 text-gray-300
                             font-medium py-2.5 rounded-xl hover:bg-[#252525] text-sm transition-all">
                  <ChevronLeft className="w-4 h-4"/> Quay lại đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-700 mt-4">
          2X18 CORE · HUS Vật lý & Bán dẫn K2024
        </p>
      </div>
    </div>
  );
}
