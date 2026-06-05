import React, { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { subjectDatabase } from '../../data';

export function LearningProgressCard({ myGrades, allGrades, members }) {
  const { myPct, groupPct, myDone, myLearning, totalSubs } = useMemo(() => {
    let myDone = 0, myLearning = 0;
    const total = subjectDatabase.length;
    subjectDatabase.forEach(sub => {
      const g = myGrades[sub.id]; if (!g) return;
      if (g.status === 'Đã học' || g.status === 'Được miễn') myDone++;
      else if (g.status === 'Đang học') myLearning++;
    });
    const myP = Math.round((myDone / total) * 100);

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
    { label: 'Hoàn thành', count: myDone, color: 'bg-green-500', textColor: 'text-green-400' },
    { label: 'Đang học', count: myLearning, color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'Chưa học', count: totalSubs - myDone - myLearning, color: 'bg-gray-700', textColor: 'text-gray-500' },
  ];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-purple-400" />
        <h3 className="font-bold text-white text-sm">Tiến độ học tập</h3>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span className="font-bold text-gray-300">Cá nhân bạn</span>
            <span className="font-bold text-white">{myPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
              style={{ width: `${myPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
            <span className="font-bold text-gray-400">Trung bình nhóm ({members.length} người)</span>
            <span className="font-bold text-gray-300">{groupPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all"
              style={{ width: `${groupPct}%` }} />
          </div>
        </div>
        {myPct > 0 && (
          <div className={`text-center text-xs font-bold px-3 py-2 rounded-xl ${myPct >= groupPct
            ? 'text-green-400 bg-green-500/10 border border-green-500/20'
            : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
            }`}>
            {myPct >= groupPct
              ? `↑ Bạn học nhanh hơn TB nhóm ${myPct - groupPct}%`
              : `↓ Bạn cần cố gắng hơn ${groupPct - myPct}% so với TB nhóm`}
          </div>
        )}
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
