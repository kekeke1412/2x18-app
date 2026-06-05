import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, Check, X, Edit3 } from 'lucide-react';

export function SemesterSelector({ semGPA, semesterNames, updateSemesterName }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [hoveredSem, setHoveredSem] = useState(null);
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

  const N = sems.length;
  const chartMin = 0.0;
  const chartMax = 4.0;
  const range = chartMax - chartMin;

  const getX = (i) => ((i + 0.5) / N) * 100;
  const getY = (gpa) => 90 - (parseFloat(gpa) / range) * 65;

  const points = sems.map((sem, i) => `${getX(i)},${getY(semGPA[sem])}`).join(' ');
  const polygonPoints = `${getX(0)},90 ${points} ${getX(N - 1)},90`;
  const yAxisTicks = [4.0, 3.0, 2.0, 1.0, 0.0];

  return (
    <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl overflow-hidden mb-6">
      <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-red-400" />
        <h3 className="font-bold text-white text-sm">GPA theo học kỳ</h3>
        <span className="text-[10px] text-gray-600 ml-1">· Click tên kỳ để đổi tên</span>
      </div>
      <div className="flex pt-5 pb-2">
        <div className="w-10 shrink-0 relative h-[180px]">
          {yAxisTicks.map(v => {
            const y = getY(v);
            return (
              <div key={v} className="absolute w-full text-right pr-2 text-[10px] font-bold text-gray-500"
                style={{ top: `${y}%`, transform: 'translateY(-50%)' }}>
                {v.toFixed(1)}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar pr-5">
          <div className="relative min-w-[600px] h-[220px] mx-auto">
            <div className="absolute inset-0 w-full h-[180px] pointer-events-none">
              {yAxisTicks.map(v => {
                const y = getY(v);
                return (
                  <div key={v} className="absolute w-full border-t border-gray-800/50"
                    style={{ top: `${y}%` }}></div>
                );
              })}
            </div>

            <svg className="absolute top-0 left-0 w-full h-[180px]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon points={polygonPoints} fill="url(#areaGrad)" />
              <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="absolute top-0 left-0 w-full h-[180px] pointer-events-none">
              {sems.map((sem, i) => {
                const gpa = semGPA[sem];
                const x = getX(i);
                const y = getY(gpa);
                const isHovered = hoveredSem === sem;
                return (
                  <div key={sem} className="absolute flex flex-col items-center justify-center w-10 h-10 pointer-events-auto cursor-pointer"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    onMouseEnter={() => setHoveredSem(sem)}
                    onMouseLeave={() => setHoveredSem(null)}>
                    <div className={`absolute bottom-8 text-sm font-black whitespace-nowrap drop-shadow-md transition-colors ${isHovered ? 'text-red-400' : 'text-white'}`}>
                      {gpa}
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border-[3px] transition-all duration-200 ${isHovered ? 'bg-red-500 border-white shadow-[0_0_12px_rgba(239,68,68,0.8)] scale-125' : 'bg-[#1a1a1a] border-red-500'}`} />
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-0 w-full flex h-[40px]">
              {sems.map((sem, i) => {
                const isEd = editing === sem;
                const isHovered = hoveredSem === sem;
                return (
                  <div key={sem} className="flex-1 flex justify-center items-end pb-1"
                    onMouseEnter={() => setHoveredSem(sem)}
                    onMouseLeave={() => setHoveredSem(null)}>
                    {isEd ? (
                      <div className="flex items-center gap-1">
                        <input ref={inputRef}
                          className="text-[10px] font-bold text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1 w-20 outline-none text-center"
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commit(sem); if (e.key === 'Escape') setEditing(null); }}
                          maxLength={20} />
                        <button onClick={() => commit(sem)} className="p-1 text-green-400 shrink-0 pointer-events-auto"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditing(null)} className="p-1 text-gray-600 hover:text-white shrink-0 pointer-events-auto"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditing(sem); setDraft(semesterNames[sem] || `Học kỳ ${sem}`); }}
                        className="group flex items-center gap-1 pointer-events-auto" title="Click để đổi tên">
                        <span className={`text-[10px] font-bold uppercase tracking-wide transition-colors truncate max-w-[90px] ${isHovered ? 'text-red-400' : 'text-gray-500'}`}>
                          {semesterNames[sem] || `Học kỳ ${sem}`}
                        </span>
                        <Edit3 className="w-2 h-2 text-gray-700 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
