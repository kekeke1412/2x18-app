// src/data.js
export const subjectDatabase = [
  // Copy toàn bộ 70 môn học đã chốt ở các bước trước vào đây
  { id: 'PHI1006', code: 'PHI1006', name: 'Triết học Mác - Lênin', credits: 3, type: 'Chung' },
    { id: 'PEC1008', code: 'PEC1008', name: 'Kinh tế chính trị Mác - Lênin', credits: 2, type: 'Chung' },
    { id: 'PHI1002', code: 'PHI1002', name: 'Chủ nghĩa xã hội khoa học', credits: 2, type: 'Chung' },
    { id: 'HIS1001', code: 'HIS1001', name: 'Lịch sử Đảng Cộng Sản Việt Nam', credits: 2, type: 'Chung' },
    { id: 'POL1001', code: 'POL1001', name: 'Tư tưởng Hồ Chí Minh', credits: 2, type: 'Chung' },
    { id: 'THL1057', code: 'THL1057', name: 'Nhà nước và pháp luật đại cương', credits: 2, type: 'Chung' },
    { id: 'VNU1001', code: 'VNU1001', name: 'Nhập môn Công nghệ số và trí tuệ nhân tạo', credits: 3, type: 'Chung' },
    { id: 'FLF1107', code: 'FLF1107', name: 'Tiếng Anh B1', credits: 5, type: 'Chung' },
    { id: 'CME1000', code: 'CME1000', name: 'Giáo dục Quốc phòng - An ninh', credits: 8, type: 'Chung', excludeCPA: true },
    { id: 'PES1000', code: 'PES1000', name: 'Giáo dục thể chất', credits: 4, type: 'Chung', excludeCPA: true },
    { id: 'HUS1012', code: 'HUS1012', name: 'Kỹ năng bổ trợ', credits: 3, type: 'Chung', excludeCPA: true },
    
    { id: 'HUS1021', code: 'HUS1021', name: 'Khoa học trái đất và sự sống', credits: 3, type: 'Lĩnh vực', electiveGroup: 'linh_vuc' },
    { id: 'HUS1022', code: 'HUS1022', name: 'Nhập môn Internet kết nối vạn vật', credits: 2, type: 'Lĩnh vực', electiveGroup: 'linh_vuc' },
    { id: 'HUS1023', code: 'HUS1023', name: 'Nhập môn phân tích dữ liệu', credits: 2, type: 'Lĩnh vực', electiveGroup: 'linh_vuc' },
    { id: 'HUS1024', code: 'HUS1024', name: 'Nhập môn Robotics', credits: 3, type: 'Lĩnh vực', electiveGroup: 'linh_vuc' },
    { id: 'HIS1056', code: 'HIS1056', name: 'Cơ sở văn hóa Việt Nam', credits: 3, type: 'Lĩnh vực', electiveGroup: 'linh_vuc' },
    
    { id: 'PHY1106', code: 'PHY1106', name: 'Đại số tuyến tính', credits: 3, type: 'Khối ngành BB' },
    { id: 'PHY1107', code: 'PHY1107', name: 'Giải tích 1', credits: 3, type: 'Khối ngành BB' },
    { id: 'PHY1108', code: 'PHY1108', name: 'Giải tích 2', credits: 3, type: 'Khối ngành BB' },
    { id: 'PHY1109', code: 'PHY1109', name: 'Xác suất thống kê', credits: 3, type: 'Khối ngành BB' },
    
    { id: 'CHE1080', code: 'CHE1080', name: 'Hóa học đại cương', credits: 3, type: 'Khối ngành TC', electiveGroup: 'khoi_nganh_tc' },
    { id: 'PHY1112', code: 'PHY1112', name: 'Vật lý môi trường', credits: 3, type: 'Khối ngành TC', electiveGroup: 'khoi_nganh_tc' },
    { id: 'PHY1303', code: 'PHY1303', name: 'Lập trình Python', credits: 3, type: 'Khối ngành TC', electiveGroup: 'khoi_nganh_tc' },
    { id: 'PHY1113', code: 'PHY1113', name: 'Lập trình C', credits: 3, type: 'Khối ngành TC', electiveGroup: 'khoi_nganh_tc' },
    { id: 'PHY1114', code: 'PHY1114', name: 'Lập trình Matlab', credits: 3, type: 'Khối ngành TC', electiveGroup: 'khoi_nganh_tc' },
    
    { id: 'PHY1348', code: 'PHY1348', name: 'Phương pháp toán cho Vật lý', credits: 3, type: 'Nhóm ngành BB' },
    { id: 'PHY1050', code: 'PHY1050', name: 'Cơ học', credits: 3, type: 'Nhóm ngành BB' },
    { id: 'PHY2302', code: 'PHY2302', name: 'Nhiệt động học và vật lý phân tử', credits: 3, type: 'Nhóm ngành BB' },
    { id: 'PHY1314', code: 'PHY1314', name: 'Điện và từ học', credits: 3, type: 'Nhóm ngành BB' },
    { id: 'PHY2304', code: 'PHY2304', name: 'Quang học', credits: 3, type: 'Nhóm ngành BB' },
    { id: 'PHY1341', code: 'PHY1341', name: 'Khoa học vật liệu đại cương', credits: 3, type: 'Nhóm ngành BB' },
    { id: 'PHY2307', code: 'PHY2307', name: 'Thực hành vật lý đại cương 1', credits: 2, type: 'Nhóm ngành BB' },
    { id: 'PHY2308', code: 'PHY2308', name: 'Thực hành vật lý đại cương 2', credits: 2, type: 'Nhóm ngành BB' },
    { id: 'PHY2309', code: 'PHY2309', name: 'Thực hành vật lý đại cương 3', credits: 2, type: 'Nhóm ngành BB' },
    { id: 'PHY3503', code: 'PHY3503', name: 'Tiếng Anh chuyên ngành', credits: 2, type: 'Nhóm ngành BB' }, 
    { id: 'PHY2206', code: 'PHY2206', name: 'Kỹ thuật điện tử', credits: 3, type: 'Nhóm ngành BB' },
    
    { id: 'PHY3296', code: 'PHY3296', name: 'Tiểu luận', credits: 3, type: 'Nhóm ngành TC', electiveGroup: 'nhom_nganh_tc' },
    { id: 'PHY1345', code: 'PHY1345', name: 'Kỹ thuật phân tích phổ', credits: 3, type: 'Nhóm ngành TC', electiveGroup: 'nhom_nganh_tc' },
    { id: 'PHY3302', code: 'PHY3302', name: 'Điện động lực học', credits: 3, type: 'Nhóm ngành TC', electiveGroup: 'nhom_nganh_tc' },
    { id: 'PHY2000', code: 'PHY2000', name: 'Phương pháp nghiên cứu khoa học', credits: 3, type: 'Nhóm ngành TC', electiveGroup: 'nhom_nganh_tc' },
    { id: 'PHY3301', code: 'PHY3301', name: 'Cơ học lý thuyết', credits: 3, type: 'Nhóm ngành TC', electiveGroup: 'nhom_nganh_tc' },
    
    { id: 'PHY1440', code: 'PHY1440', name: 'Hóa học vật liệu', credits: 3, type: 'Ngành BB' },
    { id: 'PHY2064', code: 'PHY2064', name: 'Vật lý nguyên tử', credits: 2, type: 'Ngành BB' },
    { id: 'PHY1441', code: 'PHY1441', name: 'Spintronics và ứng dụng', credits: 3, type: 'Ngành BB' },
    { id: 'PHY1310', code: 'PHY1310', name: 'Vật lý bán dẫn', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3169', code: 'PHY3169', name: 'Cơ học lượng tử', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3303', code: 'PHY3303', name: 'Vật lý thống kê', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3700', code: 'PHY3700', name: 'Các PP thực nghiệm trong KH vật liệu', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3346', code: 'PHY3346', name: 'Vật lý chất rắn', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3702', code: 'PHY3702', name: 'Cấu trúc thấp chiều và CN vật liệu nano', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3712', code: 'PHY3712', name: 'Vật liệu và công nghệ bán dẫn', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3454', code: 'PHY3454', name: 'Thực tập thực tế', credits: 3, type: 'Ngành BB' },
    { id: 'PHY3437', code: 'PHY3437', name: 'Kỹ thuật đo lường và xử lý tín hiệu', credits: 3, type: 'Ngành BB' },
    
    { id: 'PHY1340', code: 'PHY1340', name: 'Công nghệ màng mỏng và ứng dụng', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY1332', code: 'PHY1332', name: 'Thiết kế vi mạch CMOS VLSI', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3351', code: 'PHY3351', name: 'Vật lý linh kiện bán dẫn', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY1442', code: 'PHY1442', name: 'Mở đầu công nghệ đóng gói bán dẫn', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY1443', code: 'PHY1443', name: 'Mở đầu công nghệ kiểm thử bán dẫn', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY1444', code: 'PHY1444', name: 'Thực tập chuyên ngành Công nghệ bán dẫn', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY1445', code: 'PHY1445', name: 'Giới thiệu thiết bị sản xuất bán dẫn', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3465', code: 'PHY3465', name: 'Cảm biến và ứng dụng', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3722', code: 'PHY3722', name: 'Linh kiện bán dẫn chuyển đổi năng lượng', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3648', code: 'PHY3648', name: 'Thiết kế mạch điện tử', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY1338', code: 'PHY1338', name: 'Công nghệ chế tạo vi mạch tích hợp', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3713', code: 'PHY3713', name: 'Quang điện tử và quang tử', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3650', code: 'PHY3650', name: 'Xử lý tín hiệu số và ứng dụng', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    { id: 'PHY3335', code: 'PHY3335', name: 'Hệ thống nhúng', credits: 3, type: 'Ngành TC', electiveGroup: 'nganh_tc' },
    
    { id: 'PHY4090', code: 'PHY4090', name: 'Khóa luận tốt nghiệp', credits: 7, type: 'Khóa luận', electiveGroup: 'khoa_luan' },
    { id: 'PHY1363', code: 'PHY1363', name: 'Vật lý hiện đại (Thay thế KL)', credits: 4, type: 'Khóa luận', electiveGroup: 'khoa_luan' },
    { id: 'PHY1358', code: 'PHY1358', name: 'Vật liệu micro và nano tiên tiến (Thay thế KL)', credits: 3, type: 'Khóa luận', electiveGroup: 'khoa_luan' }
];

export const electiveLimits = {
  'linh_vuc': 5, 'khoi_nganh_tc': 3, 'nhom_nganh_tc': 3, 'nganh_tc': 18, 'khoa_luan': 7
};

export const calculateHe10 = (cc, gk, ck) => {
  if (!cc || !gk || !ck) return null;
  return parseFloat((cc * 0.2 + gk * 0.2 + ck * 0.6).toFixed(1));
};

export const getHe4 = (he10) => {
  if (he10 === null) return 0;
  if (he10 >= 9.0) return 4.0;
  if (he10 >= 8.5) return 3.7;
  if (he10 >= 8.0) return 3.5;
  if (he10 >= 7.0) return 3.0;
  if (he10 >= 6.5) return 2.5;
  if (he10 >= 5.5) return 2.0;
  if (he10 >= 5.0) return 1.5;
  if (he10 >= 4.0) return 1.0;
  return 0;
};