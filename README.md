# Tử Vi

Thư mục repo: `tu-vi-next` (tên hiển thị lấy từ [`brand.config.json`](brand.config.json), không có hậu tố `-next`).
Chạy tại `https://tuvi.hoandat.com`, thuộc tầng giải trí của hệ sinh thái hoandat.com.

Nhập ngày giờ sinh (dương hoặc âm lịch) để lập lá số tử vi 12 cung bằng tiếng Việt, xem lưu niên (mặc định 2027) trên
lá số, bấm vào từng sao để đọc nghĩa ngắn, xuất lá số thành ảnh PNG 1080×1350 để chia sẻ, hoặc bấm "Làm video lá số" để mở mẫu "Lá số tử vi" của Clip
(video dọc 9:16) đã điền sẵn con giáp, chính tinh ở Mệnh, cục và một câu luận giải; link chỉ mang các giá trị đó và tên,
không mang ngày giờ sinh (`apps/web/src/chart/chart-video-link.ts`). Âm lịch tính theo giờ Việt Nam (UTC+7). Chưa đăng nhập thì mọi
thứ nằm trên trình duyệt; đăng nhập tài khoản hoandat.com thì lưu được tối đa 50 lá số. Nội dung mang tính giải trí,
tham khảo.

## Cấu trúc

| Thư mục | Vai trò |
|---|---|
| [`packages/chart`](packages/chart) | `@tuvi/chart`: âm lịch Việt Nam và lớp bọc duy nhất quanh `iztro` ([`astrolabe.ts`](packages/chart/src/astrolabe.ts)); chạy được trên trình duyệt và Node |
| [`apps/web`](apps/web) | `@tuvi/web`: React 19 + Vite. Form, bàn lá số 4×4 (màn hẹp thành danh sách cung), nghĩa sao, xuất PNG, Web Share, trang pháp lý |
| [`apps/server`](apps/server) | `@tuvi/server`: Express 5 + drizzle + Postgres (PGlite khi dev/test). Đăng nhập BFF qua auth-next, phiên riêng, `/api/charts`, `/healthz` |
| [`infra`](infra) | nginx, unit systemd, script deploy |
| [`brand`](brand) | Biểu tượng AI gốc và các file sinh từ nó (`pnpm brand:gen`) |

Lá số được kiểm thế nào, chỗ nào chưa kiểm: [`docs/chart-verification.md`](docs/chart-verification.md).
Trang "Tử vi 2027" theo con giáp (render sẵn lúc build cho máy tìm kiếm) và nguồn của bảng sao hạn:
[`docs/year-pages.md`](docs/year-pages.md).
Deploy và rollback: [`docs/deployment-guide.md`](docs/deployment-guide.md).

## Chạy

Cần Node và pnpm theo `engines`, `packageManager` trong [`package.json`](package.json).

```sh
pnpm install
pnpm dev          # API ở 127.0.0.1:5290 (PGlite trong .data/), web ở http://localhost:5291
```

Đăng nhập khi dev: đặt `AUTH_CLIENT_SECRET` (và các biến khác theo [`.env.example`](.env.example)) trong
`apps/server/.env`, giá trị lấy từ thư mục env ngoài repo. Không đặt thì app vẫn lập và xuất lá số, nút đăng nhập ẩn.

## Kiểm tra

```sh
pnpm lint        # eslint + check:brand (không viết cứng tên app) + check:tokens (màu chỉ ở tokens.css, tương phản WCAG AA)
pnpm typecheck
pnpm test        # vitest: lõi lá số, server (PGlite), web (jsdom)
pnpm build       # web (vite) + bundle server (esbuild)
pnpm e2e         # Playwright: web + API thật, IdP giả chỉ có trong test
```

Máy dev dùng chung: không chạy hai việc nặng (test, build, install) cùng lúc.

## Ghi công và giấy phép

Mã nguồn theo giấy phép MIT ([`LICENSE`](LICENSE)). Lõi lá số: [`iztro`](https://github.com/SylarLong/iztro) (MIT);
lịch Trung Quốc: `lunar-lite`, `lunar-typescript` (MIT); âm lịch Việt Nam theo thuật toán đã công bố của Hồ Ngọc Đức;
[`ziwei-doushu`](https://github.com/Renhuai123/ziwei-doushu) (mã MIT) chỉ đọc tham khảo ý tưởng test, không chép mã
hay dữ liệu. Danh sách đầy đủ ở trang `/credits`.

Biểu tượng app ([`brand/app-icon-master-1024.png`](brand/app-icon-master-1024.png) và các file sinh từ nó) và hình
minh hoạ của lá số ([`apps/web/src/art`](apps/web/src/art/CREDITS.md): 12 con giáp, 14 huy hiệu chính tinh, nền,
khung, huy chương) không thuộc phạm vi MIT: AI-generated with OpenAI gpt-image for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).
Huy hiệu 12 cung, tứ hóa, ngũ hành cục, tranh trang chủ, nền ảnh xem trước link (`og-image.png`), hình danh sách trống
và trang 404 cũng không thuộc phạm vi MIT: AI-generated with open models (Qwen-Image, Z-Image-Turbo, FLUX.2 klein 4B; Apache-2.0) for the hoandat ecosystem; owned by hoandat, all rights reserved (not CC0).
