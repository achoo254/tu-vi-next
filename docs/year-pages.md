# Trang "Tử vi 2027" và bảng sao hạn

Các trang `/tu-vi-2027` (cả năm, 12 con giáp) và `/tu-vi-2027/tuoi-<con giáp>` (`ty`, `suu`, `dan`, `mao`, `thin`,
`ti` là Tỵ, `ngo`, `mui`, `than`, `dau`, `tuat`, `hoi`). Số liệu tính được, cộng phần luận giải viết sẵn (sáu mục) ở
[`content/interpretation/year-2027/`](../content/interpretation/SOURCES.md); mục nào rỗng thì không hiện.
Năm của trang và năm lưu niên mặc định trên lá số: `FEATURED_YEAR` trong
[`year-routes.ts`](../apps/web/src/year/year-routes.ts).

## HTML thật cho máy tìm kiếm

Site là SPA tĩnh sau nginx. Không thêm server render; các trang được render **một lần lúc build**:

1. `vite build` (bản cho trình duyệt), rồi `vite build --ssr src/year/year-prerender.tsx --outDir dist-ssr`: cùng
   component React, chạy trên Node, URL ảnh trùng bản trình duyệt.
2. [`prerender.ts`](../apps/web/prerender.ts) lấy `dist/index.html` làm khuôn, thay `<title>`, description, canonical,
   `og:*`, `twitter:*`, thêm JSON-LD `Article`, đặt trang đã render vào `#root`, ghi `dist/<đường dẫn>/index.html`
   ([`vite-year-pages.ts`](../apps/web/vite-year-pages.ts)). Thiếu thẻ hay thiếu trang thì build hỏng.
3. nginx: `try_files $uri $uri/index.html /index.html` (đã thử với nginx cục bộ: `/tu-vi-2027/tuoi-mui` và có `/`
   cuối đều trả trang đã render, đường dẫn khác vẫn là SPA). **Phải chạy `infra/deploy.sh setup` một lần** để cài
   cấu hình nginx mới trước (hoặc cùng) bản release này.
4. Trên trình duyệt, `main.tsx` tải chunk của trang trước rồi mới render, nên HTML có sẵn ở lại tới khi React thay
   bằng đúng trang đó (đổi được sang tiếng Anh). Chunk không tải được thì trang tĩnh vẫn đọc được.

Khi `pnpm dev` (và E2E), plugin trong `vite-year-pages.ts` render đúng HTML đó cho mỗi lần gọi.
Ảnh xem trước: con giáp 256 px (thẻ `summary`), trang tổng dùng `og-image.png`. Sitemap: `apps/web/public/sitemap.xml`.

## Quy tắc và nguồn

Hàm thuần trong [`year-fortune.ts`](../packages/chart/src/year-fortune.ts) (`@tuvi/chart/year`, không kéo iztro hay lịch):

| Mục | Quy tắc | Nguồn |
|---|---|---|
| Sao chiếu mệnh (Cửu Diệu) | Theo (tuổi mụ − 1) mod 9. Nam: La Hầu, Thổ Tú, Thủy Diệu, Thái Bạch, Thái Dương, Vân Hán, Kế Đô, Thái Âm, Mộc Đức. Nữ: Kế Đô, Vân Hán, Mộc Đức, Thái Âm, Thổ Tú, La Hầu, Thái Dương, Thái Bạch, Thủy Diệu | [Báo Hà Tĩnh](https://baohatinh.vn/cach-tinh-sao-va-han-trong-nam-2016-it-nguoi-biet-den-post109444.html) (48 tuổi: nam Thủy Diệu, nữ Mộc Đức) |
| Hạn (Bát Hạn) | Vòng Huỳnh Tuyền, Tam Kheo, Ngũ Mộ, Thiên Tinh, Toán Tận, Thiên La, Địa Võng, Diêm Vương. Nam: 10 tuổi tại Huỳnh Tuyền, mỗi chục tiến một, mỗi năm lẻ tiến một. Nữ: 10 tuổi tại Toán Tận, đi ngược | [Báo La Văn Sử](https://www.baolavansu.com/61/1931/cach-tinh-han-huynh-tuyen.html) (58 tuổi: nam Toán Tận, nữ Huỳnh Tuyền) |
| Dưới 10 tuổi mụ | Không tính (bảng in sẵn bắt đầu từ 10) | như trên |
| Tam hợp, lục hợp, lục xung, tứ hành xung | Thân Tý Thìn…; Tý–Sửu…; chi đối diện; Tý Ngọ Mão Dậu… | [boi.vn](https://boi.vn/luc-hop-luc-pha-luc-hai/), [4T Human](https://4thuman.com/huyen-hoc-phuong-dong/bat-tu/moi-quan-he-xung-hop-cua-dia-chi/), [Điện Máy Xanh](https://www.dienmayxanh.com/kinh-nghiem-hay/nam-2027-la-nam-con-gi-1587259) (Mùi hợp Hợi, Mão; xung Thìn Tuất Sửu) |
| Gặp Thái Tuế | trực (cùng chi), xung (lục xung), hình (Dần–Tỵ–Thân, Sửu–Tuất–Mùi, Tý–Mão; tự hình Thìn Ngọ Dậu Hợi), hại (lục hại Tý–Mùi, Sửu–Ngọ, Dần–Tỵ, Mão–Thìn, Thân–Hợi, Dậu–Tuất), phá (lục phá Tý–Dậu, Sửu–Thìn, Dần–Hợi, Mão–Ngọ, Tỵ–Thân, Mùi–Tuất) | boi.vn, 4T Human |
| Nạp âm (mệnh của năm) | Bảng 30 nạp âm theo cặp năm từ Giáp Tý (1984) | Điện Máy Xanh: 2027 Đinh Mùi Thiên Hà Thủy |
| Tết, tháng nhuận | Lịch âm Việt Nam của app (UTC+7): Tết 6/2/2027, năm kéo dài tới 25/1/2028, không nhuận | `year-content.test.ts` tính lại bằng `@tuvi/chart`; Điện Máy Xanh ghi cùng ngày |

Năm 2027 gặp Thái Tuế: Mùi (trực), Sửu (xung, hình), Tuất (hình, phá), Tý (hại). Một bài báo (ngoisao.vn) kể thêm
Thìn mà không nêu quan hệ nào; theo năm quy tắc trên Thìn không phạm, app không liệt kê.

## Đối chiếu

[`year-fortune.test.ts`](../packages/chart/src/year-fortune.test.ts) so **đủ 71 năm sinh × nam/nữ** của bảng sao hạn
2027 trên [ngaydep.com](https://ngaydep.com/xem-sao-chieu-menh-va-han-nien-nam-2027.html) (khớp hết) và 9 dòng bảng
2026 của Điện Máy Xanh (khớp). Một trang khác (hoatieu.vn) ghi 1966 nam năm 2026 là Thái Âm; theo cả quy tắc lẫn Điện
Máy Xanh là Kế Đô (61 tuổi), app theo Kế Đô.

Giọng: sao, hạn, Thái Tuế trình bày là "lưu ý" nhẹ nhàng, không doạ, kèm câu "quan niệm dân gian, mang tính giải trí,
tham khảo" (quyết định trong plan).
