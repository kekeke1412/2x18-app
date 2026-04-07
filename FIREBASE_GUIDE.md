# Hướng dẫn chuyển sang Firebase Realtime Database

## Tại sao nên dùng Firebase?

Hiện tại app 2X18 lưu toàn bộ dữ liệu trong `localStorage` của trình duyệt — mỗi máy tính thấy dữ liệu khác nhau, tắt trình duyệt không mất nhưng không đồng bộ giữa các thành viên. Firebase giải quyết điều này: một thành viên điểm danh, tất cả thấy ngay lập tức.

---

## Bước 1 — Tạo project Firebase

1. Vào https://console.firebase.google.com → **"Add project"**
2. Đặt tên: `2x18-core` (hoặc bất kỳ tên nào)
3. Tắt Google Analytics nếu không cần → **"Create project"**
4. Vào **"Realtime Database"** (bảng bên trái) → **"Create database"**
5. Chọn khu vực `asia-southeast1` (Singapore — gần nhất với Việt Nam)
6. Chọn **"Start in test mode"** (để dev dễ, sau đó cài Rules)

---

## Bước 2 — Lấy cấu hình Firebase

1. Vào **Project Settings** (biểu tượng bánh răng) → **"Your apps"** → chọn biểu tượng **`</>`** (Web)
2. Đặt tên app, nhấn **"Register app"**
3. Copy đoạn `firebaseConfig` — trông như thế này:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "2x18-core.firebaseapp.com",
  databaseURL: "https://2x18-core-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "2x18-core",
  storageBucket: "2x18-core.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Bước 3 — Cài Firebase SDK

```bash
npm install firebase
```

---

## Bước 4 — Tạo file cấu hình

Tạo file `src/firebase.js`:

```js
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, remove } from 'firebase/database';

const firebaseConfig = {
  // Dán config của bạn vào đây
  apiKey: "AIzaSy...",
  authDomain: "...",
  databaseURL: "https://2x18-core-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, onValue, set, update, push, remove };
```

---

## Bước 5 — Tạo custom hook để thay thế localStorage

Tạo file `src/hooks/useFirebaseState.js`:

```js
// src/hooks/useFirebaseState.js
import { useState, useEffect } from 'react';
import { db, ref, onValue, set } from '../firebase';

/**
 * Giống useState nhưng đồng bộ với Firebase Realtime Database.
 * @param {string} path  - Đường dẫn trong DB, VD: 'attendance', 'votes'
 * @param {*} initial    - Giá trị mặc định nếu DB chưa có
 */
export function useFirebaseState(path, initial) {
  const [state, setState] = useState(initial);
  const [loading, setLoading] = useState(true);

  // Subscribe realtime
  useEffect(() => {
    const dbRef = ref(db, path);
    const unsub = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      setState(val !== null && val !== undefined ? val : initial);
      setLoading(false);
    });
    return () => unsub(); // cleanup
  }, [path]); // eslint-disable-line

  // Write to Firebase
  const setFirebase = (newVal) => {
    set(ref(db, path), newVal);
    // setState ngay để UI không lag (optimistic update)
    setState(newVal);
  };

  return [state, setFirebase, loading];
}
```

---

## Bước 6 — Cập nhật AppContext.jsx

Chỉ cần thay đổi cách lưu/đọc dữ liệu. Tìm các chỗ dùng `localStorage` và thay bằng Firebase.

### Trước (localStorage):
```js
// Đọc
const [attendance, setAttendance] = useState(() => {
  try { return JSON.parse(localStorage.getItem('2x18_attendance')) || []; }
  catch { return []; }
});

// Ghi
const saveAttendance = (data) => {
  setAttendance(data);
  localStorage.setItem('2x18_attendance', JSON.stringify(data));
};
```

### Sau (Firebase):
```js
import { useFirebaseState } from '../hooks/useFirebaseState';

// Trong AppContext component:
const [attendance, setAttendance, loadingAttendance] = useFirebaseState('attendance', []);

// Không cần localStorage.setItem nữa — useFirebaseState tự đồng bộ
const saveAttendance = (data) => setAttendance(data);
```

---

## Bước 7 — Cấu trúc Database đề xuất

```
2x18-core (root)
├── attendance/           ← danh sách buổi họp
│   ├── session_abc123/
│   │   ├── sessionId: "session_abc123"
│   │   ├── sessionTitle: "Họp SME tuần 9"
│   │   ├── date: "2025-04-07"
│   │   ├── meetLink: "https://meet.google.com/..."
│   │   ├── total: 18
│   │   └── present: ["u1", "u2", ...]
│   └── ...
│
├── votes/                ← bình chọn
├── calEvents/            ← sự kiện lịch
├── roadmap/              ← lộ trình
├── contributions/        ← điểm cống hiến
│   ├── u1: 150
│   └── u2: 80
│
└── members/              ← thành viên (read-only cho member, write cho core)
```

---

## Bước 8 — Cài Security Rules

Vào **Realtime Database → Rules** và paste:

```json
{
  "rules": {
    ".read": "auth != null",
    "attendance": {
      ".write": "auth != null"
    },
    "votes": {
      ".write": "auth != null"
    },
    "calEvents": {
      ".write": "auth != null"
    },
    "roadmap": {
      ".write": "auth != null"
    },
    "contributions": {
      ".write": "auth != null"
    },
    "members": {
      ".read": "auth != null",
      ".write": "auth.token.role === 'super_admin' || auth.token.role === 'core'"
    }
  }
}
```

> Lưu ý: Rule này yêu cầu đăng nhập (Firebase Auth). Nếu chưa muốn cài Auth, có thể tạm dùng `".read": true, ".write": true` (chỉ dùng trong dev, KHÔNG dùng production).

---

## Bước 9 — Cài Firebase Authentication (tuỳ chọn nhưng khuyến khích)

1. Vào **Authentication** → **"Get started"** → bật **Email/Password**
2. Thay hàm `login` trong AppContext bằng Firebase Auth:

```js
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

// Login
const login = async (email, password) => {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  // Lưu user vào context state
  setCurrentUser({ id: userCred.user.uid, email: userCred.user.email, ...profile });
};
```

---

## Kiểm tra nhanh sau khi chuyển đổi

- [ ] Mở 2 tab trình duyệt — điểm danh ở tab 1, tab 2 cập nhật ngay
- [ ] Tắt và mở lại trình duyệt — dữ liệu vẫn còn
- [ ] Mở trên điện thoại — dữ liệu giống máy tính

---

## Chi phí

Firebase Spark Plan (miễn phí) đủ cho nhóm ~20 người:
- 1 GB database storage
- 10 GB/tháng download
- 100 kết nối đồng thời

Hoàn toàn miễn phí cho nhóm học tập nhỏ.
