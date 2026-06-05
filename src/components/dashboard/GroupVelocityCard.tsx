// @ts-nocheck
import React, { useMemo } from 'react';
import { Zap, AlertCircle, Activity } from 'lucide-react';
import { subjectDatabase } from '../../data';

export function GroupVelocityCard({ allGrades, members }) {
  const { semVelocity, latestTrend, alertMsg } = useMemo(() => {
    const semMap = {};
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
  const maxVal = Math.max(...Object.values(semVelocity).map(Number), 1);

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        <h3 className="font-bold text-white text-sm">Vận tốc học tập nhóm</h3>
        <span className="text-[10px] text-gray-600 ml-1">· Số môn TB/người mỗi kỳ</span>
      </div>
      <div className="p-5">
        {alertMsg && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{alertMsg}</span>
          </div>
        )}

        {semKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="w-9 h-9 text-gray-700 mb-2" />
            <p className="text-xs text-gray-600">Chưa đủ dữ liệu học kỳ<br />để tính vận tốc nhóm</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-3" style={{ height: 80 }}>
              {semKeys.map((k, i) => {
                const val = semVelocity[k];
                const heightPct = Math.max(8, (val / maxVal) * 100);
                const isLast = i === semKeys.length - 1;
                const barColor = isLast
                  ? (latestTrend < -0.5 ? 'bg-red-500/70' : latestTrend >= 0 ? 'bg-yellow-400/80' : 'bg-yellow-400/50')
                  : 'bg-blue-500/50';
                return (
                  <div key={k} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-500">{val.toFixed(1)}</span>
                    <div className="w-full bg-gray-800 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: 52 }}>
                      <div className={`w-full rounded-t-lg transition-all duration-700 ${barColor}`}
                        style={{ height: `${heightPct}%` }} />
                    </div>
                    <span className="text-[8px] text-gray-600 whitespace-nowrap">Kỳ {k}</span>
                  </div>
                );
              })}
            </div>

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

