# Nguồn của "Quẻ hôm nay"

- `que.json` là **nội dung tự viết**, hoàn thành ngày 31/10/2026: 64 quẻ, mỗi quẻ có tên, hai câu thơ theo thể lục bát,
  một đoạn ý nghĩa bằng lời thường và một lời nhắn cho hôm nay. Không chép hay diễn đạt sát sách, trang web hay bộ
  quẻ nào có sẵn; đây không phải quẻ Kinh Dịch hay xăm của đền chùa nào.
- `stars` có một câu cho mỗi chính tinh ở cung Mệnh (tên đúng như engine in ra), `noMajorStar` cho cung Mệnh vô chính
  diệu. Ý của sao theo cùng quy ước với `content/interpretation/` (xem `SOURCES.md` ở đó).
- Giọng văn giống phần luận giải: tích cực, cân bằng, không đoán điều xấu, không gây sợ hãi. Lời nhắn là việc nhỏ làm
  được ngay trong ngày; không có lời khuyên y tế, tài chính hay pháp lý. Nội dung chỉ để **giải trí và tham khảo**.
- Văn bản lưu tĩnh trong repo; app không gọi AI lúc chạy.

## App đọc tệp thế nào

`apps/web/src/que/que-content.ts` kiểm tệp theo schema (chunk riêng, tải khi thẻ quẻ hiện).
`apps/web/src/que/que-pick.ts` chọn quẻ theo (id lá số đã lưu, ngày giờ Việt Nam): cả ngày cùng một quẻ, sang ngày
mới thì đổi, và không trùng quẻ của hôm trước. Thêm hay bớt quẻ làm đổi quẻ của mọi người từ hôm đó, nên chỉ thêm khi
thật cần.
