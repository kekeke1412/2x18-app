import React, { useState, useRef, useEffect, useId } from 'react';
import { TrendingUp, Check, X, Edit3 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { isImeComposing } from '../../utils/stringUtils';

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  (window as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

export function SemesterSelector({ semGPA, semesterNames, updateSemesterName }: any) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gradId = useId().replace(/:/g, '');

  useEffect(() => {
    if (editing !== null && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const sems = Object.keys(semGPA || {}).sort((a, b) => Number(a) - Number(b));
  if (!sems.length) return null;

  const commit = (sem: string) => {
    if (draft.trim()) updateSemesterName(sem, draft.trim());
    setEditing(null);
  };

  const chartData = sems.map(sem => ({
    sem,
    name: semesterNames[sem] || `Học kỳ ${sem}`,
    gpa: Number(parseFloat(semGPA[sem]).toFixed(2)) || 0,
  }));

  return (
    <div className="glass overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4]">
            <TrendingUp className="w-4 h-4" strokeWidth={1.85} />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-sm">GPA theo học kỳ</h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Biểu đồ xu hướng hệ 4.0 · Nhấn vào nhãn học kỳ bên dưới để đổi tên
            </p>
          </div>
        </div>
        <span className="badge badge-blue tabular-nums">{sems.length} học kỳ</span>
      </div>

      <div className="p-5">
        <div className="w-full h-[210px]" aria-label="Biểu đồ xu hướng GPA theo học kỳ">
          <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={180}>
            <AreaChart data={chartData} margin={{ top: 14, right: 16, left: -16, bottom: 4 }}>
              <defs>
                <linearGradient id={`googleBlueGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4285F4" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="#34A853" stopOpacity={0.04} />
                </linearGradient>
                <pattern
                  id={`diagPattern-${gradId}`}
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#4285F4" strokeWidth="1.5" strokeOpacity="0.18" />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }}
                axisLine={{ stroke: 'var(--border-default)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }}
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
                  color: 'var(--text-primary)',
                }}
                formatter={(val: any) => [`${Number(val).toFixed(2)} / 4.0`, 'GPA']}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                stroke="#4285F4"
                strokeWidth={2.75}
                fill={`url(#googleBlueGrad-${gradId})`}
                dot={{ r: 5, fill: '#4285F4', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#34A853', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Accessible semester pills with direct values & rename controls */}
        <div className="mt-4 pt-3.5 border-t border-[var(--border-default)] flex flex-wrap gap-2">
          {sems.map(sem => {
            const isEd = editing === sem;
            const gpa = semGPA[sem];
            return (
              <div
                key={sem}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)]"
              >
                {isEd ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      aria-label={`Đổi tên học kỳ ${sem}`}
                      className="text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[#4285F4] rounded-lg px-2 py-0.5 w-24 outline-none"
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (isImeComposing(e)) return;
                          commit(sem);
                        }
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => commit(sem)}
                      aria-label="Lưu tên học kỳ"
                      className="p-1 text-[#34A853] hover:opacity-80"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      aria-label="Hủy đổi tên"
                      className="p-1 text-[var(--text-secondary)] hover:text-[#EA4335]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(sem);
                      setDraft(semesterNames[sem] || `Học kỳ ${sem}`);
                    }}
                    className="group flex items-center gap-1.5 text-left"
                    title="Nhấn để đổi tên học kỳ"
                  >
                    <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      {semesterNames[sem] || `Học kỳ ${sem}`}:
                    </span>
                    <span className="text-xs font-extrabold text-[#4285F4] tabular-nums">{gpa}</span>
                    <Edit3 className="w-3 h-3 text-[var(--text-muted)] opacity-60 group-hover:opacity-100 group-hover:text-[#4285F4] transition-all" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
