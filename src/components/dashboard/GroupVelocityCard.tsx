import React, { useMemo, useId } from 'react';
import { Zap, AlertCircle, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { subjectDatabase } from '../../data';

export function GroupVelocityCard({ allGrades, members }: any) {
  const patternId = useId().replace(/:/g, '');

  const { semVelocity, latestTrend, alertMsg } = useMemo(() => {
    const semMap: Record<string, number> = {};
    let activeMemberCount = 0;

    members.forEach((m: any) => {
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

    const avgPerSem: Record<string, number> = {};
    Object.entries(semMap).forEach(([k, v]) => {
      avgPerSem[k] = Number((v / activeMemberCount).toFixed(1));
    });

    const keys = Object.keys(avgPerSem).sort((a, b) => Number(a) - Number(b));
    let latestTrend = 0;
    let alertMsg: string | null = null;
    if (keys.length >= 2) {
      const last = avgPerSem[keys[keys.length - 1]];
      const prev = avgPerSem[keys[keys.length - 2]];
      latestTrend = last - prev;
      if (latestTrend < -0.5 && prev > 0) {
        const pct = Math.round((Math.abs(latestTrend) / prev) * 100);
        alertMsg = `Nhóm đang chậm tiến độ ${pct}% so với kỳ trước — cần tổ chức buổi học bù! 📢`;
      }
    }
    return { semVelocity: avgPerSem, latestTrend, alertMsg };
  }, [allGrades, members]);

  const semKeys = Object.keys(semVelocity).sort((a, b) => Number(a) - Number(b));

  const chartData = semKeys.map((k, idx) => {
    const isLast = idx === semKeys.length - 1;
    let fill = '#4285F4';
    if (isLast) {
      fill =
        latestTrend < -0.5
          ? `url(#velWarn-${patternId})`
          : latestTrend >= 0
            ? '#34A853'
            : '#FBBC05';
    }
    return {
      name: `Kỳ ${k}`,
      subjects: semVelocity[k],
      fill,
    };
  });

  return (
    <div className="glass overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FBBC05]/20 flex items-center justify-center text-[#FBBC05]">
            <Zap className="w-4 h-4" strokeWidth={1.85} />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Vận tốc học tập nhóm</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">Số môn trung bình / người mỗi kỳ</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {alertMsg && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl badge-yellow text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FBBC05]" />
            <span>{alertMsg}</span>
          </div>
        )}

        {semKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="w-9 h-9 text-[var(--text-muted)] opacity-40 mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">
              Chưa đủ dữ liệu học kỳ
              <br />
              để tính vận tốc nhóm
            </p>
          </div>
        ) : (
          <>
            <div className="w-full h-36 mb-3" aria-label="Biểu đồ vận tốc học tập nhóm theo từng kỳ">
              <ResponsiveContainer width="100%" height="100%" minWidth={160} minHeight={120}>
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }} barSize={32}>
                  <defs>
                    <pattern
                      id={`velWarn-${patternId}`}
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="6" height="6" fill="#EA4335" fillOpacity="0.85" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.35" />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700 }}
                    axisLine={{ stroke: 'var(--border-default)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-default)',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                    formatter={(val: any) => [`${Number(val).toFixed(1)} môn`, 'Trung bình']}
                  />
                  <Bar dataKey="subjects" radius={[8, 8, 2, 2]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-default)] tabular-nums">
              <span>Trung bình số môn/người/kỳ</span>
              {semKeys.length >= 2 && (
                <span
                  className={`font-black text-xs flex items-center gap-1 ${
                    latestTrend >= 0 ? 'text-[#34A853]' : 'text-[#EA4335]'
                  }`}
                >
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
