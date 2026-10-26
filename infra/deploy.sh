#!/usr/bin/env bash
# Build Tử Vi locally and release it to the shared server (.65).
#
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh setup     # first time; unit or nginx change
#   SSH_TARGET=<ssh host alias> [SSH_OPTS="-F <ssh_config>"] bash infra/deploy.sh           # release
#
# setup: system user `tuvi`, directories, the systemd unit and the nginx site (nginx -t before reload, the
#   previous file restored on failure). /etc/tuvi/production.env must already exist (docs/deployment-guide.md).
# release: gates + build here, upload to /var/www/tuvi/releases/<stamp>, point `current` at it, restart
#   tuvi-server, check /healthz on loopback and https://tuvi.hoandat.com/ through the origin. The five newest
#   releases stay; rollback: docs/deployment-guide.md.
set -euo pipefail

: "${SSH_TARGET:?set SSH_TARGET to the ssh host alias of the server}"
read -r -a ssh_opts <<<"${SSH_OPTS:-}"
mode="${1:-release}"
remote=/var/www/tuvi
host=tuvi.hoandat.com
port=5290

cd "$(dirname "$0")/.."

ssh_run() { ssh "${ssh_opts[@]}" "$SSH_TARGET" "$@"; }

setup() {
	ssh_run "mkdir -p $remote/infra" </dev/null
	rsync -rlz -e "ssh ${ssh_opts[*]}" infra/ "$SSH_TARGET:$remote/infra/"
	ssh_run bash -s <<EOF
set -euo pipefail
test -f /etc/tuvi/production.env || { echo "missing /etc/tuvi/production.env (docs/deployment-guide.md)" >&2; exit 1; }
id tuvi >/dev/null 2>&1 || useradd --system --no-create-home --shell /sbin/nologin tuvi
chown root:tuvi /etc/tuvi/production.env
chmod 640 /etc/tuvi/production.env
mkdir -p $remote/releases
install -m 644 $remote/infra/tuvi-server.service /etc/systemd/system/tuvi-server.service
systemctl daemon-reload
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
	pnpm lint
	pnpm typecheck
	pnpm test
	pnpm build
	local stamp dir
	stamp="$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
	dir="$remote/releases/$stamp"
	ssh_run "mkdir -p $dir" </dev/null
	# The server bundle needs only Node and the migrations: no install on the server.
	tar czf - apps/web/dist apps/server/dist apps/server/drizzle | ssh_run "tar xzf - --no-same-owner -C $dir"
	ssh_run bash -s <<EOF
set -euo pipefail
cd $remote
chown -R root:root $dir
find $dir -type d -exec chmod 755 {} +
find $dir -type f -exec chmod 644 {} +
ln -sfn $dir current.next
mv -T current.next current
systemctl restart tuvi-server
for attempt in \$(seq 1 20); do
	if curl -fsS http://127.0.0.1:$port/healthz >/dev/null; then echo "healthz ok"; break; fi
	sleep 1
done
curl -fsS http://127.0.0.1:$port/healthz >/dev/null || { journalctl -u tuvi-server -n 40 --no-pager; exit 1; }
# Right after a reload old nginx workers can still answer; give them a moment.
for attempt in 1 2 3 4 5; do
	code=\$(curl -sk -o /dev/null -w '%{http_code}' --resolve $host:443:127.0.0.1 https://$host/)
	[ "\$code" = 200 ] && break
	sleep 1
done
echo "origin https://$host/ -> \$code"
[ "\$code" = 200 ]
ls -1dt releases/*/ | tail -n +6 | xargs -r rm -rf
EOF
}

case "$mode" in
	setup) setup ;;
	release) release ;;
	*)
		echo "usage: infra/deploy.sh [setup|release]" >&2
		exit 2
		;;
esac
