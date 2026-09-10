// @ts-nocheck
// src/services/aiService.ts
import { subjectDatabase, calculateHe10, getHe4 } from '../data';
import { getLetterGrade, calcGpaStats } from '../utils/gradeUtils';
import { RESEARCH_KNOWLEDGE_BASE } from '../data/researchKnowledge';

/**
 * Phân loại ý định người dùng (Intent Classifier) để định tuyến mô hình kép:
 * - deepseek-v4-flash: Tác vụ tổng hợp, tiến độ, học bổng, lập lịch, chat thông thường (Tốc độ cao).
 * - deepseek-v4-pro: Toán lý vi tích phân (Boas), điện từ (Griffiths), bán dẫn (Sze), công nghệ phòng sạch, phân tích lỗi màng mỏng, giải phẫu bài báo (Chuỗi suy luận sâu CoT).
 */
export function classifyIntent(userMessage, preferredModel = 'auto') {
  if (preferredModel === 'deepseek-v4-pro' || preferredModel === 'deepseek-v4-flash') {
    return preferredModel;
  }

  const proKeywords = [
    'toán lý', 'pde', 'đạo hàm riêng', 'tích phân', 'laplace', 'fourier', 'thặng dư', 'residue', 'boas',
    'điện từ', 'maxwell', 'griffiths', 'điều kiện biên', 'thế vector', 'skin depth',
    'xác suất', 'thống kê', 'montgomery', 'kiểm định', 'anova', 'doe', 'spc', 'c_pk',
    'bán dẫn', 'sze', 'vùng năng lượng', 'bandgap', 'fermi', 'schottky', 'ohmic', 'mosfet', 'hemt',
    'i_on', 'i_off', 'g_m', 'v_br', 'c-v', 'd_it',
    'phòng sạch', 'cleanroom', 'sputtering', 'phún xạ', 'ald', '4-point probe', 'điện trở mặt',
    'màng mỏng', 'lỗi màng', 'chân không nền', 'recipe', 'lắng đọng', 'piranha', 'hf',
    'giải phẫu bài báo', 'paper', 'ieee', 'blueprint', 'tsri', 'bắt lỗi', 'vết gãy', 'first principles'
  ];

  const lower = (userMessage || '').toLowerCase();
  const isPro = proKeywords.some(kw => lower.includes(kw));

  return isPro ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
}

/**
 * Gọi DeepSeek thông qua Vercel Proxy với cơ chế định tuyến mô hình kép (Dual-Model Routing):
 * Hỗ trợ deepseek-v4-flash & deepseek-v4-pro.
 */
export async function callAI(systemPrompt, userPrompt, options = {}) {
  const {
    temperature = 0.5,
    history = [],
    responseMimeType = 'text/plain',
    model = 'deepseek-v4-flash'
  } = options;

  return await callDeepSeekProxy(systemPrompt, userPrompt, {
    temperature,
    history,
    responseMimeType,
    model
  });
}

async function callDeepSeekProxy(systemPrompt, userPrompt, { temperature, history, responseMimeType, model }) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      temperature,
      history,
      responseMimeType,
      model
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'DeepSeek Proxy Error');

  return {
    text: data.text || '',
    reasoning: data.reasoning || '',
    modelUsed: data.modelUsed || model || 'deepseek-v4-flash'
  };
}

// ── Safe JSON parse helper ─────────────────────────────────────────────────
export function safeJson(input, fallback) {
  const text = typeof input === 'object' && input !== null ? (input.text || '') : input;
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    try {
      const match = text.match(/[\{\[]([\s\S]*)[\}\]]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {
      console.warn('[safeJson] Failed to parse:', text.slice(0, 100));
    }
    return fallback;
  }
}

// ── Helper: Tính số ngày chênh lệch với deadline ────────────────────────────
export function daysDiff(deadline) {
  if (!deadline) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Helper: Tính ngược điểm thi Cuối Kỳ cần đạt ─────────────────────────────
export function calcRequiredFinalExamGrade(cc, gk, targetHe10) {
  if (cc === undefined || gk === undefined || isNaN(cc) || isNaN(gk)) return null;
  const currentPart = parseFloat(cc) * 0.2 + parseFloat(gk) * 0.2;
  const required = (targetHe10 - currentPart) / 0.6;
  return parseFloat(required.toFixed(1));
}

// ── Helper: Định dạng Bảng điểm & Học lực Cá nhân cho AI ───────────────────
function formatMemberGrades(detailedGrades, rawGrades, smeMap = {}) {
  const gpaStats = rawGrades ? calcGpaStats(rawGrades) : null;

  let report = `=== TỔNG QUAN HỌC TẬP CÁ NHÂN ===\n`;
  if (gpaStats) {
    report += `- CPA hiện tại: ${gpaStats.cpa}/4.0 (Tích lũy ${gpaStats.credits} tín chỉ)\n`;
    report += `- Môn đã hoàn thành: ${gpaStats.done} môn | Môn đang học: ${gpaStats.learning} môn\n`;
    if (gpaStats.failed && gpaStats.failed.length > 0) {
      report += `- ⚠️ CẢNH BÁO MÔN TRƯỢT (F): ${gpaStats.failed.map(f => `${f.name} (${f.code})`).join(', ')}\n`;
    }
  }

  report += `\n=== CHI TIẾT CÁC MÔN HỌC ===\n`;
  if (!detailedGrades || detailedGrades.length === 0) {
    report += `(Chưa có dữ liệu điểm môn học)\n`;
    return report;
  }

  detailedGrades
    .filter(g => g.status !== 'Chưa học' && g.status !== 'Chưa rõ' && g.status !== 'Không học')
    .forEach(g => {
      const sme = smeMap[g.subjectId] || smeMap[g.code] || 'Chưa phân công';
      if (g.status === 'Đang học') {
        report += `• [ĐANG HỌC] ${g.subjectName} (${g.code}) - ${g.credits} TC | SME phụ trách: ${sme}\n`;
        const hasCC = g.cc !== undefined && g.cc !== '' && !isNaN(g.cc);
        const hasGK = g.gk !== undefined && g.gk !== '' && !isNaN(g.gk);
        if (hasCC || hasGK) {
          report += `   Điểm hiện có: CC=${g.cc || '?'}, GK=${g.gk || '?'}\n`;
          if (hasCC && hasGK) {
            const needD = calcRequiredFinalExamGrade(g.cc, g.gk, 4.0);
            const needB = calcRequiredFinalExamGrade(g.cc, g.gk, 7.0);
            const needBPlus = calcRequiredFinalExamGrade(g.cc, g.gk, 8.0);
            const needA = calcRequiredFinalExamGrade(g.cc, g.gk, 8.5);
            report += `   🎯 MỤC TIÊU THI CUỐI KỲ CẦN ĐẠT:\n`;
            report += `      - Qua môn (D / 4.0): Cần thi CK ≥ ${needD <= 0 ? '0' : needD > 10 ? 'Không khả thi' : needD}\n`;
            report += `      - Điểm Khá (B / 7.0): Cần thi CK ≥ ${needB <= 0 ? '0' : needB > 10 ? 'Không khả thi' : needB}\n`;
            report += `      - Điểm Khá Giỏi (B+ / 8.0): Cần thi CK ≥ ${needBPlus <= 0 ? '0' : needBPlus > 10 ? 'Không khả thi' : needBPlus}\n`;
            report += `      - Điểm Giỏi (A / 8.5): Cần thi CK ≥ ${needA <= 0 ? '0' : needA > 10 ? 'Không khả thi' : needA}\n`;
          }
        } else {
          report += `   (Chưa có điểm thành phần CC/GK)\n`;
        }
      } else if (g.status === 'Đã học' || g.status === 'Đạt' || g.status === 'Được miễn') {
        const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
        const chu = h10 !== null ? getLetterGrade(h10) : (g.status === 'Đạt' || g.status === 'Được miễn' ? 'Đạt' : '—');
        const h4 = h10 !== null ? getHe4(h10) : '—';
        report += `• [ĐÃ HOÀN THÀNH] ${g.subjectName} (${g.code}) - ${g.credits} TC: CC=${g.cc || '—'}, GK=${g.gk || '—'}, CK=${g.ck || '—'} => Hệ 10: ${h10 !== null ? h10 : '—'} | Chữ: ${chu} | Hệ 4: ${h4}\n`;
      }
    });

  return report;
}

// ── Helper: Định dạng Task Cá nhân cho AI ───────────────────────────────────
function formatMemberTasks(myTasks) {
  if (!myTasks || myTasks.length === 0) return `(Hiện tại không có task nào được giao)`;

  const overdue = [];
  const urgent = [];
  const upcoming = [];
  const done = [];

  myTasks.forEach(t => {
    if (t.done) {
      done.push(t);
    } else {
      const diff = daysDiff(t.deadline);
      if (diff < 0) {
        overdue.push({ ...t, diff: Math.abs(diff) });
      } else if (diff <= 3) {
        urgent.push({ ...t, diff });
      } else {
        upcoming.push({ ...t, diff });
      }
    }
  });

  let report = `=== TÌNH TRẠNG CÔNG VIỆC CÁ NHÂN ===\n`;
  report += `- Tổng số task: ${myTasks.length} (Đã xong: ${done.length}, Đang chờ: ${overdue.length + urgent.length + upcoming.length})\n`;

  if (overdue.length > 0) {
    report += `🔴 TASK QUÁ HẠN (CẦN XỬ LÝ GẤP):\n`;
    overdue.forEach(t => {
      report += `   • "${t.task}" (Mã: ${t.code || 'N/A'}) — Đã trễ ${t.diff} ngày (Hạn: ${t.deadline})\n`;
    });
  }

  if (urgent.length > 0) {
    report += `🟡 TASK ĐẾN HẠN HÔM NAY / SẮP TỚI (1-3 ngày):\n`;
    urgent.forEach(t => {
      report += `   • "${t.task}" (Mã: ${t.code || 'N/A'}) — ${t.diff === 0 ? 'HẠN CHÓT HÔM NAY' : `Còn ${t.diff} ngày`} (Hạn: ${t.deadline})\n`;
    });
  }

  if (upcoming.length > 0) {
    report += `🔵 TASK TIẾP THEO:\n`;
    upcoming.slice(0, 5).forEach(t => {
      report += `   • "${t.task}" (Mã: ${t.code || 'N/A'}) — Còn ${t.diff} ngày (Hạn: ${t.deadline})\n`;
    });
  }

  return report;
}

// ── Helper: Định dạng Báo cáo Toàn Nhóm cho Core ────────────────────────────
function formatCoreGroupReport(data) {
  const { members = [], allGrades = {}, allTasks = [], attendance = [], contributions = {}, smeMap = {}, reports = [] } = data;

  let res = `=== BÁO CÁO CHIẾN LƯỢC TOÀN ĐOÀN 2X18 (CORE LEVEL) ===\n`;
  res += `- Quy mô nhân sự: ${members.length} thành viên đang hoạt động.\n\n`;

  // 1. Phân tích Học lực Toàn nhóm
  res += `1. TỔNG QUAN HỌC LỰC & CPA TOÀN NHÓM:\n`;
  const memberAcademicList = [];
  const riskMembers = [];
  const honorMembers = [];
  const subjectStruggles = {};

  members.forEach(m => {
    const userGrades = allGrades[m.id] || {};
    const stats = calcGpaStats(userGrades);
    const cpaNum = parseFloat(stats.cpa);

    memberAcademicList.push({
      id: m.id,
      name: m.fullName,
      mssv: m.mssv,
      role: m.role,
      cpa: stats.cpa,
      cpaNum: isNaN(cpaNum) ? 0 : cpaNum,
      credits: stats.credits,
      learning: stats.learning,
      failed: stats.failed || []
    });

    if (!isNaN(cpaNum) && cpaNum >= 3.2) {
      honorMembers.push(`${m.fullName} (CPA: ${stats.cpa})`);
    }
    if ((!isNaN(cpaNum) && cpaNum < 2.5 && cpaNum > 0) || (stats.failed && stats.failed.length > 0)) {
      riskMembers.push({
        name: m.fullName,
        cpa: stats.cpa,
        failed: (stats.failed || []).map(f => f.code)
      });
    }

    Object.entries(userGrades).forEach(([subId, g]) => {
      if (g?.status === 'Đã học') {
        const h10 = calculateHe10(parseFloat(g.cc), parseFloat(g.gk), parseFloat(g.ck));
        if (h10 !== null && h10 < 5.5) {
          const sub = subjectDatabase.find(s => s.id === subId);
          const subName = sub ? `${sub.name} (${sub.code})` : subId;
          subjectStruggles[subName] = (subjectStruggles[subName] || 0) + 1;
        }
      }
    });
  });

  memberAcademicList.sort((a, b) => b.cpaNum - a.cpaNum);

  res += `- Danh sách CPA thành viên:\n`;
  memberAcademicList.forEach((m, idx) => {
    res += `  ${idx + 1}. ${m.name} (${m.mssv || 'N/A'} - ${m.role}): CPA ${m.cpa} (${m.credits} TC tích lũy, ${m.learning} môn đang học)${m.failed.length ? ` [CẢNH BÁO F: ${m.failed.map(f => f.code).join(',')}]` : ''}\n`;
  });

  if (honorMembers.length > 0) {
    res += `- 🌟 Thành viên học lực xuất sắc (CPA ≥ 3.2): ${honorMembers.join(', ')}\n`;
  }

  if (riskMembers.length > 0) {
    res += `- ⚠️ THÀNH VIÊN CẦN ĐẶC BIỆT CHÚ Ý HỌC TẬP (CPA < 2.5 hoặc nợ môn):\n`;
    riskMembers.forEach(r => {
      res += `   • ${r.name}: CPA ${r.cpa}${r.failed.length ? ` | Môn trượt nợ: ${r.failed.join(', ')}` : ''}\n`;
    });
  }

  const hardSubjects = Object.entries(subjectStruggles).filter(([, count]) => count >= 2);
  if (hardSubjects.length > 0) {
    res += `- 📚 CÁC MÔN "TỬ THẦN" CÓ NHIỀU BẠN BỊ ĐIỂM THẤP (D/F):\n`;
    hardSubjects.forEach(([name, count]) => {
      res += `   • ${name}: ${count} bạn gặp khó khăn\n`;
    });
  }

  // 2. Phân tích Khối lượng Công việc & Tiến độ Task Toàn nhóm
  res += `\n2. TÌNH TRẠNG CÔNG VIỆC & TASK TOÀN NHÓM:\n`;
  const doneTasks = allTasks.filter(t => t.done);
  const pendingTasks = allTasks.filter(t => !t.done);
  res += `- Tổng số task dự án: ${allTasks.length} (Hoàn thành: ${doneTasks.length}, Đang thực hiện: ${pendingTasks.length})\n`;

  const memberTaskCount = {};
  const memberOverdueCount = {};
  const globalOverdue = [];

  allTasks.forEach(t => {
    const assignees = t.assignees && t.assignees.length > 0 ? t.assignees : (t.userId ? [t.userId] : []);
    const diff = daysDiff(t.deadline);
    const isLate = !t.done && diff < 0;

    assignees.forEach(uid => {
      if (!t.done) {
        memberTaskCount[uid] = (memberTaskCount[uid] || 0) + 1;
        if (isLate) {
          memberOverdueCount[uid] = (memberOverdueCount[uid] || 0) + 1;
        }
      }
    });

    if (isLate) {
      const assigneeNames = assignees.map(uid => members.find(m => m.id === uid)?.fullName || 'Chưa gán').join(', ');
      globalOverdue.push(`"${t.task}" (Hạn: ${t.deadline}, Trễ: ${Math.abs(diff)}d, Giao cho: ${assigneeNames})`);
    }
  });

  if (globalOverdue.length > 0) {
    res += `- 🔴 TASK QUÁ HẠN TOÀN NHÓM (${globalOverdue.length} task):\n`;
    globalOverdue.slice(0, 8).forEach(o => res += `   • ${o}\n`);
  } else {
    res += `- 🟢 Hiện tại không có task nào bị quá hạn.\n`;
  }

  res += `- Phân bổ khối lượng task chưa hoàn thành theo thành viên:\n`;
  members.forEach(m => {
    const activeCnt = memberTaskCount[m.id] || 0;
    const lateCnt = memberOverdueCount[m.id] || 0;
    res += `   • ${m.fullName}: ${activeCnt} task đang làm${lateCnt > 0 ? ` (⚠️ ${lateCnt} task trễ)` : ''}\n`;
  });

  // 3. Phân tích Chuyên cần Toàn nhóm
  res += `\n3. TÌNH TRẠNG CHUYÊN CẦN TOÀN NHÓM:\n`;
  const totalSessions = attendance.length;
  if (totalSessions === 0) {
    res += `(Chưa có dữ liệu điểm danh)\n`;
  } else {
    res += `- Tổng số buổi sinh hoạt/họp: ${totalSessions} buổi\n`;
    const lowAttendance = [];
    members.forEach(m => {
      const presentCount = attendance.filter(s => (s.present || []).includes(m.id)).length;
      const rate = Math.round((presentCount / totalSessions) * 100);
      if (rate < 75) {
        lowAttendance.push(`${m.fullName} (${rate}% - Tham gia ${presentCount}/${totalSessions} buổi)`);
      }
    });
    if (lowAttendance.length > 0) {
      res += `- ⚠️ Thành viên chuyên cần thấp (< 75%): ${lowAttendance.join(', ')}\n`;
    } else {
      res += `- 🟢 Tinh thần chuyên cần của toàn đội rất tốt (≥ 75%).\n`;
    }
  }

  // 4. Phân công SME (Chuyên gia Môn học)
  res += `\n4. BẢNG PHÂN CÔNG SME (CHỦ TRÌ MÔN HỌC):\n`;
  const smeList = Object.entries(smeMap);
  if (smeList.length > 0) {
    smeList.forEach(([subId, smeName]) => {
      const sub = subjectDatabase.find(s => s.id === subId);
      res += `   • ${sub ? sub.name : subId}: ${smeName}\n`;
    });
  } else {
    res += `(Chưa cấu hình SME môn học)\n`;
  }

  // 5. Bảng cống hiến & Báo cáo
  res += `\n5. ĐÓNG GÓP & BÁO CÁO:\n`;
  const topContributions = Object.entries(contributions)
    .map(([uid, pts]) => ({ name: members.find(m => m.id === uid)?.fullName || 'Ẩn danh', pts }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 5);
  res += `- Top điểm cống hiến: ${topContributions.map(c => `${c.name} (${c.pts}đ)`).join(', ')}\n`;
  const pendingReports = reports.filter(r => r.status === 'pending');
  res += `- Báo cáo: ${reports.length} báo cáo (Đang chờ duyệt: ${pendingReports.length})\n`;

  return res;
}

// ── BỘ TRI THỨC NGHIÊN CỨU & 4 MODULE TÁC CHIẾN ───────────────────────────
function buildResearchAndCopilotModulePrompt() {
  return `=== KHO TRI THỨC CHUYÊN SÂU & 4 MODULE TÁC CHIẾN (2X18 AUTONOMOUS COPILOT) ===

1. MODULE 1: HỌC THUẬT & BẮT LỖI TƯ DUY (Academic Diagnostics Engine)
- Nguồn tham chiếu: Boas (Toán lý), Griffiths (Điện từ), Montgomery (XSTK & DOE), Sze (Vật lý bán dẫn).
- Nguyên tắc chẩn đoán:
  * Khi thành viên đưa vào bài giải toán/lý: KHÔNG giải ngay từ đầu đến cuối một cách thụ động.
  * Rà soát từng dòng để chỉ ra "VẾT GÃY TƯ DUY" (First Principles):
    VD: "Bạn đang áp dụng định lý thặng dư nhưng điểm cực z = i nằm ngoài đường cong lấy tích phân C...",
    VD: "Bạn đang nhầm lẫn giữa kiểm định 1 phía và 2 phía trong bài toán của Montgomery...",
    VD: "Điều kiện biên từ trường H₁t - H₂t = K_f × n̂ chưa tính đến dòng mặt K_f...".
  * Dẫn dắt người học bằng câu hỏi gợi mở để tự sửa lỗi.

2. MODULE 2: PHÂN TÍCH QUY TRÌNH PHÒNG SẠCH (Cleanroom & Metrology Copilot)
- Hệ Sputtering Magnetron NEC/HUS:
  * Áp suất chân không nền (Base vacuum): BẮT BUỘC đạt < 5.0 × 10⁻⁶ Torr trước khi phún xạ.
  * Khí làm việc: Ar 99.999% (15-30 sccm), áp suất làm việc 3.0 - 8.0 mTorr.
  * Nguồn công suất: DC cho kim loại (Ti, Cu, Au, Al), RF 13.56 MHz cho điện môi/oxit (SiO₂, Al₂O₃, ZnO, ITO).
  * Chẩn đoán lỗi màng:
    + Màng bị đục/đen: Do chân không nền chưa sâu dẫn đến nhiễm O₂/H₂O trong buồng, hoặc Ar bị rò.
    + Màng bong tróc (Peeling): Ứng suất màng cao hoặc đế chưa tẩy siêu âm Acetone/IPA/Piranha đúng chuẩn.
    + Điện trở mặt cao: Công suất phún xạ quá thấp làm giảm động năng hạt đập vào đế, hoặc màng bị oxy hóa.
- Đo kiểm Metrology: 4-Point Probe (R_s = 4.532 V/I), Keithley I-V/C-V (đo tiếp xúc Ohmic, diode Schottky, dòng rò I_leakage).

3. MODULE 3: TÌNH BÁO KHOA HỌC & GIẢI PHẪU BÀI BÁO (Paper Dissection & SOTA Tracker)
- Bóc tách bài báo bán dẫn (IEEE TED, APL, Nature Electronics) thành "Fabrication Blueprint":
  * 1. Vật liệu & Đế (Substrate & Materials: GaN on Si, Sapphire, SiC, 2D MoS₂...).
  * 2. Công đoạn nút thắt (Critical Steps: Nhiệt độ ủ tiếp xúc Ohmic, công nghệ lắng đọng Gate High-k ALD, độ dày màng oxit...).
  * 3. Thông số linh kiện đo được (Metrics: I_on/I_off, độ hỗ dẫn g_m, điện áp đánh thủng V_br).
  * 4. Đánh giá khả năng tái lập tại Lab HUS vs TSRI Đài Loan.

4. MODULE 4: QUẢN TRỊ ĐỘI NGŨ & BẢN ĐỒ DU HỌC ĐÀI LOAN (Team Matrix & Pipeline Tracking)
- Ma trận 16 người:
  * Core 5: Hưng (Leader/System & Strategy), Long (Toán lý/Mô phỏng), Ngọc (Phòng sạch/Màng mỏng), Phúc (Đo lường/Metrology/SPC), Độ (Vật liệu/Bán dẫn).
  * 11 Thành viên: Hỗ trợ theo dõi GPA (mục tiêu ≥ 3.2), chứng chỉ ngoại ngữ IELTS ≥ 6.5 / TOCFL B1-B2.
- Học bổng Viện Bán Dẫn Đài Loan:
  * NYCU (ICST) - Viện Khoa học Bán dẫn Quốc tế (GSAT, màng mỏng, packaging, học bổng NYCU Elite 15k-25k NTD/tháng).
  * NTHU (CoSR) - Viện Bán dẫn Thanh Hoa (GaN/SiC công suất, TSMC partner).
  * NTU (GSAT) - Trường Công nghệ Tiên tiến Đài Đại.
  * TSRI - Trung tâm chế tạo và đo kiểm thử nghiệm vi mạch Đài Loan.`;
}

// ── HÀM CHÍNH: Chat Với AI (Hỗ trợ Dual-Model deepseek-v4-flash & deepseek-v4-pro) ──
export async function chatWithAI(userMessage, context, history = [], preferredModel = 'auto') {
  const { isCore, currentUser, myGradesEnriched, rawGrades, myTasks, smeMap } = context;
  const userName = currentUser?.fullName || 'bạn';
  const firstName = userName.split(' ').filter(Boolean).slice(-1)[0] || 'bạn';

  // 1. Tự động định tuyến mô hình thông minh (Model Routing)
  const selectedModel = classifyIntent(userMessage, preferredModel);

  const copilotResearchPrompt = buildResearchAndCopilotModulePrompt();
  let systemPrompt = '';

  if (isCore) {
    // ══════════════════════════════════════════════════════════════════════════
    // CHẾ ĐỘ 1: CORE / SUPER ADMIN (Trợ lý Tác chiến & Cố Vấn Chiến Lược Toàn Đoàn)
    // ══════════════════════════════════════════════════════════════════════════
    const coreReportText = formatCoreGroupReport(context);
    const personalGradesText = formatMemberGrades(myGradesEnriched, rawGrades, smeMap);
    const personalTasksText = formatMemberTasks(myTasks);

    systemPrompt = `Bạn là "2X18 Core Advisor" — Trợ lý Tác chiến Khoa học và Công nghệ Bán dẫn nội bộ của Ban Điều Hành nhóm 2X18 (Đại học Khoa học Tự nhiên, ĐHQGHN).

MÔ HÌNH ĐANG CHẠY: ${selectedModel} ${selectedModel === 'deepseek-v4-pro' ? '(Deep Reasoning CoT - Chuyên sâu Toán lý, Phòng sạch, Giải phẫu bài báo)' : '(High Speed - Tổng hợp, Quản trị, Lập lịch)'}

QUYỀN HẠN & VAI TRÒ CỦA BẠN:
- Bạn được trao quyền truy cập toàn bộ dữ liệu 16 thành viên nhóm 2X18 (Học lực, CPA, Task, Chuyên cần, Phân công SME, Quy trình lab phòng sạch, Kế hoạch học bổng Đài Loan).
- Người đang trao đổi với bạn là ${userName} (Ban Quản trị / Nhóm Core 2X18: Hưng, Long, Ngọc, Phúc, Độ).

${copilotResearchPrompt}

DỮ LIỆU ĐỘI NGŨ 2X18 HIỆN TẠI:
${coreReportText}

DỮ LIỆU CÁ NHÂN CỦA CORE (${userName}):
${personalGradesText}
${personalTasksText}

NGUYÊN TẮC GIAO TIẾP & TÁC CHIẾN (FIRST PRINCIPLES):
1. Không dùng các câu mở đầu rập khuôn thảo mai ("Chào bạn, tôi là AI..."). Đi thẳng vào trọng tâm vấn đề ngay từ câu đầu tiên.
2. Giải thích hiện tượng từ Nguyên lý thứ nhất (Vùng năng lượng, nhiệt động học màng mỏng, Maxwell, phân phối thống kê).
3. Sử dụng chính xác thuật ngữ chuyên ngành bán dẫn (Cleanroom, Sputtering, Base vacuum, RF power, Ohmic contact, High-k, TSV, Metrology, SPC, Yield).
4. Phân tích quản trị sắc bén: Chỉ rõ ai đang quá tải, ai đang hổng kiến thức môn nào, đề xuất SME tương ứng mở buổi phụ đạo, gợi ý lab Đài Loan (NYCU/NTHU/NTU) phù hợp hồ sơ.
5. Nếu ${userName} hỏi về cá nhân mình, hãy phân tích chi tiết dữ liệu học tập và công việc của ${firstName}.
6. Xưng "mình", gọi người dùng là "${firstName}" hoặc "Core ${firstName}". Trình bày súc tích, chuyên nghiệp, cấu trúc rõ ràng với icon phân loại 🔴 🟡 🟢.`;

  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // CHẾ ĐỘ 2: MEMBER THÔNG THƯỜNG (Cố Vấn Học Thuật & Phát Triển Cá Nhân)
    // ══════════════════════════════════════════════════════════════════════════
    const memberGradesText = formatMemberGrades(myGradesEnriched, rawGrades, smeMap);
    const memberTasksText = formatMemberTasks(myTasks);
    const { attendanceRate = 100, attendanceSummary = {}, vocabStats = {}, points = 0, upcomingEvents = [] } = context;

    systemPrompt = `Bạn là "2X18 Copilot" — Cố vấn Học thuật & Phát triển Cá nhân độc quyền của ${userName} tại nhóm 2X18 (Trường ĐHKHTN, ĐHQGHN).

MÔ HÌNH ĐANG CHẠY: ${selectedModel} ${selectedModel === 'deepseek-v4-pro' ? '(Deep Reasoning CoT - Phân tích Toán lý, Bắt lỗi tư duy, Phòng sạch)' : '(High Speed - Trả lời nhanh, Lập kế hoạch)'}

CHÍNH SÁCH BẢO MẬT DỮ LIỆU NGHIÊM NGẶT (STRICT PRIVACY):
- Bạn CHỈ ĐƯỢC PHÉP xem và phân tích dữ liệu của ${userName}.
- Bạn TUYỆT ĐỐI KHÔNG có quyền truy cập dữ liệu của các thành viên khác.
- Nếu người dùng hỏi về điểm số, task hay thông tin riêng tư của bạn khác, BẮT BUỘC TỪ CHỐI: "Vì chính sách bảo mật dữ liệu học tập của nhóm 2X18, mình chỉ có thể hỗ trợ và phân tích dữ liệu của riêng bạn thôi nhé!"

${copilotResearchPrompt}

DỮ LIỆU CÁ NHÂN CỦA ${userName}:
- Họ tên: ${userName} | MSSV: ${context.mssv || 'N/A'}
- Điểm cống hiến: ${points} điểm
- Chuyên cần: ${attendanceRate}% (${attendanceSummary.attended || 0}/${attendanceSummary.total || 0} buổi tham gia)
- Từ vựng: Đã thuộc ${vocabStats.learnedWords || 0} từ
- Sự kiện / Deadline nhóm: ${upcomingEvents.map(e => `${e.title} (${e.date})`).join(', ') || 'Không có'}

${memberGradesText}

${memberTasksText}

NGUYÊN TẮC CỐ VẤN HỌC THUẬT:
1. Không giải bài toán thụ động từ A-Z. Hãy rà soát từng dòng biến đổi để chỉ ra VẾT GÃY TƯ DUY và hướng dẫn theo Nguyên lý thứ nhất.
2. Công thức tính điểm HUS: Điểm HP = CC*0.2 + GK*0.2 + CK*0.6. Luôn tính ngược điểm CK cần đạt khi thành viên hỏi về mục tiêu điểm chữ.
3. Khi thành viên hỏi về quy trình phòng sạch (Sputtering, ALD, đo 4 mũi nhọn) hoặc bài báo, áp dụng chuẩn cẩm nang phòng sạch NEC/HUS.
4. Xưng "mình", gọi người dùng là "${firstName}". Đĩnh đạc, chuẩn xác, mang phong thái Trợ giảng cao cấp kiêm Kỹ sư Trưởng.`;
  }

  // Gọi AI với model được định tuyến
  const aiResult = await callAI(systemPrompt, userMessage, {
    temperature: selectedModel === 'deepseek-v4-pro' ? undefined : 0.5,
    history,
    model: selectedModel
  });

  return {
    text: aiResult.text || '',
    reasoning: aiResult.reasoning || '',
    modelUsed: aiResult.modelUsed || selectedModel
  };
}

// ── suggestTaskAssignment tối ưu với tri thức nhân sự ───────────────────────
export async function suggestTaskAssignment(taskDescription, members, existingTasks, smeMap = {}) {
  const memberInfo = members.map(m => {
    const memberTasks = existingTasks.filter(t => (t.userId === m.id || t.assignees?.includes(m.id)) && !t.done);
    const overdueTasks = memberTasks.filter(t => daysDiff(t.deadline) < 0);
    const smeSubjects = Object.entries(smeMap).filter(([, name]) => name === m.fullName).map(([subId]) => subId);

    return {
      id: m.id,
      name: m.fullName || 'N/A',
      role: m.role || 'member',
      currentTasksCount: memberTasks.length,
      overdueTasksCount: overdueTasks.length,
      smeSubjects: smeSubjects.join(', ') || 'Không',
      currentTasksList: memberTasks.map(t => t.task).slice(0, 3).join(', ') || 'Không có',
    };
  });

  const system = `Bạn là Trưởng nhóm Dự án (Project Manager) sắc bén của đội 2X18 Bán dẫn HUS.
Nhiệm vụ: Đề xuất người nhận task tối ưu dựa trên khối lượng việc, task quá hạn, và thế mạnh chuyên môn SME/Lab.
Luôn trả về JSON thuần tuý, không có markdown hay code fence.`;

  const user = `NHIỆM VỤ MỚI: "${taskDescription}"
TÌNH TRẠNG NHÂN SỰ VÀ KHỐI LƯỢNG:
${memberInfo.map((m, i) => `${i + 1}. ${m.name} (Role: ${m.role}) — ${m.currentTasksCount} task (${m.overdueTasksCount} task trễ). SME: ${m.smeSubjects}. Task gần đây: [${m.currentTasksList}]`).join('\n')}

Trả về JSON: { "suggestedAssignee": "Tên thành viên", "reason": "Lý do chi tiết dựa trên khối lượng và chuyên môn", "subtasks": ["bước 1", "bước 2"], "estimatedDays": 3, "priority": "high|medium|low" }`;

  try {
    const res = await callAI(system, user, { temperature: 0.4, responseMimeType: 'application/json', model: 'deepseek-v4-flash' });
    return safeJson(res, { suggestedAssignee: '', reason: 'Không thể phân tích.', subtasks: [], estimatedDays: 0, priority: 'medium' });
  } catch (err) {
    console.error('[suggestTaskAssignment]', err);
    return { suggestedAssignee: '', reason: 'Lỗi AI.', subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

// ── reviewReport ───────────────────────────────────────────────────────────
export async function reviewReport(reportContent, authorName) {
  const system = `Bạn là Cố vấn Đánh giá Báo cáo cấp cao của nhóm 2X18 Bán dẫn HUS.
Trả về JSON thuần tuý, không có markdown hay code fence.`;
  const user = `BÁO CÁO CỦA: ${authorName}\nNỘI DUNG: "${reportContent}"\nTrả về JSON: { "summary": ["điểm 1", "điểm 2"], "quality": "excellent|good|average|poor", "qualityLabel": "Xuất sắc|Tốt|Trung bình|Cần cải thiện", "feedback": "Nhận xét sắc bén, mang tính xây dựng theo chuẩn nghiên cứu bán dẫn", "isComplete": true }`;

  try {
    const res = await callAI(system, user, { temperature: 0.4, responseMimeType: 'application/json', model: 'deepseek-v4-flash' });
    return safeJson(res, { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false });
  } catch (err) {
    return { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false };
  }
}

// ── analyzeEarlyWarning ───────────────────────────────────────────────────
export async function analyzeEarlyWarning(members, attendance, tasks, allGrades = {}) {
  const memberStats = members.map(m => {
    const memberTasks = tasks.filter(t => t.userId === m.id || t.assignees?.includes(m.id));
    const doneTasks = memberTasks.filter(t => t.done).length;
    const overdueTasks = memberTasks.filter(t => !t.done && daysDiff(t.deadline) < 0).length;

    const presentCount = attendance.filter(s => (s.present || []).includes(m.id)).length;
    const attRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 100;

    const userGrades = allGrades[m.id] || {};
    const stats = calcGpaStats(userGrades);

    return {
      name: m.fullName,
      role: m.role,
      cpa: stats.cpa,
      failedCoursesCount: (stats.failed || []).length,
      attendanceRate: attRate,
      activeTasks: memberTasks.length - doneTasks,
      overdueTasks,
    };
  });

  const system = `Bạn là Giám đốc Đảm bảo Chất lượng & Cảnh báo Sớm (Early Warning Director) của 2X18.
Phân tích Radar toàn diện (Học lực, Chuyên cần, Khối lượng task).
Luôn trả về JSON thuần tuý, không có markdown.`;

  const user = `DỮ LIỆU ĐỘI NGŨ:
${JSON.stringify(memberStats, null, 2)}

Trả về JSON:
{
  "warnings": [
    { "type": "academic|attendance|workload", "name": "Tên thành viên", "level": "high|medium|low", "issue": "Mô tả vấn đề cụ thể", "action": "Giải pháp khắc phục ngay" }
  ],
  "overallHealth": "excellent|good|warning|critical",
  "suggestion": "Tóm tắt hành động ưu tiên số 1 cho ban điều hành"
}`;

  try {
    const res = await callAI(system, user, { temperature: 0.4, responseMimeType: 'application/json', model: 'deepseek-v4-flash' });
    return safeJson(res, { warnings: [], overallHealth: 'good', suggestion: '...' });
  } catch (err) {
    return { warnings: [], overallHealth: 'good', suggestion: 'Lỗi AI.' };
  }
}
