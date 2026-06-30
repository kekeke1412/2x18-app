// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trash2, Edit3, X, Save, Clock, Check, Users, LayoutGrid, List, Download, Search, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { roleLabel, getInitials, toDisplay } from '../../utils/stringUtils';
import { useUserVocab, useQuizHistory } from '../../hooks/useDomainQueries';
import { ETHNICITIES, BLOOD_TYPES, PROVINCES } from '../../constants/profileConstants';
import { ProfileForm } from './ProfileForm';
import { GradesTable } from './GradesTable';
import { subjectDatabase } from '../../data';
import { calcResult } from '../../utils/gradeUtils';

function MemberDetail({ member, onBack, canEdit }) {
  const { grades, updateMemberProfile, syncGrades, isSuperAdmin, kickMember } = useApp();
  const memberGrades = grades[member.id] || {};

  const [tab, setTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({ ...member });

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
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {member.avatarUrl
            ? <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0" />
            : <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">{initials}</div>
          }
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white truncate text-sm md:text-base">{member.fullName || '—'}</div>
            <div className="text-[10px] md:text-xs text-gray-500 truncate">{member.mssv || member.msv || 'MSSV chưa cập nhật'}</div>
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
              <Trash2 className="w-3.5 h-3.5" /> Kick
            </button>
          )}
          {canEdit && tab === 'profile' && !isEditing && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl hover:bg-blue-500/10 transition-all font-bold">
              <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
            </button>
          )}
          {canEdit && tab === 'profile' && isEditing && (
            <>
              <button onClick={() => { setProfile({ ...member }); setIsEditing(false); }}
                className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 px-3 py-2 rounded-xl hover:bg-[#252525] transition-all font-bold">
                <X className="w-3.5 h-3.5" /> Huỷ
              </button>
              <button onClick={handleSaveProfile}
                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl transition-all font-bold">
                <Save className="w-3.5 h-3.5" /> Lưu
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 px-6 pt-4">
        {[['profile', 'Hồ sơ'], ['grades', 'Bảng điểm']].map(([k, v]) => (
          <button key={k} onClick={() => { setTab(k); setIsEditing(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${tab === k ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#252525]'}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'profile' && (
          <ProfileForm profile={profile} setProfile={setProfile}
            isEditing={isEditing} isSuperAdmin={isSuperAdmin} isOwnProfile={false} />
        )}
        {tab === 'grades' && (
          <GradesTable profile={member} grades={memberGrades}
            onSave={handleSaveGrades} canEdit={canEdit} />
        )}
      </div>
    </div>
  );
}

function MemberCard({ member, onClick, index }) {
  const { isCore, isSuperAdmin } = useApp();
  const { data: userVocab = {} } = useUserVocab();
  const { data: quizHistory = {} } = useQuizHistory();
  const rl = roleLabel(member.role);

  const memberVocab = userVocab[member.id] || {};
  const totalLearned = Object.values(memberVocab).reduce((sum, set) => {
    return sum + Object.values(set).filter(lv => lv >= 3).length;
  }, 0);

  const history = quizHistory[member.id] || [];
  const avgScore = history.length > 0
    ? Math.round(history.reduce((a, b) => a + b.percentage, 0) / history.length)
    : 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="w-full flex flex-col gap-3 p-4 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl hover:bg-[#1e1e1e] hover:border-blue-500/30 transition-all text-left group">

      <div className="flex items-center gap-3 w-full">
        {member.avatarUrl
          ? <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0" />
          : <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
            {getInitials(member.fullName)}
          </div>
        }
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-200 text-sm truncate group-hover:text-white">{member.fullName || '—'}</div>
          <div className="text-xs text-gray-600 truncate">{member.mssv || member.msv || 'Chưa cập nhật MSSV'}</div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${rl.cls}`}>{rl.text}</span>
        <Eye className="w-4 h-4 text-gray-700 group-hover:text-blue-400 shrink-0 transition-colors" />
      </div>

      {(isCore || isSuperAdmin) && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800/40">
          <div className="bg-blue-600/5 border border-blue-500/10 rounded-xl px-3 py-2 flex flex-col">
            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Từ vựng</span>
            <span className="text-xs font-black text-gray-300">Đã học {totalLearned} từ</span>
          </div>
          <div className="bg-purple-600/5 border border-purple-500/10 rounded-xl px-3 py-2 flex flex-col">
            <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">Quiz TB</span>
            <span className="text-xs font-black text-gray-300">{avgScore}% chính xác</span>
          </div>
        </div>
      )}
    </motion.button>
  );
}

export function MembersTab() {
  const { members, isCore, isSuperAdmin, approveUser, rejectUser, exportMembersCSV, updateMemberProfile, grades } = useApp();
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [tableDataType, setTableDataType] = useState('info');
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [tableData, setTableData] = useState({});

  const gradeColor = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return 'text-gray-600';
    if (n >= 8.5) return 'text-green-400'; if (n >= 7.0) return 'text-blue-400';
    if (n >= 5.5) return 'text-yellow-400'; return 'text-red-400';
  };

  const activeMembers = members.filter(m => m.status !== 'pending');
  const pendingMembers = members.filter(m => m.status === 'pending');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = activeMembers.filter(m =>
      m.fullName?.toLowerCase().includes(q) ||
      (m.mssv || m.msv || '').includes(q) ||
      m.email?.toLowerCase().includes(q)
    );

    result.sort((a, b) => {
      const parse = (name) => {
        const parts = (name || '').trim().split(/\s+/);
        if (parts.length === 0) return { first: '', middle: '', last: '' };
        if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
        return {
          first: parts[parts.length - 1],
          last: parts[0],
          middle: parts.slice(1, -1).join(' ')
        };
      };
      const pa = parse(a.fullName);
      const pb = parse(b.fullName);

      const comp1 = pa.first.localeCompare(pb.first, 'vi');
      if (comp1 !== 0) return comp1;
      const comp2 = pa.middle.localeCompare(pb.middle, 'vi');
      if (comp2 !== 0) return comp2;
      return pa.last.localeCompare(pb.last, 'vi');
    });

    return result;
  }, [activeMembers, search]);

  const handleEditTable = () => {
    const initData = {};
    activeMembers.forEach(m => initData[m.id] = { ...m });
    setTableData(initData);
    setIsTableEditing(true);
  };

  const handleSaveTable = () => {
    activeMembers.forEach(m => {
      const draft = tableData[m.id];
      if (!draft) return;
      const isChanged = Object.keys(draft).some(k => draft[k] !== m[k]);
      if (isChanged && updateMemberProfile) {
        updateMemberProfile(m.id, draft);
      }
    });
    setIsTableEditing(false);
  };

  const handleTableChange = (id, field, value) => {
    setTableData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    if (approveUser) await approveUser(id);
    setApprovingId(null);
  };
  const handleReject = async (id) => {
    if (!window.confirm('Từ chối và xoá đơn này?')) return;
    setRejectingId(id);
    if (rejectUser) await rejectUser(id);
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
          { label: 'Tổng thành viên', value: activeMembers.length, color: 'text-white' },
          { label: 'Core Team', value: activeMembers.filter(m => m.role === 'core' || m.role === 'super_admin').length, color: 'text-blue-400' },
          { label: 'Chờ duyệt', value: pendingMembers.length, color: pendingMembers.length ? 'text-amber-400' : 'text-gray-600' },
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
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-300 text-sm">Chờ xét duyệt ({pendingMembers.length})</span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {pendingMembers.map(m => (
              <div key={m.id} className="p-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                  {getInitials(m.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{m.fullName || '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.email} · MSSV: {m.mssv || '—'}</div>
                  {m.reason && (
                    <div className="mt-1.5 text-xs text-gray-400 bg-[#252525] rounded-xl px-3 py-2 leading-relaxed">
                      "{m.reason}"
                    </div>
                  )}
                </div>
                {(isSuperAdmin || isCore) && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(m.id)} disabled={approvingId === m.id}
                      className="flex items-center gap-1 text-xs text-green-400 border border-green-500/30 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold disabled:opacity-50">
                      {approvingId === m.id ? '...' : <><Check className="w-3.5 h-3.5" /> Duyệt</>}
                    </button>
                    <button onClick={() => handleReject(m.id)} disabled={rejectingId === m.id}
                      className="flex items-center gap-1 text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-all font-bold disabled:opacity-50">
                      {rejectingId === m.id ? '...' : <><X className="w-3.5 h-3.5" /> Từ chối</>}
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
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-bold text-gray-300 text-sm flex-1">Thành viên đang hoạt động</span>

          <div className="flex bg-[#252525] rounded-xl p-1">
            <button onClick={() => { setViewMode('grid'); setIsTableEditing(false); }}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>

          {viewMode === 'table' && tableDataType === 'info' && (isCore || isSuperAdmin) && !isTableEditing && (
            <button onClick={handleEditTable}
              className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-all font-bold">
              <Edit3 className="w-3.5 h-3.5" /> Sửa bảng
            </button>
          )}
          {viewMode === 'table' && tableDataType === 'info' && isTableEditing && (
            <div className="flex gap-2">
               <button onClick={() => setIsTableEditing(false)}
                 className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-[#252525] transition-all font-bold">
                 <X className="w-3.5 h-3.5" /> Huỷ
               </button>
               <button onClick={handleSaveTable}
                 className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all font-bold">
                 <Save className="w-3.5 h-3.5" /> Lưu
               </button>
            </div>
          )}

          <button onClick={exportMembersCSV}
            className="flex items-center gap-1.5 text-xs text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold">
            <Download className="w-3.5 h-3.5" /> Xuất CSV
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-800/60 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, MSSV, email..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#252525] border border-gray-700 rounded-xl text-white placeholder:text-gray-600 outline-none focus:border-blue-500 transition-all" />
          </div>
          {viewMode === 'table' && (
            <div className="flex bg-[#252525] rounded-xl p-1 shrink-0 h-fit">
              <button onClick={() => { setTableDataType('info'); setIsTableEditing(false); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tableDataType === 'info' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                Thông tin
              </button>
              <button onClick={() => { setTableDataType('grades'); setIsTableEditing(false); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tableDataType === 'grades' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                Bảng điểm
              </button>
            </div>
          )}
        </div>
        {viewMode === 'table' && tableDataType === 'info' && (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[10px] font-black uppercase text-gray-500 bg-[#1e1e1e] border-y border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-center">STT</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">MSSV</th>
                  <th className="px-4 py-3">Giới tính</th>
                  <th className="px-4 py-3">Ngày sinh</th>
                  <th className="px-4 py-3">Dân tộc</th>
                  <th className="px-4 py-3">Nhóm máu</th>
                  <th className="px-4 py-3">Nơi sinh</th>
                  <th className="px-4 py-3">Số ĐT</th>
                  <th className="px-4 py-3">Mail HUS</th>
                  <th className="px-4 py-3">Mail VNU</th>
                  <th className="px-4 py-3">Facebook</th>
                  <th className="px-4 py-3 text-center sticky right-0 bg-[#1e1e1e] border-l border-gray-800/60 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.5)]">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map((m, i) => {
                  const draft = tableData[m.id] || m;
                  return (
                    <tr key={m.id} className="hover:bg-[#252525] transition-colors group">
                      <td className="px-4 py-3 text-gray-500 text-xs text-center font-medium">
                        {isTableEditing && isSuperAdmin ? (
                          <input value={draft.stt || ''} onChange={e => handleTableChange(m.id, 'stt', e.target.value)} className="w-10 bg-transparent border-b border-gray-700 text-center outline-none focus:border-blue-500" />
                        ) : (m.stt || i + 1)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-200 text-sm">
                        <div className="flex items-center gap-3">
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-gray-700" />
                            : <div className="w-7 h-7 bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center rounded-lg">{getInitials(m.fullName)}</div>
                          }
                          {isTableEditing ? (
                            <input value={draft.fullName || ''} onChange={e => handleTableChange(m.id, 'fullName', e.target.value)} className="w-32 bg-transparent border-b border-gray-700 outline-none focus:border-blue-500 text-sm text-gray-200" />
                          ) : (
                            <span className="whitespace-nowrap">{m.fullName || '—'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isTableEditing && isSuperAdmin && m.role !== 'super_admin' ? (
                          <select value={draft.role || 'member'} onChange={e => handleTableChange(m.id, 'role', e.target.value)} className="bg-[#252525] border border-gray-700 rounded text-xs p-1 outline-none text-gray-300">
                            <option value="member">Thành viên</option>
                            <option value="core">Core Team</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${roleLabel(m.role).cls}`}>{roleLabel(m.role).text}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? <input value={draft.mssv || draft.msv || ''} onChange={e => { handleTableChange(m.id, 'mssv', e.target.value); handleTableChange(m.id, 'msv', e.target.value); }} className="w-20 bg-transparent border-b border-gray-700 outline-none focus:border-blue-500 text-gray-300" /> : (m.mssv || m.msv || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? (
                          <select value={draft.gender || ''} onChange={e => handleTableChange(m.id, 'gender', e.target.value)} className="bg-[#252525] border border-gray-700 rounded text-xs p-1 outline-none text-gray-300">
                            <option value="">—</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                          </select>
                        ) : (m.gender || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? <input type="date" value={draft.dob || ''} onChange={e => handleTableChange(m.id, 'dob', e.target.value)} className="bg-[#252525] border border-gray-700 rounded text-xs p-1 outline-none text-gray-300" /> : (m.dob ? toDisplay(m.dob) : '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? (
                          <select value={draft.ethnicity || ''} onChange={e => handleTableChange(m.id, 'ethnicity', e.target.value)} className="bg-[#252525] border border-gray-700 rounded text-xs p-1 outline-none w-20 text-gray-300">
                            <option value="">—</option>
                            {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        ) : (m.ethnicity || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? (
                          <select value={draft.bloodType || ''} onChange={e => handleTableChange(m.id, 'bloodType', e.target.value)} className="bg-[#252525] border border-gray-700 rounded text-xs p-1 outline-none text-gray-300">
                            <option value="">—</option>
                            {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        ) : (m.bloodType || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[150px]">
                        {isTableEditing ? (
                          <select value={draft.pob || ''} onChange={e => handleTableChange(m.id, 'pob', e.target.value)} className="bg-[#252525] border border-gray-700 rounded text-xs p-1 outline-none w-24 text-gray-300">
                            <option value="">—</option>
                            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (m.pob || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? <input value={draft.phone || ''} onChange={e => handleTableChange(m.id, 'phone', e.target.value)} className="w-24 bg-transparent border-b border-gray-700 outline-none focus:border-blue-500 text-gray-300" /> : (m.phone || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? <input value={draft.mailSchool || ''} onChange={e => handleTableChange(m.id, 'mailSchool', e.target.value)} className="w-32 bg-transparent border-b border-gray-700 outline-none focus:border-blue-500 text-gray-300" /> : (m.mailSchool || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? <input value={draft.mailVnu || ''} onChange={e => handleTableChange(m.id, 'mailVnu', e.target.value)} className="w-32 bg-transparent border-b border-gray-700 outline-none focus:border-blue-500 text-gray-300" /> : (m.mailVnu || '—')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isTableEditing ? <input value={draft.facebook || ''} onChange={e => handleTableChange(m.id, 'facebook', e.target.value)} className="w-24 bg-transparent border-b border-gray-700 outline-none focus:border-blue-500 text-gray-300" /> : (
                          m.facebook ? (
                            <a href={m.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate inline-block max-w-[120px]">
                              {m.facebook}
                            </a>
                          ) : '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center sticky right-0 bg-[#1a1a1a] group-hover:bg-[#252525] border-l border-gray-800/60 transition-colors shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.5)]">
                        <button onClick={() => setSelectedMember(m)} className="p-1.5 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-blue-600 transition-all shadow-sm">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-8 text-gray-600 text-sm">Không tìm thấy thành viên nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === 'table' && tableDataType === 'grades' && (
          <div className="overflow-auto max-h-[70vh] pb-4 custom-scrollbar relative">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[10px] font-black uppercase text-gray-500 bg-[#1e1e1e]">
                <tr>
                  <th className="px-4 py-3 text-center sticky top-0 left-0 bg-[#1e1e1e] z-30 border-r border-b border-gray-800/60">STT</th>
                  <th className="px-4 py-3 sticky top-0 left-[50px] bg-[#1e1e1e] z-30 border-r border-b border-gray-800/60 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.5)]">Môn học</th>
                  {filtered.map(m => {
                    const firstName = m.fullName ? m.fullName.split(' ').pop() : '—';
                    return (
                      <th key={m.id} className="px-3 py-2 text-center min-w-[70px] sticky top-0 bg-[#1e1e1e] z-20 border-b border-gray-800/60">
                        <div className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => setSelectedMember(m)} title={m.fullName}>
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-md object-cover border border-gray-700" />
                            : <div className="w-6 h-6 bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-[10px] flex items-center justify-center rounded-md shrink-0">{getInitials(m.fullName)}</div>
                          }
                          <span className="text-[9px] text-gray-400 truncate max-w-[60px] leading-tight">{firstName}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {subjectDatabase.map((sub, i) => (
                  <tr key={sub.id} className="hover:bg-[#252525] transition-colors group">
                    <td className="px-4 py-3 text-gray-500 text-xs text-center font-medium sticky left-0 bg-[#1a1a1a] group-hover:bg-[#252525] border-r border-gray-800/60 z-10 transition-colors">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-200 text-sm sticky left-[50px] bg-[#1a1a1a] group-hover:bg-[#252525] border-r border-gray-800/60 z-10 transition-colors shadow-[10px_0_15px_-5px_rgba(0,0,0,0.5)]">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="truncate" title={sub.name}>{sub.name}</span>
                        <span className="text-[10px] text-gray-500 font-normal mt-0.5">{sub.code} · {sub.credits} TC</span>
                      </div>
                    </td>
                    {filtered.map(m => {
                      const g = (grades[m.id] || {})[sub.id] || {};
                      let st = g.status || 'Chưa học';
                      let cellContent = <span className="text-gray-600">—</span>;

                      if (sub.excludeCPA) {
                        if (st === 'Đạt') cellContent = <span className="text-green-400 font-bold">Đạt</span>;
                        else if (st === 'Chưa đạt') cellContent = <span className="text-red-400 font-bold">C.Đạt</span>;
                        else if (st === 'Được miễn') cellContent = <span className="text-blue-400 font-bold">Miễn</span>;
                        else if (st === 'Đang học') cellContent = <span className="text-yellow-400 font-bold">Đang</span>;
                      } else {
                        if (st === 'Được miễn') cellContent = <span className="text-blue-400 font-bold">Miễn</span>;
                        else if (st === 'Đang học') cellContent = <span className="text-yellow-400 font-bold">Đang</span>;
                        else if (st === 'Đã học') {
                          const r = calcResult(g.cc, g.gk, g.ck);
                          if (r.chu !== '—') {
                            const color = gradeColor(r.he10);
                            cellContent = <span className={`font-bold ${color}`}>{r.chu}</span>;
                          }
                        }
                      }

                      return (
                        <td key={m.id} className="px-3 py-3 text-center text-xs">
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {subjectDatabase.length === 0 && (
                  <tr>
                    <td colSpan={filtered.length + 2} className="text-center py-8 text-gray-600 text-sm">Chưa có môn học nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === 'grid' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {filtered.length === 0 && (
              <div className="md:col-span-2 text-center py-8 text-gray-600 text-sm">Không tìm thấy thành viên nào.</div>
            )}
            <AnimatePresence>
              {filtered.map((m, i) => (
                <MemberCard key={m.id} member={m} onClick={() => setSelectedMember(m)} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

