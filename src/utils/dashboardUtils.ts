import { useMemo } from 'react';
import { subjectDatabase, calculateHe10, getHe4 } from '../data';

export const DEFAULT_SEM_NAMES = {
  1: 'HKI 2025–26', 2: 'HKII 2025–26', 3: 'HK Hè 26',
  4: 'HKI 2026–27', 5: 'HKII 2026–27', 6: 'HKI 2027–28',
  7: 'HKII 2027–28', 8: 'HKI 2028–29',
};

export function useSemesterNames(semesterLabels, updateSemesterLabel) {
  const names = useMemo(() => ({ ...DEFAULT_SEM_NAMES, ...semesterLabels }), [semesterLabels]);
  const updateName = (sem, val) => updateSemesterLabel(String(sem), val);
  return [names, updateName];
}

export function computeCPA(grades) {
  let w = 0, c = 0, passed = 0, learning = 0;
  subjectDatabase.forEach(sub => {
    const g = grades[sub.id]; if (!g) return;
    if (g.status === 'Đang học') learning++;
    if (!sub.excludeCPA) {
      if (g.status === 'Được miễn') passed += sub.credits;
      if (g.status === 'Đã học') {
        const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
        const h4 = getHe4(h10);
        if (h10 !== null && h4 >= 1.0) {
          w += h4 * sub.credits;
          c += sub.credits;
          passed += sub.credits;
        }
      }
    }
  });
  const semGPA: Record<string, { w: number; c: number }> = {};
  subjectDatabase.forEach(sub => {
    const g = grades[sub.id]; if (!g) return;
    if (g.status === 'Đã học' && !sub.excludeCPA) {
      const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
      const h4 = getHe4(h10);
      if (h10 !== null && h4 >= 1.0) {
        const sem = String(g.semester || '?');
        if (!semGPA[sem]) semGPA[sem] = { w: 0, c: 0 };
        semGPA[sem].w += h4 * sub.credits; semGPA[sem].c += sub.credits;
      }
    }
  });
  const semResult: Record<string, string> = {};
  Object.entries(semGPA).sort(([a], [b]) => Number(a) - Number(b)).forEach(([k, v]) => {
    semResult[k] = v.c > 0 ? (Math.round((v.w / v.c + Number.EPSILON) * 100) / 100).toFixed(2) : '0.00';
  });
  return {
    cpa: c > 0 ? (Math.round((w / c + Number.EPSILON) * 100) / 100).toFixed(2) : '0.00',
    credits: passed, learning, semGPA: semResult,
  };
}

export const cpaColor = v => {
  const n = parseFloat(v);
  if (n >= 3.6) return 'text-green-400';
  if (n >= 3.2) return 'text-blue-400';
  if (n >= 2.5) return 'text-yellow-400';
  return 'text-red-400';
};
