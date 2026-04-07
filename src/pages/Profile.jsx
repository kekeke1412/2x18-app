// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import {
  User, CreditCard, Calendar, Phone, MapPin,
  Save, Edit3, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Smile,
  Download
} from 'lucide-react';
import { subjectDatabase, calculateHe10, getHe4 } from '../data';
import { useApp } from '../context/AppContext';

// ── Constants ──────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+','A−','B+','B−','AB+','AB−','O+','O−'];
const GENDERS     = ['Nam','Nữ'];
const ROLES       = ['Core Team', 'Thành viên'];
const SEMESTERS   = [1,2,3,4,5,6,7,8];
const STATUS_OPTS = ['Chưa học','Đang học','Đã học','Được miễn','Không học'];

// 54 dân tộc Việt Nam
const ETHNICITIES = [
  'Kinh','Tày','Thái','Mường','Khmer','Mông','Nùng','Dao','Gia-rai','Ngái',
  'Ê-đê','Ba-na','Xơ-đăng','Sán Chay','Cơ-ho','Chăm','Sán Dìu','Hrê','Mnông',
  'Ra-glai','Xtiêng','Bru-Vân Kiều','Thổ','Giáy','Cơ-tu','Gié-triêng','Mạ',
  'Khơ-mú','Co','Tà-ôi','Chơ-ro','Kháng','Xinh-mun','Hà Nhì','Chu-ru','Lào',
  'La Chí','La Ha','Phù Lá','La Hủ','Lự','Lô Lô','Chứt','Mảng','Pà Thẻn',
  'Cơ Lao','Cống','Bố Y','Si La','Pu Péo','Rơ-măm','Brâu','Ơ-đu',
];

// 34 tỉnh/thành sau sáp nhập 2025
const PROVINCES_34 = [
  "Tuyên Quang",
  "Lào Cai",
  "Thái Nguyên",
  "Phú Thọ",
  "Bắc Ninh",
  "Hưng Yên",
  "TP. Hải Phòng",
  "Ninh Bình",
  "Quảng Trị",
  "TP. Đà Nẵng",
  "Quảng Ngãi",
  "Gia Lai",
  "Khánh Hòa",
  "Lâm Đồng",
  "Đắk Lắk",
  "TP. Hồ Chí Minh",
  "Đồng Nai",
  "Tây Ninh",
  "TP. Cần Thơ",
  "Vĩnh Long",
  "Đồng Tháp",
  "Cà Mau",
  "An Giang"
];

// Date helpers: store yyyy-mm-dd, display dd/mm/yyyy
const toDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

// Grade helpers
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

// ── Field component ────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', options, disabled }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
    {options ? (
      <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`text-sm px-3 py-2 rounded-xl outline-none transition-all ${disabled ? 'bg-transparent text-gray-300 border-transparent cursor-default' : 'bg-[#252525] border border-gray-700 text-white focus:border-blue-500'}`}>
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : type === 'date' ? (
      disabled
        ? <div className="text-sm px-3 py-2 text-gray-300">{toDisplay(value)}</div>
        : <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"/>
    ) : (
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
        className={`text-sm px-3 py-2 rounded-xl outline-none transition-all ${disabled ? 'bg-transparent text-gray-300 border-transparent cursor-default' : 'bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'}`}/>
    )}
  </div>
);

const Section = ({ icon: Icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden mb-4">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#1e1e1e] hover:bg-[#222] transition-colors text-left">
        <Icon className="w-4 h-4 text-gray-500 shrink-0"/>
        <span className="text-sm font-bold text-gray-300 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-600"/> : <ChevronDown className="w-4 h-4 text-gray-600"/>}
      </button>
      {open && <div className="p-5 border-t border-gray-800/60">{children}</div>}
    </div>
  );
};

// ── Export grades to CSV (xlsx-compatible) ─────────────────────────────────
function exportGradesToCSV(profile, grades) {
  const headers = ['STT','Mã môn','Tên môn','Số TC','Loại','Học kỳ','Trạng thái','CC','GK','CK','Hệ 10','Chữ','Hệ 4'];
  const rows = subjectDatabase.map((sub, i) => {
    const g = grades[sub.id] || {};
    const r = calcResult(g.cc, g.gk, g.ck);
    return [
      i+1, sub.code, sub.name, sub.credits, sub.type,
      g.semester ? `Kỳ ${g.semester}` : '—',
      g.status || 'Chưa học',
      g.cc || '—', g.gk || '—', g.ck || '—',
      r.he10, r.chu, r.he4,
    ];
  });

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `BangDiem_${profile.fullName || 'SinhVien'}_${profile.msv || ''}.csv`,
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Profile() {
  const { currentUser, updateProfile, myGrades, syncGrades, isProfileComplete } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile]         = useState(() => ({ ...currentUser }));
  const [savedProfile, setSavedProfile] = useState(() => ({ ...currentUser }));
  const [grades, setGrades]           = useState(myGrades || {});
  const [savedGrades, setSavedGrades] = useState(myGrades || {});

  useEffect(() => {
    const init = {};
    subjectDatabase.forEach(s => {
      init[s.id] = (myGrades && myGrades[s.id]) || { status:'Chưa học', semester:'', cc:'', gk:'', ck:'', myProgress:0 };
    });
    setGrades(init); setSavedGrades(init);
  // eslint-disable-next-line
  }, []);

  // Sync profile from Context when it changes (e.g., after login reload)
  useEffect(() => {
    if (currentUser) { setProfile({ ...currentUser }); setSavedProfile({ ...currentUser }); }
  }, [currentUser?.id]); // eslint-disable-line

  const isComplete = isProfileComplete(savedProfile);
  const setP = (f, v) => setProfile(p => ({ ...p, [f]: v }));
  const setG = (sid, f, v) => setGrades(p => ({ ...p, [sid]: { ...(p[sid]||{}), [f]: v } }));

  const saveAll = () => {
    const final = { ...profile, id: currentUser?.id };
    setSavedProfile(final); setSavedGrades(grades); setIsEditing(false);
    if (updateProfile) updateProfile(final);
    if (syncGrades) syncGrades(currentUser?.id, grades);
  };
  const cancelEdit = () => { setProfile(savedProfile); setGrades(savedGrades); setIsEditing(false); };

  // GPA stats
  const gpaStats = (() => {
    let w=0, c=0, passed=0, learning=0, done=0;
    const semGPA = {};
    subjectDatabase.forEach(sub => {
      const g = grades[sub.id]; if (!g) return;
      if (g.status === 'Đang học') learning++;
      if (g.status === 'Đã học' || g.status === 'Được miễn') {
        done++;
        const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
        const h4  = getHe4(h10);
        if (g.status === 'Đã học' && h10 !== null && !sub.excludeCPA) {
          w += h4 * sub.credits; c += sub.credits;
          const sem = g.semester || '?';
          if (!semGPA[sem]) semGPA[sem] = { w:0, c:0 };
          semGPA[sem].w += h4*sub.credits; semGPA[sem].c += sub.credits;
        }
        if (h4 >= 1.0 || g.status === 'Được miễn') passed += sub.credits;
      }
    });
    const semResult = {};
    Object.entries(semGPA).sort(([a],[b])=>Number(a)-Number(b))
      .forEach(([k,v]) => { semResult[k] = v.c>0 ? (v.w/v.c).toFixed(2) : '0.00'; });
    return { cpa: c>0?(w/c).toFixed(2):'0.00', credits:passed, learning, done, semGPA:semResult };
  })();

  const displayAvatar = savedProfile.avatarEmoji || null;
  const initials = (savedProfile.fullName||'NT').split(' ').filter(Boolean).map(w=>w[0]).slice(-2).join('').toUpperCase();

  // Grade Row
  const GradeRow = ({ subject }) => {
    const g      = grades[subject.id] || {};
    const result = calcResult(g.cc, g.gk, g.ck);
    const isActive = g.status !== 'Không học';

    const statusColors = {
      'Đã học':'text-green-400','Đang học':'text-blue-400',
      'Được miễn':'text-purple-400','Không học':'text-gray-600','Chưa học':'text-gray-500',
    };

    if (!isEditing) {
      return (
        <tr className="border-b border-gray-800/30 hover:bg-[#1e1e1e] transition-colors">
          <td className="px-3 py-2.5 text-center text-[10px] text-gray-600">{subject.id}</td>
          <td className="px-4 py-2.5">
            <div className="text-xs font-medium text-gray-200">{subject.name}</div>
            <div className="text-[10px] text-gray-600">{subject.code} · {subject.credits} TC · {subject.type}</div>
          </td>
          <td className="px-2 py-2.5 text-center text-xs text-gray-400">{g.semester||'—'}</td>
          <td className="px-2 py-2.5 text-xs"><span className={`font-bold ${statusColors[g.status]||'text-gray-500'}`}>{g.status||'Chưa học'}</span></td>
          <td className="px-1 py-2.5 text-center text-xs text-gray-400">{g.cc||'—'}</td>
          <td className="px-1 py-2.5 text-center text-xs text-gray-400">{g.gk||'—'}</td>
          <td className="px-1 py-2.5 text-center text-xs text-gray-400">{g.ck||'—'}</td>
          <td className="px-2 py-2.5 text-center text-xs font-bold text-white">{result.he10}</td>
          <td className="px-2 py-2.5 text-center text-xs font-bold text-blue-400">{result.chu}</td>
          <td className="px-2 py-2.5 text-center text-xs font-bold text-green-400">{result.he4}</td>
        </tr>
      );
    }

    const inputCls = isActive
      ? 'text-center text-sm font-medium rounded-lg px-2 py-2 w-full outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
      : 'text-center text-sm rounded-lg px-2 py-2 w-full outline-none bg-transparent text-gray-600 border border-transparent cursor-not-allowed';

    return (
      <tr className="border-b border-gray-800/40 bg-[#1a1a2a]/30">
        <td className="px-3 py-3 text-center text-[10px] text-gray-600">{subject.id}</td>
        <td className="px-4 py-3">
          <div className="text-xs font-bold text-gray-200 leading-tight">{subject.name}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{subject.code} · {subject.credits} TC</div>
        </td>
        <td className="px-2 py-3 min-w-[70px]">
          <select value={g.semester||''} onChange={e=>setG(subject.id,'semester',e.target.value)}
            className="text-xs rounded-lg px-2 py-2 w-full outline-none bg-[#252525] border border-gray-700 text-white focus:border-blue-500">
            <option value="">—</option>
            {SEMESTERS.map(s=><option key={s} value={s}>Kỳ {s}</option>)}
          </select>
        </td>
        <td className="px-2 py-3 min-w-[120px]">
          <select value={g.status||'Chưa học'} onChange={e=>setG(subject.id,'status',e.target.value)}
            className={`text-xs font-bold rounded-lg px-2 py-2 w-full outline-none bg-[#252525] border border-gray-700 focus:border-blue-500 ${statusColors[g.status]||'text-gray-400'}`}>
            {STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        {['cc','gk','ck'].map(field=>(
          <td key={field} className="px-1 py-3 min-w-[64px]">
            <input type="number" step="0.1" min="0" max="10"
              value={isActive?(g[field]||''):''}
              onChange={e=>setG(subject.id,field,e.target.value)}
              disabled={!isActive}
              className={inputCls} placeholder={isActive?'0–10':''}/>
          </td>
        ))}
        <td className="px-2 py-3 text-center text-sm font-black text-white min-w-[60px]">{result.he10}</td>
        <td className="px-2 py-3 text-center text-sm font-black text-blue-400 min-w-[40px]">{result.chu}</td>
        <td className="px-2 py-3 text-center text-sm font-black text-green-400 min-w-[50px]">{result.he4}</td>
      </tr>
    );
  };

  return (
    <div className="h-full bg-[#121212] text-gray-200 flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="px-6 py-4 border-b border-gray-800/60 bg-[#141414] shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar: emoji or initials */}
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center text-2xl shrink-0 select-none overflow-hidden">
              {savedProfile.avatarUrl
                ? <img src={savedProfile.avatarUrl} alt="" className="w-full h-full object-cover"/>
                : displayAvatar
                  ? <span>{displayAvatar}</span>
                  : <span className="text-base font-black text-blue-400">{initials}</span>}
            </div>
            <div>
              <h1 className="text-xl font-black text-white">
                {savedProfile.nickname
                  ? <><span>{savedProfile.fullName}</span>{' '}<span className="text-blue-400 font-medium text-base">"{savedProfile.nickname}"</span></>
                  : savedProfile.fullName || 'Thành viên'}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-gray-500">{savedProfile.msv||'MSV'}</span>
                {savedProfile.role && <span className="badge badge-blue">{savedProfile.role}</span>}
                {isComplete
                  ? <span className="badge badge-green flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5"/>Hồ sơ đầy đủ</span>
                  : <span className="badge badge-red flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5"/>Cần cập nhật</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[['profile','Hồ sơ'],['grades','Bảng điểm GPA']].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab===k?'bg-blue-600 text-white':'text-gray-500 border border-gray-800 hover:text-gray-300'}`}>
                {l}
              </button>
            ))}
            {isEditing ? (
              <>
                <button onClick={cancelEdit} className="px-4 py-1.5 rounded-xl text-xs font-medium border border-gray-700 text-gray-400 hover:bg-[#252525] transition-all">Hủy</button>
                <button onClick={saveAll} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-all">
                  <Save className="w-3.5 h-3.5"/> Lưu tất cả
                </button>
              </>
            ) : (
              <button onClick={()=>setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold border border-gray-700 text-gray-300 hover:bg-[#1e1e1e] transition-all">
                <Edit3 className="w-3.5 h-3.5"/> Chỉnh sửa
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto">
            {/* Avatar + Nickname + Avatar URL */}
            <Section icon={Smile} title="Hình ảnh & Biệt danh">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emoji avatar picker */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Emoji Avatar</label>
                  {isEditing ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {['🎓','😎','🚀','🔥','⚡','🌟','💎','🎯','🦁','🐉','🌙','🎸','🔬','⚗️','🧪','🌌'].map(e=>(
                          <button key={e} onClick={()=>setP('avatarEmoji',e)}
                            className={`w-8 h-8 rounded-lg text-base transition-all hover:bg-blue-500/20 ${profile.avatarEmoji===e?'bg-blue-500/30 ring-1 ring-blue-500/50':'bg-[#252525]'}`}>
                            {e}
                          </button>
                        ))}
                        <button onClick={()=>setP('avatarEmoji','')}
                          className="w-8 h-8 rounded-lg text-[10px] font-bold text-gray-500 bg-[#252525] hover:bg-red-500/10 hover:text-red-400">✕</button>
                      </div>
                      <p className="text-[10px] text-gray-600">Chọn 1 emoji · hiển thị toàn app</p>
                    </>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#252525] flex items-center justify-center text-2xl">
                      {savedProfile.avatarEmoji || <span className="text-sm font-bold text-gray-500">{initials}</span>}
                    </div>
                  )}
                </div>

                {/* URL avatar */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">URL Ảnh đại diện</label>
                  {isEditing ? (
                    <>
                      <input type="url" value={profile.avatarUrl||''} onChange={e=>setP('avatarUrl',e.target.value)}
                        placeholder="https://... (link ảnh trực tiếp)"
                        className="text-sm px-3 py-2 rounded-xl bg-[#252525] border border-gray-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none w-full"/>
                      {profile.avatarUrl && (
                        <img src={profile.avatarUrl} alt="preview"
                          className="w-12 h-12 rounded-xl object-cover border border-gray-700"
                          onError={e=>{ e.target.style.display='none'; }}/>
                      )}
                      <p className="text-[10px] text-gray-600">Nếu có URL ảnh, sẽ ưu tiên dùng thay emoji.</p>
                    </>
                  ) : (
                    savedProfile.avatarUrl
                      ? <img src={savedProfile.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-700"/>
                      : <span className="text-xs text-gray-600">Chưa có — dùng Chỉnh sửa để thêm</span>
                  )}
                </div>

                {/* Nickname */}
                <div className="md:col-span-2">
                  <Field label="Biệt danh (hiển thị bên cạnh tên)"
                    value={profile.nickname} onChange={v=>setP('nickname',v)} disabled={!isEditing}/>
                </div>
              </div>
            </Section>

            <Section icon={User} title="Thông tin cơ bản">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="STT"       value={profile.stt}       onChange={v=>setP('stt',v)}       disabled={!isEditing}/>
                <Field label="MSV *"    value={profile.msv}      onChange={v=>setP('msv',v)}      disabled={!isEditing}/>
                <Field label="Chức vụ"   value={profile.role}      onChange={v=>setP('role',v)}      options={ROLES}      disabled={!isEditing}/>
                <Field label="Họ và tên *" value={profile.fullName} onChange={v=>setP('fullName',v)} disabled={!isEditing}/>
                <Field label="Giới tính *" value={profile.gender}   onChange={v=>setP('gender',v)}   options={GENDERS}    disabled={!isEditing}/>
                <Field label="Ngày sinh"  value={profile.dob}      onChange={v=>setP('dob',v)}      type="date"          disabled={!isEditing}/>
                <Field label="Dân tộc"   value={profile.ethnicity} onChange={v=>setP('ethnicity',v)} options={ETHNICITIES} disabled={!isEditing}/>
                <Field label="Nhóm máu"  value={profile.bloodType} onChange={v=>setP('bloodType',v)} options={BLOOD_TYPES} disabled={!isEditing}/>
                <Field label="Nơi sinh"  value={profile.pob}       onChange={v=>setP('pob',v)}      options={PROVINCES_34} disabled={!isEditing}/>
              </div>
            </Section>

            <Section icon={Calendar} title="Đoàn – Đảng" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ngày vào Đoàn" value={profile.joinedYouth}  onChange={v=>setP('joinedYouth',v)}  type="date" disabled={!isEditing}/>
                <Field label="Ngày vào Đảng" value={profile.joinedParty}  onChange={v=>setP('joinedParty',v)}  type="date" disabled={!isEditing}/>
              </div>
            </Section>

            <Section icon={CreditCard} title="Giấy tờ & Ngân hàng" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Số CCCD"             value={profile.cccd} onChange={v=>setP('cccd',v)} disabled={!isEditing}/>
                <Field label="STK ngân hàng (BIDV)" value={profile.bank} onChange={v=>setP('bank',v)} disabled={!isEditing}/>
              </div>
            </Section>

            <Section icon={Phone} title="Liên hệ">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="SĐT *"          value={profile.phone}        onChange={v=>setP('phone',v)}        type="tel"   disabled={!isEditing}/>
                <Field label="SĐT người thân"  value={profile.phoneFamily}  onChange={v=>setP('phoneFamily',v)}  type="tel"   disabled={!isEditing}/>
                <Field label="Mail HUS *"      value={profile.mailSchool}   onChange={v=>setP('mailSchool',v)}   type="email" disabled={!isEditing}/>
                <Field label="Mail VNU"        value={profile.mailVnu}      onChange={v=>setP('mailVnu',v)}      type="email" disabled={!isEditing}/>
                <Field label="Mail cá nhân"    value={profile.mailPersonal} onChange={v=>setP('mailPersonal',v)} type="email" disabled={!isEditing}/>
                <Field label="Facebook"        value={profile.facebook}     onChange={v=>setP('facebook',v)}     disabled={!isEditing}/>
              </div>
            </Section>

            <Section icon={MapPin} title="Địa chỉ" defaultOpen={false}>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Quê quán"        value={profile.hometown}         onChange={v=>setP('hometown',v)}         options={PROVINCES_34} disabled={!isEditing}/>
                <Field label="Nơi thường trú"  value={profile.permanentAddress} onChange={v=>setP('permanentAddress',v)} disabled={!isEditing}/>
                <Field label="Nơi ở hiện tại"  value={profile.currentAddress}   onChange={v=>setP('currentAddress',v)}   disabled={!isEditing}/>
              </div>
            </Section>
          </div>
        )}

        {/* ── GRADES TAB ── */}
        {activeTab === 'grades' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label:'CPA Tích lũy',   value:gpaStats.cpa,              color:'text-green-400'  },
                { label:'Tín chỉ đạt',    value:`${gpaStats.credits}/133`, color:'text-blue-400'   },
                { label:'Đang học',       value:`${gpaStats.learning} môn`,color:'text-yellow-400' },
                { label:'Đã hoàn thành', value:`${gpaStats.done} môn`,   color:'text-purple-400' },
              ].map(s=>(
                <div key={s.label} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Semester GPA pills */}
            {Object.keys(gpaStats.semGPA).length > 0 && (
              <div className="flex gap-3 mb-5 overflow-x-auto pb-1 custom-scrollbar">
                {Object.entries(gpaStats.semGPA).map(([k,v])=>(
                  <div key={k} className="bg-[#1a1a1a] border border-gray-800/60 rounded-xl px-5 py-3 text-center shrink-0">
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Học kỳ {k}</div>
                    <div className="text-xl font-black text-green-400">{v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 sticky top-0 bg-[#1a1a1a] z-10">
                <h3 className="font-bold text-white text-sm">Bảng điểm 70 môn</h3>
                <div className="flex items-center gap-3">
                  {/* ── EXPORT BUTTON ── */}
                  <button
                    onClick={() => exportGradesToCSV(savedProfile, grades)}
                    className="flex items-center gap-1.5 text-xs text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold">
                    <Download className="w-3.5 h-3.5"/> Xuất CSV/Excel
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${isEditing?'bg-green-400 animate-pulse':'bg-gray-600'}`}/>
                    {isEditing ? 'Đang chỉnh sửa' : 'Chỉ xem'}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[55vh] custom-scrollbar">
                <table className="w-full text-sm text-left table-sticky">
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
                    {subjectDatabase.map(sub => <GradeRow key={sub.id} subject={sub}/>)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
