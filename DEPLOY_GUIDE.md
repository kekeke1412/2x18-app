# 🚀 HƯỚNG DẪN DEPLOY 2X18 CORE APP

## Cấu trúc thư mục hoàn chỉnh

```
2x18-core/
├── public/
│   └── favicon.ico
├── src/
│   ├── context/
│   │   └── AppContext.jsx        ← Global state (Context API)
│   ├── pages/
│   │   ├── Auth.jsx              ← Đăng nhập / Đăng ký
│   │   ├── Dashboard.jsx         ← Tổng quan
│   │   ├── Profile.jsx           ← Hồ sơ & GPA
│   │   ├── Subjects.jsx          ← Môn học & SME
│   │   ├── Tasks.jsx             ← Tiến độ & Task
│   │   ├── Roadmap.jsx           ← Lộ trình 4 năm
│   │   ├── Calendar.jsx          ← Lịch trình
│   │   ├── Voting.jsx            ← Bình chọn
│   │   ├── Notifications.jsx     ← Thông báo
│   │   ├── Attendance.jsx        ← Điểm danh
│   │   └── Gamification.jsx      ← Vinh danh
│   ├── App.jsx                   ← Router + Layout
│   ├── main.jsx                  ← Entry point
│   ├── index.css                 ← Global styles
│   ├── data.js                   ← 70 môn học (cố định)
│   ├── mockData.js               ← Dữ liệu mẫu Demo
│   └── supabase.js               ← Supabase client + SQL schema
├── .env                          ← Environment variables
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

---

## BƯỚC 1: Cài đặt dependencies

```bash
npm create vite@latest 2x18-core -- --template react
cd 2x18-core
npm install

# Core dependencies
npm install react-router-dom @supabase/supabase-js
npm install lucide-react

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### tailwind.config.js
```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

---

## BƯỚC 2: Đặt file đúng vị trí

Sau khi tải các file từ Claude, copy vào đúng thư mục:

```
src/context/AppContext.jsx   ← AppContext.jsx
src/pages/Auth.jsx           ← Auth.jsx
src/pages/Dashboard.jsx      ← Dashboard.jsx
src/pages/Profile.jsx        ← Profile.jsx
src/pages/Subjects.jsx       ← Subjects.jsx
src/pages/Tasks.jsx          ← Tasks.jsx
src/pages/Roadmap.jsx        ← Roadmap.jsx
src/pages/Calendar.jsx       ← Calendar.jsx
src/pages/Voting.jsx         ← Voting.jsx

# Tách file NotificationsAttendanceGamification.jsx thành 3 file:
src/pages/Notifications.jsx  ← export function Notifications
src/pages/Attendance.jsx     ← export function Attendance
src/pages/Gamification.jsx   ← export function Gamification

src/App.jsx                  ← App_final.jsx (đổi tên)
src/data.js                  ← data.js
src/mockData.js              ← mockData.js
src/supabase.js              ← supabase.js
src/index.css                ← index.css
```

---

## BƯỚC 3: Tạo tài khoản Supabase (miễn phí)

1. Truy cập https://supabase.com → **Start your project** → Đăng ký bằng GitHub
2. Tạo project mới:
   - **Name**: `2x18-core`
   - **Database password**: Đặt mật khẩu mạnh (lưu lại)
   - **Region**: Southeast Asia (Singapore)
3. Chờ ~2 phút để project khởi tạo

### Lấy API keys
Vào **Project Settings → API**:
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Chạy SQL Schema
Vào **SQL Editor → New query**, paste toàn bộ nội dung SQL trong file `supabase.js` (phần comment) → **Run**

---

## BƯỚC 4: Tạo file .env

```bash
# .env (đặt ở thư mục gốc, KHÔNG commit lên GitHub)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```bash
# .env.example (commit file này lên GitHub)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## BƯỚC 5: Chạy local

```bash
npm run dev
# → http://localhost:5173
```

**Test đăng nhập demo:**
- Email: bất kỳ
- Password: `123456`

---

## BƯỚC 6: Deploy lên Vercel (miễn phí)

### Cách 1: Qua GitHub (Khuyến nghị)

1. Tạo repo GitHub (private):
```bash
git init
echo ".env" >> .gitignore
git add .
git commit -m "Initial commit: 2X18 Core App"
git remote add origin https://github.com/username/2x18-core.git
git push -u origin main
```

2. Vào https://vercel.com → **Import Git Repository** → Chọn repo vừa tạo

3. **Configure project**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables** (quan trọng!):
   Thêm 2 biến:
   ```
   VITE_SUPABASE_URL = https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJ...
   ```

5. Click **Deploy** → Chờ ~2 phút → Nhận URL dạng `2x18-core.vercel.app`

### Cách 2: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## BƯỚC 7: Custom domain (tùy chọn)

Trong Vercel Dashboard → **Settings → Domains**:
- Thêm domain: `2x18.yourdomain.com`
- Hoặc mua domain miễn phí tại Freenom: `2x18core.tk`

---

## BƯỚC 8: Cấu hình Supabase Auth cho production

Vào **Supabase → Authentication → URL Configuration**:
```
Site URL: https://2x18-core.vercel.app
Redirect URLs: https://2x18-core.vercel.app/**
```

---

## CHECKLIST TRƯỚC KHI ĐI LIVE

- [ ] `.env` không được commit lên GitHub
- [ ] SQL schema đã chạy trên Supabase
- [ ] RLS đã enable trên tất cả tables
- [ ] Environment variables đã thêm trên Vercel
- [ ] Test đăng ký + đăng nhập thật
- [ ] Test trên mobile (Chrome DevTools → Responsive)
- [ ] Super Admin MSSV `25000723` đã được tạo

---

## LỘ TRÌNH NÂNG CẤP TIẾP THEO

### Phase 2 — Supabase Real-time
Thay `localStorage` bằng Supabase queries trong `AppContext.jsx`:
```js
// Thay vì: persist('2x18_tasks', tasks)
// Dùng: await supabase.from('tasks').upsert(task)
```

### Phase 3 — Tính năng nâng cao
- [ ] Export Excel danh sách thành viên (thư viện: `xlsx`)
- [ ] Notification push (Supabase Realtime)
- [ ] Rating tài liệu 5 sao
- [ ] Audit log tự động

---

## LIÊN HỆ HỖ TRỢ

Nếu gặp lỗi, chụp màn hình terminal và hỏi lại Claude với nội dung lỗi cụ thể.

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS
- State: Context API + useReducer
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Deploy: Vercel (free tier)
- Icons: Lucide React
