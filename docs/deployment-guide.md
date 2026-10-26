# Triển khai Tử Vi (`tuvi.hoandat.com`)

Runbook deploy của repo này. Quy tắc chung của hệ sinh thái (tên, IdP, brand, box `.65` dùng chung):
`docs/ecosystem-architecture.md` của workspace `hoandat-app`. Repo public: không ghi IP, cổng SSH hay user máy chủ
vào đây; dùng alias SSH (`SSH_TARGET`) và placeholder như `<SERVER_65_IP>`.

## Kiến trúc chạy

| Phần | Ở đâu |
|---|---|
| Web (React + Vite, tĩnh) | `/var/www/tuvi/current/apps/web/dist`, nginx phục vụ trực tiếp |
| API (Node, Express 5, một file bundle) | systemd `tuvi-server`, loopback `127.0.0.1:5290`, Node 22 ở `/opt/node22` |
| Database | Postgres đang chạy trên `.65`, database `tuvi`, role `tuvi`; migration chạy khi server khởi động |
| Đường vào | Cloudflare (proxied, SSL "full") → nginx `conf.d/tuvi.hoandat.com.conf` → `/api/`, `/auth/`, `/healthz` sang API |
| Đăng nhập | client BFF `tuvi-web` trên `auth.hoandat.com`, scope `openid`, callback `https://tuvi.hoandat.com/auth/callback` |

Lá số được tính trên trình duyệt; server chỉ giữ phiên đăng nhập và dữ liệu đầu vào của lá số đã lưu, nên nhẹ.
Unit giới hạn `MemoryHigh=160M`, `MemoryMax=256M`.

Các file: [`infra/nginx/tuvi.hoandat.com.conf`](../infra/nginx/tuvi.hoandat.com.conf),
[`infra/tuvi-server.service`](../infra/tuvi-server.service), [`infra/deploy.sh`](../infra/deploy.sh).

## Biến môi trường

Mẫu: [`.env.example`](../.env.example). Giá trị thật nằm ở thư mục env trên iCloud (`ENV production/tu-vi-next/`),
không bao giờ trong repo. Trên server là `/etc/tuvi/production.env` (`root:tuvi`, 640).

| Biến | Production |
|---|---|
| `NODE_ENV` | `production` (bắt buộc có `DATABASE_URL`, `AUTH_CLIENT_SECRET`, `PUBLIC_URL` https) |
| `PORT` | `5290` (kiểm còn trống trước khi cài: `ss -ltnp \| grep 5290`) |
| `PUBLIC_URL` | `https://tuvi.hoandat.com` |
| `DATABASE_URL` | `postgres://tuvi:<mật khẩu>@127.0.0.1:5432/tuvi` |
| `AUTH_ISSUER` | `https://auth.hoandat.com` |
| `AUTH_CLIENT_ID` | `tuvi-web` |
| `AUTH_CLIENT_SECRET` | secret của client `tuvi-web`, cùng giá trị với `TUVI_WEB_CLIENT_SECRET` trên IdP (≥ 32 ký tự) |

## Lần đầu

1. **IdP:** trên `auth-next` đặt `TUVI_WEB_CLIENT_SECRET` (client `tuvi-web`, redirect
   `https://tuvi.hoandat.com/auth/callback`) rồi deploy lại IdP. Việc này thuộc repo `auth-next`.
2. **DNS:** bản ghi `A` `tuvi.hoandat.com` **proxied** trỏ về `<SERVER_65_IP>` (cách gọi Cloudflare API: runbook của
   `miu-world-next`, mục DNS). Kiểm: `dig +short A tuvi.hoandat.com @1.1.1.1` trả IP của Cloudflare.
3. **Database** (trên `.65`, hỏi người trước):

   ```sh
   sudo -u postgres psql -c "CREATE ROLE tuvi LOGIN PASSWORD '<mật khẩu>'"
   sudo -u postgres createdb -O tuvi tuvi
   ```

   Thêm dòng `host tuvi tuvi 127.0.0.1/32 scram-sha-256` vào `pg_hba.conf` (cạnh các dòng của sản phẩm khác) rồi
   `systemctl reload postgresql`. Không tạo instance Postgres mới.
4. **Env:** ghi `/etc/tuvi/production.env` từ thư mục env trên iCloud qua ssh stdin, không in giá trị ra màn hình.
5. **Cài unit và nginx:** `SSH_TARGET=<alias> bash infra/deploy.sh setup`. Chạy lại sau khi sửa unit hay site nginx:
   unit đổi thì service đang chạy được restart ngay.
6. **Release:** `SSH_TARGET=<alias> bash infra/deploy.sh`.

## Release

```sh
SSH_TARGET=<alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh
```

Script từ chối chạy khi cây làm việc còn thay đổi chưa commit (`git status --porcelain` khác rỗng): bản release mang
tên commit `HEAD` nên phải đúng là `HEAD`. Sau đó chạy `pnpm lint`, `typecheck`, `test`, `build` trên máy dev, đẩy `apps/web/dist`, `apps/server/dist`,
`apps/server/drizzle` vào `/var/www/tuvi/releases/<thời điểm>-<commit>`, trỏ `current` sang bản mới, restart
`tuvi-server`, rồi kiểm `/healthz` trên loopback và `https://tuvi.hoandat.com/` qua origin. Một trong hai bước kiểm
hỏng thì script tự trỏ `current` về bản trước, restart, in log và thoát mã 1. Giữ 5 bản gần nhất. Gói release không
chứa `._*` hay `.DS_Store` (`COPYFILE_DISABLE=1` và `--exclude`).
Server không cần `pnpm install`: bundle đã gồm mọi thư viện.

Kiểm sau release:

- `curl -fsS https://tuvi.hoandat.com/healthz` trả `ok`.
- Đăng nhập rồi đăng xuất được; lưu một lá số, tải lại trang, mở lại được.
- RSS của service (mục tiêu < 120 MB): `systemctl show tuvi-server -p MemoryCurrent`.

## Rollback

Release hỏng tự quay về bản trước (mục Release). Quay về tay:

```sh
ssh <alias> 'cd /var/www/tuvi && ls -1dt releases/*/'          # chọn bản trước
ssh <alias> 'cd /var/www/tuvi && ln -sfn releases/<bản trước> current && systemctl restart tuvi-server'
```

Migration chỉ thêm bảng/cột; bản cũ chạy được trên schema mới (migration đã chạy thì vẫn giữ khi quay về).

## Cache trình duyệt

`index.html` và các file không băm trả `Cache-Control: no-cache`; `/assets/` (tên có hash) cache một năm. Sau mỗi
release, trang mở từ bản trước không tải được chunk engine cũ (đã xoá): web tự tải lại trang một lần rồi mới báo lỗi. Gỡ hẳn app: `systemctl disable --now tuvi-server`,
xoá `/etc/nginx/conf.d/tuvi.hoandat.com.conf` (`nginx -t` rồi reload), xoá bản ghi DNS, gỡ `TUVI_WEB_*` trên IdP.

## Log

`journalctl -u tuvi-server`; nginx: `/var/log/nginx/tuvi.hoandat.com.{access,error}.log`. Log của server chỉ ghi
lỗi và trạng thái đăng nhập, không ghi ngày sinh hay tên: lỗi truy vấn chỉ ghi mã và thông báo của Postgres, không
ghi câu SQL hay tham số (`apps/server/src/log-error.ts`, có test). Phiên hết hạn bị xoá khi server khởi động, mỗi giờ
và mỗi lần đăng nhập. Mất kết nối Postgres (Postgres chung restart) không làm sập service.
