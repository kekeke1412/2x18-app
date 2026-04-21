// src/services/aiService.js

export async function callAI(systemPrompt, userPrompt, options = {}) {
  const { temperature = 1.3, history = [], responseMimeType = 'text/plain' } = options;
  
  // Chỉ sử dụng DeepSeek Hệ thống (Gọi qua Proxy của Vercel)
  return await callDeepSeekProxy(systemPrompt, userPrompt, { temperature, history, responseMimeType });
}

/**
 * Gọi DeepSeek thông qua Vercel Proxy để bảo mật System Key
 */
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

// ── Cập nhật các hàm nghiệp vụ để dùng callAI ──────────────────────────────

export async function suggestTaskAssignment(taskDescription, members, existingTasks) {
  const memberInfo = members.map(m => {
    const memberTasks = existingTasks.filter(t => t.userId === m.id && !t.done);
    return {
      name: m.fullName || 'N/A',
      role: m.role || 'member',
      currentTasksCount: memberTasks.length,
      currentTasksList: memberTasks.map(t => t.task).slice(0, 3).join(', ') || 'Không có',
    };
  });

  const system = `Bạn là Trưởng nhóm dự án (Project Manager) cực kỳ sắc bén của đội 2X18.
Luôn trả về JSON thuần tuý, không có markdown hay code fence.`;

  const user = `NHIỆM VỤ MỚI CẦN XỬ LÝ: "${taskDescription}"
TÌNH TRẠNG NHÂN SỰ HIỆN TẠI:
${memberInfo.map((m, i) => `${i + 1}. ${m.name} (Role: ${m.role}) — Đang có ${m.currentTasksCount} task chưa xong.`).join('\n')}

Trả về JSON: { "suggestedAssignee": "...", "reason": "...", "subtasks": [], "estimatedDays": 3, "priority": "high" }`;

  try {
    const text = await callAI(system, user, { temperature: 1.0, responseMimeType: 'application/json' });
    return safeJson(text, { suggestedAssignee: '', reason: 'Không thể phân tích.', subtasks: [], estimatedDays: 0, priority: 'medium' });
  } catch (err) {
    console.error('[suggestTaskAssignment]', err);
    return { suggestedAssignee: '', reason: 'Lỗi AI.', subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

export async function reviewReport(reportContent, authorName) {
  const system = `Bạn là Cố vấn cấp cao (Senior Advisor) của dự án 2X18. Trả về JSON thuần.`;
  const user = `BÁO CÁO CỦA: ${authorName}\nNỘI DUNG: "${reportContent}"\nTrả về JSON: { "summary": [], "quality": "good", "qualityLabel": "Tốt", "feedback": "...", "isComplete": true }`;

  try {
    const text = await callAI(system, user, { temperature: 1.0, responseMimeType: 'application/json' });
    return safeJson(text, { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false });
  } catch (err) {
    return { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false };
  }
}

export async function chatWithAI(userMessage, context, history = []) {
  const { userName, mssv, userRole, points, attendanceRate, vocabStats, pendingTasks, detailedGrades } = context;

  // Format grades for AI to read easily
  const gradesText = detailedGrades && detailedGrades.length > 0
    ? detailedGrades
        .map(g => `- ${g.subjectName} (${g.code}): [Trạng thái: ${g.status}] | CC:${g.cc || 0}, GK:${g.gk || 0}, CK:${g.ck || 0}. (Số tín chỉ: ${g.credits})`)
        .join('\n')
    : "Chưa có dữ liệu điểm.";

  const system = `Bạn là "2X18 Bot", Siêu cố vấn học tập của nhóm 2X18.
DỮ LIỆU CÁ NHÂN:
- Tên: ${userName}
- MSSV: ${mssv}
- Điểm cống hiến: ${points}
- Chuyên cần: ${attendanceRate}%
- Từ vựng: Đã học ${vocabStats?.learnedWords} từ.
- Task chưa xong: ${pendingTasks?.length || 0}.

BẢNG ĐIỂM CHI TIẾT:
${gradesText}

Hãy trả lời thông minh, dí dỏm, xưng "mình", gọi người dùng là ${userName?.split(' ').pop()}.
Khi người dùng hỏi về tình hình học tập hoặc điểm số, hãy dựa vào BẢNG ĐIỂM CHI TIẾT để nhận xét và đưa ra lời khuyên (khen ngợi nếu điểm cao, động viên nếu điểm thấp).`;

  return await callAI(system, userMessage, { temperature: 1.3, history });
}

export async function analyzeEarlyWarning(members, attendance, tasks) {
  const memberStats = members.map(m => {
    const memberTasks = tasks.filter(t => t.userId === m.id);
    const doneTasks = memberTasks.filter(t => t.done).length;
    return { name: m.fullName, attendanceRate: 100, taskCompletion: memberTasks.length ? Math.round((doneTasks / memberTasks.length) * 100) : 100 };
  });

  const system = `Phân tích Radar 2X18. Trả về JSON.`;
  const user = `DỮ LIỆU: ${JSON.stringify(memberStats)}\nJSON: { "warnings": [], "overallHealth": "good", "suggestion": "..." }`;

  try {
    const text = await callAI(system, user, { temperature: 1.0, responseMimeType: 'application/json' });
    return safeJson(text, { warnings: [], overallHealth: 'good', suggestion: '...' });
  } catch (err) {
    return { warnings: [], overallHealth: 'good', suggestion: 'Lỗi AI.' };
  }
}
