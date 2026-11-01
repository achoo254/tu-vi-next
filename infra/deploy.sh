#!/usr/bin/env bash
# Build Tử Vi locally and release it to the shared server (.65), by hand (every push to main also deploys
# through .github/workflows/deploy.yml).
#
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh setup     # first time; unit or nginx change
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh           # release
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh media <dir> # videos
#
# setup: system user `tuvi`, directories, the systemd unit and the nginx site (nginx -t before reload, the
#   previous file restored on failure). /etc/tuvi/production.env must already exist (docs/deployment-guide.md).
#   A changed unit restarts the running service.
# release: refuses a dirty working tree; gates + build here, upload to /var/www/tuvi/ci-incoming/<release-id>
#   (YYYYMMDD-HHMMSS-<sha12>), then run /usr/local/sbin/tuvi-activate-incoming <release-id>
#   (infra/activate-incoming.sh), the same switch every push to main runs through .github/workflows/deploy.yml:
#   releases/<release-id>, `current`, restart tuvi-server, /healthz on loopback and https://tuvi.hoandat.com/
#   through the origin; on failure `current` goes back to the previous release, the service restarts, and the
#   script exits 1. The five newest releases stay; manual rollback: docs/deployment-guide.md.
# setup and release both upload infra/ and reinstall /usr/local/sbin/tuvi-activate-incoming first.
# media: copy <dir> (a folder such as tu-vi-2027 with <slug>.mp4 and <slug>.jpg) to /var/www/tuvi/media/<dir name>/,
#   outside the releases and served under /media/ by nginx; same-name files are replaced. Needs `setup` once.
set -euo pipefail

: "${SSH_TARGET:?set SSH_TARGET to the ssh host alias of the server}"
read -r -a ssh_opts <<<"${SSH_OPTS:-}"
mode="${1:-release}"
remote=/var/www/tuvi
host=tuvi.hoandat.com
# macOS tar would otherwise add AppleDouble `._*` entries that nginx would serve.
export COPYFILE_DISABLE=1

cd "$(dirname "$0")/.."

ssh_run() { ssh "${ssh_opts[@]}" "$SSH_TARGET" "$@"; }

# Upload infra/ (root-owned on the server) and refresh the root command the CI user runs, so it always matches
# the infra/activate-incoming.sh that this run uses.
sync_infra() {
	ssh_run "mkdir -p $remote/infra" </dev/null
	rsync -rlz --exclude "._*" --exclude .DS_Store -e "ssh ${ssh_opts[*]}" infra/ "$SSH_TARGET:$remote/infra/"
	ssh_run "chown -R root:root $remote/infra && install -m 755 -o root -g root $remote/infra/activate-incoming.sh /usr/local/sbin/tuvi-activate-incoming" </dev/null
}

setup() {
	sync_infra
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
	local id
	id="$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short=12 HEAD)"
	sync_infra
	ssh_run "mkdir -p $remote/ci-incoming/$id" </dev/null
	# The server bundle needs only Node and the migrations: no install on the server.
	tar czf - --exclude '._*' --exclude .DS_Store apps/web/dist apps/server/dist apps/server/drizzle |
		ssh_run "tar xzf - --no-same-owner -C $remote/ci-incoming/$id"
	# The same switch CI runs (checks, restart, healthz + origin, previous release back on failure).
	ssh_run "/usr/local/sbin/tuvi-activate-incoming $id" </dev/null
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
