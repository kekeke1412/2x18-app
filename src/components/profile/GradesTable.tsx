// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Download, Edit3, Save, XCircle } from 'lucide-react';
import { subjectDatabase, electiveLimits } from '../../data';
import { calcGpaStats, exportGradesToCSV, calcResult } from '../../utils/gradeUtils';
import { SEMESTERS } from '../../constants/profileConstants';

function GradeRow({ subject, grades, onGradeChange, isEditing, isDimmed }) {
  const g = grades[subject.id] || {};
  const isExclude = subject.excludeCPA;

  let st = g.status || 'Chưa học';
  if (isDimmed) st = 'Không học';

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
      value={g[field] || ''} onChange={e => onGradeChange(subject.id, field, e.target.value)}
      className="w-14 text-center text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500" />
  );

  const canEnterGrades = isEditing && !isExclude && !isDimmed && (st === 'Đã học' || st === 'Đang học');

  return (
    <tr className={`border-b border-gray-800/40 hover:bg-white/[0.02] transition-colors ${isDimmed ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
      <td className="px-3 py-2.5 text-center text-xs text-gray-600">{subject.idx || ''}</td>
      <td className="px-4 py-2.5">
        <div className="text-xs font-semibold text-gray-200 leading-tight">{subject.name}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{subject.code} · {subject.credits}TC {isExclude && '· (Không tính CPA)'}</div>
      </td>
      <td className="px-2 py-2.5 text-center">
        {isEditing && !isDimmed ? (
          <select value={g.semester || ''} onChange={e => onGradeChange(subject.id, 'semester', e.target.value)}
            className="text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500 w-12">
            <option value="">—</option>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : <span className="text-xs text-gray-400">{g.semester ? `Kỳ ${g.semester}` : '—'}</span>}
      </td>
      <td className="px-2 py-2.5">
        {isEditing && !isDimmed ? (
          <select value={st} onChange={e => {
            const newStatus = e.target.value;
            onGradeChange(subject.id, 'status', newStatus);
            if (newStatus === 'Chưa học' || newStatus === 'Không học') {
              onGradeChange(subject.id, 'cc', '');
              onGradeChange(subject.id, 'gk', '');
              onGradeChange(subject.id, 'ck', '');
            }
          }}
            className="text-xs bg-[#252525] border border-gray-700 rounded-lg px-1 py-1 text-white outline-none focus:border-blue-500">
            <option value="">—</option>
            {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span className={`text-xs font-medium ${st === 'Đã học' || st === 'Đạt' ? 'text-green-400' : st === 'Đang học' ? 'text-yellow-400' :
              st === 'Được miễn' ? 'text-blue-400' : 'text-gray-600'}`}>
            {st}
          </span>
        )}
      </td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('cc') : <span className="text-xs text-gray-400">{g.cc || '—'}</span>}</td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('gk') : <span className="text-xs text-gray-400">{g.gk || '—'}</span>}</td>
      <td className="px-1 py-2.5 text-center">{canEnterGrades ? inp('ck') : <span className="text-xs text-gray-400">{g.ck || '—'}</span>}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-sm ${gradeColor(r.he10)}`}>{(st === 'Đã học' || st === 'Đang học') && r.he10 !== '—' ? r.he10 : (isExclude && (st === 'Đạt' || st === 'Chưa đạt') ? st : '—')}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-xs ${gradeColor(r.he10)}`}>{(st === 'Đã học' || st === 'Đang học') && r.chu !== '—' ? r.chu : '—'}</td>
      <td className={`px-2 py-2.5 text-center font-bold text-xs ${gradeColor(r.he4)}`}>{(st === 'Đã học' || st === 'Đang học') && r.he4 !== '—' ? r.he4 : '—'}</td>
    </tr>
  );
}

export function GradesTable({ profile, grades, onSave, canEdit }) {
  const [localGrades, setLocalGrades] = useState(grades);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => { setLocalGrades(grades); }, [grades]);

  const handleChange = (subjectId, field, value) => {
    setLocalGrades(prev => ({
      ...prev,
      [subjectId]: { ...(prev[subjectId] || {}), [field]: value },
    }));
  };

  const handleSave = () => { onSave(localGrades); setIsEditing(false); };

  const gpaStats = useMemo(() => calcGpaStats(localGrades), [localGrades]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
        {[
          { label: 'CPA Tích lũy (Hệ 4)', value: gpaStats.cpa, color: 'text-green-400' },
          { label: 'Tín chỉ đạt', value: `${gpaStats.credits}/133`, color: 'text-blue-400' },
          {
            label: 'TC trượt (Điểm F)', value: gpaStats.failed?.length
              ? `${gpaStats.failed.reduce((s, f) => s + f.credits, 0)} TC`
              : '0 TC',
            color: gpaStats.failed?.length ? 'text-red-400' : 'text-gray-500'
          },
          { label: 'Đang học', value: `${gpaStats.learning} môn`, color: 'text-yellow-400' },
          { label: 'Đã hoàn thành', value: `${gpaStats.done} môn`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {Object.keys(gpaStats.semGPA).length > 0 && (
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1 custom-scrollbar">
          {Object.entries(gpaStats.semGPA).sort(([a], [b]) => a - b).map(([k, v]) => (
            <div key={k} className="bg-[#1a1a1a] border border-gray-800/60 rounded-xl px-5 py-3 text-center shrink-0">
              <div className="text-[10px] text-gray-500 font-bold uppercase">Học kỳ {k}</div>
              <div className="text-xl font-black text-green-400">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-1.5 text-[11px] text-gray-500 bg-[#1a1a1a] border border-gray-800/60 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>CPA tích lũy chỉ tính các môn có trạng thái <strong className="text-green-400">Đã học</strong> với điểm từ <strong className="text-green-400">D trở lên</strong> (hệ 4). Điểm F bị loại trừ.</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Các môn Thể chất, QPAN, Kỹ năng bổ trợ chỉ ghi nhận <strong className="text-blue-400">Đạt/Chưa đạt</strong> và không tính vào CPA.</span>
        </div>
      </div>


      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60 sticky top-0 bg-[#1a1a1a] z-10">
          <h3 className="font-bold text-white text-sm">Bảng điểm · {subjectDatabase.length} môn</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => exportGradesToCSV(profile, localGrades)}
              className="flex items-center gap-1.5 text-xs text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl hover:bg-green-500/10 transition-all font-bold">
              <Download className="w-3.5 h-3.5" /> Xuất CSV
            </button>
            {canEdit && !isEditing && (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-500/10 transition-all font-bold">
                <Edit3 className="w-3.5 h-3.5" /> Sửa
              </button>
            )}
            {canEdit && isEditing && (
              <button onClick={handleSave}
                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all font-bold">
                <Save className="w-3.5 h-3.5" /> Lưu
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isEditing ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
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

                        const isDimmed = sub.electiveGroup && currentCr >= limit && !isActive;

                        return (
                          <GradeRow key={sub.id} subject={sub} grades={localGrades}
                            onGradeChange={handleChange} isEditing={isEditing} isDimmed={isDimmed} />
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

      {gpaStats.failed && gpaStats.failed.length > 0 && (
        <div className="mt-5 bg-[#1a1a1a] border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-red-500/5 border-b border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400" />
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

