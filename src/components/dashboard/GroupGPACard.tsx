import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { computeCPA, cpaColor } from '../../utils/dashboardUtils';

export function GroupGPACard({ myGrades, allGrades, members }) {
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

  const myVal = parseFloat(myCPA);
  const grpVal = parseFloat(groupCPA);
  const diff = (myVal - grpVal).toFixed(2);
  const isAbove = myVal >= grpVal;

  const bars = [
    { label: 'Bạn', val: myVal, color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'Nhóm TB', val: grpVal, color: 'bg-gray-500', textColor: 'text-gray-400' },
  ];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h3 className="font-bold text-white text-sm">So sánh GPA nhóm</h3>
      </div>
      <div className="p-5">
        <div className="flex items-end justify-around gap-6 mb-4 h-24">
          {bars.map(b => (
            <div key={b.label} className="flex flex-col items-center gap-2 flex-1">
              <div className={`text-sm font-black ${b.textColor}`}>{b.val.toFixed(2)}</div>
              <div className="w-full flex-1 bg-gray-800 rounded-lg overflow-hidden flex flex-col justify-end">
                <div className={`${b.color} rounded-lg transition-all duration-700`}
                  style={{ height: `${Math.min(100, (b.val / 4) * 100)}%` }} />
              </div>
              <div className="text-[10px] font-bold text-gray-500 text-center">{b.label}</div>
            </div>
          ))}
        </div>
        <div className={`text-center text-xs font-bold px-3 py-2 rounded-xl ${myVal === 0
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
        {memberCPAs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800/40 space-y-1.5">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Top GPA nhóm</div>
            {memberCPAs.sort((a, b) => b.cpa - a.cpa).slice(0, 5).map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600 w-4">{i + 1}.</span>
                {m.avatarUrl ? <img src={m.avatarUrl} className="w-5 h-5 rounded-full object-cover border border-gray-700 shrink-0" /> : <div className="w-5 h-5 rounded-full bg-[#252525] flex items-center justify-center text-[8px] font-bold text-gray-400 shrink-0">{m.avatar}</div>}
                <span className="text-[11px] text-gray-400 flex-1 truncate">{m.fullName.split(' ').slice(-2).join(' ')}</span>
                <span className={`text-[11px] font-black ${cpaColor(String(m.cpa))}`}>{m.cpa.toFixed(2)}</span>
                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(m.cpa / 4) * 100}%` }} />
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
