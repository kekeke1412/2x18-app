// src/pages/Auth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Clock, CheckCircle, ChevronLeft, User, Mail, Phone, Hash } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

// Icon Google SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle } = useApp();

  const [tab,        setTab]       = useState('login');
  const [showPass,   setShowPass]  = useState(false);
  const [showPass2,  setShowPass2] = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState('');
  const [pending,    setPending]   = useState(null);

  const [lf, setLf] = useState({ email: '', password: '' });
  const setL = (k, v) => setLf(p => ({ ...p, [k]: v }));

  const [rf, setRf] = useState({
    ho: '', ten: '', mssv: '', email: '', phone: '',
    password: '', password2: '', reason: '',
  });
  const setR = (k, v) => setRf(p => ({ ...p, [k]: v }));

  // ── Đăng nhập thường ──
  const handleLogin = async () => {
    setError('');
    if (!lf.email || !lf.password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    setLoading(true);
    try {
      await login(lf.email, lf.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Lỗi đã được Toast trong AppContext
    } finally {
      setLoading(false);
    }
  };

  // ── Đăng nhập Google ──
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Lỗi đã được Toast trong AppContext
    } finally {
      setLoading(false);
    }
  };

  // ── Đăng ký ──
  const handleRegister = async () => {
    setError('');
    const { ho, ten, mssv, email, phone, password, password2 } = rf;
    if (!ho.trim() || !ten.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    if (!mssv.trim())              { setError('Vui lòng nhập MSSV.'); return; }
    if (!email.includes('@'))      { setError('Email không hợp lệ.'); return; }
    if (!phone.trim())             { setError('Vui lòng nhập số điện thoại.'); return; }
    if (password.length < 6)       { setError('Mật khẩu tối thiểu 6 ký tự.'); return; }
    if (password !== password2)    { setError('Mật khẩu xác nhận không khớp.'); return; }
    
    setLoading(true);
    try {
      await register(rf); // Gọi Firebase tạo user
      setPending({ name: `${ho.trim()} ${ten.trim()}`, mssv: mssv.trim(), email: email.trim() });
      setTab('pending');
    } catch (err) {
      // Lỗi đã được Toast trong AppContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] p-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none"/>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 font-black text-xl shadow-2xl shadow-blue-900/40">
            2X
          </div>
          <h1 className="text-2xl font-black text-white">2X18 CORE</h1>
          <p className="text-gray-500 text-xs mt-1">Nhóm học tập bán dẫn · HUS K2024</p>
        </div>

        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
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
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* ── LOGIN TAB ── */}
            {tab === 'login' && (
              <div className="space-y-4">
                <FInput
                  label="Email" type="email" placeholder="email@hus.edu.vn"
                  value={lf.email} onChange={e => setL('email', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} placeholder="••••••••"
                      value={lf.password} onChange={e => setL('password', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                
                <button onClick={handleLogin} disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><span>Đăng nhập</span><ArrowRight className="w-4 h-4"/></>}
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-800"></div>
                  <span className="text-xs text-gray-500 font-medium">HOẶC</span>
                  <div className="flex-1 h-px bg-gray-800"></div>
                </div>

                <button onClick={handleGoogleLogin} disabled={loading}
                  className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl flex items-center justify-center gap-3 transition-all">
                  <GoogleIcon />
                  <span>Đăng nhập với Google</span>
                </button>
              </div>
            )}

            {/* ── REGISTER TAB ── */}
            {tab === 'register' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FInput label="Họ *" placeholder="Nguyễn" value={rf.ho} onChange={e => setR('ho', e.target.value)}/>
                  <FInput label="Tên *" placeholder="Văn A" value={rf.ten} onChange={e => setR('ten', e.target.value)}/>
                </div>
                <FInput label="MSSV *" icon={Hash} placeholder="25000001" value={rf.mssv} onChange={e => setR('mssv', e.target.value)}/>
                <FInput label="Email HUS *" icon={Mail} type="email" placeholder="email@hus.edu.vn" value={rf.email} onChange={e => setR('email', e.target.value)}/>
                <FInput label="Số điện thoại *" icon={Phone} type="tel" placeholder="0912 345 678" value={rf.phone} onChange={e => setR('phone', e.target.value)}/>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Mật khẩu * <span className="text-gray-600 font-normal">(≥ 6 ký tự)</span></label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={rf.password} onChange={e => setR('password', e.target.value)} className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all" />
                    <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">{showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Xác nhận mật khẩu *</label>
                  <div className="relative">
                    <input type={showPass2 ? 'text' : 'password'} placeholder="••••••••" value={rf.password2} onChange={e => setR('password2', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all" />
                    <button onClick={() => setShowPass2(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">{showPass2 ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Lý do tham gia</label>
                  <textarea rows={3} placeholder="VD: Mình muốn học nhóm..." value={rf.reason} onChange={e => setR('reason', e.target.value)} className="w-full bg-[#252525] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
                </div>

                <button onClick={handleRegister} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><span>Gửi đơn đăng ký</span><ArrowRight className="w-4 h-4"/></>}
                </button>
              </div>
            )}

            {/* ── PENDING STATE ── */}
            {tab === 'pending' && pending && (
              <div className="text-center py-2 fade-in space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-400"/>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Đơn đã gửi thành công!</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">Core nhóm 2X18 sẽ xét duyệt và phản hồi trong vòng <strong className="text-white">1–2 ngày</strong>.</p>
                </div>
                <button onClick={() => { setTab('login'); setError(''); setPending(null); }} className="w-full flex items-center justify-center gap-2 border border-gray-700 text-gray-300 font-medium py-2.5 rounded-xl hover:bg-[#252525] text-sm transition-all">
                  <ChevronLeft className="w-4 h-4"/> Quay lại đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}