import React, { useMemo, useId } from 'react';
import { TrendingUp } from 'lucide-react';
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
import { computeCPA, cpaColor } from '../../utils/dashboardUtils';
import { useOptionalApp } from '../../context/AppContext';
import UserAvatar from '../UserAvatar';

export function GroupGPACard({ myGrades, allGrades, members }: any) {
  const app: any = useOptionalApp();
  const isCore = Boolean(app?.isCore);
  const patternId = useId().replace(/:/g, '');

  const { myCPA, groupCPA, memberCPAs } = useMemo(() => {
    const me = computeCPA(myGrades);
    const cpas = members
      .map((m: any) => {
        const g = allGrades[m.id] || {};
        return { ...m, cpa: parseFloat(computeCPA(g).cpa) };
      })
      .filter((m: any) => !Number.isNaN(m.cpa) && m.cpa > 0);

    const grpAvg = cpas.length
      ? (
          Math.round((cpas.reduce((s: number, m: any) => s + m.cpa, 0) / cpas.length + Number.EPSILON) * 100) /
          100
        ).toFixed(2)
      : '0.00';

    return { myCPA: me.cpa, groupCPA: grpAvg, memberCPAs: cpas };
  }, [myGrades, allGrades, members]);

  const parsedMy = parseFloat(myCPA);
  const myVal = Number.isNaN(parsedMy) ? 0 : parsedMy;
  const parsedGrp = parseFloat(groupCPA);
  const grpVal = Number.isNaN(parsedGrp) ? 0 : parsedGrp;
  const diff = (Math.round((myVal - grpVal + Number.EPSILON) * 100) / 100).toFixed(2);
  const isAbove = myVal >= grpVal;

  const chartData = [
    {
      name: '● Bạn',
      cpa: Number((Math.round((myVal + Number.EPSILON) * 100) / 100).toFixed(2)),
      fill: '#4285F4',
    },
    {
      name: '▲ Nhóm TB',
      cpa: Number((Math.round((grpVal + Number.EPSILON) * 100) / 100).toFixed(2)),
      fill: `url(#grpStripe-${patternId})`,
    },
  ];

  return (
    <div className="glass overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#34A853]/15 flex items-center justify-center text-[#34A853]">
            <TrendingUp className="w-4 h-4" strokeWidth={1.85} />
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm">So sánh GPA nhóm</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold tabular-nums">
          <span className="text-[#4285F4]">● Bạn: {myVal.toFixed(2)}</span>
          <span className="text-[#34A853]">▲ Nhóm: {grpVal.toFixed(2)}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="w-full h-36 mb-3" aria-label="Biểu đồ cột so sánh CPA cá nhân và trung bình nhóm">
          <ResponsiveContainer width="100%" height="100%" minWidth={160} minHeight={120}>
            <BarChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }} barSize={44}>
              <defs>
                <pattern
                  id={`grpStripe-${patternId}`}
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="8" height="8" fill="#34A853" fillOpacity="0.82" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.32" />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 700 }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 2, 4]}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(66, 133, 244, 0.06)' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-default)',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} / 4.0`, 'CPA']}
              />
              <Bar dataKey="cpa" radius={[10, 10, 4, 4]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className={`text-center text-xs font-bold px-3.5 py-2.5 rounded-2xl tabular-nums ${
            myVal === 0
              ? 'text-[var(--text-secondary)] bg-[var(--bg-subtle)]'
              : isAbove
                ? 'badge-green w-full justify-center py-2.5 text-xs'
                : 'badge-yellow w-full justify-center py-2.5 text-xs'
          }`}
        >
          {myVal === 0
            ? '— Chưa có điểm để so sánh'
            : isAbove
              ? `↑ Cao hơn TB nhóm ${diff} điểm 🎉`
              : `↓ Thấp hơn TB nhóm ${Math.abs(parseFloat(diff)).toFixed(2)} điểm`}
        </div>

        {isCore && memberCPAs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Danh sách GPA nhóm (Core Team)
            </div>
            {[...memberCPAs]
              .sort((a, b) => b.cpa - a.cpa)
              .map((m, i) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] w-4 tabular-nums">{i + 1}.</span>
                  <UserAvatar user={m} size={22} />
                  <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">
                    {(m.fullName || '').split(' ').slice(-2).join(' ')}
                  </span>
                  <span className={`text-xs font-black tabular-nums ${cpaColor(String(m.cpa))}`}>
                    {m.cpa.toFixed(2)}
                  </span>
                  <div className="w-16 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#4285F4]"
                      style={{ width: `${(m.cpa / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
          <span>{isCore ? 'Chi tiết CPA từng thành viên' : 'Trung bình ẩn danh toàn nhóm'}</span>
          <span>
            {memberCPAs.length}/{members.length} có dữ liệu
          </span>
        </div>
      </div>
    </div>
  );
}
