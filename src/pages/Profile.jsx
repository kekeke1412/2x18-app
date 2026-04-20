// src/pages/Profile.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  User, CreditCard, Calendar, Phone, MapPin,
  Save, Edit3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Download, Users, ChevronLeft, Search, Check, X,
  Clock, Eye, BookOpen, Lock, CheckCircle, GraduationCap, XCircle, Trash2, Key,
  Shield, Settings, ShieldCheck, Zap, Database, Sparkles
} from 'lucide-react';
import { subjectDatabase, calculateHe10, getHe4, electiveLimits } from '../data';
import { useApp } from '../context/AppContext';
import { getApiKey } from '../services/aiService';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ──────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+','A−','B+','B−','AB+','AB−','O+','O−'];
const GENDERS     = ['Nam','Nữ'];
const SEMESTERS   = [1,2,3,4,5,6,7,8];

// Cập nhật danh sách 23 Tỉnh/Thành phố
const PROVINCES = [
  'Hà Nội',
  'TP Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Cần Thơ',
  'Huế',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long'
];

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

const ETHNICITIES = [
  'Kinh','Tày','Thái','Mường','Khmer','Mông','Nùng','Dao','Gia-rai','Ngái',
  'Ê-đê','Ba-na','Xơ-đăng','Sán Chay','Cơ-ho','Chăm','Sán Dìu','Hrê','Mnông',
  'Ra-glai','Xtiêng','Bru-Vân Kiều','Thổ','Giáy','Cơ-tu','Gié-triêng','Mạ',
  'Khơ-mú','Co','Tà-ôi','Chơ-ro','Kháng','Xinh-mun','Hà Nhì','Chu-ru','Lào',
  'La Chí','La Ha','Phù Lá','La Hủ','Lự','Lô Lô','Chứt','Mảng','Pà Thẻn',
  'Cơ Lao','Cống','Bố Y','Si La','Pu Péo','Rơ-măm','Brâu','Ơ-đu',
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
function calcGpaStats(grades) {
  let totalPoints = 0, totalCredits = 0, earnedCredits = 0;
  let learning = 0, done = 0;
  const semGPA = {};
  const failed = []; // môn trượt (Điểm F — không tính CPA)

  // 1. Tính toán trước số tín chỉ hiện tại của từng khối tự chọn
  const groupCredits = {};
  subjectDatabase.forEach(sub => {
    if (sub.electiveGroup) {
      const st = grades[sub.id]?.status;
      if (st === 'Đã học' || st === 'Đang học' || st === 'Được miễn' || st === 'Đạt') {
        groupCredits[sub.electiveGroup] = (groupCredits[sub.electiveGroup] || 0) + sub.credits;
      }
    }
  });

  subjectDatabase.forEach(sub => {
    const g = grades[sub.id] || {};
    let st = g.status || 'Chưa học';

    // 2. Logic ép "Không học" nếu khối tự chọn đã đủ tín chỉ
    const limit = sub.electiveGroup ? electiveLimits[sub.electiveGroup] : 0;
    const currentCr = sub.electiveGroup ? (groupCredits[sub.electiveGroup] || 0) : 0;
    const isActive = st === 'Đã học' || st === 'Đang học' || st === 'Được miễn' || st === 'Đạt';
    
    // Nếu khối đã đủ chỉ, và môn này chưa được chọn -> Mặc định là Không học
    if (sub.electiveGroup && currentCr >= limit && !isActive) {
      st = 'Không học';
    }

    if (st === 'Đang học') learning++;
    
    if (st === 'Đã học' || st === 'Đạt' || st === 'Được miễn') {
      if (st === 'Đã học' || st === 'Đạt') done++;
      
      // 3. Loại bỏ các môn Giáo dục thể chất, QPAN, Kỹ năng bổ trợ khỏi GPA và Tín chỉ
      if (!sub.excludeCPA) {
        // Môn được miễn luôn tính vào tín chỉ đạt
        if (st === 'Được miễn') earnedCredits += sub.credits;

        if (st === 'Đã học') {
          const r = calcResult(g.cc, g.gk, g.ck);
          const he4 = parseFloat(r.he4);
          if (!isNaN(he4)) {
            if (he4 >= 1.0) {
              // Điểm từ D trở lên → tính vào CPA và tín chỉ đạt
              earnedCredits += sub.credits;
              totalPoints  += he4 * sub.credits;
              totalCredits += sub.credits;
              if (g.semester) {
                if (!semGPA[g.semester]) semGPA[g.semester] = { pts:0, cr:0 };
                semGPA[g.semester].pts += he4 * sub.credits;
                semGPA[g.semester].cr  += sub.credits;
              }
            } else {
              // Điểm F → không tính CPA, không tính tín chỉ đạt
              failed.push({ ...sub, he10: r.he10, chu: r.chu, he4: r.he4, semester: g.semester });
            }
          }
        }
      }
    }
  });

  const cpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : '—';
  const semGPAFmt = {};
  Object.entries(semGPA).forEach(([k,v]) => {
    semGPAFmt[k] = v.cr ? (v.pts/v.cr).toFixed(2) : '—';
  });
  return { cpa, credits: earnedCredits, learning, done, semGPA: semGPAFmt,
           failed, rawPoints: totalPoints, rawCredits: totalCredits };
}

function exportGradesToCSV(profile, grades) {
  const headers = ['STT','Mã môn','Tên môn','Số TC','Loại','Học kỳ','Trạng thái','CC','GK','CK','Hệ 10','Chữ','Hệ 4'];
  const rows = subjectDatabase.map((sub, i) => {
    const g = grades[sub.id] || {};
    let st = g.status || 'Chưa học';
    if (sub.excludeCPA && st === 'Đã học') st = 'Đạt'; // Fix export format
    const r = sub.excludeCPA ? { he10: '—', chu: '—', he4: '—' } : calcResult(g.cc, g.gk, g.ck);
    return [i+1, sub.code, sub.name, sub.credits, sub.type,
      g.semester ? `Kỳ ${g.semester}` : '—', st,
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden mb-4"
    >
      <button onClick={()=>setOpen(v=>!v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#1e1e1e] hover:bg-[#222] transition-colors text-left">
        <Icon className="w-4 h-4 text-gray-500 shrink-0"/>
        <span className="text-sm font-bold text-gray-300 flex-1">{title}</span>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/20">{badge}</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-600"/> : <ChevronDown className="w-4 h-4 text-gray-600"/>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800/60 overflow-hidden"
          >
            <div className="p-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-5 bg-[#1a1a1a] border border-amber-500/20 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0"/>
          <span className="text-sm font-bold text-amber-300">Hoàn thiện hồ sơ để mở khóa tính năng</span>
        </div>
        <span className="text-sm font-black text-amber-400">{filled}/{total}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
        />
      </div>
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
    </motion.div>
  );
}

// ── GradeRow ──────────────────────────────────────────────────────────────
function GradeRow({ subject, grades, onGradeChange, isEditing, isDimmed }) {
  const g = grades[subject.id] || {};
  const isExclude = subject.excludeCPA; // Đánh dấu môn Thể chất, QPAN

  // Nếu bị dư tự chọn, ép hiển thị là Không học
  let st = g.status || 'Chưa học';
  if (isDimmed) st = 'Không học';

  // Menu thả xuống riêng cho môn Thể chất/QPAN
  const statusOpts = isExclude 
    ? ['Chưa học', 'Đang học', 'Đạt', 'Chưa đạt', 'Không học']
    : ['Chưa học', 'Đang học', 'Đã học', 'Được miễn', 'Không học'];

  const r = isExclude ? { he10: '—', chu: '—', he4: '—' } : calcResult(g.cc, g.gk, g.ck);
  
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

  // Chỉ cho phép nhập điểm nếu không bị làm mờ, không phải môn loại trừ, và đang học/đã học
  const canEnterGrades = isEditing && !isExclude && !isDimmed && (st === 'Đã học' || st === 'Đang học');

  return (
    <tr className={`border-b border-gray-800/40 hover:bg-white/[0.02] transition-colors ${isDimmed ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
      <td className="px-3 py-2.5 text-center text-xs text-gray-600">{subject.idx||''}</td>
      <td className="px-4 py-2.5">
        <div className="text-xs font-semibold text-gray-200 leading-tight">{subject.name}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{subject.code} · {subject.credits}TC {isExclude && '· (Không tính CPA)'}</div>
      </td>
      <td className="px-2 py-2.5 text-center">
        {isEditing && !isDimmed ? (
          <select value={g.semester||''} onChange={e=>onGradeChange(subject.id,'semester',e.target.value)}
            className="text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500 w-12">
            <option value="">—</option>
            {SEMESTERS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        ) : <span className="text-xs text-gray-400">{g.semester ? `Kỳ ${g.semester}` : '—'}</span>}
      </td>
      <td className="px-2 py-2.5">
        {isEditing && !isDimmed ? (
          <select value={st} onChange={e => {
            const newStatus = e.target.value;
            onGradeChange(subject.id, 'status', newStatus);
            // FIX: clear grade fields when switching to a non-graded status
            if (newStatus === 'Chưa học' || newStatus === 'Không học') {
              onGradeChange(subject.id, 'cc', '');
              onGradeChange(subject.id, 'gk', '');
              onGradeChange(subject.id, 'ck', '');
            }
          }}
            className="text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500">
            <option value="">—</option>
            {statusOpts.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span className={`text-xs font-medium ${
            st==='Đã học' || st==='Đạt' ?'text-green-400' : st==='Đang học'?'text-yellow-400':
            st==='Được miễn'?'text-blue-400':'text-gray-600'}`}>
            {st}
          </span>
        )}
      </td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('cc') : <span className="text-xs text-gray-400">{g.cc||'—'}</span>}</td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('gk') : <span className="text-xs text-gray-400">{g.gk||'—'}</span>}</td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('ck') : <span className="text-xs text-gray-400">{g.ck||'—'}</span>}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-sm ${gradeColor(r.he10)}`}>{st==='Đã học' ? r.he10 : (isExclude && st==='Đạt' ? 'Đạt' : '—')}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-xs ${gradeColor(r.he10)}`}>{st==='Đã học' ? r.chu : '—'}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-xs ${gradeColor(r.he4)}`}>{st==='Đã học' ? r.he4 : '—'}</td>
    </tr>
  );
}

// ── GradesTable ───────────────────────────────────────────────────────────
function GradesTable({ profile, grades, onSave, canEdit }) {
  const [localGrades, setLocalGrades] = useState(grades);
  const [isEditing, setIsEditing]     = useState(false);
  const [cpaGoal,   setCpaGoal]       = useState('');
  useEffect(() => { setLocalGrades(grades); }, [grades]);

  const handleChange = (subjectId, field, value) => {
    setLocalGrades(prev => ({
      ...prev,
      [subjectId]: { ...(prev[subjectId]||{}), [field]: value },
    }));
  };

  const handleSave = () => { onSave(localGrades); setIsEditing(false); };

  const gpaStats = useMemo(() => calcGpaStats(localGrades), [localGrades]);

  // Tổng tín chỉ chương trình — cố định 133 TC (theo chương trình đào tạo)
  const totalProgramCredits = 133;

  // Tính điểm TB cần đạt mỗi kỳ để đạt mục tiêu CPA
  const cpaGoalResult = useMemo(() => {
    const goal = parseFloat(cpaGoal);
    if (!cpaGoal || isNaN(goal) || goal <= 0 || goal > 4.0) return null;
    const { rawPoints, rawCredits } = gpaStats;
    const remaining = totalProgramCredits - rawCredits;
    if (remaining <= 0) return { needed: null, remaining: 0 };
    const needed = (goal * (rawCredits + remaining) - rawPoints) / remaining;
    return { needed: Math.min(4.0, Math.max(0, needed)).toFixed(2), remaining };
  }, [cpaGoal, gpaStats, totalProgramCredits]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
        {[
          { label:'CPA Tích lũy (Hệ 4)', value:gpaStats.cpa,                                             color:'text-green-400' },
          { label:'Tín chỉ đạt',          value:`${gpaStats.credits}/133`,                               color:'text-blue-400'  },
          { label:'TC trượt (Điểm F)',    value: gpaStats.failed?.length
              ? `${gpaStats.failed.reduce((s,f)=>s+f.credits,0)} TC`
              : '0 TC',
            color: gpaStats.failed?.length ? 'text-red-400' : 'text-gray-500' },
          { label:'Đang học',             value:`${gpaStats.learning} môn`,                              color:'text-yellow-400'},
          { label:'Đã hoàn thành',        value:`${gpaStats.done} môn`,                                  color:'text-purple-400'},
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
      <div className="mb-4 flex flex-col gap-1.5 text-[11px] text-gray-500 bg-[#1a1a1a] border border-gray-800/60 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0"/>
          <span>CPA tích lũy chỉ tính các môn có trạng thái <strong className="text-green-400">Đã học</strong> với điểm từ <strong className="text-green-400">D trở lên</strong> (hệ 4). Điểm F bị loại trừ.</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0"/>
          <span>Các môn Thể chất, QPAN, Kỹ năng bổ trợ chỉ ghi nhận <strong className="text-blue-400">Đạt/Chưa đạt</strong> và không tính vào CPA.</span>
        </div>
      </div>

      {/* CPA Goal Panel */}
      <div className="mb-5 bg-[#1a1a1a] border border-purple-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-4 h-4 text-purple-400"/>
          <span className="text-sm font-bold text-purple-300">Mục tiêu CPA khi ra trường</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">CPA mục tiêu (hệ 4)</label>
            <input
              type="number" min="0" max="4" step="0.01"
              placeholder="VD: 3.20"
              value={cpaGoal}
              onChange={e => setCpaGoal(e.target.value)}
              className="w-24 text-sm bg-[#252525] border border-gray-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-purple-500 text-center"/>
          </div>
          {cpaGoalResult && cpaGoalResult.remaining > 0 && (
            <div className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-center border ${
              parseFloat(cpaGoalResult.needed) <= 4.0
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}>
              {parseFloat(cpaGoalResult.needed) <= 4.0
                ? <>Cần duy trì TB <span className="text-lg font-black">{cpaGoalResult.needed}</span>/4.0 trong {cpaGoalResult.remaining} TC còn lại</>
                : <>Mục tiêu này <span className="text-red-400 font-black">không khả thi</span> với điểm số hiện tại</>
              }
            </div>
          )}
          {cpaGoalResult && cpaGoalResult.remaining === 0 && (
            <div className="flex-1 px-4 py-2.5 rounded-xl text-sm text-gray-500 text-center border border-gray-800">
              Đã hoàn thành chương trình học.
            </div>
          )}
          {!cpaGoalResult && cpaGoal && (
            <div className="flex-1 px-4 py-2.5 rounded-xl text-xs text-amber-400 border border-amber-500/20 bg-amber-500/10">
              Nhập CPA mục tiêu từ 0.00 đến 4.00
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Tính dựa trên {gpaStats.rawCredits} TC đã có điểm và còn {Math.max(0, totalProgramCredits - gpaStats.rawCredits)} TC chưa được đánh giá.
        </p>
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
              {(() => {
                const groups = [];
                const groupMap = {};
                subjectDatabase.forEach((sub, i) => {
                  const key = sub.type;
                  if (!groupMap[key]) {
                    groupMap[key] = { label: key, subjects: [] };
                    groups.push(groupMap[key]);
                  }
                  groupMap[key].subjects.push({ ...sub, idx: i + 1 });
                });

                // Tính toán tín chỉ của từng khối tự chọn theo thời gian thực
                const groupCredits = {};
                subjectDatabase.forEach(sub => {
                  if (sub.electiveGroup) {
                    const st = localGrades[sub.id]?.status;
                    if (st === 'Đã học' || st === 'Đang học' || st === 'Được miễn' || st === 'Đạt') {
                      groupCredits[sub.electiveGroup] = (groupCredits[sub.electiveGroup] || 0) + sub.credits;
                    }
                  }
                });

                const groupColors = [
                  'text-sky-400 bg-sky-500/10 border-sky-500/20',
                  'text-violet-400 bg-violet-500/10 border-violet-500/20',
                  'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  'text-rose-400 bg-rose-500/10 border-rose-500/20',
                  'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                  'text-orange-400 bg-orange-500/10 border-orange-500/20',
                  'text-pink-400 bg-pink-500/10 border-pink-500/20',
                ];

                return groups.map((group, gi) => {
                  const colorCls = groupColors[gi % groupColors.length];
                  const totalCredits = group.subjects.reduce((s, sub) => s + sub.credits, 0);
                  return (
                    <React.Fragment key={group.label}>
                      <tr className="bg-[#1e1e1e]">
                        <td colSpan={10} className="px-4 py-2 border-y border-gray-800/60">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${colorCls}`}>
                              {group.label}
                            </span>
                            <span className="text-[10px] text-gray-600 font-medium">
                              {group.subjects.length} môn · {totalCredits} tín chỉ
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.subjects.map(sub => {
                        const limit = sub.electiveGroup ? electiveLimits[sub.electiveGroup] : 0;
                        const currentCr = sub.electiveGroup ? (groupCredits[sub.electiveGroup] || 0) : 0;
                        const st = localGrades[sub.id]?.status;
                        const isActive = st === 'Đã học' || st === 'Đang học' || st === 'Được miễn' || st === 'Đạt';
                        
                        // Làm mờ nếu khối đã full tín chỉ, và môn này đang không được chọn
                        const isDimmed = sub.electiveGroup && currentCr >= limit && !isActive;

                        return (
                          <GradeRow key={sub.id} subject={sub} grades={localGrades}
                            onGradeChange={handleChange} isEditing={isEditing} isDimmed={isDimmed}/>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Môn trượt (Điểm F) ── */}
      {gpaStats.failed && gpaStats.failed.length > 0 && (
        <div className="mt-5 bg-[#1a1a1a] border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-red-500/5 border-b border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400"/>
            <span className="font-bold text-red-300 text-sm">Môn trượt ({gpaStats.failed.length} môn · không tính CPA)</span>
            <span className="ml-auto text-[10px] text-red-500 font-medium">
              {gpaStats.failed.reduce((s, f) => s + f.credits, 0)} TC bị ảnh hưởng
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-black uppercase text-gray-500 bg-[#1e1e1e]">
                <tr>
                  <th className="px-4 py-2.5 border-b border-gray-800 min-w-[200px]">Môn học</th>
                  <th className="px-3 py-2.5 text-center border-b border-gray-800">Kỳ</th>
                  <th className="px-3 py-2.5 text-center border-b border-gray-800">Hệ 10</th>
                  <th className="px-3 py-2.5 text-center border-b border-gray-800">Chữ</th>
                  <th className="px-3 py-2.5 text-center border-b border-gray-800">Hệ 4</th>
                </tr>
              </thead>
              <tbody>
                {gpaStats.failed.map(f => (
                  <tr key={f.id} className="border-b border-gray-800/40 hover:bg-red-500/5 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-semibold text-gray-200">{f.name}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{f.code} · {f.credits} TC</div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{f.semester ? `Kỳ ${f.semester}` : '—'}</td>
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-red-400">{f.he10}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-red-400">{f.chu}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-red-400">{f.he4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-red-500/5 border-t border-red-500/10 text-[10px] text-red-500">
            ⚠ Các môn trên có điểm F (hệ 4 &lt; 1.0) và bị loại khỏi công thức tính CPA. Cần học lại để cải thiện điểm.
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Settings Tab (Super Admin Only) ──────────────────────────────────
function SystemSettings() {
  const { config, updateConfig } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    gemini_api_key: config?.gemini_api_key || '',
    maintenance_mode: config?.maintenance_mode || false,
    announcement: config?.announcement || '',
  });

  useEffect(() => {
    setForm({
      gemini_api_key: config?.gemini_api_key || '',
      maintenance_mode: config?.maintenance_mode || false,
      announcement: config?.announcement || '',
    });
  }, [config]);

  const handleSave = () => {
    setIsSaving(true);
    updateConfig(form);
    // Tạo cảm giác lưu tức thì, không bắt người dùng đợi lâu
    setTimeout(() => setIsSaving(false), 600);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a1a1a] border border-blue-500/20 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Cấu hình Hệ thống</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dành riêng cho Super Admin</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-3 h-3 text-blue-400" /> GEMINI API KEY (AI RESTORATION)
            </label>
            <div className="relative">
              <input 
                type="password"
                className="input-dark pr-12"
                placeholder="Dán API Key của Gemini vào đây..."
                value={form.gemini_api_key}
                onChange={e => setForm({...form, gemini_api_key: e.target.value})}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {config?.gemini_api_key ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed italic">
              Key này sẽ được đồng bộ ngay lập tức cho toàn bộ người dùng để khôi phục các tính năng AI.
            </p>
          </div>

          <div className="h-px bg-gray-800 my-2"></div>

          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-[#121212] border border-gray-800 rounded-xl">
                <div>
                   <div className="text-sm font-bold text-gray-200">Chế độ bảo trì</div>
                   <div className="text-[10px] text-gray-500">Khóa truy cập đối với thành viên thường</div>
                </div>
                <button 
                  onClick={() => setForm({...form, maintenance_mode: !form.maintenance_mode})}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.maintenance_mode ? 'bg-red-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.maintenance_mode ? 'left-7' : 'left-1'}`} />
                </button>
             </div>

             <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Thông báo toàn hệ thống</label>
                <textarea 
                  className="input-dark min-h-[100px] resize-none"
                  placeholder="Nội dung thông báo sẽ hiện ở Dashboard..."
                  value={form.announcement}
                  onChange={e => setForm({...form, announcement: e.target.value})}
                />
             </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ĐANG LƯU...
                </div>
              ) : (
                <><Save className="w-4 h-4" /> LƯU CẤU HÌNH HỆ THỐNG</>
              )}
            </button>
            
            {config?.updatedAt && (
              <p className="text-center text-[9px] text-gray-600 mt-3 uppercase tracking-widest">
                Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')} bởi {config.updatedBy || 'Admin'}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileForm({ profile, setProfile, isEditing, isSuperAdmin, isOwnProfile, onStartEdit }) {
  const rl = roleLabel(profile.role);
  const loginEmail = profile.email || '';
  const { toast } = useApp();

  return (
    <>
      {isOwnProfile && (
        <ProfileCompletionBanner profile={profile} isEditing={isEditing} onStartEdit={onStartEdit}/>
      )}

      <Section icon={Sparkles} title="Cấu hình AI cá nhân" badge="New">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Key className="w-3 h-3" /> Gemini API Key của bạn
            </label>
            <div className="relative">
              <input 
                type={isEditing ? "text" : "password"}
                value={profile.personalApiKey || ''}
                onChange={e => setProfile(p => ({ ...p, personalApiKey: e.target.value }))}
                disabled={!isEditing}
                placeholder="Dán Key cá nhân để dùng riêng (ghi đè Key của nhóm)..."
                className={`w-full text-sm px-4 py-3 rounded-xl outline-none transition-all
                  ${!isEditing ? 'bg-transparent text-gray-400 border-transparent italic cursor-default' 
                             : 'bg-[#252525] border border-gray-700 text-white focus:border-indigo-500 shadow-inner'}`}
              />
              {!isEditing && profile.personalApiKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed italic">
              * Khi bạn nhập Key ở đây, 2X18 sẽ ưu tiên dùng "tài nguyên" của bạn để xử lý AI. 
              Giúp tiết kiệm lượt dùng cho Key chung của nhóm.
            </p>
          </div>
        </div>
      </Section>

      <Section icon={User} title="Nhận diện">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <Section icon={User} title="Thông tin cơ bản">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="STT"        value={profile.stt}      onChange={v=>setProfile(p=>({...p,stt:v}))}      disabled={!isEditing || !isSuperAdmin}/>
          <Field label="MSV" required value={profile.mssv||profile.msv} onChange={v=>setProfile(p=>({...p,mssv:v,msv:v}))} disabled={!isEditing}/>

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
          <Field label="Nơi sinh"  required value={profile.pob}       onChange={v=>setProfile(p=>({...p,pob:v}))}       options={PROVINCES} disabled={!isEditing}/>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="SĐT" required          value={profile.phone}        onChange={v=>setProfile(p=>({...p,phone:v}))}        type="tel"   disabled={!isEditing}/>
          <Field label="SĐT người thân"        value={profile.phoneFamily}  onChange={v=>setProfile(p=>({...p,phoneFamily:v}))}  type="tel"   disabled={!isEditing}/>
          <Field label="Mail HUS" required     value={profile.mailSchool}   onChange={v=>setProfile(p=>({...p,mailSchool:v}))}   type="email" disabled={!isEditing}/>
          <Field label="Mail VNU" required     value={profile.mailVnu}      onChange={v=>setProfile(p=>({...p,mailVnu:v}))}      type="email" disabled={!isEditing}/>
          <Field label="Facebook" required     value={profile.facebook}     onChange={v=>setProfile(p=>({...p,facebook:v}))}                 disabled={!isEditing}/>

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
          <Field label="Quê quán"       value={profile.hometown}         onChange={v=>setProfile(p=>({...p,hometown:v}))}         options={PROVINCES} disabled={!isEditing}/>
          <Field label="Nơi thường trú" value={profile.permanentAddress} onChange={v=>setProfile(p=>({...p,permanentAddress:v}))} disabled={!isEditing}/>
          <Field label="Nơi ở hiện tại" value={profile.currentAddress}   onChange={v=>setProfile(p=>({...p,currentAddress:v}))}   disabled={!isEditing}/>
        </div>
      </Section>
    </>
  );
}

// ── MemberDetail ──────────────────────────────────────────────────────────
function MemberDetail({ member, onBack, canEdit }) {
  // FIX: use updateMemberProfile (not updateProfile) so currentUser/localStorage
  // are never overwritten when an admin edits another member's profile.
  const { grades, updateMemberProfile, syncGrades, isSuperAdmin, kickMember } = useApp();
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
      <div className="flex flex-wrap items-center gap-3 md:gap-4 p-4 md:p-6 border-b border-gray-800/60 bg-[#1a1a1a] sticky top-0 z-10">
        <button onClick={onBack}
          className="p-2 rounded-xl hover:bg-[#252525] text-gray-400 hover:text-white transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {member.avatarUrl
            ? <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0"/>
            : <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">{initials}</div>
          }
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white truncate text-sm md:text-base">{member.fullName||'—'}</div>
            <div className="text-[10px] md:text-xs text-gray-500 truncate">{member.mssv||member.msv||'MSSV chưa cập nhật'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto md:justify-end border-t md:border-none border-gray-800 pt-3 md:pt-0 mt-1 md:mt-0">
          <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 ${rl.cls}`}>{rl.text}</span>
          {isSuperAdmin && !isEditing && (
            <button onClick={() => {
              if (window.confirm(`Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu của ${member.fullName}? Hành động này KHÔNG THỂ hoàn tác!`)) {
                kickMember(member.id);
                onBack();
              }
            }}
              className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-all font-bold">
              <Trash2 className="w-3.5 h-3.5"/> Kick
            </button>
          )}
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
function MemberCard({ member, onClick, index }) {
  const rl = roleLabel(member.role);
  return (
    <motion.button 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
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
    </motion.button>
  );
}

// ── Members Management Tab ─────────────────────────────────────────────────
function MembersTab() {
  const { members, isCore, isSuperAdmin, approveUser, rejectUser, exportMembersCSV } = useApp();
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId,  setRejectingId] = useState(null);

  // Phân loại thành viên
  const activeMembers = members.filter(m => m.status !== 'pending');
  const pendingMembers = members.filter(m => m.status === 'pending');

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
    if(approveUser) await approveUser(id);
    setApprovingId(null);
  };
  const handleReject = async (id) => {
    if (!window.confirm('Từ chối và xoá đơn này?')) return;
    setRejectingId(id);
    if(rejectUser) await rejectUser(id);
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
          <AnimatePresence>
            {filtered.map((m, i) => (
              <MemberCard key={m.id} member={m} onClick={()=>setSelectedMember(m)} index={i}/>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Main Profile Page ──────────────────────────────────────────────────────
export default function Profile() {
  const {
    currentUser, updateProfile, myGrades, syncGrades,
    isProfileComplete, isCore, isSuperAdmin, members,
  } = useApp();

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profileState, setProfileState] = useState({ ...currentUser });

  useEffect(() => {
    if (!isEditing) setProfileState({ ...currentUser });
  }, [currentUser, isEditing]);

  const complete  = isProfileComplete(currentUser);
  const initials  = getInitials(currentUser?.fullName);
  const rl        = roleLabel(currentUser?.role);
  const activeMembers = members?.filter(m => m.status !== 'pending') || [];

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
    ...(isSuperAdmin ? [{ key:'system', label:'Hệ thống', icon:Settings }] : []),
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
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
                  {activeMembers.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
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

            {activeTab === 'system' && isSuperAdmin && (
              <SystemSettings/>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}