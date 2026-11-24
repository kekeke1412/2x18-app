import React, { useMemo } from 'react';
import { Hexagon } from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { subjectDatabase, calculateHe10, getHe4 } from '../../data';

const GOOGLE_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];
const SHAPE_MARKERS = ['●', '▲', '■', '◆'];

export function RadarChartCard({ myGrades }: any) {
  const axes = useMemo(() => {
    const typeMap: Record<string, { sum: number; count: number }> = {};
    subjectDatabase.forEach(sub => {
      const g = myGrades[sub.id];
      if (!g || g.status !== 'Đã học' || sub.excludeCPA) return;
      const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
      if (h10 === null) return;
      const h4 = getHe4(h10);
      if (h4 < 1.0) return;
      const type = sub.type || 'Khác';
      if (!typeMap[type]) typeMap[type] = { sum: 0, count: 0 };
      typeMap[type].sum += h4;
      typeMap[type].count++;
    });
    return Object.entries(typeMap)
      .filter(([, v]) => v.count > 0)
      .map(([label, v]) => ({
        label,
        shortLabel: label.length > 14 ? `${label.slice(0, 13)}…` : label,
        value: Number((Math.round((v.sum / v.count + Number.EPSILON) * 100) / 100).toFixed(2)),
        max: 4.0,
      }));
  }, [myGrades]);

  if (axes.length < 3) {
    return (
      <div className="glass overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4]">
            <Hexagon className="w-4 h-4" strokeWidth={1.85} />
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Biểu đồ thế mạnh</h3>
        </div>
        <div className="flex-1 flex items-center justify-center py-12 text-center px-4">
          <div>
            <Hexagon className="w-10 h-10 text-[var(--text-muted)] opacity-40 mx-auto mb-2" />
            <p className="text-xs text-[var(--text-secondary)]">
              Cần điểm ít nhất 3 nhóm môn học
              <br />
              để hiển thị biểu đồ thế mạnh
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4]">
            <Hexagon className="w-4 h-4" strokeWidth={1.85} />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Biểu đồ thế mạnh</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">GPA trung bình theo nhóm môn học</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className="w-full h-[220px]" aria-label="Biểu đồ Radar GPA theo từng nhóm môn học">
          <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={180}>
            <RadarChart data={axes} outerRadius="74%">
              <PolarGrid stroke="var(--border-default)" />
              <PolarAngleAxis
                dataKey="shortLabel"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 4]}
                tickCount={5}
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-default)',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} / 4.0`, 'GPA']}
              />
              <Radar
                name="GPA"
                dataKey="value"
                stroke="#4285F4"
                strokeWidth={2.5}
                fill="#4285F4"
                fillOpacity={0.26}
                dot={{ r: 4, fill: '#34A853', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-2 pt-3 border-t border-[var(--border-default)] px-1">
          {axes.map((a, i) => {
            const color = GOOGLE_COLORS[i % GOOGLE_COLORS.length];
            const marker = SHAPE_MARKERS[i % SHAPE_MARKERS.length];
            // Never use raw yellow text on light backgrounds
            const textColor =
              color === '#FBBC05' ? 'var(--semantic-yellow-text)' : color;
            return (
              <div key={a.label} className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold shrink-0" style={{ color }} aria-hidden="true">
                  {marker}
                </span>
                <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{a.label}</span>
                <span className="text-xs font-black tabular-nums shrink-0" style={{ color: textColor }}>
                  {a.value.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
