#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

for profile in "$HOME/.zprofile" "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.profile"; do
  if [ -f "$profile" ]; then
    # shellcheck disable=SC1090
    source "$profile" >/dev/null 2>&1 || true
  fi
done

function show_message() {
  echo
  echo "$1"
  echo
}

function maybe_open() {
  if [ "${NO_OPEN:-0}" = "1" ]; then
    return
  fi
  open "$1" >/dev/null 2>&1 || true
}

if ! command -v node >/dev/null 2>&1; then
  show_message "Node.js를 찾지 못했습니다. Node.js를 먼저 설치한 뒤 다시 실행해주세요."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  show_message ".env 파일을 새로 만들었습니다. RESEND_API_KEY를 입력한 뒤 다시 실행해주세요."
  maybe_open "$SCRIPT_DIR/.env"
  exit 0
fi

set -a
source ./.env
set +a

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-4173}"
INBOX_DOMAIN="${INBOX_DOMAIN:-inbox.xtracker.co.kr}"
RESEND_API_KEY="${RESEND_API_KEY:-}"

if [ -z "$RESEND_API_KEY" ] || [ "$RESEND_API_KEY" = "re_xxxxxxxxx" ]; then
  show_message "RESEND_API_KEY가 비어 있습니다. .env 파일에 실제 Resend API 키를 넣어주세요."
  maybe_open "$SCRIPT_DIR/.env"
  exit 1
fi

PID_FILE="$SCRIPT_DIR/logs/free-mail-forge.pid"
LOG_FILE="$SCRIPT_DIR/logs/free-mail-forge.log"
URL="http://$HOST:$PORT"

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    show_message "하루메일이 이미 실행 중입니다. 브라우저를 엽니다: $URL"
    maybe_open "$URL"
    exit 0
  fi
fi

nohup env \
  HOST="$HOST" \
  PORT="$PORT" \
  INBOX_DOMAIN="$INBOX_DOMAIN" \
  RESEND_API_KEY="$RESEND_API_KEY" \
  RESEND_WEBHOOK_SECRET="${RESEND_WEBHOOK_SECRET:-}" \
  node server.js > "$LOG_FILE" 2>&1 &
PID=$!
echo "$PID" > "$PID_FILE"

sleep 2

if kill -0 "$PID" 2>/dev/null; then
  show_message "하루메일이 실행되었습니다. 브라우저를 엽니다: $URL"
  maybe_open "$URL"
  exit 0
fi

show_message "서버 시작에 실패했습니다. 로그 파일을 확인해주세요: $LOG_FILE"
maybe_open "$LOG_FILE"
exit 1
