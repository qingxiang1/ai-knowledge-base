#!/usr/bin/env bash
#
# 创建时间: 2026-06-14
# 文件名: start-dev.sh
# 文件描述: Project02 AI 翻译助手一键本地启动脚本，自动安装依赖、准备 .env 并同时拉起前后端
# 作者: Felix(LQX5731@163.com)
# 版本号: v1.0.0
# 最后更新时间: 2026-06-14
#
set -euo pipefail

# 切换到脚本所在目录（项目根目录），保证相对路径稳定
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[错误] 未检测到 pnpm，请先安装：npm i -g pnpm" >&2
  exit 1
fi

echo "==> 安装前端依赖"
pnpm install

echo "==> 安装后端依赖"
pnpm --dir server install

if [ ! -f server/.env ]; then
  echo "==> 未找到 server/.env，已从 .env.example 自动生成（mock 模式）"
  cp server/.env.example server/.env
fi

# 退出时确保后端子进程一并结束
cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> 启动后端 (http://localhost:3000)"
pnpm --dir server dev &
SERVER_PID=$!

echo "==> 启动前端 (http://localhost:5173)"
echo "==> 按 Ctrl + C 可同时退出前后端"
pnpm dev
