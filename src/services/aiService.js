// src/services/aiService.js

/**
 * Hàm điều hướng AI thông minh: 
 * 1. Ưu tiên Gemini Key cá nhân (nếu có trong currentUser)
 * 2. Dự phòng bằng DeepSeek hệ thống (qua Proxy)
 */
export async function callAI(systemPrompt, userPrompt, options = {}) {
  const { currentUser, temperature = 0.7, history = [], responseMimeType = 'text/plain' } = options;
  
  // TẦNG 1: Ưu tiên Gemini cá nhân
  if (currentUser?.geminiKey && currentUser.geminiKey.trim() !== "") {
    try {
      return await callGeminiDirect(currentUser.geminiKey, systemPrompt, userPrompt, { temperature, history, responseMimeType });
    } catch (err) {
      console.warn('[AI] Personal Gemini Key failed, falling back to System DeepSeek...', err.message);
      // Nếu lỗi do Key (401, 403) thì mới nhảy sang dự phòng, hoặc nếu bạn muốn nhảy sang luôn khi có bất kỳ lỗi nào
    }
  }

  // TẦNG 2: Dự phòng DeepSeek Hệ thống (Gọi qua Proxy của Vercel)
  return await callDeepSeekProxy(systemPrompt, userPrompt, { temperature, history, responseMimeType });
}

/**
 * Gọi trực tiếp Gemini API bằng REST (không dùng SDK để dễ truyền Key động)
 */
async function callGeminiDirect(apiKey, systemPrompt, userPrompt, { temperature, history, responseMimeType }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  const contents = [
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text || m.content || "" }]
    })),
    { role: 'user', parts: [{ text: userPrompt }] }
  ];

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature,
      maxOutputTokens: 2000,
      responseMimeType: responseMimeType === 'application/json' ? 'application/json' : 'text/plain'
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Gemini Error');
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

export async function suggestTaskAssignment(taskDescription, members, existingTasks, currentUser) {
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
    const text = await callAI(system, user, { currentUser, temperature: 0.4, responseMimeType: 'application/json' });
    return safeJson(text, { suggestedAssignee: '', reason: 'Không thể phân tích.', subtasks: [], estimatedDays: 0, priority: 'medium' });
  } catch (err) {
    console.error('[suggestTaskAssignment]', err);
    return { suggestedAssignee: '', reason: 'Lỗi AI.', subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

export async function reviewReport(reportContent, authorName, currentUser) {
  const system = `Bạn là Cố vấn cấp cao (Senior Advisor) của dự án 2X18. Trả về JSON thuần.`;
  const user = `BÁO CÁO CỦA: ${authorName}\nNỘI DUNG: "${reportContent}"\nTrả về JSON: { "summary": [], "quality": "good", "qualityLabel": "Tốt", "feedback": "...", "isComplete": true }`;

  try {
    const text = await callAI(system, user, { currentUser, temperature: 0.3, responseMimeType: 'application/json' });
    return safeJson(text, { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false });
  } catch (err) {
    return { summary: [], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi AI.', isComplete: false };
  }
}

export async function chatWithAI(userMessage, context, history = [], currentUser) {
  const { userName, mssv, userRole, points, attendanceRate, vocabStats, pendingTasks } = context;

  const system = `Bạn là "2X18 Bot", Siêu cố vấn học tập của nhóm 2X18.
DỮ LIỆU: Tên ${userName}, MSSV ${mssv}, Vai trò ${userRole}, Điểm ${points}, Chuyên cần ${attendanceRate}%, Đã học ${vocabStats?.learnedWords} từ vựng.
Tasks chưa xong: ${pendingTasks?.length || 0}.
Hãy trả lời thông minh, dí dỏm, xưng "mình", gọi người dùng là ${userName?.split(' ').pop()}.`;

  return await callAI(system, userMessage, { currentUser, temperature: 0.8, history });
}

export async function analyzeEarlyWarning(members, attendance, tasks, currentUser) {
  const memberStats = members.map(m => {
    const memberTasks = tasks.filter(t => t.userId === m.id);
    const doneTasks = memberTasks.filter(t => t.done).length;
    return { name: m.fullName, attendanceRate: 100, taskCompletion: memberTasks.length ? Math.round((doneTasks/memberTasks.length)*100) : 100 };
  });

  const system = `Phân tích Radar 2X18. Trả về JSON.`;
  const user = `DỮ LIỆU: ${JSON.stringify(memberStats)}\nJSON: { "warnings": [], "overallHealth": "good", "suggestion": "..." }`;

  try {
    const text = await callAI(system, user, { currentUser, temperature: 0.2, responseMimeType: 'application/json' });
    return safeJson(text, { warnings: [], overallHealth: 'good', suggestion: '...' });
  } catch (err) {
    return { warnings: [], overallHealth: 'good', suggestion: 'Lỗi AI.' };
  }
}
