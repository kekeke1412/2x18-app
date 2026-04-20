// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── API Key Management ──────────────────────────────────────────────────────
let runtimeApiKey = null;

export function setApiKey(key) {
  runtimeApiKey = key;
}

export function getApiKey() {
  // Ưu tiên Key từ runtime (Firebase config), sau đó mới đến biến môi trường
  const key = runtimeApiKey || import.meta.env.VITE_GEMINI_API_KEY || "";
  return key.trim();
}

// ── Core AI Call (Gemini) ───────────────────────────────────────────────────
export async function callGemini(systemPrompt, userPrompt, { temperature = 0.7, history = [], responseMimeType = 'text/plain' } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Use gemini-1.5-flash for better stability and lower latency
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemPrompt
    });

    // Convert history to format: { role: 'user'|'model', parts: [{ text: '...' }] }
    const contents = [
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text || m.content || "" }]
      })),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 2000,
        responseMimeType
      }
    });

    const response = result.response;
    const text = response.text();

    if (!text) {
      console.warn('[callGemini] Empty response text');
      return '';
    }
    return text;
  } catch (err) {
    console.error('[Gemini API Error Detail]:', {
      message: err.message,
      status: err.status,
      name: err.name
    });
    throw err;
  }
}

// ── Safe JSON parse helper ─────────────────────────────────────────────────
export function safeJson(text, fallback) {
  if (!text) return fallback;
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch {
    try {
      // 2. Extract JSON between brackets/braces if there's surrounding text
      const match = text.match(/[\{\[]([\s\S]*)[\}\]]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {
      console.warn('[safeJson] Failed to parse:', text.slice(0, 100));
    }
    return fallback;
  }
}

// ── 1. Smart Task: Gợi ý phân công & chia nhỏ task ────────────────────────
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

  const user = `NHIỆM VỤ MỚI CẦN XỬ LÝ:
"${taskDescription}"

TÌNH TRẠNG NHÂN SỰ HIỆN TẠI:
${memberInfo.map((m, i) => `${i + 1}. ${m.name} (Role: ${m.role}) — Đang có ${m.currentTasksCount} task chưa xong. Các task đang làm: ${m.currentTasksList}`).join('\n')}

Trả về JSON đúng cấu trúc sau:
{
  "suggestedAssignee": "Tên người được chọn",
  "reason": "Lý do chọn người này (2 câu)",
  "subtasks": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."],
  "estimatedDays": 3,
  "priority": "high"
}`;

  try {
    const text = await callGemini(system, user, { temperature: 0.4 });
    return safeJson(text, {
      suggestedAssignee: '', reason: 'Không thể phân tích.', subtasks: [], estimatedDays: 0, priority: 'medium',
    });
  } catch (err) {
    console.error('[suggestTaskAssignment]', err);
    return { suggestedAssignee: '', reason: 'Lỗi khi gọi AI.', subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

// ── 2. AI Review Báo cáo ──────────────────────────────────────────────────
export async function reviewReport(reportContent, authorName) {
  const system = `Bạn là Cố vấn cấp cao (Senior Advisor) của dự án 2X18.
Luôn trả về JSON thuần tuý, không có markdown hay code fence.`;

  const user = `BÁO CÁO CỦA: ${authorName}
NỘI DUNG BÁO CÁO:
"${reportContent}"

Tiêu chí: rõ ràng việc đã làm / chưa làm, có nêu khó khăn, kế hoạch tuần tới khả thi.

Trả về JSON:
{
  "summary": ["Ý 1", "Ý 2", "Ý 3"],
  "quality": "excellent|good|average|poor",
  "qualityLabel": "Xuất sắc|Tốt|Cần cải thiện|Sơ sài",
  "feedback": "Nhận xét xây dựng (tối đa 3 câu)",
  "isComplete": true
}`;

  try {
    const text = await callGemini(system, user, { temperature: 0.3 });
    return safeJson(text, {
      summary: ['Lỗi đánh giá AI'], quality: 'average', qualityLabel: 'Không xác định',
      feedback: 'Không thể phân tích lúc này.', isComplete: false,
    });
  } catch (err) {
    console.error('[reviewReport]', err);
    return { summary: ['Lỗi AI'], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Lỗi khi gọi AI.', isComplete: false };
  }
}

// ── 3. AI Chatbot (hỗ trợ lịch sử hội thoại) ─────────────────────────────
export async function chatWithAI(userMessage, context, history = []) {
  const { 
    userName, userRole, mssv, points, 
    upcomingEvents, pendingTasks, completedTasksCount,
    attendanceRate, vocabStats, personalInfo 
  } = context;

  const system = `Bạn là "2X18 Bot", trợ lý ảo cá nhân hóa cao cho thành viên nhóm 2X18.
Dữ liệu dưới đây là bí mật của người dùng hiện tại, hãy dùng nó để trả lời chính xác.

THÔNG TIN CHI TIẾT NGƯỜI DÙNG:
- Họ tên: ${userName} | MSSV: ${mssv || 'N/A'}
- Vai trò: ${userRole} | Điểm cống hiến: ${points}
- Thông tin khác: Giới tính ${personalInfo?.gender}, Sinh ngày ${personalInfo?.dob}, Đến từ ${personalInfo?.pob}.
- Lịch trình: ${upcomingEvents?.length ? upcomingEvents.map(e => `[${e.date}] ${e.title}`).join(', ') : 'Không có sự kiện mới'}
- Học tập: Đã học ${vocabStats?.learnedWords} từ vựng trong ${vocabStats?.totalSets} học phần.
- Công việc: Còn ${pendingTasks?.length} task chưa xong (${pendingTasks?.map(t => t.task).join(', ')}). Đã hoàn thành ${completedTasksCount} task.
- Chuyên cần: Tỉ lệ tham gia họp nhóm đạt ${attendanceRate}%.

HƯỚNG DẪN:
1. Bạn BIẾT TUỐT về người dùng này dựa trên dữ liệu trên. Nếu họ hỏi về bản thân, công việc, hay thành tích, hãy trả lời dựa trên số liệu thật.
2. Xưng "mình", gọi người dùng bằng tên. Phong cách: thông minh, dí dỏm, hỗ trợ.
3. Nếu dữ liệu nào bị thiếu (N/A), hãy nhắc người dùng cập nhật hồ sơ để mình phục vụ tốt hơn.
4. Trả lời ngắn gọn, có emoji.`;

  try {
    return await callGemini(system, userMessage, {
      temperature: 0.8,
      history: history,
    });
  } catch (err) {
    console.error('[chatWithAI]', err);
    throw err;
  }
}

// ── 4. AI Cảnh báo sớm ───────────────────────────────────────────────────
export async function analyzeEarlyWarning(members, attendance, tasks) {
  const memberStats = members.map(m => {
    const memberTasks = tasks.filter(t => t.userId === m.id);
    const doneTasks = memberTasks.filter(t => t.done).length;
    const totalTasks = memberTasks.length;
    const memberAttendance = attendance.reduce((cnt, sess) => {
      const present = Array.isArray(sess.present) ? sess.present : [];
      return cnt + (present.includes(m.id) ? 1 : 0);
    }, 0);
    return {
      name: m.fullName || 'N/A',
      role: m.role,
      attendanceRate: attendance.length ? Math.round((memberAttendance / attendance.length) * 100) : 100,
      taskCompletion: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 100,
      pendingTasks: totalTasks - doneTasks,
    };
  });

  const system = `Bạn là Hệ thống Radar của 2X18, phân tích hoạt động thành viên.
Luôn trả về JSON thuần tuý, không markdown.`;

  const user = `DỮ LIỆU THÀNH VIÊN:
${memberStats.map(m => `- ${m.name} (${m.role}): Điểm danh ${m.attendanceRate}%, Task ${m.taskCompletion}% (còn ${m.pendingTasks} task)`).join('\n')}

Trả về JSON:
{
  "warnings": [
    { "memberName": "...", "level": "high|medium|low", "reason": "..." }
  ],
  "overallHealth": "good|warning|critical",
  "suggestion": "Lời khuyên cho Core team (2 câu)"
}`;

  try {
    const text = await callGemini(system, user, { temperature: 0.2, responseMimeType: 'application/json' });
    return safeJson(text, { warnings: [], overallHealth: 'good', suggestion: 'Không thể phân tích lúc này.' });
  } catch (err) {
    console.error('[analyzeEarlyWarning]', err);
    return { warnings: [], overallHealth: 'good', suggestion: 'Lỗi khi gọi AI.' };
  }
}
