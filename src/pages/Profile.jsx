// src/pages/Profile.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  User, CreditCard, Calendar, Phone, MapPin,
  Save, Edit3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Download, Users, ShieldCheck, ChevronLeft, Search, Check, X,
  Clock, Eye, BookOpen, Lock, CheckCircle
} from 'lucide-react';
import { subjectDatabase, calculateHe10, getHe4 } from '../data';
import { useApp } from '../context/AppContext';

// ── Constants ──────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+','A−','B+','B−','AB+','AB−','O+','O−'];
const GENDERS     = ['Nam','Nữ'];
const SEMESTERS   = [1,2,3,4,5,6,7,8];
const STATUS_OPTS = ['Chưa học','Đang học','Đã học','Được miễn','Không học'];

const ETHNICITIES = [
  'Kinh','Tày','Thái','Mường','Khmer','Mông','Nùng','Dao','Gia-rai','Ngái',
  'Ê-đê','Ba-na','Xơ-đăng','Sán Chay','Cơ-ho','Chăm','Sán Dìu','Hrê','Mnông',
  'Ra-glai','Xtiêng','Bru-Vân Kiều','Thổ','Giáy','Cơ-tu','Gié-triêng','Mạ',
  'Khơ-mú','Co','Tà-ôi','Chơ-ro','Kháng','Xinh-mun','Hà Nhì','Chu-ru','Lào',
  'La Chí','La Ha','Phù Lá','La Hủ','Lự','Lô Lô','Chứt','Mảng','Pà Thẻn',
  'Cơ Lao','Cống','Bố Y','Si La','Pu Péo','Rơ-măm','Brâu','Ơ-đu',
];

const PROVINCES_34 = [
  "Tuyên Quang","Lào Cai","Thái Nguyên","Phú Thọ","Bắc Ninh","Hưng Yên",
  "TP. Hải Phòng","Ninh Bình","Quảng Trị","TP. Đà Nẵng","Quảng Ngãi",
  "Gia Lai","Khánh Hòa","Lâm Đồng","Đắk Lắk","TP. Hồ Chí Minh","Đồng Nai",
  "Tây Ninh","TP. Cần Thơ","Vĩnh Long","Đồng Tháp","Cà Mau","An Giang",
  "Hà Nội","Bắc Giang","Vĩnh Phúc","Nam Định","Thanh Hóa","Nghệ An",
  "Hà Tĩnh","Thừa Thiên Huế","Bình Định","Đắk Nông","Bình Dương",
];

// Fields required for profile unlock
const REQUIRED_FIELDS = [
  { key: 'mssv',      label: 'Mã số sinh viên' },
  { key: 'fullName',  label: 'Họ và tên' },
  { key: 'gender',    label: 'Giới tính' },
  { key: 'dob',       label: 'Ngày sinh' },
  { key: 'ethnicity', label: 'Dân tộc' },
  { key: 'bloodType', label: 'Nhóm máu' },
  { key: 'pob',       label: 'Nơi sinh' },
  { key: 'phone',     label: 'Số điện thoại' },
  { key: 'mailVnu',   label: 'Mail VNU' },
  { key: 'mailSchool',label: 'Mail HUS' },
  { key: 'facebook',  label: 'Facebook' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const toDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const getLetterGrade = he10 => {
  if (he10 === null) return '—';
  if (he10 >= 9.0) return 'A+'; if (he10 >= 8.5) return 'A';
  if (he10 >= 8.0) return 'B+'; if (he10 >= 7.0) return 'B';
  if (he10 >= 6.5) return 'C+'; if (he10 >= 5.5) return 'C';
  if (he10 >= 5.0) return 'D+'; if (he10 >= 4.0) return 'D';
  return 'F';
};
const calcResult = (cc, gk, ck) => {
  const h10 = calculateHe10(parseFloat(cc), parseFloat(gk), parseFloat(ck));
  if (h10 === null) return { he10: '—', chu: '—', he4: '—' };
  return { he10: h10.toFixed(1), chu: getLetterGrade(h10), he4: getHe4(h10).toFixed(1) };
};

const roleLabel = (role) => {
  if (role === 'super_admin') return { text: 'Super Admin', cls: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
  if (role === 'core')        return { text: 'Core Team',   cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
  return                             { text: 'Thành viên',  cls: 'bg-gray-700/40 text-gray-400 border border-gray-700' };
};

const getInitials = (name='') =>
  name.split(' ').filter(Boolean).map(w=>w[0]).slice(-2).join('').toUpperCase() || '??';

// ── Grade helpers ──────────────────────────────────────────────────────────
// CPA uses hệ 4, only counts subjects with status "Đã học"
function calcGpaStats(grades) {
  let totalPoints = 0, totalCredits = 0, earnedCredits = 0;
  let learning = 0, done = 0;
  const semGPA = {};

  subjectDatabase.forEach(sub => {
    const g = grades[sub.id] || {};
    const st = g.status || 'Chưa học';
    if (st === 'Đang học') learning++;
    // Only count subjects explicitly marked "Đã học"
    if (st === 'Đã học') {
      const r = calcResult(g.cc, g.gk, g.ck);
      const he4 = parseFloat(r.he4);
      if (!isNaN(he4) && he4 >= 0) {
        done++;
        totalPoints  += he4 * sub.credits;
        totalCredits += sub.credits;
        earnedCredits += sub.credits;
        if (g.semester) {
          if (!semGPA[g.semester]) semGPA[g.semester] = { pts:0, cr:0 };
          semGPA[g.semester].pts += he4 * sub.credits;
          semGPA[g.semester].cr  += sub.credits;
        }
      }
    }
  });

  const cpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : '—';
  const semGPAFmt = {};
  Object.entries(semGPA).forEach(([k,v]) => {
    semGPAFmt[k] = v.cr ? (v.pts/v.cr).toFixed(2) : '—';
  });
  return { cpa, credits: earnedCredits, learning, done, semGPA: semGPAFmt };
}

function exportGradesToCSV(profile, grades) {
  const headers = ['STT','Mã môn','Tên môn','Số TC','Loại','Học kỳ','Trạng thái','CC','GK','CK','Hệ 10','Chữ','Hệ 4'];
  const rows = subjectDatabase.map((sub, i) => {
    const g = grades[sub.id] || {};
    const r = calcResult(g.cc, g.gk, g.ck);
    return [i+1, sub.code, sub.name, sub.credits, sub.type,
      g.semester ? `Kỳ ${g.semester}` : '—', g.status || 'Chưa học',
      g.cc||'—', g.gk||'—', g.ck||'—', r.he10, r.chu, r.he4];
  });
  const csv = [headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'),{href:url,download:`BangDiem_${profile.fullName||'SinhVien'}.csv`});
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

// ── UI primitives ──────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type='text', options, disabled, required, hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
      {label}
      {required && !disabled && <span className="text-red-400">*</span>}
    </label>
    {options ? (
      <select value={value||''} onChange={e=>onChange(e.target.value)} disabled={disabled}
        className={`text-sm px-3 py-2 rounded-xl outline-none transition-all
          ${disabled ? 'bg-transparent text-gray-300 border-transparent cursor-default'
                     : 'bg-[#252525] border border-gray-700 text-white focus:border-blue-500'}`}>
        <option value="">—</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    ) : type==='date' ? (
      disabled
        ? <div className="text-sm px-3 py-2 text-gray-300">{toDisplay(value)}</div>
        : <input type="date" value={value||''} onChange={e=>onChange(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"/>
    ) : (
      <input type={type} value={value||''} onChange={onChange ? e=>onChange(e.target.value) : undefined} disabled={disabled}
        className={`text-sm px-3 py-2 rounded-xl outline-none transition-all
          ${disabled ? 'bg-transparent text-gray-300 border-transparent cursor-default'
                     : 'bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'}`}/>
    )}
    {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
  </div>
);

const Section = ({ icon:Icon, title, children, defaultOpen=true, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden mb-4">
      <button onClick={()=>setOpen(v=>!v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#1e1e1e] hover:bg-[#222] transition-colors text-left">
        <Icon className="w-4 h-4 text-gray-500 shrink-0"/>
        <span className="text-sm font-bold text-gray-300 flex-1">{title}</span>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/20">{badge}</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-600"/> : <ChevronDown className="w-4 h-4 text-gray-600"/>}
      </button>
      {open && <div className="p-5 border-t border-gray-800/60">{children}</div>}
    </div>
  );
};

// ── Profile Completion Progress Bar ───────────────────────────────────────
function ProfileCompletionBanner({ profile, isEditing, onStartEdit }) {
  const missing = REQUIRED_FIELDS.filter(f => {
    const val = f.key === 'mssv' ? (profile.mssv || profile.msv) : profile[f.key];
    return !val || String(val).trim() === '';
  });

  if (missing.length === 0) return null;

  const total = REQUIRED_FIELDS.length;
  const filled = total - missing.length;
  const pct = Math.round((filled / total) * 100);

  return (
    <div className="mb-5 bg-[#1a1a1a] border border-amber-500/20 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0"/>
          <span className="text-sm font-bold text-amber-300">Hoàn thiện hồ sơ để mở khóa tính năng</span>
        </div>
        <span className="text-sm font-black text-amber-400">{filled}/{total}</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
          style={{width:`${pct}%`}}/>
      </div>
      {/* Missing fields */}
      <div className="flex flex-wrap gap-1.5">
        {missing.map(f => (
          <span key={f.key}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {f.label}
          </span>
        ))}
      </div>
      {!isEditing && (
        <button onClick={onStartEdit}
          className="mt-3 w-full py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all">
          Điền ngay →
        </button>
      )}
    </div>
  );
}

// ── GradeRow ──────────────────────────────────────────────────────────────
function GradeRow({ subject, grades, onGradeChange, isEditing }) {
  const g = grades[subject.id] || {};
  const r = calcResult(g.cc, g.gk, g.ck);
  const gradeColor = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'text-gray-600';
    if (n >= 8.5) return 'text-green-400'; if (n >= 7.0) return 'text-blue-400';
    if (n >= 5.5) return 'text-yellow-400'; return 'text-red-400';
  };
  const inp = (field) => (
    <input type="number" min="0" max="10" step="0.1"
      value={g[field]||''} onChange={e=>onGradeChange(subject.id, field, e.target.value)}
      className="w-14 text-center text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500"/>
  );

  // Only show grade inputs if status is "Đã học" or "Đang học"
  const canEnterGrades = isEditing && (g.status === 'Đã học' || g.status === 'Đang học');

  return (
    <tr className="border-b border-gray-800/40 hover:bg-white/[0.02] transition-colors">
      <td className="px-3 py-2.5 text-center text-xs text-gray-600">{subject.idx||''}</td>
      <td className="px-4 py-2.5">
        <div className="text-xs font-semibold text-gray-200 leading-tight">{subject.name}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{subject.code} · {subject.credits}TC</div>
      </td>
      <td className="px-2 py-2.5 text-center">
        {isEditing ? (
          <select value={g.semester||''} onChange={e=>onGradeChange(subject.id,'semester',e.target.value)}
            className="text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500 w-12">
            <option value="">—</option>
            {SEMESTERS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        ) : <span className="text-xs text-gray-400">{g.semester ? `Kỳ ${g.semester}` : '—'}</span>}
      </td>
      <td className="px-2 py-2.5">
        {isEditing ? (
          <select value={g.status||''} onChange={e=>onGradeChange(subject.id,'status',e.target.value)}
            className="text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500">
            <option value="">—</option>
            {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span className={`text-xs font-medium ${
            g.status==='Đã học'?'text-green-400':g.status==='Đang học'?'text-yellow-400':
            g.status==='Được miễn'?'text-blue-400':'text-gray-600'}`}>
            {g.status||'—'}
          </span>
        )}
      </td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('cc') : <span className="text-xs text-gray-400">{g.cc||'—'}</span>}</td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('gk') : <span className="text-xs text-gray-400">{g.gk||'—'}</span>}</td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('ck') : <span className="text-xs text-gray-400">{g.ck||'—'}</span>}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-sm ${gradeColor(r.he10)}`}>{g.status==='Đã học'?r.he10:'—'}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-xs ${gradeColor(r.he10)}`}>{g.status==='Đã học'?r.chu:'—'}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-xs ${gradeColor(r.he4)}`}>{g.status==='Đã học'?r.he4:'—'}</td>
    </tr>
  );
}

// ── GradesTable ───────────────────────────────────────────────────────────
function GradesTable({ profile, grades, onSave, canEdit }) {
  const [localGrades, setLocalGrades] = useState(grades);
  const [isEditing, setIsEditing]     = useState(false);
  useEffect(() => { setLocalGrades(grades); }, [grades]);

  const handleChange = (subjectId, field, value) => {
    setLocalGrades(prev => ({
      ...prev,
      [subjectId]: { ...(prev[subjectId]||{}), [field]: value },
    }));
  };

  const handleSave = () => { onSave(localGrades); setIsEditing(false); };

  const gpaStats = useMemo(() => calcGpaStats(localGrades), [localGrades]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label:'CPA Tích lũy (Hệ 4)', value:gpaStats.cpa,              color:'text-green-400' },
          { label:'Tín chỉ đạt',          value:`${gpaStats.credits}/133`, color:'text-blue-400'  },
          { label:'Đang học',             value:`${gpaStats.learning} môn`,color:'text-yellow-400'},
          { label:'Đã hoàn thành',        value:`${gpaStats.done} môn`,    color:'text-purple-400'},
        ].map(s=>(
          <div key={s.label} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {Object.keys(gpaStats.semGPA).length > 0 && (
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1 custom-scrollbar">
          {Object.entries(gpaStats.semGPA).sort(([a],[b])=>a-b).map(([k,v])=>(
            <div key={k} className="bg-[#1a1a1a] border border-gray-800/60 rounded-xl px-5 py-3 text-center shrink-0">
              <div className="text-[10px] text-gray-500 font-bold uppercase">Học kỳ {k}</div>
              <div className="text-xl font-black text-green-400">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Note about CPA calculation */}
      <div className="mb-4 flex items-center gap-2 text-[11px] text-gray-500 bg-[#1a1a1a] border border-gray-800/60 rounded-xl px-4 py-2.5">
        <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0"/>
        CPA tích lũy chỉ tính các môn có trạng thái <strong className="text-green-400 mx-1">Đã học</strong> theo thang điểm hệ 4.
      </div>

      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 sticky top-0 bg-[#1a1a1a] z-10">
          <h3 className="font-bold text-white text-sm">Bảng điểm · {subjectDatabase.length} môn</h3>
          <div className="flex items-center gap-3">
            <button onClick={()=>exportGradesToCSV(profile, localGrades)}
              className="flex items-center gap-1.5 text-xs text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold">
              <Download className="w-3.5 h-3.5"/> Xuất CSV
            </button>
            {canEdit && !isEditing && (
              <button onClick={()=>setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-all font-bold">
                <Edit3 className="w-3.5 h-3.5"/> Sửa
              </button>
            )}
            {canEdit && isEditing && (
              <button onClick={handleSave}
                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all font-bold">
                <Save className="w-3.5 h-3.5"/> Lưu
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isEditing?'bg-green-400 animate-pulse':'bg-gray-600'}`}/>
              {isEditing ? 'Đang chỉnh sửa' : 'Chỉ xem'}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[55vh] custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] font-black uppercase text-gray-500 bg-[#1e1e1e] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-center border-b border-gray-800">#</th>
                <th className="px-4 py-3 border-b border-gray-800 min-w-[200px]">Môn học</th>
                <th className="px-2 py-3 text-center border-b border-gray-800">Kỳ</th>
                <th className="px-2 py-3 border-b border-gray-800">Trạng thái</th>
                <th className="px-1 py-3 text-center border-b border-gray-800">CC</th>
                <th className="px-1 py-3 text-center border-b border-gray-800">GK</th>
                <th className="px-1 py-3 text-center border-b border-gray-800">CK</th>
                <th className="px-2 py-3 text-center border-b border-gray-800">Hệ 10</th>
                <th className="px-2 py-3 text-center border-b border-gray-800">Chữ</th>
                <th className="px-2 py-3 text-center border-b border-gray-800">Hệ 4</th>
              </tr>
            </thead>
            <tbody>
              {subjectDatabase.map(sub => (
                <GradeRow key={sub.id} subject={sub} grades={localGrades}
                  onGradeChange={handleChange} isEditing={isEditing}/>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── ProfileForm ───────────────────────────────────────────────────────────
// Renders editable/viewable profile fields for any member
function ProfileForm({ profile, setProfile, isEditing, isSuperAdmin, isOwnProfile, onStartEdit }) {
  const rl = roleLabel(profile.role);
  // Login email (from auth) is always the profile.email field — read-only
  const loginEmail = profile.email || '';

  return (
    <>
      {/* Completion banner — only for own profile */}
      {isOwnProfile && (
        <ProfileCompletionBanner profile={profile} isEditing={isEditing} onStartEdit={onStartEdit}/>
      )}

      {/* Avatar & Identity */}
      <Section icon={User} title="Nhận diện">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Avatar preview */}
          <div className="flex flex-col gap-2 md:col-span-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ảnh đại diện</label>
            {isEditing ? (
              <>
                <input type="url" value={profile.avatarUrl||''} onChange={e=>setProfile(p=>({...p,avatarUrl:e.target.value}))}
                  placeholder="https://... (link ảnh trực tiếp)"
                  className="text-sm px-3 py-2 rounded-xl bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none w-full"/>
                {profile.avatarUrl && (
                  <img src={profile.avatarUrl} alt="preview"
                    className="w-12 h-12 rounded-xl object-cover border border-gray-700"
                    onError={e=>{ e.target.style.display='none'; }}/>
                )}
              </>
            ) : profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-700"/>
            ) : (
              <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm">
                {getInitials(profile.fullName)}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <Field label="Biệt danh" value={profile.nickname} onChange={v=>setProfile(p=>({...p,nickname:v}))} disabled={!isEditing}/>
          </div>
        </div>
      </Section>

      {/* Basic info */}
      <Section icon={User} title="Thông tin cơ bản">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="STT"        value={profile.stt}      onChange={v=>setProfile(p=>({...p,stt:v}))}      disabled={!isEditing || !isSuperAdmin}/>
          <Field label="MSV" required value={profile.mssv||profile.msv} onChange={v=>setProfile(p=>({...p,mssv:v,msv:v}))} disabled={!isEditing}/>

          {/* Role — only super admin can change */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chức vụ</label>
            {isSuperAdmin && isEditing && profile.role !== 'super_admin' ? (
              <select value={profile.role||'member'} onChange={e=>setProfile(p=>({...p,role:e.target.value}))}
                className="text-sm px-3 py-2 rounded-xl outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500">
                <option value="member">Thành viên</option>
                <option value="core">Core Team</option>
              </select>
            ) : (
              <div className={`text-xs font-bold px-3 py-2 rounded-xl inline-flex w-fit mt-0.5 ${rl.cls}`}>
                {rl.text}
              </div>
            )}
          </div>

          <Field label="Họ và tên" required value={profile.fullName}  onChange={v=>setProfile(p=>({...p,fullName:v}))}  disabled={!isEditing}/>
          <Field label="Giới tính" required value={profile.gender}    onChange={v=>setProfile(p=>({...p,gender:v}))}    options={GENDERS}    disabled={!isEditing}/>
          <Field label="Ngày sinh" required value={profile.dob}       onChange={v=>setProfile(p=>({...p,dob:v}))}       type="date"          disabled={!isEditing}/>
          <Field label="Dân tộc"   required value={profile.ethnicity} onChange={v=>setProfile(p=>({...p,ethnicity:v}))} options={ETHNICITIES} disabled={!isEditing}/>
          <Field label="Nhóm máu"  required value={profile.bloodType} onChange={v=>setProfile(p=>({...p,bloodType:v}))} options={BLOOD_TYPES} disabled={!isEditing}/>
          <Field label="Nơi sinh"  required value={profile.pob}       onChange={v=>setProfile(p=>({...p,pob:v}))}       options={PROVINCES_34} disabled={!isEditing}/>
        </div>
      </Section>

      <Section icon={Calendar} title="Đoàn – Đảng" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ngày vào Đoàn" value={profile.joinedYouth} onChange={v=>setProfile(p=>({...p,joinedYouth:v}))} type="date" disabled={!isEditing}/>
          <Field label="Ngày vào Đảng" value={profile.joinedParty} onChange={v=>setProfile(p=>({...p,joinedParty:v}))} type="date" disabled={!isEditing}/>
        </div>
      </Section>

      <Section icon={CreditCard} title="Giấy tờ & Ngân hàng" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số CCCD"              value={profile.cccd} onChange={v=>setProfile(p=>({...p,cccd:v}))} disabled={!isEditing}/>
          <Field label="STK ngân hàng (BIDV)" value={profile.bank} onChange={v=>setProfile(p=>({...p,bank:v}))} disabled={!isEditing}/>
        </div>
      </Section>

      <Section icon={Phone} title="Liên hệ">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="SĐT" required          value={profile.phone}        onChange={v=>setProfile(p=>({...p,phone:v}))}        type="tel"   disabled={!isEditing}/>
          <Field label="SĐT người thân"        value={profile.phoneFamily}  onChange={v=>setProfile(p=>({...p,phoneFamily:v}))}  type="tel"   disabled={!isEditing}/>
          <Field label="Mail HUS" required     value={profile.mailSchool}   onChange={v=>setProfile(p=>({...p,mailSchool:v}))}   type="email" disabled={!isEditing}/>
          <Field label="Mail VNU" required     value={profile.mailVnu}      onChange={v=>setProfile(p=>({...p,mailVnu:v}))}      type="email" disabled={!isEditing}/>
          <Field label="Facebook" required     value={profile.facebook}     onChange={v=>setProfile(p=>({...p,facebook:v}))}                 disabled={!isEditing}/>

          {/* Login email — always read-only, never editable */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Mail đăng nhập
              <Lock className="w-2.5 h-2.5 text-gray-600"/>
            </label>
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-[#1a1a1a] border border-gray-800 text-gray-400">
              <span className="flex-1 truncate">{loginEmail || '—'}</span>
              <span className="text-[9px] font-bold text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-md shrink-0">Cố định</span>
            </div>
            <p className="text-[10px] text-gray-600">Email dùng để đăng nhập, không thể thay đổi.</p>
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Địa chỉ" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Quê quán"       value={profile.hometown}         onChange={v=>setProfile(p=>({...p,hometown:v}))}         options={PROVINCES_34} disabled={!isEditing}/>
          <Field label="Nơi thường trú" value={profile.permanentAddress} onChange={v=>setProfile(p=>({...p,permanentAddress:v}))} disabled={!isEditing}/>
          <Field label="Nơi ở hiện tại" value={profile.currentAddress}   onChange={v=>setProfile(p=>({...p,currentAddress:v}))}   disabled={!isEditing}/>
        </div>
      </Section>
    </>
  );
}

// ── MemberDetail ──────────────────────────────────────────────────────────
// Full profile + grades view for a specific member (opened by core)
function MemberDetail({ member, onBack, canEdit }) {
  const { grades, updateMemberProfile, syncGrades, isSuperAdmin } = useApp();
  const memberGrades = grades[member.id] || {};

  const [tab,       setTab]       = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profile,   setProfile]   = useState({ ...member });

  useEffect(() => { setProfile({ ...member }); }, [member]);

  const handleSaveProfile = () => {
    updateMemberProfile(member.id, profile);
    setIsEditing(false);
  };

  const handleSaveGrades = (updatedGrades) => {
    syncGrades(member.id, updatedGrades);
  };

  const rl = roleLabel(member.role);
  const initials = getInitials(member.fullName);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-gray-800/60 bg-[#1a1a1a] sticky top-0 z-10">
        <button onClick={onBack}
          className="p-2 rounded-xl hover:bg-[#252525] text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {member.avatarUrl
            ? <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-700"/>
            : <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">{initials}</div>
          }
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{member.fullName||'—'}</div>
            <div className="text-xs text-gray-500">{member.mssv||member.msv||'MSSV chưa cập nhật'}</div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 ${rl.cls}`}>{rl.text}</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && tab === 'profile' && !isEditing && (
            <button onClick={()=>setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl hover:bg-blue-500/10 transition-all font-bold">
              <Edit3 className="w-3.5 h-3.5"/> Chỉnh sửa
            </button>
          )}
          {canEdit && tab === 'profile' && isEditing && (
            <>
              <button onClick={()=>{setProfile({...member});setIsEditing(false);}}
                className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 px-3 py-2 rounded-xl hover:bg-[#252525] transition-all font-bold">
                <X className="w-3.5 h-3.5"/> Huỷ
              </button>
              <button onClick={handleSaveProfile}
                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl transition-all font-bold">
                <Save className="w-3.5 h-3.5"/> Lưu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-6 pt-4">
        {[['profile','Hồ sơ'],['grades','Bảng điểm']].map(([k,v])=>(
          <button key={k} onClick={()=>{setTab(k);setIsEditing(false);}}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${tab===k ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                       : 'text-gray-500 hover:text-gray-300 hover:bg-[#252525]'}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'profile' && (
          <ProfileForm profile={profile} setProfile={setProfile}
            isEditing={isEditing} isSuperAdmin={isSuperAdmin} isOwnProfile={false}/>
        )}
        {tab === 'grades' && (
          <GradesTable profile={member} grades={memberGrades}
            onSave={handleSaveGrades} canEdit={canEdit}/>
        )}
      </div>
    </div>
  );
}

// ── MemberCard ─────────────────────────────────────────────────────────────
function MemberCard({ member, onClick }) {
  const rl = roleLabel(member.role);
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl hover:bg-[#1e1e1e] hover:border-blue-500/30 transition-all text-left group">
      {member.avatarUrl
        ? <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0"/>
        : <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
            {getInitials(member.fullName)}
          </div>
      }
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-200 text-sm truncate group-hover:text-white">{member.fullName||'—'}</div>
        <div className="text-xs text-gray-600 truncate">{member.mssv||member.msv||'Chưa cập nhật MSSV'}</div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${rl.cls}`}>{rl.text}</span>
      <Eye className="w-4 h-4 text-gray-700 group-hover:text-blue-400 shrink-0 transition-colors"/>
    </button>
  );
}

// ── Members Management Tab ─────────────────────────────────────────────────
function MembersTab() {
  const { activeMembers, pendingMembers, isCore, isSuperAdmin, approveUser, rejectUser, exportMembersCSV } = useApp();
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId,  setRejectingId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeMembers.filter(m =>
      m.fullName?.toLowerCase().includes(q) ||
      (m.mssv||m.msv||'').includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  }, [activeMembers, search]);

  const handleApprove = async (id) => {
    setApprovingId(id);
    await approveUser(id);
    setApprovingId(null);
  };
  const handleReject = async (id) => {
    if (!window.confirm('Từ chối và xoá đơn này?')) return;
    setRejectingId(id);
    await rejectUser(id);
    setRejectingId(null);
  };

  if (selectedMember) {
    const fresh = activeMembers.find(m => m.id === selectedMember.id) || selectedMember;
    return (
      <MemberDetail
        member={fresh}
        canEdit={isCore || isSuperAdmin}
        onBack={() => setSelectedMember(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Tổng thành viên',   value: activeMembers.length, color:'text-white' },
          { label:'Core Team',          value: activeMembers.filter(m=>m.role==='core'||m.role==='super_admin').length, color:'text-blue-400' },
          { label:'Chờ duyệt',          value: pendingMembers.length, color: pendingMembers.length ? 'text-amber-400' : 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4 text-center">
            <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending approval */}
      {pendingMembers.length > 0 && (
        <div className="bg-[#1a1a1a] border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-500/8 border-b border-amber-500/20">
            <Clock className="w-4 h-4 text-amber-400"/>
            <span className="font-bold text-amber-300 text-sm">Chờ xét duyệt ({pendingMembers.length})</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {pendingMembers.map(m => (
              <div key={m.id} className="p-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                  {getInitials(m.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{m.fullName||'—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.email} · MSSV: {m.mssv||'—'}</div>
                  {m.reason && (
                    <div className="mt-1.5 text-xs text-gray-400 bg-[#252525] rounded-xl px-3 py-2 leading-relaxed">
                      "{m.reason}"
                    </div>
                  )}
                  <div className="text-[10px] text-gray-600 mt-1">
                    Đăng ký: {m.registeredAt ? new Date(m.registeredAt).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
                {(isSuperAdmin || isCore) && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>handleApprove(m.id)} disabled={approvingId===m.id}
                      className="flex items-center gap-1 text-xs text-green-400 border border-green-500/30 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold disabled:opacity-50">
                      {approvingId===m.id ? '...' : <><Check className="w-3.5 h-3.5"/> Duyệt</>}
                    </button>
                    <button onClick={()=>handleReject(m.id)} disabled={rejectingId===m.id}
                      className="flex items-center gap-1 text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-all font-bold disabled:opacity-50">
                      {rejectingId===m.id ? '...' : <><X className="w-3.5 h-3.5"/> Từ chối</>}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60">
          <Users className="w-4 h-4 text-gray-500"/>
          <span className="font-bold text-gray-300 text-sm flex-1">Thành viên đang hoạt động</span>
          <button onClick={exportMembersCSV}
            className="flex items-center gap-1.5 text-xs text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold">
            <Download className="w-3.5 h-3.5"/> Xuất CSV
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Tìm theo tên, MSSV, email..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#252525] border border-gray-700 rounded-xl text-white placeholder:text-gray-600 outline-none focus:border-blue-500 transition-all"/>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.length === 0 && (
            <div className="md:col-span-2 text-center py-8 text-gray-600 text-sm">Không tìm thấy thành viên nào.</div>
          )}
          {filtered.map(m => (
            <MemberCard key={m.id} member={m} onClick={()=>setSelectedMember(m)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Profile Page ──────────────────────────────────────────────────────
export default function Profile() {
  const {
    currentUser, updateProfile, myGrades, syncGrades,
    isProfileComplete, isCore, isSuperAdmin, activeMembers,
  } = useApp();

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileState, setProfileState] = useState({ ...currentUser });

  // Sync when currentUser changes externally (e.g. core edits our profile)
  useEffect(() => {
    if (!isEditing) setProfileState({ ...currentUser });
  }, [currentUser, isEditing]);

  const complete  = isProfileComplete(currentUser);
  const initials  = getInitials(currentUser?.fullName);
  const rl        = roleLabel(currentUser?.role);

  const handleSaveProfile = () => {
    updateProfile(profileState);
    setIsEditing(false);
  };
  const handleSaveGrades = (updatedGrades) => {
    syncGrades(currentUser.id, updatedGrades);
  };
  const handleCancelEdit = () => {
    setProfileState({ ...currentUser });
    setIsEditing(false);
  };

  const tabs = [
    { key:'profile', label:'Hồ sơ',      icon:User     },
    { key:'grades',  label:'Bảng điểm',  icon:BookOpen },
    ...(isCore||isSuperAdmin ? [{ key:'members', label:'Thành viên', icon:Users }] : []),
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-800/60 bg-[#121212] sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          {currentUser?.avatarUrl
            ? <img src={currentUser.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-gray-700"/>
            : <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-lg">
                {initials}
              </div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black text-white">{currentUser?.fullName||'Thành viên'}</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${rl.cls}`}>{rl.text}</span>
              {complete
                ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3.5 h-3.5"/> Hồ sơ đầy đủ</span>
                : <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="w-3.5 h-3.5"/> Hồ sơ chưa đầy đủ</span>
              }
            </div>
            <div className="text-sm text-gray-500 mt-0.5">{currentUser?.mssv||currentUser?.msv||'MSSV chưa cập nhật'} · {currentUser?.mailSchool||currentUser?.email||''}</div>
          </div>

          {/* Profile edit actions (only on profile tab) */}
          {activeTab === 'profile' && (
            <div className="flex gap-2">
              {!isEditing && (
                <button onClick={()=>setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
                  <Edit3 className="w-3.5 h-3.5"/> Chỉnh sửa
                </button>
              )}
              {isEditing && (
                <>
                  <button onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-700 hover:border-gray-600 hover:bg-[#252525] text-gray-300 text-sm font-bold rounded-xl transition-all">
                    <X className="w-3.5 h-3.5"/> Huỷ
                  </button>
                  <button onClick={handleSaveProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all">
                    <Save className="w-3.5 h-3.5"/> Lưu
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key}
              onClick={()=>{ setActiveTab(t.key); setIsEditing(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
                ${activeTab===t.key
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#252525]'}`}>
              <t.icon className="w-3.5 h-3.5"/>
              {t.label}
              {t.key==='members' && activeTab!=='members' && (
                <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {activeMembers?.length||''}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {activeTab === 'profile' && (
          <ProfileForm
            profile={profileState}
            setProfile={setProfileState}
            isEditing={isEditing}
            isSuperAdmin={isSuperAdmin}
            isOwnProfile={true}
            onStartEdit={()=>setIsEditing(true)}
          />
        )}

        {activeTab === 'grades' && (
          <GradesTable
            profile={currentUser}
            grades={myGrades}
            onSave={handleSaveGrades}
            canEdit={true}
          />
        )}

        {activeTab === 'members' && (isCore||isSuperAdmin) && (
          <MembersTab/>
        )}
      </div>
    </div>
  );
}
