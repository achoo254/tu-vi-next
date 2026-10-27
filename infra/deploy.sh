#!/usr/bin/env bash
# Build Tử Vi locally and release it to the shared server (.65).
#
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh setup     # first time; unit or nginx change
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh           # release
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh media <dir> # videos
#
# setup: system user `tuvi`, directories, the systemd unit and the nginx site (nginx -t before reload, the
#   previous file restored on failure). /etc/tuvi/production.env must already exist (docs/deployment-guide.md).
#   A changed unit restarts the running service.
# release: refuses a dirty working tree; gates + build here, upload to /var/www/tuvi/releases/<stamp>, point
#   `current` at it, restart tuvi-server, check /healthz on loopback and https://tuvi.hoandat.com/ through the
#   origin. On failure `current` goes back to the previous release, the service restarts, and the script exits 1.
#   The five newest releases stay; manual rollback: docs/deployment-guide.md.
# media: copy <dir> (a folder such as tu-vi-2027 with <slug>.mp4 and <slug>.jpg) to /var/www/tuvi/media/<dir name>/,
#   outside the releases and served under /media/ by nginx; same-name files are replaced. Needs `setup` once.
set -euo pipefail

: "${SSH_TARGET:?set SSH_TARGET to the ssh host alias of the server}"
read -r -a ssh_opts <<<"${SSH_OPTS:-}"
mode="${1:-release}"
remote=/var/www/tuvi
host=tuvi.hoandat.com
port=5290
# macOS tar would otherwise add AppleDouble `._*` entries that nginx would serve.
export COPYFILE_DISABLE=1

cd "$(dirname "$0")/.."

ssh_run() { ssh "${ssh_opts[@]}" "$SSH_TARGET" "$@"; }

setup() {
	ssh_run "mkdir -p $remote/infra" </dev/null
	rsync -rlz --exclude "._*" --exclude .DS_Store -e "ssh ${ssh_opts[*]}" infra/ "$SSH_TARGET:$remote/infra/"
	ssh_run bash -s <<EOF
set -euo pipefail
test -f /etc/tuvi/production.env || { echo "missing /etc/tuvi/production.env (docs/deployment-guide.md)" >&2; exit 1; }
id tuvi >/dev/null 2>&1 || useradd --system --no-create-home --shell /sbin/nologin tuvi
chown root:tuvi /etc/tuvi/production.env
chmod 640 /etc/tuvi/production.env
mkdir -p $remote/releases $remote/media
unit=/etc/systemd/system/tuvi-server.service
if ! cmp -s $remote/infra/tuvi-server.service \$unit; then
	install -m 644 $remote/infra/tuvi-server.service \$unit
	systemctl daemon-reload
	# A running service keeps the old limits and ExecStart until restarted (no-op when not running yet).
	systemctl try-restart tuvi-server
	echo "unit installed"
fi
systemctl enable tuvi-server >/dev/null
conf=/etc/nginx/conf.d/$host.conf
if ! cmp -s $remote/infra/nginx/$host.conf \$conf; then
	if [ -f \$conf ]; then cp \$conf \$conf.prev; fi
	cp $remote/infra/nginx/$host.conf \$conf
	if ! nginx -t; then
		if [ -f \$conf.prev ]; then mv \$conf.prev \$conf; else rm -f \$conf; fi
		echo "nginx -t failed: config restored, nothing reloaded" >&2
		exit 1
	fi
	systemctl reload nginx
	echo "nginx site installed and reloaded"
fi
EOF
}

release() {
	# The release is named after HEAD: it must be exactly HEAD.
	if [ -n "$(git status --porcelain)" ]; then
		echo "working tree is not clean: commit or stash first (git status)" >&2
		exit 1
	fi
	pnpm lint
	pnpm typecheck
	pnpm test
	pnpm build
	local stamp dir
	stamp="$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
	dir="$remote/releases/$stamp"
	ssh_run "mkdir -p $dir" </dev/null
	# The server bundle needs only Node and the migrations: no install on the server.
	tar czf - --exclude '._*' --exclude .DS_Store apps/web/dist apps/server/dist apps/server/drizzle | ssh_run "tar xzf - --no-same-owner -C $dir"
	ssh_run bash -s <<EOF
set -euo pipefail
cd $remote
chown -R root:root $dir
find $dir -type d -exec chmod 755 {} +
find $dir -type f -exec chmod 644 {} +
prev=\$(readlink -f current || true)
ln -sfn $dir current.next
mv -T current.next current
healthy() {
	for attempt in \$(seq 1 20); do
		curl -fsS http://127.0.0.1:$port/healthz >/dev/null && return 0
		sleep 1
	done
	return 1
}
origin_ok() {
	# Right after a reload old nginx workers can still answer; give them a moment.
	for attempt in 1 2 3 4 5; do
		code=\$(curl -sk -o /dev/null -w '%{http_code}' --resolve $host:443:127.0.0.1 https://$host/)
		[ "\$code" = 200 ] && return 0
		sleep 1
	done
	echo "origin https://$host/ -> \$code" >&2
	return 1
}
systemctl restart tuvi-server
if ! healthy || ! origin_ok; then
	journalctl -u tuvi-server -n 40 --no-pager || true
	if [ -n "\$prev" ] && [ -d "\$prev" ] && [ "\$prev" != "$dir" ]; then
		echo "release failed: switching back to \$prev" >&2
		ln -sfn "\$prev" current.next
		mv -T current.next current
		systemctl restart tuvi-server
		if healthy; then echo "previous release is back and healthy" >&2; else echo "previous release is not healthy either" >&2; fi
	fi
	exit 1
fi
echo "healthz ok, origin 200"
media=\$(curl -sk -o /dev/null -w '%{content_type}' --resolve $host:443:127.0.0.1 https://$host/media/tu-vi-2027/mui.mp4)
case "\$media" in video/mp4*) ;; *) echo "WARNING: /media/tu-vi-2027/ is not served (run deploy.sh media); the sign page videos are broken" >&2 ;; esac
ls -1dt releases/*/ | tail -n +6 | xargs -r rm -rf
EOF
}

media() {
	local src="${1:?usage: infra/deploy.sh media <dir named tu-vi-<year>>}" name slug ext missing=""
	[ -d "$src" ] || { echo "no such directory: $src" >&2; exit 1; }
	name="$(basename "$src")"
	# The pages link /media/tu-vi-<year>/<slug>.*, so the folder name is the set name and must match.
	[[ $name =~ ^tu-vi-[0-9]{4}$ ]] || { echo "the folder must be named tu-vi-<year> (got $name)" >&2; exit 1; }
	for slug in ty suu dan mao thin ti ngo mui than dau tuat hoi; do
		for ext in mp4 jpg vtt; do [ -f "$src/$slug.$ext" ] || missing="$missing $slug.$ext"; done
	done
	[ -z "$missing" ] || { echo "missing in $src:$missing" >&2; exit 1; }
	# -t keeps mtimes (stable ETag/Last-Modified on a re-run); -L uploads files, never symlinks nginx would follow.
	rsync -rLtz --chmod=D755,F644 --exclude "._*" --exclude .DS_Store -e "ssh ${ssh_opts[*]}" "$src/" "$SSH_TARGET:$remote/media/$name/"
	# Through nginx on this host, by name, without Cloudflare. The type matters: without the /media/ location the
	# SPA fallback would answer 200 text/html.
	local type
	for ext in mp4 jpg vtt; do
		type=$(ssh_run "curl -fsSk -o /dev/null -w '%{content_type}' --resolve $host:443:127.0.0.1 https://$host/media/$name/mui.$ext" </dev/null)
		case "$ext:$type" in
			mp4:video/mp4* | jpg:image/jpeg* | vtt:text/vtt*) ;;
			*) echo "/media/$name/mui.$ext answered '$type' (run setup with the current nginx site?)" >&2; exit 1 ;;
		esac
	done
	echo "media ok: /media/$name/ (36 files)"
}

case "$mode" in
	setup) setup ;;
	release) release ;;
	media) media "${2:-}" ;;
	*)
		echo "usage: infra/deploy.sh [setup|release|media <dir named tu-vi-<year>>]" >&2
		exit 2
		;;
esac
