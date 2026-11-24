import { useMemo } from 'react';
import { calcGpaStats } from './gradeUtils';

export const DEFAULT_SEM_NAMES: Record<number | string, string> = {
  1: 'HKI 2025–26', 2: 'HKII 2025–26', 3: 'HK Hè 26',
  4: 'HKI 2026–27', 5: 'HKII 2026–27', 6: 'HKI 2027–28',
  7: 'HKII 2027–28', 8: 'HKI 2028–29',
};

export function useSemesterNames(semesterLabels: Record<string, string>, updateSemesterLabel: (k: string, v: string) => void) {
  const names = useMemo(() => ({ ...DEFAULT_SEM_NAMES, ...semesterLabels }), [semesterLabels]);
  const updateName = (sem: string | number, val: string) => updateSemesterLabel(String(sem), val);
  return [names, updateName] as const;
}

export function computeCPA(grades: Record<string, any> = {}) {
  const stats = calcGpaStats(grades);
  return {
    cpa: stats.cpa,
    credits: stats.credits,
    learning: stats.learning,
    done: stats.done,
    failed: stats.failed,
    semGPA: stats.semGPA,
  };
}

export const cpaColor = (v: string | number) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (Number.isNaN(n)) return 'text-gray-400';
  if (n >= 3.6) return 'text-green-400';
  if (n >= 3.2) return 'text-blue-400';
  if (n >= 2.5) return 'text-yellow-400';
  return 'text-red-400';
};
