import { subjectDatabase, calculateHe10, getHe4, electiveLimits } from '../data';

export const getLetterGrade = he10 => {
  if (he10 === null) return '—';
  if (he10 >= 9.0) return 'A+'; if (he10 >= 8.5) return 'A';
  if (he10 >= 8.0) return 'B+'; if (he10 >= 7.0) return 'B';
  if (he10 >= 6.5) return 'C+'; if (he10 >= 5.5) return 'C';
  if (he10 >= 5.0) return 'D+'; if (he10 >= 4.0) return 'D';
  return 'F';
};

export const calcResult = (cc, gk, ck) => {
  const h10 = calculateHe10(parseFloat(cc), parseFloat(gk), parseFloat(ck));
  if (h10 === null) return { he10: '—', chu: '—', he4: '—' };
  return { he10: h10.toFixed(1), chu: getLetterGrade(h10), he4: getHe4(h10).toFixed(1) };
};

export function calcGpaStats(grades) {
  let totalPoints = 0, totalCredits = 0, earnedCredits = 0;
  let learning = 0, done = 0;
  const semGPA = {};
  const failed = [];

  // 1. Tính toán trước số tín chỉ hiện tại của từng khối tự chọn
  const groupCredits = {};
  subjectDatabase.forEach(sub => {
    if (sub.electiveGroup) {
      const st = grades[sub.id]?.status;
      if (st === 'Đã học' || st === 'Đang học' || st === 'Được miễn' || st === 'Đạt') {
        groupCredits[sub.electiveGroup] = (groupCredits[sub.electiveGroup] || 0) + sub.credits;
      }
    }
  });

  subjectDatabase.forEach(sub => {
    const g = grades[sub.id] || {};
    let st = g.status || 'Chưa học';

    // 2. Logic ép "Không học" nếu khối tự chọn đã đủ tín chỉ
    const limit = sub.electiveGroup ? electiveLimits[sub.electiveGroup] : 0;
    const currentCr = sub.electiveGroup ? (groupCredits[sub.electiveGroup] || 0) : 0;
    const isActive = st === 'Đã học' || st === 'Đang học' || st === 'Được miễn' || st === 'Đạt';

    if (sub.electiveGroup && currentCr >= limit && !isActive) {
      st = 'Không học';
    }

    if (st === 'Đang học') learning++;

    if (st === 'Đã học' || st === 'Đạt' || st === 'Được miễn') {
      if (st === 'Đã học' || st === 'Đạt') done++;

      if (!sub.excludeCPA) {
        if (st === 'Được miễn') earnedCredits += sub.credits;

        if (st === 'Đã học') {
          const r = calcResult(g.cc, g.gk, g.ck);
          const he4 = parseFloat(r.he4);
          if (!isNaN(he4)) {
            if (he4 >= 1.0) {
              earnedCredits += sub.credits;
              totalPoints += he4 * sub.credits;
              totalCredits += sub.credits;
              if (g.semester) {
                if (!semGPA[g.semester]) semGPA[g.semester] = { pts: 0, cr: 0 };
                semGPA[g.semester].pts += he4 * sub.credits;
                semGPA[g.semester].cr += sub.credits;
              }
            } else {
              failed.push({ ...sub, he10: r.he10, chu: r.chu, he4: r.he4, semester: g.semester });
            }
          }
        }
      }
    }
  });

  const cpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : '—';
  const semGPAFmt: Record<string, string> = {};
  Object.entries(semGPA as Record<string, { pts: number; cr: number }>).forEach(([k, v]) => {
    semGPAFmt[k] = v.cr ? (v.pts / v.cr).toFixed(2) : '—';
  });
  return {
    cpa, credits: earnedCredits, learning, done, semGPA: semGPAFmt,
    failed, rawPoints: totalPoints, rawCredits: totalCredits
  };
}

export function exportGradesToCSV(profile, grades) {
  const headers = ['STT', 'Mã môn', 'Tên môn', 'Số TC', 'Loại', 'Học kỳ', 'Trạng thái', 'CC', 'GK', 'CK', 'Hệ 10', 'Chữ', 'Hệ 4'];
  const rows = subjectDatabase.map((sub, i) => {
    const g = grades[sub.id] || {};
    let st = g.status || 'Chưa học';
    if (sub.excludeCPA && st === 'Đã học') st = 'Đạt'; // Fix export format
    const r = sub.excludeCPA ? { he10: '—', chu: '—', he4: '—' } : calcResult(g.cc, g.gk, g.ck);
    return [i + 1, sub.code, sub.name, sub.credits, sub.type,
    g.semester ? `Kỳ ${g.semester}` : '—', st,
    g.cc || '—', g.gk || '—', g.ck || '—', r.he10, r.chu, r.he4];
  });
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `BangDiem_${profile.fullName || 'SinhVien'}.csv` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
