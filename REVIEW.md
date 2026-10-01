# Rà soát và vận hành

## Đã sửa

- Firebase: bỏ ghi lại toàn bộ danh sách khi nhận snapshot, dùng một nguồn subscription. Cập nhật từng bản ghi, hỗ trợ khóa số cũ và ID mới, giữ trường chưa biết.
- Thùng rác: lưu bản sao trước khi xóa; có sửa đồng thời thì giữ bản gốc và báo lỗi. Khôi phục trước khi xóa bản sao; chặn ghi đè ID đang tồn tại. Dọn các mục đã chọn không xóa mục mới đến.
- Google: hộp thoại cấp quyền có nút người dùng bấm, xử lý token hết hạn và thiếu scope. Token chỉ ở bộ nhớ và có hạn dùng.
- Báo cáo: DeepSeek phân loại tiêu đề và mô tả, kiểm tra JSON/loại/tags/điểm, lưu khi xác nhận. Không giả kết quả AI khi API lỗi. Không đọc PDF; confidence là điểm AI tự đánh giá chưa hiệu chuẩn.
- AI server: xác thực Firebase và thành viên active, giới hạn kích thước/context/token/thời gian/yêu cầu. Khóa chỉ ở server; cache phân loại theo người dùng giảm gọi lặp.
- Thông báo: đọc riêng từng thành viên, tránh phát lại lịch sử, một timer nhắc lịch gần nhất. Xin quyền khi người dùng bấm nút.
- Biểu mẫu chờ xác nhận lưu và giữ nội dung nếu lỗi. Sửa vòng lặp khi bộ thẻ từ vựng không tồn tại; chia bundle theo trang.

## Bảo toàn dữ liệu

Không chạy migration, reset mùa, xóa hoặc ghi vào Firebase production trong kiểm thử. Firebase dùng adapter/mock. Không thay khóa số cũ hàng loạt. Nếu dọn bản sao thất bại có thể giữ cả bản gốc và thùng rác để tránh mất dữ liệu. Reset mùa lưu lịch sử và reset trong cùng transaction.

## Chạy và triển khai AI

Node.js 22+: `npm ci`, `npm run dev`. Vite phục vụ cả frontend và `/api/ai` local. Tạo `.env.local` theo `.env.example`, đặt `DEEPSEEK_API_KEY`; không đặt khóa trong `VITE_*` hoặc commit. Vercel dùng build `npm run build`, output `dist`, function `api/ai.js`; đặt khóa ở Environment Variables của Vercel. Model mặc định `deepseek-chat`/`deepseek-reasoner`, có thể cấu hình model được tài khoản hỗ trợ. OAuth cần Authorized Domains, bật Calendar/Drive API và cấu hình consent screen.

## Cần xác minh trước production

- Chưa có DeepSeek key và chưa thử Google OAuth bằng tài khoản thật.
- Không có Firebase Security Rules production trong repo. Cần kiểm tra rules cho vai trò, hồ sơ/điểm và `readBy`; kiểm tra quyền frontend không thay thế rules. Không mở quyền database để chữa lỗi. Reset mùa cần transaction root và thất bại an toàn khi thiếu quyền.
- Rate limit AI theo process; nhiều instance cần bộ giới hạn dùng chung. Điểm thưởng là tác vụ sau thao tác chính, chưa đảm bảo đúng một lần khi mất mạng; lỗi được báo và dữ liệu chính vẫn giữ.
- Nhắc lịch cần ứng dụng mở; chưa có backend Web Push khi đóng ứng dụng. Service worker không cache API riêng tư.
- Nhiều file cũ còn `@ts-nocheck`; typecheck/lint không chứng minh toàn bộ mã có kiểu chặt chẽ. Kiểm thử trang dùng dữ liệu rỗng, chưa thay thế thử nhiều người dùng thật.
- Chưa đo năng lượng thiết bị. Giảm subscription trùng, ghi toàn danh sách, timer và tải ban đầu giảm công việc thừa; cần đo để định lượng.

## Kiểm tra

Chạy `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Tests kiểm tra thùng rác/dữ liệu, AI/API, OAuth, provider, 14 trang và lỗi lưu báo cáo; không gửi dữ liệu thật tới DeepSeek.
