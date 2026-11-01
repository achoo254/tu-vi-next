# Triển khai Tử Vi (`tuvi.hoandat.com`)

Runbook deploy của repo này. Quy tắc chung của hệ sinh thái (tên, IdP, brand, box `.65` dùng chung):
`docs/ecosystem-architecture.md` của workspace `hoandat-app`. Repo public: không ghi IP, cổng SSH hay user máy chủ
vào đây; dùng alias SSH (`SSH_TARGET`) và placeholder như `<SERVER_65_IP>`.

## Kiến trúc chạy

| Phần | Ở đâu |
|---|---|
| Web (React + Vite, tĩnh) | `/var/www/tuvi/current/apps/web/dist`, nginx phục vụ trực tiếp; trang `/tu-vi-2027…` là HTML render sẵn (`<path>/index.html`, [`year-pages.md`](year-pages.md)) |
| API (Node, Express 5, một file bundle) | systemd `tuvi-server`, loopback `127.0.0.1:5290`, Node 22 ở `/opt/node22` |
| Database | Postgres đang chạy trên `.65`, database `tuvi`, role `tuvi`; migration chạy khi server khởi động |
| Đường vào | Cloudflare (proxied, SSL "full") → nginx `conf.d/tuvi.hoandat.com.conf` → `/api/`, `/auth/`, `/healthz` sang API |
| Đăng nhập | client BFF `tuvi-web` trên `auth.hoandat.com`, scope `openid profile email`, callback `https://tuvi.hoandat.com/auth/callback`; tên, email, ảnh lấy từ userinfo lúc đăng nhập, lưu ở bảng `users` cho menu tài khoản |

Lá số và quẻ hằng ngày được tính trên trình duyệt; server chỉ giữ phiên đăng nhập, tên/email/địa chỉ ảnh của tài
khoản, dữ liệu đầu vào của lá số đã lưu và chuỗi ngày xem quẻ (bảng `que_streaks`: ngày gần nhất và số ngày liên
tiếp), nên nhẹ.
Unit giới hạn `MemoryHigh=160M`, `MemoryMax=256M`.

Các file: [`infra/nginx/tuvi.hoandat.com.conf`](../infra/nginx/tuvi.hoandat.com.conf),
[`infra/tuvi-server.service`](../infra/tuvi-server.service), [`infra/deploy.sh`](../infra/deploy.sh),
[`infra/activate-incoming.sh`](../infra/activate-incoming.sh), [`infra/setup-deploy-user.sh`](../infra/setup-deploy-user.sh),
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

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
7. **User CI:** tạo user hạn chế `tuvi-deploy` và secret của repo (mục Deploy tự động).

## Deploy tự động (CI)

**Mỗi lần push lên `main` là tự deploy.** `ci` (lint, typecheck, test, build) xanh thì `deploy.yml` chạy:

1. Job `build` (không có secret nào) cài thư viện, `pnpm build`, gói `apps/web/dist`, `apps/server/dist`,
   `apps/server/drizzle` thành artifact; mã bản dạng `YYYYMMDD-HHMMSS-<sha12>`.
2. Job `deploy` (environment `production`) chỉ tải artifact, rsync lên `/var/www/tuvi/ci-incoming/<mã bản>` bằng
   user `tuvi-deploy`, rồi chạy lệnh sudo duy nhất user đó có: `sudo -n /usr/local/sbin/tuvi-activate-incoming <mã bản>`.
3. Lệnh đó (bản cài của `infra/activate-incoming.sh`, root sở hữu) kiểm mã bản, chuyển bản tải lên vào thư mục chỉ
   root đọc được rồi mới kiểm (không link hay tệp đặc biệt; đủ `index.html`, bundle server, `drizzle/meta/_journal.json`),
   ghi mã bản vào `apps/web/dist/RELEASE`, đổi bản như mục Release, hỏng thì quay về bản trước và thoát mã khác 0.
4. Kiểm từ ngoài: `https://tuvi.hoandat.com/` trả 200, `/healthz` trả `ok`, `/RELEASE` trả đúng mã bản vừa lên.

User `tuvi-deploy` chỉ ghi được `/var/www/tuvi/ci-incoming` và chạy đúng lệnh trên qua sudo (`/etc/sudoers.d/tuvi-deploy`);
khoá trong `authorized_keys` có `restrict` (không forward, không pty). CI không đổi được nginx, unit hay script root:
những thứ đó chỉ đổi qua `deploy.sh setup`/`deploy.sh` chạy bằng root.

Secret của repo (Settings → Secrets → Actions): `DEPLOY_SSH_KEY` (khoá riêng ed25519 của `tuvi-deploy`),
`DEPLOY_KNOWN_HOSTS` (`ssh-keyscan -p <cổng> -t ed25519,ecdsa,rsa <máy chủ>`), `DEPLOY_HOST`, `DEPLOY_PORT`.

**Tạo hoặc đổi khoá** (lần đầu, hay khi lộ khoá):

```sh
ssh-keygen -t ed25519 -N '' -C tuvi-deploy -f tuvi-deploy
ssh <alias> 'bash /var/www/tuvi/infra/setup-deploy-user.sh' < tuvi-deploy.pub   # ghi đè khoá cũ
gh secret set DEPLOY_SSH_KEY -R achoo254/tu-vi-next < tuvi-deploy
rm tuvi-deploy tuvi-deploy.pub
```

`setup-deploy-user.sh` với stdin rỗng (`< /dev/null`) giữ khoá đang có, chỉ cài lại lệnh sudo. Script cần
`/var/www/tuvi/infra` đã có (chạy `deploy.sh setup` hoặc `deploy.sh` một lần trước).

**Deploy tay khi nào:** lần đầu, khi đổi unit/nginx (`setup`), khi sửa `infra/activate-incoming.sh` (mỗi lần chạy
`setup` hay release tay đều cài lại `/usr/local/sbin/tuvi-activate-incoming`; CI không tự làm), tải video (`media`),
hoặc khi CI hỏng. Deploy tay dùng chung bước đổi bản với CI.

## Release

```sh
SSH_TARGET=<alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh
```

Script từ chối chạy khi cây làm việc còn thay đổi chưa commit (`git status --porcelain` khác rỗng): bản release mang
tên commit `HEAD` nên phải đúng là `HEAD`. Sau đó chạy `pnpm lint`, `typecheck`, `test`, `build` trên máy dev, đẩy `apps/web/dist`, `apps/server/dist`,
`apps/server/drizzle` vào `/var/www/tuvi/ci-incoming/<thời điểm>-<commit 12 ký tự>`, rồi chạy cùng lệnh đổi bản với CI
(`/usr/local/sbin/tuvi-activate-incoming`, cài lại từ `infra/` ngay trước đó): chuyển bản sang `releases/<mã bản>`, trỏ `current` sang bản mới, restart
`tuvi-server`, rồi kiểm `/healthz` trên loopback và `https://tuvi.hoandat.com/` qua origin. Một trong hai bước kiểm
hỏng thì script tự trỏ `current` về bản trước, restart, in log và thoát mã 1. Giữ 5 bản gần nhất. Gói release không
chứa `._*` hay `.DS_Store` (`COPYFILE_DISABLE=1` và `--exclude`).
Server không cần `pnpm install`: bundle đã gồm mọi thư viện.

**CSP.** `img-src` cho phép ảnh tài khoản của Google (`https://lh3.googleusercontent.com`) và GitHub
(`https://avatars.githubusercontent.com`) trên menu tài khoản; test `apps/web/index-html.test.ts` giữ đúng danh sách đó.
CSP chỉ đổi khi chạy `setup` (dưới đây). Trang không có script inline nào (Tử Vi chỉ có một giao diện, không cần script đặt theme trước lần vẽ đầu),
nên `script-src` trong site nginx chỉ gồm `'self'` và Cloudflare Web Analytics; test `apps/web/index-html.test.ts` báo
lỗi nếu `index.html` có lại script inline hoặc CSP có lại hash. Release không cài lại site nginx, chỉ `setup` làm việc
đó: CSP cũ (còn hash của script theme đã bỏ) vẫn chạy được với bản web mới, nên chạy `setup` lúc nào cũng được.

Kiểm sau release:

- `curl -fsS https://tuvi.hoandat.com/healthz` trả `ok`; `curl -fsS https://tuvi.hoandat.com/RELEASE` trả mã bản đang chạy
  (bản cũ trước khi có CI không có tệp này).
- Đăng nhập thấy ảnh (hoặc chữ cái đầu) và tên trên header; mở menu, đăng xuất được; lưu một lá số, tải lại trang,
  mở lại được.
- RSS của service (mục tiêu < 120 MB): `systemctl show tuvi-server -p MemoryCurrent`.

## Video (`/media/`)

Video và poster của các trang năm không nằm trong repo hay trong release: chúng ở `/var/www/tuvi/media/<bộ>/` trên
máy chủ, nginx phục vụ dưới `/media/` (cache một ngày, hỗ trợ tua). Release và rollback không đụng tới thư mục này.

```sh
SSH_TARGET=<alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh media <thư mục>/tu-vi-2027
```

Thư mục nguồn chứa `<tuổi>.mp4`, `<tuổi>.jpg` và phụ đề `<tuổi>.vtt` (12 tuổi, tên theo `ZODIAC_SLUGS`); bản gốc giữ trên PC dựng video
(`C:\AI\content\tu-vi-2027\final\`). File trùng tên bị ghi đè; sau khi ghi đè, trình duyệt và Cloudflare có thể giữ bản
cũ tối đa một ngày (purge cache trên Cloudflare nếu cần ngay). Thư mục nguồn phải tên `tu-vi-<năm>` (lệnh từ chối
tên khác và báo thiếu file trước khi gửi); release chỉ cảnh báo, không dừng, khi `/media/tu-vi-2027/` chưa có. Lệnh cần `setup` đã chạy với bản nginx có `location /media/`. Trang chỉ trỏ tới video khi năm đó có trong
`apps/web/src/year/year-video.ts`, nên tải video lên **trước** release có trang trỏ tới chúng.

## Rollback

Release hỏng (CI hay tay) tự quay về bản trước (mục Release). Quay về tay:

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
