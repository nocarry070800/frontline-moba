#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -eq 0
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test -f /etc/systemd/system/frontline.service
test -f /opt/frontline/server.cjs
/usr/bin/node -e 'if(Number(process.versions.node.split(".")[0])!==24)process.exit(1)'

install -d -m 0755 /usr/local/lib/frontline /opt/frontline-releases
install -m 0644 "$HERE/remote-deploy.cjs" /usr/local/lib/frontline/deploy.cjs
cat > /usr/local/sbin/frontline-deploy <<'COMMAND'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([a-f0-9]{40})$ ]]; then
  exec /usr/bin/flock -w 120 /opt/frontline-releases/.deploy.lock /usr/bin/node /usr/local/lib/frontline/deploy.cjs "${BASH_REMATCH[1]}"
fi
echo 'This key can only deploy Frontline.' >&2
exit 1
COMMAND
chmod 0755 /usr/local/sbin/frontline-deploy

if [ ! -e /opt/frontline-current ] && [ ! -L /opt/frontline-current ]; then
  ln -s /opt/frontline /opt/frontline-current
fi
test -L /opt/frontline-current
install -d -m 0755 /etc/systemd/system/frontline.service.d
cat > /etc/systemd/system/frontline.service.d/deploy.conf <<'SERVICE'
[Service]
WorkingDirectory=/opt/frontline-current
ExecStart=
ExecStart=/usr/bin/node /opt/frontline-current/server.cjs
SERVICE
systemctl daemon-reload

install -d -m 0700 /root/.ssh
KEY=/root/.ssh/frontline_actions
if [ ! -f "$KEY" ]; then
  ssh-keygen -q -t ed25519 -N '' -C frontline-github-actions -f "$KEY"
fi
touch /root/.ssh/authorized_keys
chmod 0600 /root/.ssh/authorized_keys "$KEY"
PUBLIC_KEY="$(cat "$KEY.pub")"
if ! grep -Fq -- "$PUBLIC_KEY" /root/.ssh/authorized_keys; then
  printf 'restrict,command="/usr/local/sbin/frontline-deploy" %s\n' "$PUBLIC_KEY" >> /root/.ssh/authorized_keys
fi

echo 'Setup complete. The running game has not been restarted.'
echo 'GitHub secret CONTABO_SSH_KEY: copy the output of this command directly to GitHub (not to a chat):'
echo 'cat /root/.ssh/frontline_actions'
echo 'GitHub secret CONTABO_KNOWN_HOSTS: use the following PUBLIC line:'
printf '169.58.99.208 '
cut -d ' ' -f 1,2 /etc/ssh/ssh_host_ed25519_key.pub
