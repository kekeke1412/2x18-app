import React, { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { subjectDatabase } from '../../data';
import ProgressRing from '../ui/ProgressRing';

export function LearningProgressCard({ myGrades, allGrades, members }: any) {
  const { myPct, groupPct, myDone, myLearning, totalSubs } = useMemo(() => {
    let myDone = 0,
      myLearning = 0;
    const total = subjectDatabase.length;
    subjectDatabase.forEach(sub => {
      const g = myGrades[sub.id];
      if (!g) return;
      if (g.status === 'Đã học' || g.status === 'Được miễn' || g.status === 'Đạt') myDone++;
      else if (g.status === 'Đang học') myLearning++;
    });
    const myP = Math.round((myDone / total) * 100);

    let totalProg = 0,
      countProg = 0;
    members.forEach((m: any) => {
      const g = allGrades[m.id] || {};
      let done = 0;
      subjectDatabase.forEach(sub => {
        const sg = g[sub.id];
        if (sg?.status === 'Đã học' || sg?.status === 'Được miễn' || sg?.status === 'Đạt') done++;
      });
      if (done > 0) {
        totalProg += done;
        countProg++;
      }
    });
    const grpP = countProg > 0 ? Math.round((totalProg / (countProg * total)) * 100) : 0;

    return { myPct: myP, groupPct: grpP, myDone, myLearning, totalSubs: total };
  }, [myGrades, allGrades, members]);

  const segments = [
    {
      label: 'Hoàn thành',
      marker: '●',
      count: myDone,
      textColor: 'text-[#34A853]',
      bg: 'bg-[#34A853]/12 border-[#34A853]/25',
    },
    {
      label: 'Đang học',
      marker: '▲',
      count: myLearning,
      textColor: 'text-[#4285F4]',
      bg: 'bg-[#4285F4]/12 border-[#4285F4]/25',
    },
    {
      label: 'Chưa học',
      marker: '■',
      count: totalSubs - myDone - myLearning,
      textColor: 'text-[var(--text-secondary)]',
      bg: 'bg-[var(--bg-subtle)] border-[var(--border-default)]',
    },
  ];

  return (
    <div className="glass overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4]">
          <BarChart2 className="w-4 h-4" strokeWidth={1.85} />
        </div>
        <h3 className="font-bold text-[var(--text-primary)] text-sm">Tiến độ học tập</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* Apple Fitness / Health style dual progress rings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <ProgressRing
              value={myPct}
              max={100}
              size={54}
              thickness={6}
              color="#4285F4"
              label="Tiến độ hoàn thành môn học cá nhân"
              valueText={`${myPct}% (${myDone}/${totalSubs} môn)`}
            >
              <span className="text-xs font-black text-[#4285F4]">{myPct}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-[var(--text-primary)]">Cá nhân bạn</div>
              <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                {myDone}/{totalSubs} môn
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <ProgressRing
              value={groupPct}
              max={100}
              size={54}
              thickness={6}
              color="#34A853"
              label="Tiến độ hoàn thành trung bình của nhóm"
              valueText={`${groupPct}% (${members.length} thành viên)`}
            >
              <span className="text-xs font-black text-[#34A853]">{groupPct}%</span>
            </ProgressRing>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-[var(--text-primary)]">TB nhóm</div>
              <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                {members.length} thành viên
              </div>
            </div>
          </div>
        </div>

        {myPct > 0 && (
          <div
            className={`text-center text-xs font-bold px-3.5 py-2.5 rounded-2xl tabular-nums ${
              myPct >= groupPct
                ? 'badge-green w-full justify-center py-2.5 text-xs'
                : 'badge-yellow w-full justify-center py-2.5 text-xs'
            }`}
          >
            {myPct >= groupPct
              ? `↑ Bạn học nhanh hơn TB nhóm ${myPct - groupPct}%`
              : `↓ Bạn cần cố gắng hơn ${groupPct - myPct}% so với TB nhóm`}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {segments.map(s => (
            <div key={s.label} className={`text-center p-2.5 rounded-2xl border ${s.bg}`}>
              <div className={`text-lg font-black tabular-nums ${s.textColor}`}>{s.count}</div>
              <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                <span aria-hidden="true" className="mr-1">
                  {s.marker}
                </span>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
