// src/pages/Dashboard.jsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  TrendingUp, BookOpen, AlertCircle, Clock, Award, Zap, Users,
  CheckCircle2, Activity, Edit3, Check, X, GraduationCap, BarChart2, Hexagon
} from 'lucide-react';import { subjectDatabase, getHe4, calculateHe10 } from '../data';
import { useApp } from '../context/AppContext';

// ── Semester names — persisted via AppContext ──────────────────────────────
const DEFAULT_SEM_NAMES = {
  1: 'HKI 2024–25',  2: 'HKII 2024–25', 3: 'HK Hè 25',
  4: 'HKI 2025–26',  5: 'HKII 2025–26', 6: 'HKI 2026–27',
  7: 'HKII 2026–27', 8: 'HKI 2027–28',
};

function useSemesterNames(semesterLabels, updateSemesterLabel) {
  // Merge Context labels with defaults
  const names = useMemo(() => ({ ...DEFAULT_SEM_NAMES, ...semesterLabels }), [semesterLabels]);
  const updateName = (sem, val) => updateSemesterLabel(String(sem), val);
  return [names, updateName];
}

// ── Helper: compute CPA from a grades object ───────────────────────────────
// Logic đồng nhất với calcGpaStats trong Profile.jsx:
// - 'Được miễn' → luôn tính vào tín chỉ đạt, không tính GPA
// - 'Đã học' + he4 >= 1.0 → tính cả GPA lẫn tín chỉ đạt
// - 'Đã học' + he4 < 1.0 (Điểm F) → không tính vào GPA, không tính tín chỉ đạt
function computeCPA(grades) {
  let w = 0, c = 0, passed = 0, learning = 0;
  subjectDatabase.forEach(sub => {
    const g = grades[sub.id]; if (!g) return;
    if (g.status === 'Đang học') learning++;
    if (!sub.excludeCPA) {
      // Được miễn: tính tín chỉ đạt, không tính điểm
      if (g.status === 'Được miễn') passed += sub.credits;
      // Đã học: chỉ tính khi điểm từ D trở lên (he4 >= 1.0)
      if (g.status === 'Đã học') {
        const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
        const h4  = getHe4(h10);
        if (h10 !== null && h4 >= 1.0) {
          w      += h4 * sub.credits;
          c      += sub.credits;
          passed += sub.credits;
        }
        // Điểm F (h4 < 1.0): không tính CPA, không tính tín chỉ đạt
      }
    }
  });
  const semGPA = {};
  subjectDatabase.forEach(sub => {
    const g = grades[sub.id]; if (!g) return;
    if (g.status === 'Đã học' && !sub.excludeCPA) {
      const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
      const h4  = getHe4(h10);
      // Chỉ tính semGPA khi điểm từ D trở lên
      if (h10 !== null && h4 >= 1.0) {
        const sem = String(g.semester || '?');
        if (!semGPA[sem]) semGPA[sem] = { w: 0, c: 0 };
        semGPA[sem].w += h4 * sub.credits; semGPA[sem].c += sub.credits;
      }
    }
  });
  const semResult = {};
  Object.entries(semGPA).sort(([a],[b]) => Number(a)-Number(b)).forEach(([k,v]) => {
    semResult[k] = v.c > 0 ? (v.w / v.c).toFixed(2) : '0.00';
  });
  return {
    cpa: c > 0 ? (w / c).toFixed(2) : '0.00',
    credits: passed, learning, semGPA: semResult,
  };
}

const cpaColor = v => {
  const n = parseFloat(v);
  if (n >= 3.6) return 'text-green-400';
  if (n >= 3.2) return 'text-blue-400';
  if (n >= 2.5) return 'text-yellow-400';
  return 'text-red-400';
};

// ── Semester Selector with editable names ──────────────────────────────────
function SemesterSelector({ semGPA, semesterNames, updateSemesterName }) {
  const [editing, setEditing] = useState(null);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing !== null && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const sems = Object.keys(semGPA).sort((a, b) => Number(a) - Number(b));
  if (!sems.length) return null;

  const commit = (sem) => {
    if (draft.trim()) updateSemesterName(sem, draft.trim());
    setEditing(null);
  };

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden mb-6">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-blue-400"/>
        <h3 className="font-bold text-white text-sm">GPA theo học kỳ</h3>
        <span className="text-[10px] text-gray-600 ml-1">· Click tên kỳ để đổi tên</span>
      </div>
      <div className="flex overflow-x-auto custom-scrollbar">
        {sems.map((sem, i) => {
          const gpa = semGPA[sem];
          const isEd = editing === sem;
          return (
            <div key={sem}
              className={`flex-1 min-w-[130px] px-4 py-4 border-r border-gray-800/40 last:border-r-0 ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#181818]'}`}>
              {isEd ? (
                <div className="flex items-center gap-1 mb-2">
                  <input ref={inputRef}
                    className="text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1 w-full outline-none"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') commit(sem); if (e.key==='Escape') setEditing(null); }}
                    maxLength={20}/>
                  <button onClick={() => commit(sem)} className="p-1 text-green-400 shrink-0"><Check className="w-3 h-3"/></button>
                  <button onClick={() => setEditing(null)} className="p-1 text-gray-600 hover:text-white shrink-0"><X className="w-3 h-3"/></button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditing(sem); setDraft(semesterNames[sem] || `Học kỳ ${sem}`); }}
                  className="group flex items-center gap-1 mb-2" title="Click để đổi tên">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide group-hover:text-blue-400 transition-colors truncate max-w-[90px]">
                    {semesterNames[sem] || `Học kỳ ${sem}`}
                  </span>
                  <Edit3 className="w-2.5 h-2.5 text-gray-700 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"/>
                </button>
              )}
              <div className={`text-2xl font-black ${cpaColor(gpa)}`}>{gpa}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">/ 4.0</div>
              <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/60 rounded-full"
                  style={{ width: `${Math.min(100, (parseFloat(gpa)/4)*100)}%` }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Group GPA Card — dùng REAL data từ Context ─────────────────────────────
function GroupGPACard({ myGrades, allGrades, members }) {
  // Tính CPA thực tế của từng thành viên
  const { myCPA, groupCPA, memberCPAs } = useMemo(() => {
    const me = computeCPA(myGrades);
    const cpas = members.map(m => {
      const g = allGrades[m.id] || {};
      return { ...m, cpa: parseFloat(computeCPA(g).cpa) };
    }).filter(m => m.cpa > 0);

    const grpAvg = cpas.length
      ? (cpas.reduce((s, m) => s + m.cpa, 0) / cpas.length).toFixed(2)
      : '0.00';

    return { myCPA: me.cpa, groupCPA: grpAvg, memberCPAs: cpas };
  }, [myGrades, allGrades, members]);

  const myVal  = parseFloat(myCPA);
  const grpVal = parseFloat(groupCPA);
  const diff   = (myVal - grpVal).toFixed(2);
  const isAbove = myVal >= grpVal;

  const bars = [
    { label: 'Bạn',     val: myVal,   color: 'bg-blue-500',  textColor: 'text-blue-400' },
    { label: 'Nhóm TB', val: grpVal,  color: 'bg-gray-500',  textColor: 'text-gray-400' },
  ];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-400"/>
        <h3 className="font-bold text-white text-sm">So sánh GPA nhóm</h3>
      </div>
      <div className="p-5">
        {/* Bar chart */}
        <div className="flex items-end justify-around gap-6 mb-4 h-24">
          {bars.map(b => (
            <div key={b.label} className="flex flex-col items-center gap-2 flex-1">
              <div className={`text-sm font-black ${b.textColor}`}>{b.val.toFixed(2)}</div>
              <div className="w-full flex-1 bg-gray-800 rounded-lg overflow-hidden flex flex-col justify-end">
                <div className={`${b.color} rounded-lg transition-all duration-700`}
                  style={{ height: `${Math.min(100, (b.val / 4) * 100)}%` }}/>
              </div>
              <div className="text-[10px] font-bold text-gray-500 text-center">{b.label}</div>
            </div>
          ))}
        </div>
        {/* Comparison result */}
        <div className={`text-center text-xs font-bold px-3 py-2 rounded-xl ${
          myVal === 0
            ? 'text-gray-500 bg-[#252525]'
            : isAbove
              ? 'text-green-400 bg-green-500/10 border border-green-500/20'
              : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
        }`}>
          {myVal === 0
            ? '— Chưa có điểm để so sánh'
            : isAbove
              ? `↑ Cao hơn TB nhóm ${diff} điểm 🎉`
              : `↓ Thấp hơn TB nhóm ${Math.abs(parseFloat(diff)).toFixed(2)} điểm`}
        </div>
        {/* Mini leaderboard */}
        {memberCPAs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800/40 space-y-1.5">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Top GPA nhóm</div>
            {memberCPAs.sort((a,b)=>b.cpa-a.cpa).slice(0,5).map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-4">{i+1}.</span>
                {m.avatarUrl ? <img src={m.avatarUrl} className="w-5 h-5 rounded-full object-cover border border-gray-700 shrink-0"/> : <div className="w-5 h-5 rounded-full bg-[#252525] flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0">{m.avatar}</div>}
                <span className="text-[11px] text-gray-400 flex-1 truncate">{m.fullName.split(' ').slice(-2).join(' ')}</span>
                <span className={`text-[11px] font-black ${cpaColor(String(m.cpa))}`}>{m.cpa.toFixed(2)}</span>
                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(m.cpa/4)*100}%` }}/>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-gray-800/40 flex justify-between text-[10px] text-gray-600">
          <span>Dựa trên bảng điểm từng người</span>
          <span>{memberCPAs.length}/{members.length} có dữ liệu</span>
        </div>
      </div>
    </div>
  );
}

// ── Learning Progress Card — real data ─────────────────────────────────────
function LearningProgressCard({ myGrades, allGrades, members }) {
  const { myPct, groupPct, myDone, myLearning, totalSubs } = useMemo(() => {
    let myDone = 0, myLearning = 0;
    const total = subjectDatabase.length;
    subjectDatabase.forEach(sub => {
      const g = myGrades[sub.id]; if (!g) return;
      if (g.status === 'Đã học' || g.status === 'Được miễn') myDone++;
      else if (g.status === 'Đang học') myLearning++;
    });
    const myP = Math.round((myDone / total) * 100);

    // Group avg progress
    let totalProg = 0, countProg = 0;
    members.forEach(m => {
      const g = allGrades[m.id] || {};
      let done = 0;
      subjectDatabase.forEach(sub => {
        const sg = g[sub.id];
        if (sg?.status === 'Đã học' || sg?.status === 'Được miễn') done++;
      });
      if (done > 0) { totalProg += done; countProg++; }
    });
    const grpP = countProg > 0 ? Math.round((totalProg / (countProg * total)) * 100) : 0;

    return { myPct: myP, groupPct: grpP, myDone, myLearning, totalSubs: total };
  }, [myGrades, allGrades, members]);

  const segments = [
    { label: 'Hoàn thành', count: myDone,                       color: 'bg-green-500',  textColor: 'text-green-400'  },
    { label: 'Đang học',   count: myLearning,                   color: 'bg-blue-500',   textColor: 'text-blue-400'   },
    { label: 'Chưa học',   count: totalSubs - myDone - myLearning, color: 'bg-gray-700', textColor: 'text-gray-500' },
  ];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-purple-400"/>
        <h3 className="font-bold text-white text-sm">Tiến độ học tập</h3>
      </div>
      <div className="p-5 space-y-4">
        {/* My progress */}
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span className="font-bold text-gray-300">Cá nhân bạn</span>
            <span className="font-bold text-white">{myPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
              style={{ width: `${myPct}%` }}/>
          </div>
        </div>
        {/* Group avg */}
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span className="font-bold text-gray-400">Trung bình nhóm ({members.length} người)</span>
            <span className="font-bold text-gray-300">{groupPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all"
              style={{ width: `${groupPct}%` }}/>
          </div>
        </div>
        {/* Comparison */}
        {myPct > 0 && (
          <div className={`text-center text-xs font-bold px-3 py-2 rounded-xl ${
            myPct >= groupPct
              ? 'text-green-400 bg-green-500/10 border border-green-500/20'
              : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
          }`}>
            {myPct >= groupPct
              ? `↑ Bạn học nhanh hơn TB nhóm ${myPct - groupPct}%`
              : `↓ Bạn cần cố gắng hơn ${groupPct - myPct}% so với TB nhóm`}
          </div>
        )}
        {/* Segment counts */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-800/40">
          {segments.map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-lg font-black ${s.textColor}`}>{s.count}</div>
              <div className="text-[10px] text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Radar Chart Card ───────────────────────────────────────────────────────
function RadarChartCard({ myGrades }) {
  const axes = useMemo(() => {
    const typeMap = {};
    subjectDatabase.forEach(sub => {
      const g = myGrades[sub.id];
      if (!g || g.status !== 'Đã học' || sub.excludeCPA) return;
      const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
      if (h10 === null) return;
      const h4 = getHe4(h10);
      if (h4 < 1.0) return; // bỏ điểm F
      const type = sub.type || 'Khác';
      if (!typeMap[type]) typeMap[type] = { sum: 0, count: 0 };
      typeMap[type].sum += h4;
      typeMap[type].count++;
    });
    return Object.entries(typeMap)
      .filter(([, v]) => v.count > 0)
      .map(([label, v]) => ({ label, value: v.sum / v.count, max: 4.0 }));
  }, [myGrades]);

  if (axes.length < 3) {
    return (
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-purple-400"/>
          <h3 className="font-bold text-white text-sm">Biểu đồ thế mạnh</h3>
        </div>
        <div className="flex-1 flex items-center justify-center py-12 text-center">
          <div>
            <Hexagon className="w-10 h-10 text-gray-700 mx-auto mb-2"/>
            <p className="text-xs text-gray-600">Cần điểm ít nhất 3 loại môn học<br/>để hiển thị biểu đồ</p>
          </div>
        </div>
      </div>
    );
  }

  const SIZE = 220, CX = 110, CY = 110, R = 78;
  const n = axes.length;
  const angle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, val) => ({
    x: CX + ((val / 4.0) * R) * Math.cos(angle(i)),
    y: CY + ((val / 4.0) * R) * Math.sin(angle(i)),
  });
  const bgPoly = (pct) => axes.map((_, i) => {
    const a = angle(i), d = pct * R;
    return `${CX + d * Math.cos(a)},${CY + d * Math.sin(a)}`;
  }).join(' ');

  const dataPoints = axes.map((a, i) => pt(i, a.value));
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const AXIS_COLORS = ['#818cf8','#34d399','#fb923c','#f472b6','#38bdf8','#a3e635','#e879f9'];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <Hexagon className="w-4 h-4 text-purple-400"/>
        <h3 className="font-bold text-white text-sm">Biểu đồ thế mạnh</h3>
        <span className="text-[10px] text-gray-600 ml-1">· GPA trung bình theo loại môn</span>
      </div>
      <div className="p-4 flex flex-col items-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background circles */}
          {[0.25, 0.5, 0.75, 1.0].map((pct, i) => (
            <polygon key={i} points={bgPoly(pct)}
              fill="none" stroke={pct === 1.0 ? '#374151' : '#1f2937'} strokeWidth={pct === 1.0 ? '1.5' : '1'}/>
          ))}
          {/* Axis lines */}
          {axes.map((_, i) => {
            const outer = pt(i, 4.0);
            return <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="#1f2937" strokeWidth="1"/>;
          })}
          {/* Data polygon */}
          <polygon points={dataPolygon}
            fill="rgba(129,140,248,0.18)" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round"/>
          {/* Data dots */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill={AXIS_COLORS[i % AXIS_COLORS.length]} stroke="#1a1a1a" strokeWidth="1.5"/>
          ))}
          {/* Labels */}
          {axes.map((a, i) => {
            const la = angle(i), lx = CX + (R + 24) * Math.cos(la), ly = CY + (R + 24) * Math.sin(la);
            const label = a.label.length > 12 ? a.label.slice(0, 11) + '…' : a.label;
            return (
              <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize="8.5" fill="#9ca3af" fontWeight="bold">{label}</text>
            );
          })}
          {/* Center label */}
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#6b7280">GPA</text>
        </svg>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full mt-1 px-1">
          {axes.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: AXIS_COLORS[i % AXIS_COLORS.length] }}/>
              <span className="text-[10px] text-gray-400 truncate flex-1">{a.label}</span>
              <span className="text-[10px] font-black shrink-0" style={{ color: AXIS_COLORS[i % AXIS_COLORS.length] }}>
                {a.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Group Velocity Card ────────────────────────────────────────────────────
function GroupVelocityCard({ allGrades, members }) {
  const { semVelocity, latestTrend, alertMsg } = useMemo(() => {
    const semMap = {};   // { semKey: totalSubjectsDone }
    let activeMemberCount = 0;

    members.forEach(m => {
      const g = allGrades[m.id] || {};
      let hasSemData = false;
      subjectDatabase.forEach(sub => {
        const sg = g[sub.id];
        if (sg?.status === 'Đã học' && sg.semester) {
          const sem = String(sg.semester);
          semMap[sem] = (semMap[sem] || 0) + 1;
          hasSemData = true;
        }
      });
      if (hasSemData) activeMemberCount++;
    });

    if (!activeMemberCount) return { semVelocity: {}, latestTrend: 0, alertMsg: null };

    const avgPerSem = {};
    Object.entries(semMap).forEach(([k, v]) => { avgPerSem[k] = v / activeMemberCount; });

    const keys = Object.keys(avgPerSem).sort((a, b) => Number(a) - Number(b));
    let latestTrend = 0, alertMsg = null;
    if (keys.length >= 2) {
      const last = avgPerSem[keys[keys.length - 1]];
      const prev = avgPerSem[keys[keys.length - 2]];
      latestTrend = last - prev;
      if (latestTrend < -0.5 && prev > 0) {
        const pct = Math.round(Math.abs(latestTrend) / prev * 100);
        alertMsg = `Nhóm đang chậm tiến độ ${pct}% so với kỳ trước — cần tổ chức buổi học bù! 📢`;
      }
    }
    return { semVelocity: avgPerSem, latestTrend, alertMsg };
  }, [allGrades, members]);

  const semKeys = Object.keys(semVelocity).sort((a, b) => Number(a) - Number(b));
  const maxVal  = Math.max(...Object.values(semVelocity).map(Number), 1);

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400"/>
        <h3 className="font-bold text-white text-sm">Vận tốc học tập nhóm</h3>
        <span className="text-[10px] text-gray-600 ml-1">· Số môn TB/người mỗi kỳ</span>
      </div>
      <div className="p-5">
        {alertMsg && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400"/>
            <span>{alertMsg}</span>
          </div>
        )}

        {semKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="w-9 h-9 text-gray-700 mb-2"/>
            <p className="text-xs text-gray-600">Chưa đủ dữ liệu học kỳ<br/>để tính vận tốc nhóm</p>
          </div>
        ) : (
          <>
            {/* Bar chart */}
            <div className="flex items-end gap-2 mb-3" style={{ height: 80 }}>
              {semKeys.map((k, i) => {
                const val = semVelocity[k];
                const heightPct = Math.max(8, (val / maxVal) * 100);
                const isLast    = i === semKeys.length - 1;
                const barColor  = isLast
                  ? (latestTrend < -0.5 ? 'bg-red-500/70' : latestTrend >= 0 ? 'bg-yellow-400/80' : 'bg-yellow-400/50')
                  : 'bg-blue-500/50';
                return (
                  <div key={k} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-500">{val.toFixed(1)}</span>
                    <div className="w-full bg-gray-800 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: 52 }}>
                      <div className={`w-full rounded-t-lg transition-all duration-700 ${barColor}`}
                        style={{ height: `${heightPct}%` }}/>
                    </div>
                    <span className="text-[8px] text-gray-600 whitespace-nowrap">Kỳ {k}</span>
                  </div>
                );
              })}
            </div>

            {/* Trend summary */}
            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2.5 border-t border-gray-800/40">
              <span>Trung bình số môn/người/kỳ</span>
              {semKeys.length >= 2 && (
                <span className={`font-black text-xs flex items-center gap-1 ${latestTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {latestTrend >= 0 ? '↑' : '↓'} {Math.abs(latestTrend).toFixed(1)} môn so với kỳ trước
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    currentUser, myGrades, myTasks, smeMap, members, auditLogs,
    contributions, grades: allGrades, isCore, exportMembersCSV,
    semesterLabels, updateSemesterLabel,
  } = useApp();

  const [semesterNames, updateSemesterName] = useSemesterNames(semesterLabels, updateSemesterLabel);
  const [showTaskPanel, setShowTaskPanel] = useState(false);

  // My personal stats
  const myStats = useMemo(() => computeCPA(myGrades), [myGrades]);

  const mySmeSubjects  = useMemo(() =>
    Object.entries(smeMap)
      .filter(([, uid]) => uid === currentUser?.id)
      .map(([id]) => subjectDatabase.find(s => s.id === id))
      .filter(Boolean),
    [smeMap, currentUser?.id]
  );

  const upcomingTasks = useMemo(() =>
    [...myTasks].filter(t => !t.done)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5),
    [myTasks]
  );

  const topMembers = useMemo(() =>
    [...members]
      .map(m => ({ ...m, points: Number(contributions[m.id]) || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5),
    [members, contributions]
  );

  const daysDiff = d => Math.ceil((new Date(d) - new Date()) / 86400000);

  return (
    <div className="h-full bg-[#121212] text-gray-200 overflow-y-auto custom-scrollbar p-6">
      {/* ── Hero Banner ── */}
      <div className="mb-6 bg-gradient-to-br from-blue-900/30 via-[#1a1a1a] to-[#1a1a1a] border border-blue-500/15 rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">{currentUser?.role}</div>
            <h1 className="text-2xl font-black text-white mb-1">
              Chào, {(currentUser?.fullName || 'Thành viên').split(' ').pop()}! 👋
            </h1>
            <p className="text-gray-500 text-sm">Dữ liệu tổng hợp từ hồ sơ và bảng điểm của bạn.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-400">{myStats.credits}</div>
            <div className="text-xs text-gray-500">/ 133 tín chỉ</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tiến độ tích lũy tín chỉ</span>
            <span>{Math.round(myStats.credits / 133 * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
              style={{ width: `${Math.min(100, Math.round(myStats.credits / 133 * 100))}%` }}/>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp} label="CPA Tích lũy" value={myStats.cpa} valueClass={cpaColor(myStats.cpa)} sub="Hệ 4 điểm" color="green"/>
        <StatCard icon={Award}      label="Tín chỉ đạt"  value={`${myStats.credits}`} sub="trên 133 TC" color="blue"/>
        <StatCard icon={BookOpen}   label="Đang học"      value={myStats.learning}    sub="môn học kỳ này" color="purple"/>
        <div onClick={() => setShowTaskPanel(v => !v)} className="cursor-pointer">
          <StatCard icon={AlertCircle} label="Task chờ" value={myTasks.filter(t=>!t.done).length} sub={showTaskPanel ? 'Nhấn để thu gọn ↑' : 'Nhấn để xem chi tiết ↓'} color="red"/>
        </div>
      </div>

      {/* ── Task panel (expandable) ── */}
      {showTaskPanel && (
        <div className="mb-6 bg-[#1a1a1a] border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-500/15 flex items-center justify-between bg-red-500/5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400"/>
              <h3 className="font-bold text-white text-sm">Danh sách Task cần làm</h3>
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">
                {myTasks.filter(t=>!t.done).length} việc
              </span>
            </div>
            <button onClick={() => setShowTaskPanel(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
              <X className="w-4 h-4"/>
            </button>
          </div>
          {myTasks.filter(t=>!t.done).length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-600 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-700"/>
              Không có task nào đang chờ 🎉
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {[...myTasks]
                .filter(t => !t.done)
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                .map(t => {
                  const d = daysDiff(t.deadline);
                  const isLate = d <= 0;
                  const isSoon = d > 0 && d <= 3;
                  return (
                    <div key={t.id} className={`flex items-start gap-4 px-5 py-3.5 hover:bg-[#1e1e1e] transition-colors ${isLate ? 'bg-red-500/5' : ''}`}>
                      <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${isLate ? 'bg-red-400 animate-pulse' : isSoon ? 'bg-yellow-400' : 'bg-gray-600'}`}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-200 leading-snug">{t.task}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          {t.subjectId && <span className="text-blue-400 font-medium">{t.subjectId}</span>}
                          {t.subjectId && <span>·</span>}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {t.deadline}</span>
                          {t.assignedTo && <span>· {t.assignedTo}</span>}
                        </div>
                        {t.desc && <div className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">{t.desc}</div>}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                        isLate
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : isSoon
                            ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                            : 'bg-gray-800/60 border-gray-700 text-gray-500'
                      }`}>
                        {isLate ? `Trễ ${Math.abs(d)} ngày` : d === 0 ? 'Hôm nay!' : `Còn ${d} ngày`}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Semester GPA Selector ── */}
      <SemesterSelector semGPA={myStats.semGPA} semesterNames={semesterNames} updateSemesterName={updateSemesterName}/>

      {/* ── Group tracking ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col gap-6">
          <GroupGPACard myGrades={myGrades} allGrades={allGrades} members={members}/>
          {/* Deadline sắp tới — nằm dưới GroupGPACard */}
          <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800/60 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-400"/>
              <h3 className="font-bold text-white text-sm">Deadline sắp tới</h3>
            </div>
            <div className="divide-y divide-gray-800/60">
              {upcomingTasks.length > 0 ? upcomingTasks.map(t => {
                const d = daysDiff(t.deadline);
                return (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#1e1e1e] transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-gray-200 truncate">{t.task}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.subjectId} · {t.deadline}</div>
                    </div>
                    <span className={`badge ml-3 shrink-0 ${d<=0?'badge-red':d<=7?'badge-yellow':'badge-gray'}`}>
                      {d<=0?'Trễ hạn':d===1?'Còn 1 ngày':`Còn ${d} ngày`}
                    </span>
                  </div>
                );
              }) : (
                <div className="px-5 py-8 text-center text-gray-600 text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-700"/>
                  Không có deadline nào 🎉
                </div>
              )}
            </div>
          </div>
        </div>
        <LearningProgressCard myGrades={myGrades} allGrades={allGrades} members={members}/>
      </div>

      {/* ── Radar + Group Velocity ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <RadarChartCard myGrades={myGrades}/>
        <GroupVelocityCard allGrades={allGrades} members={members}/>
      </div>

      {/* ── Right col: SME / Top cống hiến / Nhóm info ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SME subjects */}
          {mySmeSubjects.length > 0 && (
            <div className="bg-[#1a1a1a] border border-blue-500/20 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-500/10 bg-blue-600/5">
                <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2"><Zap className="w-4 h-4"/>Môn bạn phụ trách (SME)</h3>
              </div>
              <div className="p-3 space-y-2">
                {mySmeSubjects.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 bg-[#111] rounded-xl border border-gray-800">
                    <div className="w-8 h-8 bg-blue-600/15 rounded-lg flex items-center justify-center"><BookOpen className="w-4 h-4 text-blue-400"/></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-200 truncate">{s.name}</div>
                      <div className="text-[10px] text-gray-500">{s.code} · {s.credits} TC</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core: top members */}
          {isCore && (
            <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800/60 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2"><Users className="w-4 h-4 text-gray-500"/>Top cống hiến</h3>
                <button onClick={exportMembersCSV} className="text-[10px] text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg hover:bg-blue-500/10">↓ CSV</button>
              </div>
              <div className="divide-y divide-gray-800/40">
                {topMembers.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="text-xs font-black text-gray-600 w-5 text-center">{i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}</div>
                    {m.avatarUrl ? <img src={m.avatarUrl} className="w-6 h-6 rounded-full object-cover border border-gray-700 shrink-0"/> : <div className="w-6 h-6 rounded-full bg-[#252525] flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">{m.avatar}</div>}
                    <div className="flex-1 min-w-0 text-xs text-gray-300 truncate">{m.fullName.split(' ').slice(-2).join(' ')}</div>
                    <div className="text-xs font-black text-blue-400">{m.points}đ</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group info */}
          <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-gray-500"/>Nhóm 2X18</h3>
            {[
              { label:'Tổng thành viên', value:`${members.length} người` },
              { label:'Core Team',       value:`${members.filter(m=>m.role==='core'||m.role==='super_admin').length} người` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-800/40 last:border-0">
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className="text-xs font-bold text-gray-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Audit Log ── */}
      {auditLogs.length > 0 && (
        <div className="mt-6 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800/60 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500"/>
            <h3 className="font-bold text-white text-sm">Hoạt động gần đây</h3>
          </div>
          <div className="divide-y divide-gray-800/40">
            {auditLogs.slice(0, 8).map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"/>
                <div className="flex-1 min-w-0 text-xs text-gray-300">
                  <span className="font-medium">{log.action}</span>
                  {log.target && <span className="text-gray-500"> · {log.target}</span>}
                  {log.detail && <span className="text-gray-600"> — {log.detail}</span>}
                </div>
                <span className="text-[10px] text-gray-700 shrink-0">
                  {new Date(log.time).toLocaleTimeString('vi', { hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, valueClass }) {
  const colors = {
    green:  'bg-green-500/10 text-green-400',
    blue:   'bg-blue-500/10  text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red:    'bg-red-500/10   text-red-400',
  };
  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4 flex items-center gap-4 card-hover">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5"/>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className={`text-2xl font-black ${valueClass || 'text-white'}`}>{value}</div>
        <div className="text-[10px] text-gray-600">{sub}</div>
      </div>
    </div>
  );
}
