#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/free-mail-forge.pid"

if [ ! -f "$PID_FILE" ]; then
  echo
  echo "실행 중인 Free Mail Forge 프로세스를 찾지 못했습니다."
  echo
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -z "$PID" ]; then
  rm -f "$PID_FILE"
  echo
  echo "PID 파일이 비어 있어 정리했습니다."
  echo
  exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  sleep 1
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null || true
  fi
  echo
  echo "Free Mail Forge를 종료했습니다."
  echo
else
  echo
  echo "이미 종료된 프로세스였습니다. PID 파일만 정리합니다."
  echo
fi

rm -f "$PID_FILE"
