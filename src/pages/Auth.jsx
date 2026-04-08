// src/pages/Auth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Clock, CheckCircle, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Google Logo SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const AuthInput = ({ label, hint, rightElement, error, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
    <div className="relative">
      <input
        {...props}
        className={`w-full h-11 px-4 rounded-xl text-sm text-white bg-[#1e1e1e] border transition-all outline-none
          placeholder:text-gray-600
          ${error
            ? 'border-red-500/60 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
            : 'border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          }
          ${rightElement ? 'pr-11' : ''}
        `}
      />
      {rightElement && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
          {rightElement}
        </div>
      )}
    </div>
    {hint && <p className="text-xs text-gray-600">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const Spinner = () => (
  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
);

// ── Pending screen (reusable for both register & google) ───────────────────
function PendingScreen({ info, onBack }) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
        <Clock className="w-10 h-10 text-amber-400"/>
      </div>

      <div>
        <h2 className="text-2xl font-black text-white mb-2">Chờ xét duyệt</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Tài khoản của bạn đang chờ Core Team 2X18 phê duyệt.
          Kết quả sẽ được thông báo qua email trong vòng{' '}
          <strong className="text-white">1–2 ngày</strong>.
        </p>
      </div>

      {(info?.name || info?.email) && (
        <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl overflow-hidden text-left">
          <div className="px-4 py-3 border-b border-gray-800">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thông tin đã gửi</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {[
              info.name  && ['Họ tên', info.name],
              info.mssv  && ['MSSV',   info.mssv],
              info.email && ['Email',  info.email],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-sm font-semibold text-white">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
        <Clock className="w-4 h-4 text-amber-400 shrink-0"/>
        <span className="text-sm font-medium text-amber-300">Đang chờ Core Team xét duyệt...</span>
      </div>

      <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl text-left">
        <div className="flex gap-2 items-start">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
          <p className="text-xs text-gray-400 leading-relaxed">
            Nếu cần gấp, liên hệ Core Team qua Zalo nhóm 2X18 để được duyệt sớm hơn.
          </p>
        </div>
      </div>

      <button onClick={onBack}
        className="w-full h-11 flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 hover:bg-white/5 text-gray-300 font-medium text-sm rounded-xl transition-all">
        <ChevronLeft className="w-4 h-4"/> Quay lại đăng nhập
      </button>
    </div>
  );
}

// ── Success screen after register ──────────────────────────────────────────
function RegisterSuccessScreen({ info, onBack }) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/20 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-400"/>
      </div>

      <div>
        <h2 className="text-2xl font-black text-white mb-2">Đơn đã gửi thành công!</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Core Team 2X18 sẽ xem xét và phản hồi trong vòng{' '}
          <strong className="text-white">1–2 ngày</strong>.
        </p>
      </div>

      <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl overflow-hidden text-left">
        <div className="px-4 py-3 border-b border-gray-800">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thông tin đã gửi</span>
        </div>
        <div className="divide-y divide-gray-800/60">
          {[['Họ tên', info.name], ['MSSV', info.mssv], ['Email', info.email]].map(([k,v])=>(
            <div key={k} className="flex justify-between items-center px-4 py-3">
              <span className="text-xs text-gray-500">{k}</span>
              <span className="text-sm font-semibold text-white">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
        <Clock className="w-4 h-4 text-amber-400 shrink-0"/>
        <span className="text-sm font-medium text-amber-300">Đang chờ Core Team xét duyệt...</span>
      </div>

      <button onClick={onBack}
        className="w-full h-11 flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 hover:bg-white/5 text-gray-300 font-medium text-sm rounded-xl transition-all">
        <ChevronLeft className="w-4 h-4"/> Quay lại đăng nhập
      </button>
    </div>
  );
}

// ── Main Auth Component ────────────────────────────────────────────────────
export default function Auth() {
  const navigate  = useNavigate();
  const { login, loginWithGoogle, register } = useApp();

  // tab: 'login' | 'register' | 'registerSuccess' | 'pending'
  const [tab,      setTab]     = useState('login');
  const [loading,  setLoading] = useState(false);
  const [gLoading, setGLoad]   = useState(false);
  const [errors,   setErrors]  = useState({});
  const [pendingInfo, setPendingInfo] = useState(null);
  const [regInfo,     setRegInfo]     = useState(null);

  const [showP,  setShowP]  = useState(false);
  const [showP2, setShowP2] = useState(false);

  const [lf, setLf] = useState({ email:'', password:'' });
  const setL = (k, v) => { setLf(p=>({...p,[k]:v})); if(errors[k]) setErrors(e=>({...e,[k]:''})); };

  const [rf, setRf] = useState({ ho:'', ten:'', mssv:'', email:'', phone:'', password:'', password2:'', reason:'' });
  const setR = (k, v) => { setRf(p=>({...p,[k]:v})); if(errors[k]) setErrors(e=>({...e,[k]:''})); };

  const switchTab = (t) => { setTab(t); setErrors({}); };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const e = {};
    if (!lf.email)    e.email    = 'Vui lòng nhập email.';
    if (!lf.password) e.password = 'Vui lòng nhập mật khẩu.';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await login(lf.email.trim(), lf.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.message === 'PENDING') {
        setPendingInfo({ email: lf.email.trim() });
        setTab('pending');
      } else {
        setErrors({ form: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google Login ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGLoad(true);
    try {
      const result = await loginWithGoogle();
      if (result?.status === 'pending') {
        setPendingInfo({ name: result.name, email: result.email });
        setTab('pending');
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // error toast already shown in context
    } finally {
      setGLoad(false);
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const e = {};
    if (!rf.ho.trim())           e.ho       = 'Nhập họ.';
    if (!rf.ten.trim())          e.ten      = 'Nhập tên.';
    if (!rf.mssv.trim())         e.mssv     = 'Nhập MSSV.';
    if (!rf.email.includes('@')) e.email    = 'Email không hợp lệ.';
    if (!rf.phone.trim())        e.phone    = 'Nhập số điện thoại.';
    if (rf.password.length < 6)  e.password = 'Tối thiểu 6 ký tự.';
    if (rf.password !== rf.password2) e.password2 = 'Mật khẩu xác nhận không khớp.';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await register(rf);
      setRegInfo({
        name:  `${rf.ho.trim()} ${rf.ten.trim()}`,
        mssv:  rf.mssv.trim(),
        email: rf.email.trim(),
      });
      setTab('registerSuccess');
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] flex">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[500px] bg-gradient-to-br from-blue-950 via-[#0d0d20] to-[#080810] flex-col justify-between p-12 border-r border-white/5 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-900/50">
            2X
          </div>
          <div>
            <div className="text-white font-black text-lg leading-none">2X18 CORE</div>
            <div className="text-blue-400/60 text-xs mt-0.5">HUS Bán dẫn K2024</div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Quản lý nhóm học tập<br/>
              <span className="text-blue-400">thông minh hơn</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Theo dõi GPA, điểm danh, tài liệu và tiến độ học tập của 16 thành viên — tất cả trong một nơi.
            </p>
          </div>

          {[
            { icon:'📊', title:'Tracking GPA realtime', desc:'So sánh CPA cá nhân với nhóm theo từng học kỳ.' },
            { icon:'🎯', title:'Hệ thống SME & Tài liệu', desc:'Phân công chuyên gia, chia sẻ tài liệu qua Google Drive.' },
            { icon:'🏅', title:'Chiến Tích & Huy Hiệu', desc:'Gamification — cộng điểm cống hiến mỗi khi đóng góp.' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl shrink-0">{f.icon}</div>
              <div>
                <div className="text-white font-bold text-sm mb-1">{f.title}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-gray-700 text-xs">© 2X18 HUS K2024 · Bán dẫn &amp; Công nghệ vật liệu</div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-0">

          {/* ─── REGISTER SUCCESS ──────────────────────────────────── */}
          {tab === 'registerSuccess' && regInfo && (
            <RegisterSuccessScreen info={regInfo} onBack={() => { switchTab('login'); setRegInfo(null); }}/>
          )}

          {/* ─── PENDING (login attempted but not approved yet) ─────── */}
          {tab === 'pending' && (
            <PendingScreen info={pendingInfo} onBack={() => { switchTab('login'); setPendingInfo(null); }}/>
          )}

          {/* ─── LOGIN ─────────────────────────────────────────────── */}
          {tab === 'login' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white mb-1">Đăng nhập</h1>
                <p className="text-gray-500 text-sm">
                  Chưa có tài khoản?{' '}
                  <button onClick={() => switchTab('register')} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    Đăng ký
                  </button>
                </p>
              </div>

              {/* Google */}
              <button onClick={handleGoogle} disabled={gLoading||loading}
                className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-800 font-semibold text-sm rounded-xl border border-gray-200 transition-all shadow-sm">
                {gLoading ? <Spinner/> : <GoogleLogo/>}
                <span>{gLoading ? 'Đang xử lý...' : 'Tiếp tục với Google'}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800"/>
                <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest">Hoặc email</span>
                <div className="flex-1 h-px bg-gray-800"/>
              </div>

              {errors.form && (
                <div className="flex items-start gap-2.5 p-3 bg-red-500/8 border border-red-500/25 rounded-xl">
                  <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-red-400 text-sm">{errors.form}</p>
                </div>
              )}

              <AuthInput
                label="Email" type="email" placeholder="email@hus.edu.vn"
                value={lf.email} onChange={e=>setL('email',e.target.value)}
                error={errors.email} autoComplete="email"
              />
              <AuthInput
                label="Mật khẩu" type={showP?'text':'password'} placeholder="••••••••"
                value={lf.password} onChange={e=>setL('password',e.target.value)}
                error={errors.password} autoComplete="current-password"
                onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                rightElement={
                  <button type="button" onClick={()=>setShowP(v=>!v)} className="text-gray-500 hover:text-gray-300">
                    {showP?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                }
              />

              <button onClick={handleLogin} disabled={loading||gLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-900/30">
                {loading ? <><Spinner/><span>Đang đăng nhập...</span></> : <><span>Đăng nhập</span><ArrowRight className="w-4 h-4"/></>}
              </button>

              <p className="text-center text-xs text-gray-700">
                Bằng cách đăng nhập, bạn đồng ý với các điều khoản sử dụng của nhóm 2X18.
              </p>
            </div>
          )}

          {/* ─── REGISTER ──────────────────────────────────────────── */}
          {tab === 'register' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white mb-1">Tạo tài khoản</h1>
                <p className="text-gray-500 text-sm">
                  Đã có tài khoản?{' '}
                  <button onClick={()=>switchTab('login')} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    Đăng nhập
                  </button>
                </p>
              </div>

              {/* Google register */}
              <button onClick={handleGoogle} disabled={gLoading||loading}
                className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-800 font-semibold text-sm rounded-xl border border-gray-200 transition-all shadow-sm">
                {gLoading ? <Spinner/> : <GoogleLogo/>}
                <span>{gLoading ? 'Đang xử lý...' : 'Đăng ký với Google'}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800"/>
                <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest">Hoặc điền form</span>
                <div className="flex-1 h-px bg-gray-800"/>
              </div>

              {errors.form && (
                <div className="flex items-start gap-2.5 p-3 bg-red-500/8 border border-red-500/25 rounded-xl">
                  <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-red-400 text-sm">{errors.form}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <AuthInput label="Họ *" placeholder="Nguyễn" value={rf.ho} onChange={e=>setR('ho',e.target.value)} error={errors.ho}/>
                <AuthInput label="Tên *" placeholder="Văn A" value={rf.ten} onChange={e=>setR('ten',e.target.value)} error={errors.ten}/>
              </div>
              <AuthInput label="MSSV *" placeholder="25000001" value={rf.mssv} onChange={e=>setR('mssv',e.target.value)} error={errors.mssv}/>
              <AuthInput label="Email HUS *" type="email" placeholder="email@hus.edu.vn" value={rf.email} onChange={e=>setR('email',e.target.value)} error={errors.email} autoComplete="email"/>
              <AuthInput label="Số điện thoại *" type="tel" placeholder="0912 345 678" value={rf.phone} onChange={e=>setR('phone',e.target.value)} error={errors.phone}/>

              <AuthInput
                label="Mật khẩu *" type={showP?'text':'password'} placeholder="Tối thiểu 6 ký tự"
                value={rf.password} onChange={e=>setR('password',e.target.value)} error={errors.password}
                autoComplete="new-password"
                rightElement={
                  <button type="button" onClick={()=>setShowP(v=>!v)} className="text-gray-500 hover:text-gray-300">
                    {showP?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                }
              />
              <AuthInput
                label="Xác nhận mật khẩu *" type={showP2?'text':'password'} placeholder="Nhập lại mật khẩu"
                value={rf.password2} onChange={e=>setR('password2',e.target.value)} error={errors.password2}
                onKeyDown={e=>e.key==='Enter'&&handleRegister()}
                autoComplete="new-password"
                rightElement={
                  <button type="button" onClick={()=>setShowP2(v=>!v)} className="text-gray-500 hover:text-gray-300">
                    {showP2?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button>
                }
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  Lý do tham gia <span className="text-gray-600 font-normal">(Core Team sẽ đọc)</span>
                </label>
                <textarea rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white bg-[#1e1e1e] border border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-gray-600 resize-none transition-all"
                  placeholder="VD: Mình đang học Vật lý bán dẫn và muốn tham gia nhóm để học cùng..."
                  value={rf.reason} onChange={e=>setR('reason',e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Tài khoản mới sẽ là <strong className="text-white">Thành viên</strong> sau khi được Core duyệt.
                  Chỉ Super Admin mới có thể nâng lên <strong className="text-blue-400">Core Team</strong>.
                </p>
              </div>

              <button onClick={handleRegister} disabled={loading||gLoading}
                className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-900/30">
                {loading ? <><Spinner/><span>Đang gửi...</span></> : <><span>Gửi đơn đăng ký</span><ArrowRight className="w-4 h-4"/></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
