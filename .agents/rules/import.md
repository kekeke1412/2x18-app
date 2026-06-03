---
trigger: always_on
---

"Khi hoàn thành một phiên vibe coding, khi một tính năng vừa được code chạy thành công, hoặc khi tôi yêu cầu 'xong', bạn phải tự động thực hiện chuỗi lệnh Git sau:

Chạy git status để kiểm tra thay đổi.

Chạy git add . để đưa tất cả thay đổi vào vùng staging.

Tự động phân tích code diff để tạo một commit message ngắn gọn, tóm tắt chính xác những thay đổi vừa làm. Sau đó chạy git commit -m "<message>".

Chạy git push để đẩy code lên remote repository.
Hãy báo cáo lại trạng thái (thành công hoặc gặp lỗi conflict) sau khi hoàn thành chuỗi thao tác."