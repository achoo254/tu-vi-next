# Nguồn và bản quyền của nội dung luận giải

- Toàn bộ văn bản trong thư mục này là **nội dung tự viết**, hoàn thành ngày 26/10/2026. Không có câu nào chép lại hay diễn đạt sát theo sách hoặc trang web nào.
- Ý nghĩa các sao, các cung và Tứ Hóa theo **quy ước của trường phái Tử Vi Đẩu Số Tân Biên** (Vân Đằng Thái Thứ Lang), là tài liệu tham khảo phổ biến nhất ở Việt Nam. Chỉ dùng những ý nghĩa chung, ai cũng biết, rồi viết lại bằng giọng văn hiện đại, tích cực, hướng tới việc tự hiểu bản thân.
- Giọng văn cân bằng: nói điểm mạnh trước, coi thử thách là xu hướng kèm lời khuyên thiết thực, không đưa ra lời đoán gây sợ hãi.
- Nội dung chỉ dùng để **giải trí và tham khảo**. Đây không phải lời khuyên về y tế, tài chính hay pháp lý.

## Các tệp

- `palaces.json`: ý nghĩa 12 cung.
- `stars.json`: 14 chính tinh, kèm cách sao thể hiện theo 7 mức sáng (Miếu, Vượng, Đắc, Lợi, Bình, Bất, Hãm).
- `star-in-palace.json`: 14 chính tinh ở 12 cung.
- `tu-hoa.json`: Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ ở 12 cung.
- `cuc.json`: năm cục.
- `year-2027/`: tổng quan năm Đinh Mùi 2027 cho 12 con giáp.

## App đọc các tệp thế nào

- Lá số: `apps/web/src/interpretation/corpus.ts` kiểm từng tệp theo schema rồi tra theo trường `name` (đúng tên engine
  in ra), tải thành chunk riêng khi lá số hiện. Test `corpus.test.ts`: mọi chính tinh × cung × độ sáng, mọi tứ hóa ×
  cung đều có chữ, và mọi thứ engine sinh ra trên khoảng 400 lá số đều tra được.
- `year-<năm>/<slug>.json` (slug như trong `apps/web/src/year/year-routes.ts`): `branch`, `animal`, `year`,
  `year-name`, `relation` (giữ trong tệp, không hiện), rồi sáu mục `overview`, `career`, `money`, `love`, `health`,
  `advice` (Tổng quan, Công việc, Tài chính, Tình cảm gia đình, Sức khỏe, Lời khuyên). Văn bản thuần, đoạn cách nhau
  bằng một dòng trống. Mục rỗng thì không hiện, không bao giờ để chữ giữ chỗ.
