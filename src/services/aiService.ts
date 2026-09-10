// @ts-nocheck
// src/services/aiService.ts
import { subjectDatabase, calculateHe10, getHe4 } from '../data';
import { getLetterGrade, calcGpaStats } from '../utils/gradeUtils';

/**
 * Gọi AI DeepSeek thông qua Vercel Serverless Function Proxy.
 * Thiết lập default temperature = 0.5 để đảm bảo khả năng tính toán chuẩn xác,
 * phân tích thực dụng và không bị ảo giác số liệu.
 */
export async function callAI(systemPrompt, userPrompt, options = {}) {
  const { temperature = 0.5, history = [], responseMimeType = 'text/plain' } = options;
  return await callDeepSeekProxy(systemPrompt, userPrompt, { temperature, history, responseMimeType });
}

async function callDeepSeekProxy(systemPrompt, userPrompt, { temperature, history, responseMimeType }) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      temperature,
      history,
      responseMimeType
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'DeepSeek Proxy Error');
  return data.text;
}

// ── Safe JSON parse helper ─────────────────────────────────────────────────
export function safeJson(text, fallback) {
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
// Công thức HUS: Điểm HP = CC * 0.2 + GK * 0.2 + CK * 0.6
// => CK = (Mục_tiêu - CC * 0.2 - GK * 0.2) / 0.6
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

    // Đếm các môn có điểm thấp trong nhóm
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

  // Sắp xếp CPA giảm dần
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
    res += `- 🟢 Tuyệt vời! Hiện tại không có task nào bị quá hạn.\n`;
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
      res += `- 🟢 Tinh thần chuyên cần của toàn đội rất tốt, tất cả đều đạt trên 75%.\n`;
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

// ── HÀM CHÍNH: Chat Với AI (Hỗ trợ 2 Chế độ Core & Member) ──────────────────
export async function chatWithAI(userMessage, context, history = []) {
  const { isCore, currentUser, myGradesEnriched, rawGrades, myTasks, smeMap } = context;
  const userName = currentUser?.fullName || 'bạn';
  const firstName = userName.split(' ').filter(Boolean).slice(-1)[0] || 'bạn';

  let systemPrompt = '';

  if (isCore) {
    // ══════════════════════════════════════════════════════════════════════════
    // CHẾ ĐỘ 1: CORE / SUPER ADMIN (Cố Vấn Chiến Lược & Quản Trị Toàn Nhóm)
    // ══════════════════════════════════════════════════════════════════════════
    const coreReportText = formatCoreGroupReport(context);
    const personalGradesText = formatMemberGrades(myGradesEnriched, rawGrades, smeMap);
    const personalTasksText = formatMemberTasks(myTasks);

    systemPrompt = `Bạn là "2X18 Core Bot" — Cố vấn Chiến lược & Quản trị Dự án Cấp cao của Ban Điều Hành nhóm 2X18.

QUYỀN HẠN & PHẠM VI DỮ LIỆU CỦA BẠN:
- Bạn được trao QUYỀN TRUY CẬP ĐẦY ĐỦ toàn bộ dữ liệu của tất cả thành viên trong nhóm 2X18 (Bảng điểm, CPA, môn nguy cơ, khối lượng task, chuyên cần, cống hiến, phân công SME).
- Người đang trò chuyện với bạn là ${userName} (Ban Quản trị / Core Team).

DỮ LIỆU TOÀN ĐOÀN 2X18:
${coreReportText}

DỮ LIỆU CÁ NHÂN CỦA CORE (${userName}):
${personalGradesText}
${personalTasksText}

QUY TẮC CỐ VẤN THỰC CHIẾN (PRAGMATIC & ACTIONABLE ADVICE):
1. Không nói lý thuyết suông, không đưa ra lời khuyên chung chung. Luôn dựa trên SỐ LIỆU THỰC TẾ và TÊN CỤ THỂ của các thành viên.
2. Áp dụng khung phân tích 3 tầng:
   - 📌 Thực trạng dữ liệu: Trích dẫn chính xác con số (CPA, số task quá hạn, chuyên cần %).
   - ⚠️ Điểm nghẽn & Rủi ro:
     * Cảnh báo học tập: Chỉ ra thành viên có CPA thấp hoặc nợ môn F/D, các môn học "tử thần" cả nhóm đang bị đuối.
     * Cảnh báo công việc: Thành viên đang bị quá tải task (>3 task), các task quá hạn cần giải quyết.
     * Cảnh báo gắn kết: Thành viên vắng họp nhiều.
   - 🎯 Đề xuất hành động cụ thể:
     * Gợi ý phân công lại task từ người bận sang người rảnh.
     * Đề xuất SME tương ứng mở buổi ôn tập cấp tốc trước kỳ thi.
     * Kế hoạch hành động từng bước (Step-by-step).
3. Nếu ${userName} hỏi về kết quả học tập hoặc công việc của chính cá nhân mình, hãy phân tích sâu sắc dữ liệu cá nhân của ${firstName} theo công thức tính điểm và hạn task.
4. Xưng "mình", gọi người dùng là "${firstName}" hoặc "Core ${firstName}". Trả lời tự tin, sắc sảo, ngắn gọn, có cấu trúc rõ ràng (sử dụng gạch đầu dòng, icon phân loại 🔴 🟡 🟢).`;

  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // CHẾ ĐỘ 2: MEMBER THÔNG THƯỜNG (Cố Vấn Học Tập & Phát Triển Cá Nhân)
    // ══════════════════════════════════════════════════════════════════════════
    const memberGradesText = formatMemberGrades(myGradesEnriched, rawGrades, smeMap);
    const memberTasksText = formatMemberTasks(myTasks);
    const { attendanceRate = 100, attendanceSummary = {}, vocabStats = {}, points = 0, upcomingEvents = [] } = context;

    systemPrompt = `Bạn là "2X18 Bot" — Cố vấn Học tập & Phát triển Cá nhân độc quyền của ${userName} tại nhóm 2X18.

QUY ĐỊNH BẢO MẬT DỮ LIỆU NGHIÊM NGẶT (STRICT PRIVACY POLICY):
- Bạn CHỈ ĐƯỢC PHÉP xem và phân tích dữ liệu của ${userName}.
- Bạn TUYỆT ĐỐI KHÔNG có quyền truy cập bảng điểm, công việc hay dữ liệu cá nhân của các thành viên khác.
- Nếu ${userName} hỏi về điểm số, task hay thông tin riêng tư của bạn khác trong nhóm, bạn BẮT BUỘC PHẢI LỊCH SỰ TỪ CHỐI: "Vì chính sách bảo mật thông tin học tập cá nhân của nhóm 2X18, mình chỉ có thể phân tích và hỗ trợ dữ liệu của riêng bạn thôi nhé!"

DỮ LIỆU CÁ NHÂN CỦA ${userName}:
- Họ tên: ${userName} | MSSV: ${context.mssv || 'N/A'}
- Điểm cống hiến: ${points} điểm
- Chuyên cần: ${attendanceRate}% (${attendanceSummary.attended || 0}/${attendanceSummary.total || 0} buổi tham gia)
- Từ vựng: Đã thuộc ${vocabStats.learnedWords || 0} từ
- Sự kiện / Deadline nhóm sắp tới: ${upcomingEvents.map(e => `${e.title} (${e.date})`).join(', ') || 'Không có'}

${memberGradesText}

${memberTasksText}

QUY TẮC CỐ VẤN THỰC CHIẾN (PRAGMATIC & ACTIONABLE ADVICE):
1. Tuyệt đối không trả lời sáo rỗng hoặc lý thuyết chung chung ("bạn hãy cố gắng học tập", "hãy quản lý thời gian"). Luôn nói bằng CON SỐ CỤ THỂ từ bảng điểm và danh sách task.
2. Công thức tính điểm chuẩn HUS/VNU:
   - Điểm HP Hệ 10 = CC * 0.2 + GK * 0.2 + CK * 0.6
   - Thang điểm: A+ (≥9.0), A (≥8.5), B+ (≥8.0), B (≥7.0), C+ (≥6.5), C (≥5.5), D+ (≥5.0), D (≥4.0 - Điểm sàn qua môn), F (<4.0 - Trượt môn).
3. TÍNH TOÁN NGƯỢC ĐIỂM THI CUỐI KỲ: Khi người dùng hỏi về ôn thi hoặc cải thiện điểm, hãy tính rõ ràng điểm CK cần đạt để lấy điểm B, B+, A hoặc an toàn qua môn D. Nếu môn nào khó, hãy chỉ ra bạn SME phụ trách môn đó để người dùng chủ động liên hệ nhờ hỗ trợ.
4. CẢNH BÁO TASK & TIẾN ĐỘ: Chỉ rõ task nào đang 🔴 QUÁ HẠN cần làm xong ngay lập tức hôm nay.
5. Cấu trúc câu trả lời:
   - 📌 Đánh giá thực trạng (Trích dẫn số liệu điểm/task)
   - ⚠️ Rủi ro cần phòng tránh
   - 🎯 Kế hoạch hành động cụ thể (Actionable steps)
6. Xưng "mình", gọi người dùng là "${firstName}". Giọng điệu ấm áp, thông minh, thẳng thắn, luôn thúc đẩy hành động.`;
  }

  return await callAI(systemPrompt, userMessage, { temperature: 0.5, history });
}

// ── Cập nhật suggestTaskAssignment tối ưu ───────────────────────────────────
export async function suggestTaskAssignment(taskDescription, members, existingTasks, smeMap = {}) {
  const memberInfo = members.map(m => {
    const memberTasks = existingTasks.filter(t => (t.userId === m.id || t.assignees?.includes(m.id)) && !t.done);
    const overdueTasks = memberTasks.filter(t => daysDiff(t.deadline) < 0);
    // Xem m có là SME môn nào không
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

  const system = `Bạn là Trưởng nhóm Dự án (Project Manager) cực kỳ sắc bén của đội 2X18.
Nhiệm vụ: Đề xuất người nhận task tối ưu dựa trên khối lượng việc hiện tại, số task quá hạn, và thế mạnh chuyên môn SME.
Luôn trả về JSON thuần tuý, không có markdown hay code fence.`;

  const user = `NHIỆM VỤ MỚI CẦN XỬ LÝ: "${taskDescription}"
TÌNH TRẠNG NHÂN SỰ VÀ KHỐI LƯỢNG HIỆN TẠI:
${memberInfo.map((m, i) => `${i + 1}. ${m.name} (Role: ${m.role}) — Đang có ${m.currentTasksCount} task (${m.overdueTasksCount} task trễ). SME: ${m.smeSubjects}. Task gần đây: [${m.currentTasksList}]`).join('\n')}

Trả về JSON: { "suggestedAssignee": "Tên thành viên", "reason": "Lý do chi tiết dựa trên khối lượng và chuyên môn", "subtasks": ["bước 1", "bước 2"], "estimatedDays": 3, "priority": "high|medium|low" }`;

  try {
    const text = await callAI(system, user, { temperature: 0.4, responseMimeType: 'application/json' });
    return safeJson(text, { suggestedAssignee: '', reason: 'Không thể phân tích.', subtasks: [], estimatedDays: 0, priority: 'medium' });
  } catch (err) {
    console.error('[suggestTaskAssignment]', err);
    return { suggestedAssignee: '', reason: 'Lỗi AI.', subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

// ── Cập nhật reviewReport ──────────────────────────────────────────────────
export async function reviewReport(reportContent, authorName) {
  const system = `Bạn là Cố vấn Đánh giá Báo cáo cấp cao của nhóm 2X18.
Trả về JSON thuần tuý, không có markdown hay code fence.`;
  const user = `BÁO CÁO CỦA: ${authorName}\nNỘI DUNG: "${reportContent}"\nTrả về JSON: { "summary": ["điểm 1", "điểm 2"], "quality": "excellent|good|average|poor", "qualityLabel": "Xuất sắc|Tốt|Trung bình|Cần cải thiện", "feedback": "Nhận xét sắc bén, mang tính xây dựng", "isComplete": true }`;

  try {
    const text = await callAI(system, user, { temperature: 0.4, responseMimeType: 'application/json' });
    return safeJson(text, { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false });
  } catch (err) {
    return { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false };
  }
}

// ── Cập nhật analyzeEarlyWarning toàn diện ──────────────────────────────────
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
    const text = await callAI(system, user, { temperature: 0.4, responseMimeType: 'application/json' });
    return safeJson(text, { warnings: [], overallHealth: 'good', suggestion: '...' });
  } catch (err) {
    return { warnings: [], overallHealth: 'good', suggestion: 'Lỗi AI.' };
  }
}
