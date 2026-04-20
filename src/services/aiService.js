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
    attendanceRate, vocabStats, personalInfo,
    detailedGrades, allDocuments 
  } = context;

  const system = `Bạn là "2X18 Bot", Siêu cố vấn học tập của nhóm 2X18.
Bạn có quyền truy cập vào CƠ SỞ DỮ LIỆU TOÀN DIỆN của người dùng hiện tại.

DỮ LIỆU HỌC TẬP CHI TIẾT:
- Bảng điểm (Môn học, điểm, trạng thái): ${JSON.stringify(detailedGrades || {})}
- Kho tài liệu (Metadata): ${JSON.stringify(allDocuments || {})}
- Chuyên cần & Hoạt động: Tỉ lệ đi họp ${attendanceRate}%, Điểm cống hiến ${points}.
- Thông tin cá nhân: ${userName}, MSSV: ${mssv}, Vai trò: ${userRole}.
- Tiến độ từ vựng: Đã học ${vocabStats?.learnedWords} từ.

NHIỆM VỤ CỦA BẠN:
1. PHÂN TÍCH BẢNG ĐIỂM: Nếu người dùng hỏi về điểm số, hãy liệt kê dưới dạng BẢNG (Markdown table). Nhận xét môn nào cao, môn nào thấp.
2. TƯ VẤN TÀI LIỆU: Dựa trên kho tài liệu, hãy chỉ đích danh tài liệu (Slide, Đề thi...) mà người dùng nên đọc cho từng môn nếu họ cần giúp đỡ.
3. QUẢN LÝ CÔNG VIỆC: Nhắc nhở về ${pendingTasks?.length} task chưa xong và các sự kiện sắp tới.
4. PHONG CÁCH: Thông minh, cực kỳ chuyên nghiệp nhưng vẫn dí dỏm. Xưng "mình", gọi "bạn" (hoặc tên). 
5. TRỰC QUAN: Luôn sử dụng Markdown (Bảng, In đậm, Danh sách) để trình bày số liệu một cách chuẩn nhất.`;

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
