// @ts-nocheck
import React, { useMemo } from 'react';
import { Hexagon } from 'lucide-react';
import { subjectDatabase, calculateHe10, getHe4 } from '../../data';

export function RadarChartCard({ myGrades }) {
  const axes = useMemo(() => {
    const typeMap = {};
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
      .map(([label, v]) => ({ label, value: v.sum / v.count, max: 4.0 }));
  }, [myGrades]);

  if (axes.length < 3) {
    return (
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
          <Hexagon className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-white text-sm">Biểu đồ thế mạnh</h3>
        </div>
        <div className="flex-1 flex items-center justify-center py-12 text-center">
          <div>
            <Hexagon className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">Cần điểm ít nhất 3 loại môn học<br />để hiển thị biểu đồ</p>
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

  const AXIS_COLORS = ['#818cf8', '#34d399', '#fb923c', '#f472b6', '#38bdf8', '#a3e635', '#e879f9'];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <Hexagon className="w-4 h-4 text-purple-400" />
        <h3 className="font-bold text-white text-sm">Biểu đồ thế mạnh</h3>
        <span className="text-[10px] text-gray-600 ml-1">· GPA trung bình theo loại môn</span>
      </div>
      <div className="p-4 flex flex-col items-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#818cf8" floodOpacity="0.4" />
            </filter>
          </defs>
          {[0.25, 0.5, 0.75, 1.0].map((pct, i) => (
            <polygon key={i} points={bgPoly(pct)}
              fill="none" stroke={pct === 1.0 ? '#374151' : '#1f2937'} strokeWidth={pct === 1.0 ? '1.5' : '1'} />
          ))}
          {axes.map((_, i) => {
            const outer = pt(i, 4.0);
            return <line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="#1f2937" strokeWidth="1" />;
          })}
          <polygon points={dataPolygon} filter="url(#radarGlow)"
            fill="rgba(129,140,248,0.22)" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill={AXIS_COLORS[i % AXIS_COLORS.length]} stroke="#1a1a1a" strokeWidth="1.5" />
          ))}
          {axes.map((a, i) => {
            const la = angle(i), lx = CX + (R + 24) * Math.cos(la), ly = CY + (R + 24) * Math.sin(la);
            const label = a.label.length > 12 ? a.label.slice(0, 11) + '…' : a.label;
            return (
              <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize="8.5" fill="#9ca3af" fontWeight="bold">{label}</text>
            );
          })}
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#6b7280">GPA</text>
        </svg>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 w-full mt-1 px-1">
          {axes.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: AXIS_COLORS[i % AXIS_COLORS.length] }} />
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

