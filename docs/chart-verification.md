# Kiểm chứng lá số

Lá số do thư viện [`iztro`](https://github.com/SylarLong/iztro) 2.6.3 (MIT) an sao, gọi qua một module bọc duy nhất
[`packages/chart/src/astrolabe.ts`](../packages/chart/src/astrolabe.ts). Tài liệu này ghi những gì đã kiểm, kiểm
bằng gì, và những gì **chưa** kiểm được. Ngày kiểm: 26/10/2026.

## 1. iztro đổi lịch theo giờ Trung Quốc (UTC+8): đã xác nhận

- iztro đổi mọi ngày qua `lunar-lite` → `lunar-typescript` (lịch Trung Quốc). Không có tuỳ chọn múi giờ
  (`astro.config` chỉ có `yearDivide`, `horoscopeDivide`, `ageDivide`, `dayDivide`, `algorithm`, `mutagens`,
  `brightness`). `byLunar` cũng chỉ đổi ngày âm sang dương bằng lịch Trung Quốc rồi gọi `bySolar`.
- Từ 1/1/1968 đến 31/12/2099 có **1.859 ngày** mà ngày âm Việt Nam (UTC+7) khác ngày âm Trung Quốc; 116 ngày trong số
  đó (ngày 30 của tháng Trung Quốc chỉ có 29 ngày, hoặc tháng nhuận chỉ Việt Nam có như nhuận 2/1985, nhuận 7/1987)
  không tồn tại trong lịch Trung Quốc.

## 2. Cách làm: lịch Việt trước, iztro sau, không đụng can chi

1. Đổi ngày sinh sang **âm lịch Việt Nam** ([`vn-lunar-calendar.ts`](../packages/chart/src/vn-lunar-calendar.ts)):
   từ 8/8/1967 (nghị định đổi sang UTC+7 của miền Bắc) dùng thuật toán của Hồ Ngọc Đức ở múi giờ 7; trước đó dùng đúng
   lịch Trung Quốc của `lunar-lite` (lịch Việt khi ấy là lịch UTC+8). Hai lịch trùng nhau từ 8/8 đến 30/11/1967 nên
   mốc chuyển không tạo khe hở.
2. Lá số của iztro chỉ phụ thuộc can chi năm âm, tháng âm (tháng nhuận: 15 ngày đầu tính tháng đó, từ ngày 16 tính
   tháng sau, quy tắc `fixLeap` của iztro), ngày âm, canh giờ và giới tính. Module bọc đưa cho iztro một "ngày thay"
   có đúng các giá trị đó trong lịch Trung Quốc: chính ngày âm đó nếu Trung Quốc có, nếu không thì cùng tháng, cùng
   ngày ở năm cách 60·k năm (cùng can chi).
3. Can chi năm, tháng, ngày, giờ hiển thị trên lá số tự tính từ ngày âm Việt và ngày Julius, không lấy của iztro.

**Bằng chứng ngày thay không làm đổi lá số** ([`astrolabe.test.ts`](../packages/chart/src/astrolabe.test.ts)):

- Lá số iztro của một ngày và của cùng ngày âm 60 năm sau giống hệt nhau (so mọi cung, can chi cung, mọi sao, độ
  sáng, tứ hoá, Tràng Sinh, Bác Sĩ, đại hạn): đạt trên hơn 100 ngày mẫu 1970–2030. Lúc thăm dò đã chạy 1.456 ngày
  ngẫu nhiên 1968–2099, không lệch ngày nào.
- Ngày tháng nhuận cho lá số giống ngày tháng thường tương ứng (đến ngày 15: cùng tháng; từ ngày 16: tháng sau): kiểm
  cả 29 ngày của nhuận 2/2023; lúc thăm dò đã kiểm mọi ngày nhuận 1968–2099 (1.471 ngày), không lệch ngày nào.

Không có chỗ nào phải sửa iztro hay tự tính phần an sao.

## 3. Âm lịch Việt Nam: đối chiếu bảng đã công bố

Test [`vn-lunar-calendar.test.ts`](../packages/chart/src/vn-lunar-calendar.test.ts):

| Ngày dương | Âm lịch Việt | Âm lịch Trung Quốc | Nguồn |
|---|---|---|---|
| 29/1/1968 | 1/1 Mậu Thân | 30/12 Đinh Mùi | Wikipedia "Vietnamese calendar" (Tết 1968 hai miền khác ngày sau khi miền Bắc đổi UTC+7) |
| 16/2/1969 | 1/1 Kỷ Dậu | 30/12 Mậu Thân | Bài RFA 2007 (năm 1969, 1985, 2007 Tết lệch) |
| 21/1/1985 | 1/1 Ất Sửu | 1/12 Giáp Tý | Wikipedia "Vietnamese calendar": Tết Việt 21/1/1985, Tết Trung Quốc 20/2/1985 |
| 21/3/1985 – 19/4/1985 | tháng 2 nhuận | tháng 2 | Wikipedia: tháng nhuận của lịch Việt 21/3 – 19/4/1985 |
| 17/2/2007 | 1/1 Đinh Hợi | 30/12 Bính Tuất | RFA 7/2/2007; Báo Lâm Đồng "Âm Dương lịch ngày 17/02/2007" |

Nguồn: <https://en.wikipedia.org/wiki/Vietnamese_calendar>,
<https://www.rfa.org/vietnamese/in_depth/WhyVietnameseLunarCalendarDiffersFromChina_GMinh-20070207.html>,
<https://baolamdong.vn/am-duong-lich-ngay-17-thang-2-nam-2007.html>.

Thêm: đổi dương → âm → dương khớp cho **mọi ngày** 1901–2099; ngày âm liên tiếp đúng thứ tự. Thuật toán gốc của
Hồ Ngọc Đức trả "ngày 0" ở 7/5/2054 và 9/4/2062 (ước lượng kỳ trăng mới lệch một); module tìm trăng mới gần nhất nên
hai ngày đó đúng, các ngày khác không đổi.

## 4. Các biên đã có test

- **Lập Xuân:** năm lá số đổi ở Tết, không ở Lập Xuân (`yearDivide: 'normal'`). 5/2/2024 và 9/2/2024 (sau Lập Xuân,
  trước Tết) vẫn là Quý Mão; 10/2/2024 là Giáp Thìn. 21/1/1985 (Tết Việt, trước Lập Xuân) đã là Ất Sửu.
- **Canh giờ:** quy ước duy nhất, ghi ngay dưới ô giờ sinh: giờ Tý từ 23:00 đến 00:59 và mở đầu ngày mới; sinh
  23:00–23:59 tính là giờ Tý của **ngày hôm sau**. 23:30 ngày 16/2/2007 cho đúng lá số của 00:30 ngày 17/2/2007 (mùng
  1 Tết Đinh Hợi); 22:59 vẫn là giờ Hợi ngày 16/2. iztro có "giờ Tý muộn" (chỉ số 12) xử lý lệch nhau giữa các bước;
  app không dùng chỉ số đó.
- **Ngày không tồn tại:** 29/2/2023, 31/4/2023, ngày 30 tháng Giêng 2023 âm lịch (tháng thiếu), tháng 10 nhuận 1984 (chỉ
  Trung Quốc có) đều bị từ chối với thông báo riêng; server cũng từ chối lưu chúng.
- **Toàn vẹn:** đủ 12 cung khác tên, một cung Mệnh, một cung Thân, đủ 14 chính tinh mỗi sao một lần, đại hạn 10 năm.

## 5. Lá số mẫu để đối chiếu

| Ngày giờ sinh | Âm lịch Việt | Mệnh | Thân | Cục | Mệnh chủ / Thân chủ | Tử Vi tại |
|---|---|---|---|---|---|---|
| 16/8/2000 03:30, nam | 17/7 Canh Thìn, giờ Dần | Ngọ (Tử Vi) | Tuất | Mộc Tam Cục | Phá Quân / Văn Xương | Ngọ |
| 17/2/2007 10:00, nữ | 1/1 Đinh Hợi, giờ Tỵ | Dậu (vô chính diệu) | Mùi | Thổ Ngũ Cục | Văn Khúc / Thiên Cơ | Ngọ |
| 25/3/1985 14:20, nam | 5/2 nhuận Ất Sửu, giờ Mùi | Thân (vô chính diệu) | Tuất | Thủy Nhị Cục | Liêm Trinh / Thiên Tướng | Mão |

Lá số thứ nhất khớp ví dụ trong README của iztro (Mệnh tại Ngọ có Tử Vi).

## 6. Chưa kiểm được

- **Đối chiếu với 2 trang lập lá số tử vi Việt (việc 4 của phase 3): chưa làm.** Các trang tìm được (yeutuvi.com,
  tuvi.vn…) chỉ lập lá số qua form và JavaScript, công cụ của phiên làm việc không gửi form được. Cần người (hoặc phiên
  có trình duyệt được phép) nhập 3 lá số ở mục 5 trên hai trang và ghi kết quả vào đây.
- **Khác biệt trường phái có thể gặp (chưa có nguồn, chưa sửa):** app dùng cấu hình mặc định của iztro. Những điểm
  nên so khi đối chiếu ở trên:
  - Mệnh chủ, Thân chủ: iztro (mặc định) lấy Mệnh chủ theo chi của cung Mệnh; nhiều sách tử vi Việt có thể an theo
    chi năm sinh. iztro có `algorithm: 'zhongzhou'` lấy theo chi năm.
  - Tứ hoá theo can năm, nhất là năm Canh và Nhâm, là chỗ các phái hay khác nhau; iztro cho phép đổi bảng
    (`config.mutagens`).
  - Tên một số sao phụ trong dữ liệu vi-VN của iztro (Tuần/Triệt tách thành Tuần Trung, Tuần Không, Triệt Lộ, Không
    Vong…; Bác Sỹ, Lực Sỹ) có thể khác cách gọi quen thuộc.

  Chỉ đổi khi có nguồn tử vi Việt nói rõ, và thêm test cho chỗ đổi.
- **Miền Nam 1968–1975** dùng lịch UTC+8; người sinh ở miền Nam giai đoạn này có thể có ngày âm lệch một ngày so với
  app ở các ngày hai lịch khác nhau. App theo lịch chính thức (miền Bắc rồi cả nước).
- **Năm ngoài 1901–2099** không nhận (giới hạn của bảng và thuật toán đã kiểm).

## 7. Lưu niên (vận hạn năm trên lá số)

`yearHoroscope(chart, năm âm)` trong [`astrolabe.ts`](../packages/chart/src/astrolabe.ts) lấy `horoscope()` của iztro:
Lưu Mệnh, Tiểu hạn, Đại hạn đang chạy, lưu tứ hóa. iztro tính tuổi mụ và Đại hạn từ năm sinh của **ngày thay**, nên
năm được hỏi cũng dời đúng 60·k năm như ngày thay (cùng can chi, cùng tuổi mụ), lấy ngày mùng 1 tháng 6 âm của năm đó
cho xa ranh giới Tết. Test [`year-horoscope.test.ts`](../packages/chart/src/year-horoscope.test.ts):

- khớp iztro gọi thẳng bằng ngày thật (ba lá số mà lịch Việt và Trung Quốc trùng nhau, năm 2026, 2027, 2028, 2031, 2045);
- năm lá số mẫu × 11 năm mỗi lá số, đúng quy tắc sách: Lưu Mệnh tại chi của năm; Tiểu hạn khởi tuổi 1 tại Tuất (Thân
  Tý Thìn), Mùi (Tỵ Dậu Sửu), Thìn (Dần Ngọ Tuất), Sửu (Hợi Mão Mùi), nam thuận nữ nghịch; Đại hạn là cung chứa tuổi
  mụ; lưu tứ hóa theo can năm (bảng mặc định của iztro, năm Canh: Dương Vũ Âm Đồng);
- hai lá số ngày 30 âm mà Trung Quốc không có (30/1/1985, 30/5/1984; ngày thay cách 60 năm) vẫn đúng các quy tắc trên;
- trước Đại hạn đầu (tuổi mụ nhỏ hơn số cục) không có Đại hạn; năm trước năm sinh bị từ chối.

Lá số 16/8/2000 03:30 nam, năm 2027: tuổi mụ 28, Lưu Mệnh Mùi, Tiểu hạn Sửu, Đại hạn Thân (23–32), lưu Lộc Thái Âm,
Quyền Thiên Đồng, Khoa Thiên Cơ, Kỵ Cự Môn.

## 8. Kích thước

Đo bằng `vite build` (chunk riêng của engine, tải khi cần): **487 KB, gzip 154,4 KB** (lưu niên thêm 0,01 KB). Riêng `iztro` cùng thư viện nó
kéo theo đã là 146 KB gzip (đo bằng esbuild: `lunar-typescript` 100 KB, `i18next` và 6 ngôn ngữ của iztro phần lớn còn
lại); phần của app (lịch Việt, module bọc, `zod/mini`) khoảng 10 KB. Mức này được chấp nhận (26/10/2026) vì engine tải
lười: trang tải trước JS chính 93 KB gzip (bundle chính 84 KB và hai chunk dùng chung 6,6 KB, 2,4 KB; đo 26/10/2026), engine
tải khi vào trang lập lá số; trang pháp lý (4 KB) và trang Tử vi theo năm (7,4 KB) có chunk riêng, không tải engine.
