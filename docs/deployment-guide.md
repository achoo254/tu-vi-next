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
| Xoá tài khoản | chỉ ở `auth.hoandat.com/account` (ADR 0018 của `auth-next`); IdP gửi SET ký ES256 tới `POST https://tuvi.hoandat.com/api/idp/account-deleted`, server kiểm bằng JWKS của IdP rồi xoá ngay dòng `users` và mọi thứ cascade theo (mục Xoá tài khoản) |

Lá số và quẻ hằng ngày được tính trên trình duyệt; server chỉ giữ phiên đăng nhập, tên/email/địa chỉ ảnh của tài
khoản, dữ liệu đầu vào của lá số đã lưu, chuỗi ngày xem quẻ (bảng `que_streaks`: ngày gần nhất và số ngày liên
tiếp) và, khi bật Web Push, các trình duyệt bật "Nhắc quẻ hôm nay" (bảng `push_subscriptions`, `que_reminders`), nên nhẹ.
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
| `VAPID_PUBLIC_KEY` | khoá công khai VAPID (base64url, 87 ký tự); trình duyệt đăng ký nhận thông báo bằng khoá này |
| `VAPID_PRIVATE_KEY` | khoá riêng VAPID (base64url, 43 ký tự); bí mật, chỉ ở thư mục env và `/etc/tuvi/production.env` |
| `VAPID_SUBJECT` | địa chỉ liên hệ cho dịch vụ đẩy: `mailto:noreply@hoandat.com` (hoặc một URL `https://`) |

Ba biến `VAPID_*` đi cùng nhau (mục Nhắc quẻ hằng ngày): đặt đủ ba thì bật, không đặt biến nào thì tắt hẳn (không có
nút bật nhắc, không chạy hẹn giờ gửi, không nạp thư viện `web-push`), đặt thiếu hay sai dạng thì server từ chối khởi
động và log nêu tên biến. Deploy trước khi có khoá là an toàn.

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

## Xoá tài khoản

Tài khoản chỉ bị xoá ở `auth.hoandat.com/account`; app không có nút hay API xoá riêng. IdP báo bằng
`POST https://tuvi.hoandat.com/api/idp/account-deleted` ([`account-deleted.ts`](../apps/server/src/auth/account-deleted.ts)),
body là SET (RFC 8417, `Content-Type: application/secevent+jwt`): header `alg` ES256, `typ` `secevent+jwt`; `iss` là
`AUTH_ISSUER`; `aud` đúng `PUBLIC_URL/api/idp/account-deleted`; `exp` chưa qua (lệch giờ 60 giây); event
`urn:hoandat:auth:event:account.deleted`; chữ ký kiểm bằng `jwks_uri` trong discovery của IdP. Hợp lệ thì xoá dòng
`users` của `sub` đó, cascade theo: phiên, lá số đã lưu, chuỗi quẻ, máy bật nhắc, ngày nhắc. Không có gì dùng chung
giữa các tài khoản nên không chuyển chủ.

Trả `202` khi đã xoá, khi không có tài khoản mang `sub` đó, hay khi nhận lại (IdP thử lại); `400` khi body không phải
SET; `401` khi SET sai (chữ ký, `iss`, `aud`, hết hạn, event); `503` khi đăng nhập đang tắt, không đọc được khoá của IdP
hay xoá lỗi, để IdP thử lại. Log chỉ ghi id nội bộ và kết quả, không ghi SET hay `sub`.

URL `https://tuvi.hoandat.com/api/idp/account-deleted` phải có trong `ACCOUNT_DELETED_URLS` của env IdP (`auth-next`)
và phải đúng từng ký tự với `PUBLIC_URL` + `/api/idp/account-deleted`. nginx chuyển sẵn qua `location ~ ^/(api|auth)/`.

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

## Nhắc quẻ hằng ngày (Web Push)

Người đã đăng nhập, có lá số đã lưu, bật công tắc "Nhắc quẻ hôm nay" trên thẻ quẻ: trình duyệt đăng ký service worker
`/sw.js` và gửi địa chỉ nhận thông báo lên `POST /api/push/subscriptions`. Mỗi sáng từ **07:30 giờ Việt Nam** server gửi
một thông báo ("Quẻ hôm nay của bạn đã sẵn sàng", bấm vào mở `/#que-today`) tới mọi trình duyệt đã bật của tài khoản.

- **Chạy ở đâu:** hẹn giờ ngay trong `tuvi-server` (cùng kiểu với việc xoá phiên hết hạn), kiểm mỗi 5 phút và lúc
  khởi động; không có timer systemd riêng. Server tắt lúc 07:30 thì khi chạy lại trong ngày sẽ gửi bù.
- **Mỗi ngày một lần:** trước khi gửi, server ghi ngày hôm nay vào `que_reminders` của tài khoản trong một câu upsert;
  lần chạy sau trong ngày (restart, hai lượt chồng nhau) không gửi lại. Bỏ qua tài khoản không còn lá số nào, tài
  khoản đã xin quẻ hôm nay trước giờ gửi, và trình duyệt bật sau 07:30 hôm đó (đợi sáng mai).
- **Dọn đăng ký chết:** dịch vụ đẩy trả 404/410 thì xoá dòng đó; lỗi khác chỉ đếm, giữ dòng.
- **Log:** một dòng mỗi ngày có gửi: `que reminders <ngày>: N account(s), sent X, gone Y, failed Z`; lỗi gửi chỉ ghi
  mã (`push-429`, `push-network`). Không bao giờ ghi endpoint hay khoá.
- Chỉ nhận endpoint của dịch vụ đẩy thật của trình duyệt (`fcm.googleapis.com`, `updates.push.services.mozilla.com`,
  `*.push.apple.com`, `*.notify.windows.com`, https, không cổng): server không gọi tới địa chỉ tuỳ ý. Tối đa 10 trình
  duyệt mỗi tài khoản. Trên iPhone/iPad, Safari chỉ cho nhận thông báo khi app đã được thêm vào Màn hình chính.

**Bật trên production** (theo thứ tự):

1. Release bản có tính năng này (migration `0003_push-reminders` tự chạy khi server khởi động; chỉ thêm bảng). Chưa
   có khoá thì log khởi động ghi `que reminder push: off (VAPID keys unset)`.
2. Tạo cặp khoá **một lần** trên máy dev, không in ra màn hình, ghi thẳng vào thư mục env trên iCloud
   (`ENV production/tu-vi-next/`):

   ```sh
   cd apps/server && pnpm exec web-push generate-vapid-keys --json > "<thư mục env>/tu-vi-next/vapid-keys.json"
   ```

   Thêm `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` và `VAPID_SUBJECT=mailto:noreply@hoandat.com` vào env production.
3. Ghi lại `/etc/tuvi/production.env` từ thư mục env qua ssh stdin (như bước Env của mục Lần đầu), rồi
   `ssh <alias> 'systemctl restart tuvi-server'`.
4. Kiểm: `journalctl -u tuvi-server -n 20` có `que reminder push: on`; `curl -fsS https://tuvi.hoandat.com/api/push/key`
   trả `publicKey` khác `null`. Đăng nhập, có lá số, bật công tắc trên thẻ quẻ; sáng hôm sau 07:30 nhận thông báo.

**Đổi khoá:** chỉ khi khoá riêng bị lộ. Mọi đăng ký cũ gắn với khoá công khai cũ, nên sau khi đổi, dịch vụ đẩy từ
chối chúng (log `failed`), người dùng phải tắt rồi bật lại nhắc. Muốn dọn: `DELETE FROM push_subscriptions;` trên
database `tuvi`. **Tắt hẳn:** xoá ba biến `VAPID_*` khỏi env rồi restart; dữ liệu đăng ký giữ nguyên, bật lại thì
gửi tiếp.

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
ghi câu SQL hay tham số (`apps/server/src/log-error.ts`, có test). Nhắc quẻ chỉ ghi số đếm mỗi ngày và mã lỗi, không ghi endpoint
hay khoá đẩy. Phiên hết hạn bị xoá khi server khởi động, mỗi giờ
và mỗi lần đăng nhập. Mất kết nối Postgres (Postgres chung restart) không làm sập service.
