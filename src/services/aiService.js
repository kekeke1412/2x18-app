// src/services/aiService.js
// ── Gemini AI Service for 2X18 ─────────────────────────────────────────────
import { GoogleGenAI } from '@google/genai';

const STORAGE_KEY = '2x18_gemini_api_key';
const HARDCODED_KEY = 'AIzaSyApiaUHXc3zz8x0yymJL5PyptCWAYV_mzg';

// ── API Key Management ─────────────────────────────────────────────────────
export const getApiKey = () => localStorage.getItem(STORAGE_KEY) || HARDCODED_KEY;
export const setApiKey = (key) => localStorage.setItem(STORAGE_KEY, key);
export const removeApiKey = () => localStorage.removeItem(STORAGE_KEY);

// ── Core AI Call ────────────────────────────────────────────────────────────
async function callGemini(prompt, { maxTokens = 2048, temperature = 0.7 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  return response.text;
}

// ── 1. Smart Task: Gợi ý phân công & chia nhỏ task ────────────────────────
export async function suggestTaskAssignment(taskDescription, members, existingTasks) {
  const memberInfo = members.map(m => ({
    name: m.fullName || 'N/A',
    role: m.role || 'member',
    currentTasks: existingTasks.filter(t => t.userId === m.id && !t.done).length,
  }));

  const prompt = `Bạn là trợ lý quản lý nhóm 2X18 (nhóm sinh viên đại học).

NHIỆM VỤ MỚI CẦN PHÂN CÔNG:
"${taskDescription}"

DANH SÁCH THÀNH VIÊN (kèm số task đang làm):
${memberInfo.map((m, i) => `${i + 1}. ${m.name} (${m.role}) — đang có ${m.currentTasks} task chưa hoàn thành`).join('\n')}

Hãy trả lời bằng tiếng Việt theo JSON format:
{
  "suggestedAssignee": "Tên người phù hợp nhất",
  "reason": "Lý do ngắn gọn",
  "subtasks": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."],
  "estimatedDays": 3,
  "priority": "high/medium/low"
}

Chỉ trả về JSON, không thêm markdown hay giải thích.`;

  const text = await callGemini(prompt, { temperature: 0.5 });
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { suggestedAssignee: '', reason: text, subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

// ── 2. AI Review Báo cáo ──────────────────────────────────────────────────
export async function reviewReport(reportContent, authorName) {
  const prompt = `Bạn là trợ lý kiểm duyệt báo cáo tuần cho nhóm sinh viên 2X18.

BÁO CÁO CỦA: ${authorName}
NỘI DUNG:
"${reportContent}"

Hãy đánh giá báo cáo này và trả lời bằng tiếng Việt theo JSON format:
{
  "summary": ["Điểm chính 1", "Điểm chính 2", "Điểm chính 3"],
  "quality": "excellent/good/average/poor",
  "qualityLabel": "Xuất sắc/Tốt/Trung bình/Sơ sài",
  "feedback": "Nhận xét ngắn cho tác giả (1-2 câu)",
  "isComplete": true
}

Chỉ trả về JSON, không thêm markdown hay giải thích.`;

  const text = await callGemini(prompt, { temperature: 0.3 });
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { summary: [text], quality: 'average', qualityLabel: 'Trung bình', feedback: '', isComplete: false };
  }
}

// ── 3. AI Chatbot ─────────────────────────────────────────────────────────
export async function chatWithAI(userMessage, context) {
  const { userName, userRole, gpa, upcomingEvents, pendingTasks, recentAttendance } = context;

  const prompt = `Bạn là "2X18 Bot", trợ lý ảo thông minh của nhóm sinh viên 2X18 tại Đại học Khoa học Tự nhiên (HUS), Đại học Quốc gia Hà Nội (VNU).
Bạn thân thiện, nói chuyện tự nhiên bằng tiếng Việt, có thể dùng emoji.
Trả lời ngắn gọn, dưới 150 từ.

THÔNG TIN NGƯỜI DÙNG HIỆN TẠI:
- Tên: ${userName || 'Chưa rõ'}
- Vai trò: ${userRole || 'member'}
- GPA hiện tại: ${gpa || 'Chưa có dữ liệu'}

SỰ KIỆN SẮP TỚI:
${upcomingEvents?.length ? upcomingEvents.map(e => `• ${e.title} — ${e.date}`).join('\n') : '• Không có sự kiện nào sắp tới'}

NHIỆM VỤ ĐANG LÀM:
${pendingTasks?.length ? pendingTasks.map(t => `• ${t.title} (${t.done ? '✅' : '⏳'})`).join('\n') : '• Không có task nào'}

ĐIỂM DANH GẦN ĐÂY:
${recentAttendance || 'Không có dữ liệu'}

CÂU HỎI CỦA NGƯỜI DÙNG:
"${userMessage}"

Trả lời trực tiếp, hữu ích và thân thiện:`;

  return await callGemini(prompt, { maxTokens: 512, temperature: 0.8 });
}

// ── 4. AI Cảnh báo sớm ───────────────────────────────────────────────────
export async function analyzeEarlyWarning(members, attendance, tasks) {
  const memberStats = members.map(m => {
    const memberTasks = tasks.filter(t => t.userId === m.id);
    const doneTasks = memberTasks.filter(t => t.done).length;
    const totalTasks = memberTasks.length;

    const memberAttendance = attendance.reduce((count, sess) => {
      const present = Array.isArray(sess.present) ? sess.present : [];
      return count + (present.includes(m.id) ? 1 : 0);
    }, 0);
    const totalSessions = attendance.length;

    return {
      name: m.fullName || 'N/A',
      role: m.role,
      attendanceRate: totalSessions ? Math.round((memberAttendance / totalSessions) * 100) : 0,
      taskCompletion: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
      pendingTasks: totalTasks - doneTasks,
    };
  });

  const prompt = `Bạn là hệ thống cảnh báo sớm của nhóm sinh viên 2X18.

THỐNG KÊ THÀNH VIÊN:
${memberStats.map(m => `• ${m.name} (${m.role}): Điểm danh ${m.attendanceRate}% | Task hoàn thành ${m.taskCompletion}% | Còn ${m.pendingTasks} task chưa xong`).join('\n')}

Hãy phân tích và trả về JSON:
{
  "warnings": [
    {
      "memberName": "Tên",
      "level": "high/medium/low",
      "reason": "Lý do cảnh báo ngắn gọn"
    }
  ],
  "overallHealth": "good/warning/critical",
  "suggestion": "Gợi ý chung cho nhóm (1-2 câu)"
}

Chỉ cảnh báo những thành viên THỰC SỰ có vấn đề (điểm danh < 60% HOẶC task completion < 40%). Nếu không ai có vấn đề, trả mảng warnings rỗng.
Chỉ trả về JSON, không thêm markdown.`;

  const text = await callGemini(prompt, { temperature: 0.3 });
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { warnings: [], overallHealth: 'good', suggestion: text };
  }
}
