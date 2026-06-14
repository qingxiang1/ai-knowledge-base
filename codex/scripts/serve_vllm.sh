#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash scripts/serve_vllm.sh <model_path_or_name>"
  exit 1
fi

MODEL_PATH="$1"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
API_KEY="${API_KEY:-dev-token}"
TP_SIZE="${TP_SIZE:-1}"
DTYPE="${DTYPE:-auto}"

vllm serve "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --api-key "$API_KEY" \
  --tensor-parallel-size "$TP_SIZE" \
  --dtype "$DTYPE"
