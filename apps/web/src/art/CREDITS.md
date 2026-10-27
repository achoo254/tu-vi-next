# Hình minh hoạ (`apps/web/src/art`)

| Thư mục | Nội dung |
|---|---|
| `zodiac/` | 12 con giáp lịch Việt (Tý chuột, Sửu trâu, Dần hổ, Mão mèo, Thìn rồng, Tỵ rắn, Ngọ ngựa, Mùi dê, Thân khỉ, Dậu gà, Tuất chó, Hợi lợn), mỗi con hai cỡ: 256 px và 64 px |
| `stars/` | 14 chính tinh dạng huy hiệu chòm sao, mỗi sao hai cỡ: 192 px và 48 px |
| `palaces/` | Huy hiệu 12 cung (Mệnh hoa sen, Phụ Mẫu hai ông bà, Phúc Đức đền thờ, Điền Trạch nhà, Quan Lộc mũ cánh chuồn, Nô Bộc đôi tay giúp nhau, Thiên Di đường và la bàn, Tật Ách hồ lô thuốc, Tài Bạch tiền vàng, Tử Tức nôi em bé, Phu Thê đôi nhẫn, Huynh Đệ bắt tay), 48 px; khoá theo tên cung trên lá số (`Tử Tức`) |
| `mutagens/` | Huy hiệu tứ hóa: Lộc (thỏi vàng nảy mầm), Quyền (gậy như ý), Khoa (cuộn giấy và bút lông), Kỵ (nút chỉ rối dưới mây đen), 48 px |
| `elements/` | Huy hiệu ngũ hành cục: Thủy (giọt nước), Mộc (cây non), Kim (chuông và thỏi vàng), Thổ (núi đất), Hỏa (lửa trên lư đồng), 96 px |
| `illustrations/` | Tranh trang chủ khi chưa đăng nhập (bánh xe 12 con giáp trên trời sao; `hero-640`, `hero-1200`), hình danh sách lá số trống (hộp cuộn giấy) và trang 404 (kính thiên văn), 192 px |
| `decor/` | Giấy nền bầu trời sao (`sky.webp`), khung trang trí bàn lá số (`frame.webp`), huy chương ô giữa (`medallion.webp`) |

Giấy phép (không thuộc phạm vi giấy phép MIT của mã nguồn):

- `zodiac/`, `stars/`, `decor/`: AI-generated with OpenAI gpt-image for the hoandat ecosystem; owned by hoandat, all
  rights reserved (not CC0).
- `palaces/`, `mutagens/`, `elements/`, `illustrations/` (và nền của `apps/web/public/og-image.png`): AI-generated with open models (Qwen-Image, Z-Image-Turbo, FLUX.2 klein 4B; Apache-2.0) for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).

Tạo ngày 26/10/2026 bằng `gpt-image-1.5`: con giáp và huy hiệu ở chất lượng medium/high, nền trong suốt; nền giấy,
khung và huy chương ở chất lượng high. Ảnh gốc PNG không đưa vào repo; các file ở đây là WebP đã thu nhỏ. Mọi chữ trên
lá số do code vẽ; hình minh hoạ không chứa chữ.

Bộ thứ hai vẽ ngày 26/10/2026 trên ComfyUI của máy nhà (skill `inet-artgen`, không tốn tiền theo ảnh):

- Huy hiệu cung, tứ hóa, ngũ hành cục, hình danh sách trống và 404: FLUX.2 klein 4B (`klein-edit`). Ảnh mẫu là huy
  hiệu sao Tử Vi để giữ cùng một bộ. Nền trắng được tách bằng tô loang từ mép ảnh (giữ nguyên cả đĩa huy hiệu, góc
  alpha 0).
- Tranh trang chủ: Qwen-Image (`qwen`, 1664 × 928). Ảnh xem trước link dùng lại tranh này, còn chữ do `pnpm
  brand:gen` vẽ.

Prompt và seed của từng ảnh nằm trong báo cáo của đợt vẽ (`plans/dattqh/reports/fullstack-261026-tuvi-offline-art.md`
ở repo workspace).
