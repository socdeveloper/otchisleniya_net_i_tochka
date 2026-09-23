#!/usr/bin/env bash
set -euo pipefail

preview_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$preview_root"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is required. Install it with: brew install cloudflared" >&2
  exit 1
fi

if ! python3 - <<'PY'
from pathlib import Path

env_file = Path('.env')
if not env_file.exists():
    raise SystemExit(1)
for line in env_file.read_text().splitlines():
    if line.startswith('TELEGRAM_BOT_TOKEN=') and line.partition('=')[2].strip():
        break
else:
    raise SystemExit(1)
PY
then
  echo "Set TELEGRAM_BOT_TOKEN in .env first." >&2
  exit 1
fi

docker compose up --build --quiet-build -d api bot worker webapp

preview_log="$(mktemp -t sharajka-cloudflared).log"
cloudflared tunnel --url http://localhost:4173 --protocol http2 --no-autoupdate >"$preview_log" 2>&1 &
preview_pid=$!
trap 'kill "$preview_pid" 2>/dev/null || true' EXIT INT TERM

webapp_url=""
for _ in $(seq 1 60); do
  webapp_url="$(sed -nE 's/.*(https:\/\/[-[:alnum:].]+\.trycloudflare\.com).*/\1/p' "$preview_log" | head -n 1)"
  if [[ -n "$webapp_url" ]] && grep -q 'Registered tunnel connection' "$preview_log"; then
    break
  fi
  if ! kill -0 "$preview_pid" 2>/dev/null; then
    cat "$preview_log" >&2
    exit 1
  fi
  sleep 1
done

if [[ -z "$webapp_url" ]] || ! grep -q 'Registered tunnel connection' "$preview_log"; then
  cat "$preview_log" >&2
  exit 1
fi

PREVIEW_WEBAPP_URL="$webapp_url" python3 - <<'PY'
import os
from pathlib import Path

path = Path('.env')
lines = path.read_text().splitlines()
name = 'TELEGRAM_WEBAPP_URL'
value = os.environ['PREVIEW_WEBAPP_URL']
for index, line in enumerate(lines):
    if line.startswith(name + '='):
        lines[index] = f'{name}={value}'
        break
else:
    lines.append(f'{name}={value}')
path.write_text('\n'.join(lines) + '\n')
PY

docker compose up -d bot
printf '\nTelegram Mini App preview: %s\n' "$webapp_url"
printf 'Open your bot in Telegram and send /start. Keep this terminal running during the test.\n'
wait "$preview_pid"
