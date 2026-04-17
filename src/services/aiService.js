// src/services/aiService.js
// ── Gemini AI Service for 2X18 ─────────────────────────────────────────────
import { GoogleGenAI } from '@google/genai';

const STORAGE_KEY = '2x18_gemini_api_key';
const HARDCODED_KEY = '';

// ── API Key Management ─────────────────────────────────────────────────────
export const getApiKey = () => localStorage.getItem(STORAGE_KEY) || HARDCODED_KEY;
export const setApiKey = (key) => localStorage.setItem(STORAGE_KEY, key);
export const removeApiKey = () => localStorage.removeItem(STORAGE_KEY);

// ── Core AI Call ────────────────────────────────────────────────────────────
async function callGemini(prompt, { maxTokens = 2048, temperature = 0.7, jsonMode = false } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  try {
    const genAI = new GoogleGenAI(apiKey);
    const generationConfig = {
      maxOutputTokens: maxTokens,
      temperature: temperature,
    };
    
    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error('[Gemini API Error]', err);
    throw err;
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

  const prompt = `Bạn là Trưởng nhóm dự án (Project Manager) cực kỳ sắc bén của đội 2X18.

NHIỆM VỤ MỚI CẦN XỬ LÝ:
"${taskDescription}"

TÌNH TRẠNG NHÂN SỰ HIỆN TẠI:
${memberInfo.map((m, i) => `${i + 1}. ${m.name} (Role: ${m.role}) — Đang có ${m.currentTasksCount} task chưa xong. Các task đang làm: ${m.currentTasksList}`).join('\n')}

MỤC TIÊU CỦA BẠN:
1. Đề xuất người phù hợp nhất để nhận nhiệm vụ này, ưu tiên sự cân bằng công việc (tránh dồn việc cho người đang có nhiều task) và phù hợp về vai trò (core/member).
2. Viết một lý do thuyết phục giải thích tại sao chọn người này.
3. Chia nhỏ nhiệm vụ này thành 3-4 bước thực hiện cụ thể (subtasks) giúp người nhận dễ hình dung.
4. Đánh giá số ngày hoàn thành dự kiến (1-14) và mức độ ưu tiên (high, medium, low).

Bạn PHẢI trả về đúng định dạng JSON sau:
{
  "suggestedAssignee": "Tên người được chọn (chọn từ danh sách trên)",
  "reason": "Lý do chọn người này một cách logic (khoảng 2 câu)",
  "subtasks": ["Bước 1: ...", "Bước 2: ...", "Bước 3: ..."],
  "estimatedDays": 3,
  "priority": "high"
}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.4, jsonMode: true });
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Error:", err);
    return { suggestedAssignee: '', reason: 'Không thể phân tích do lỗi AI hoặc thiếu API Key.', subtasks: [], estimatedDays: 0, priority: 'medium' };
  }
}

// ── 2. AI Review Báo cáo ──────────────────────────────────────────────────
export async function reviewReport(reportContent, authorName) {
  const prompt = `Bạn là Cố vấn cấp cao (Senior Advisor) của dự án 2X18. Nhiệm vụ của bạn là đánh giá báo cáo tuần của sinh viên.

BÁO CÁO CỦA: ${authorName}
NỘI DUNG BÁO CÁO:
"${reportContent}"

TIÊU CHÍ ĐÁNH GIÁ:
- Báo cáo có rõ ràng những gì đã làm được và chưa làm được không?
- Báo cáo có nêu lên vấn đề, khó khăn đang gặp phải không?
- Kế hoạch tuần tới có khả thi và cụ thể không?

Bạn PHẢI trả về định dạng JSON sau:
{
  "summary": ["Tóm tắt ý 1", "Tóm tắt ý 2", "Tóm tắt ý 3"],
  "quality": "excellent|good|average|poor",
  "qualityLabel": "Xuất sắc|Tốt|Cần cải thiện|Sơ sài",
  "feedback": "Nhận xét chân thành, mang tính xây dựng, chỉ ra điểm tốt và điểm cần khắc phục (tối đa 3 câu).",
  "isComplete": true/false (true nếu báo cáo đủ ý, false nếu quá ngắn/thiếu thông tin)
}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.3, jsonMode: true });
    return JSON.parse(text);
  } catch (err) {
    return { summary: ['Lỗi đánh giá AI'], quality: 'average', qualityLabel: 'Không xác định', feedback: 'Vui lòng kiểm tra lại cấu hình API Key.', isComplete: false };
  }
}

// ── 3. AI Chatbot ─────────────────────────────────────────────────────────
export async function chatWithAI(userMessage, context) {
  const { userName, userRole, gpa, upcomingEvents, pendingTasks, recentAttendance } = context;

  const prompt = `Bạn là "2X18 Bot", một trợ lý ảo siêu việt, dí dỏm và thông minh của nhóm sinh viên 2X18 tại Đại học Khoa học Tự nhiên (HUS), ĐHQGHN.
Bạn có tính cách năng động, sẵn sàng giúp đỡ, biết đùa nhưng khi cần thì rất nghiêm túc.

THÔNG TIN NGƯỜI ĐANG TRÒ CHUYỆN VỚI BẠN:
- Tên: ${userName || 'Thành viên 2X18'}
- Vai trò: ${userRole || 'Thành viên'}
- GPA hiện tại: ${gpa || 'Chưa rõ'}

DỮ LIỆU NGỮ CẢNH CỦA NGƯỜI NÀY:
- Sự kiện sắp tới: ${upcomingEvents?.length ? upcomingEvents.map(e => `[${e.date}] ${e.title}`).join(', ') : 'Trống'}
- Nhiệm vụ chưa xong: ${pendingTasks?.length ? pendingTasks.map(t => t.title).join(', ') : 'Không có'}
- Lịch sử điểm danh gần đây: ${recentAttendance || 'Chưa rõ'}

CÂU HỎI / TIN NHẮN TỪ NGƯỜI DÙNG:
"${userMessage}"

HƯỚNG DẪN TRẢ LỜI:
1. Xưng hô "mình" và gọi người dùng bằng Tên (nếu có).
2. Dùng dữ liệu ngữ cảnh để câu trả lời mang tính cá nhân hóa (ví dụ: nhắc họ làm task nếu họ hỏi về công việc, hoặc chúc họ thi tốt nếu có sự kiện thi).
3. Trả lời trực tiếp vào trọng tâm, ngắn gọn dưới 150 từ. Thêm emoji cho sinh động. Không in đậm toàn bộ câu.`;

  return await callGemini(prompt, { maxTokens: 800, temperature: 0.8, jsonMode: false });
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
      attendanceRate: totalSessions ? Math.round((memberAttendance / totalSessions) * 100) : 100,
      taskCompletion: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 100,
      pendingTasks: totalTasks - doneTasks,
    };
  });

  const prompt = `Bạn là Hệ thống Radar của 2X18, chuyên phân tích dữ liệu hoạt động của các thành viên để phát hiện những ai đang chểnh mảng hoặc bị quá tải.

DỮ LIỆU HOẠT ĐỘNG HIỆN TẠI CỦA CÁC THÀNH VIÊN:
${memberStats.map(m => `- ${m.name} (Role: ${m.role}): Điểm danh ${m.attendanceRate}%, Hoàn thành task ${m.taskCompletion}% (Còn ${m.pendingTasks} task tồn đọng)`).join('\n')}

YÊU CẦU:
1. Xác định những thành viên có dấu hiệu đáng lo ngại (Ví dụ: Điểm danh < 70%, hoặc Hoàn thành task < 50%, hoặc có quá nhiều task tồn đọng).
2. Xếp loại cảnh báo (high = rất nghiêm trọng, medium = cần lưu ý, low = nhắc nhở nhẹ).
3. Đánh giá sức khỏe tổng thể của nhóm (good = ổn định, warning = nhiều người chểnh mảng, critical = khủng hoảng).
4. Đưa ra một lời khuyên chiến lược cho Ban điều hành (Core team) để xử lý tình hình.

Bạn PHẢI trả về JSON có cấu trúc sau:
{
  "warnings": [
    {
      "memberName": "Tên thành viên",
      "level": "high|medium|low",
      "reason": "Lý do cụ thể dựa trên số liệu"
    }
  ],
  "overallHealth": "good|warning|critical",
  "suggestion": "Lời khuyên hành động cho Core team (khoảng 2 câu)"
}
(Nếu không ai có vấn đề, trả về mảng warnings rỗng [])`;

  try {
    const text = await callGemini(prompt, { temperature: 0.2, jsonMode: true });
    return JSON.parse(text);
  } catch (err) {
    return { warnings: [], overallHealth: 'good', suggestion: 'Không thể phân tích dữ liệu lúc này.' };
  }
}

