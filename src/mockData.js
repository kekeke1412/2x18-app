// src/mockData.js
// Dữ liệu mẫu dùng cho Demo — KHÔNG dùng trong production

export const MOCK_MEMBERS = [
  { id:'u1', mssv:'25000723', fullName:'Phạm Bá Hưng',      role:'super_admin', gender:'Nam', bloodType:'O+', phone:'0912345001', mailSchool:'hung.pb@hus.edu.vn',   cpa:3.85, credits:32, avatar:'PH' },
  { id:'u2', mssv:'24000002', fullName:'Nguyễn Thành',       role:'core',        gender:'Nam', bloodType:'A+', phone:'0912345002', mailSchool:'thanh.ng@hus.edu.vn',   cpa:3.72, credits:28, avatar:'NT' },
  { id:'u3', mssv:'24000003', fullName:'Trần Lan Anh',        role:'core',        gender:'Nữ',  bloodType:'B+', phone:'0912345003', mailSchool:'anh.tl@hus.edu.vn',    cpa:3.90, credits:30, avatar:'LA' },
  { id:'u4', mssv:'24000004', fullName:'Lê Minh Khôi',        role:'member',      gender:'Nam', bloodType:'AB+',phone:'0912345004', mailSchool:'khoi.lm@hus.edu.vn',   cpa:3.45, credits:25, avatar:'MK' },
  { id:'u5', mssv:'24000005', fullName:'Phạm Tuấn Anh',       role:'member',      gender:'Nam', bloodType:'O-', phone:'0912345005', mailSchool:'anh.pt@hus.edu.vn',    cpa:3.20, credits:22, avatar:'TA' },
  { id:'u6', mssv:'24000006', fullName:'Vũ Hải Nam',          role:'member',      gender:'Nam', bloodType:'A-', phone:'0912345006', mailSchool:'nam.vh@hus.edu.vn',    cpa:3.60, credits:27, avatar:'HN' },
  { id:'u7', mssv:'24000007', fullName:'Đinh Thu Hà',         role:'member',      gender:'Nữ',  bloodType:'B-', phone:'0912345007', mailSchool:'ha.dt@hus.edu.vn',     cpa:3.78, credits:29, avatar:'TH' },
  { id:'u8', mssv:'24000008', fullName:'Ngô Minh Đức',        role:'member',      gender:'Nam', bloodType:'O+', phone:'0912345008', mailSchool:'duc.nm@hus.edu.vn',    cpa:3.15, credits:20, avatar:'MD' },
  { id:'u9', mssv:'24000009', fullName:'Bùi Khánh Linh',      role:'member',      gender:'Nữ',  bloodType:'A+', phone:'0912345009', mailSchool:'linh.bk@hus.edu.vn',   cpa:3.55, credits:26, avatar:'KL' },
  { id:'u10',mssv:'24000010', fullName:'Hoàng Minh Long',     role:'member',      gender:'Nam', bloodType:'AB-',phone:'0912345010', mailSchool:'long.hm@hus.edu.vn',   cpa:3.40, credits:24, avatar:'ML' },
  { id:'u11',mssv:'24000011', fullName:'Trần Thị Hoàn',       role:'member',      gender:'Nữ',  bloodType:'O+', phone:'0912345011', mailSchool:'hoan.tt@hus.edu.vn',   cpa:3.65, credits:28, avatar:'TH' },
  { id:'u12',mssv:'24000012', fullName:'Mai Thị Anh',         role:'member',      gender:'Nữ',  bloodType:'B+', phone:'0912345012', mailSchool:'anh.mt@hus.edu.vn',    cpa:3.30, credits:23, avatar:'MA' },
  { id:'u13',mssv:'24000013', fullName:'Nguyễn Văn Trọng',    role:'member',      gender:'Nam', bloodType:'A-', phone:'0912345013', mailSchool:'trong.nv@hus.edu.vn',  cpa:3.50, credits:25, avatar:'VT' },
  { id:'u14',mssv:'24000014', fullName:'Lê Thu Hà',           role:'member',      gender:'Nữ',  bloodType:'O+', phone:'0912345014', mailSchool:'ha.lt@hus.edu.vn',     cpa:3.70, credits:29, avatar:'TH' },
  { id:'u15',mssv:'24000015', fullName:'Phạm Việt Dũng',      role:'member',      gender:'Nam', bloodType:'B+', phone:'0912345015', mailSchool:'dung.pv@hus.edu.vn',   cpa:3.25, credits:21, avatar:'VD' },
  { id:'u16',mssv:'24000016', fullName:'Nguyễn Minh Tú',      role:'member',      gender:'Nữ',  bloodType:'A+', phone:'0912345016', mailSchool:'tu.nm@hus.edu.vn',     cpa:3.80, credits:30, avatar:'MT' },
];

export const MOCK_SME = {
  'PHY1310': 'u2', // Vật lý bán dẫn → Nguyễn Thành
  'PHY1341': 'u3', // Khoa học vật liệu → Trần Lan Anh
  'PHY1303': 'u4', // Lập trình Python → Lê Minh Khôi
  'PHY1107': 'u6', // Giải tích 1 → Vũ Hải Nam
  'PHY1314': 'u7', // Điện và từ học → Đinh Thu Hà
};

export const MOCK_TASKS = [
  { id:'t1', subjectId:'PHY1310', userId:'u1', task:'Đọc chương 3-5 giáo trình Neamen', deadline:'2026-04-10', done:false, type:'Cá nhân' },
  { id:'t2', subjectId:'PHY1107', userId:'u1', task:'Bài tập Giải tích trang 120-135', deadline:'2026-04-08', done:false, type:'Bắt buộc' },
  { id:'t3', subjectId:'PHY1341', userId:'u1', task:'Báo cáo thực hành tuần 6',         deadline:'2026-04-15', done:true,  type:'Nhóm' },
];

export const MOCK_EVENTS = [
  { id:'e1', title:'Họp SME Vật lý bán dẫn', date:'2026-04-07', startTime:'20:00', endTime:'21:30', type:'sme',      location:'Google Meet',   guests:'Nhóm A',   allDay:false },
  { id:'e2', title:'Deadline báo cáo VL bán dẫn', date:'2026-04-10', startTime:'23:59', endTime:'',  type:'deadline', location:'',             guests:'Cả nhóm', allDay:false },
  { id:'e3', title:'Check-in tiến độ tháng 4', date:'2026-04-17', startTime:'', endTime:'',          type:'study',    location:'',             guests:'Cả nhóm', allDay:true  },
  { id:'e4', title:'Seminar bán dẫn 2026',     date:'2026-05-15', startTime:'08:00', endTime:'11:30',type:'event',    location:'Phòng B1-101', guests:'Core+SME', allDay:false },
];

export const MOCK_ROADMAP = [
  {
    year: 2026,
    events: [
      { id:'r1', month:'T1–T5', level:'Kỳ 2 năm 1',    status:'In Progress', task:'KICK LỰC 🔥 — Hoàn thành tất cả môn kỳ 2 với điểm cao nhất có thể', pic:'Cả nhóm', goal:'Cả nhóm không ai dưới 3.0 GPA', checked:false },
      { id:'r2', month:'T6',    level:'Thi CK 2 năm 1', status:'Planning',    task:'Ôn thi tập trung — SME dẫn dắt từng môn',                          pic:'SME',     goal:'80% thành viên đạt B+ trở lên', checked:false },
      { id:'r3', month:'T7–T9', level:'Hè năm 1',       status:'None',        task:'Nghỉ ngơi + học thêm kỹ năng mềm, IELTS cơ bản',                   pic:'Cá nhân', goal:'Đi du lịch nhóm 1 chuyến ✈️',  checked:false },
      { id:'r4', month:'T10',   level:'Kỳ 1 năm 2',     status:'None',        task:'Bắt đầu nghiên cứu khoa học cấp Khoa',                              pic:'Hưng',    goal:'Có 1 đề tài NCKH được duyệt',  checked:false },
    ]
  },
  {
    year: 2027,
    events: [
      { id:'r5', month:'T1–T6', level:'Kỳ 2 năm 2', status:'None', task:'Tìm Lab chuyên sâu bán dẫn',               pic:'Cả nhóm', goal:'ALL vào được Lab nghiên cứu', checked:false },
      { id:'r6', month:'T7–T8', level:'Hè năm 2',   status:'None', task:'Cày IELTS — target 6.5+',                  pic:'Cá nhân', goal:'50% đạt IELTS 6.5 trở lên',  checked:false },
      { id:'r7', month:'T9',    level:'Du lịch',     status:'None', task:'Trip xả stress sau 2 năm chiến đấu 😎',    pic:'Cả nhóm', goal:'Đi nước ngoài lần đầu',       checked:false },
      { id:'r8', month:'T10',   level:'Kỳ 1 năm 3', status:'None', task:'Apply học bổng quốc tế / exchange program', pic:'Hưng',    goal:'Ít nhất 2 bạn get học bổng', checked:false },
    ]
  },
  {
    year: 2028,
    events: [
      { id:'r9',  month:'T1–T6', level:'Kỳ 2 năm 3', status:'None', task:'Thực tập tại doanh nghiệp bán dẫn',       pic:'Cả nhóm', goal:'ALL có chỗ thực tập uy tín',       checked:false },
      { id:'r10', month:'T7–T9', level:'Hè năm 3',   status:'None', task:'Build portfolio + LinkedIn chuyên nghiệp', pic:'Cá nhân', goal:'Profile LinkedIn 500+ connections', checked:false },
      { id:'r11', month:'T10',   level:'Kỳ 1 năm 4', status:'None', task:'Bắt đầu Khóa luận tốt nghiệp',            pic:'Hưng',    goal:'Chọn được đề tài KLTN rõ ràng',    checked:false },
    ]
  },
  {
    year: 2029,
    events: [
      { id:'r12', month:'T1–T4', level:'Kỳ 2 năm 4', status:'None', task:'Hoàn thiện và bảo vệ Khóa luận',          pic:'Cả nhóm', goal:'ALL tốt nghiệp loại Giỏi trở lên', checked:false },
      { id:'r13', month:'T5',    level:'TỐT NGHIỆP 🎓',status:'None',task:'Lễ tốt nghiệp đại học',                   pic:'Cả nhóm', goal:'Buổi lễ TN đáng nhớ cả đời 🥲',   checked:false },
      { id:'r14', month:'T6+',   level:'Sau TN',      status:'None', task:'Bắt đầu sự nghiệp / học Master / startup', pic:'Cá nhân', goal:'Mỗi người tìm được con đường riêng', checked:false },
    ]
  },
];

export const MOCK_VOTES = [
  {
    id:'v1', title:'Chọn giờ họp SME tuần tới', creator:'Phạm Bá Hưng', createdAt:'2026-04-05T10:00:00',
    deadline:'2026-04-08T23:59:00', multiSelect:true, closed:false,
    options:[
      { id:'o1', text:'Thứ 2, 20:00', votes:['u1','u2','u3','u4'] },
      { id:'o2', text:'Thứ 3, 19:30', votes:['u5','u6'] },
      { id:'o3', text:'Thứ 6, 21:00', votes:['u1','u7','u8','u9','u10'] },
    ]
  },
];

export const MOCK_NOTIFICATIONS = [
  { id:'n1', type:'task',    msg:'Deadline "Báo cáo VL bán dẫn" còn 2 ngày',              time:'2026-04-08T08:00:00', read:false, link:'/tasks'    },
  { id:'n2', type:'sme',     msg:'Nguyễn Thành vừa upload tài liệu môn Vật lý bán dẫn',  time:'2026-04-07T15:30:00', read:false, link:'/subjects'  },
  { id:'n3', type:'system',  msg:'Tài khoản Nguyễn Văn X đã được Core duyệt',              time:'2026-04-06T09:00:00', read:true,  link:'/dashboard' },
  { id:'n4', type:'vote',    msg:'Bình chọn "Giờ họp SME" đang mở — hãy vote!',           time:'2026-04-05T10:00:00', read:true,  link:'/voting'    },
];

export const MOCK_ATTENDANCE = [
  { id:'a1', sessionId:'s1', sessionTitle:'Họp SME Vật lý bán dẫn T3',  date:'2026-04-01', present:['u1','u2','u3','u4','u6','u7'], total:16 },
  { id:'a2', sessionId:'s2', sessionTitle:'Họp SME Giải tích tuần 8',    date:'2026-03-28', present:['u1','u2','u3','u5','u8'],       total:16 },
];

export const MOCK_CONTRIBUTIONS = {
  u1:420, u2:380, u3:510, u4:220, u5:180,
  u6:310, u7:290, u8:150, u9:260, u10:200,
  u11:330, u12:190, u13:240, u14:350, u15:170, u16:400,
};
