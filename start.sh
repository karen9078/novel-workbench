#!/bin/bash
# 开发模式启动脚本
# 需要先启动后端，再启动前端（Vite 代理 API 到后端）

DIR="$(cd "$(dirname "$0")" && pwd)"

# 关闭旧进程
kill $(lsof -ti:5000) 2>/dev/null
kill $(lsof -ti:5173) 2>/dev/null
sleep 1

# 启动后端
cd "$DIR/server" && node index.js &
sleep 2

# 启动前端（开发模式）
cd "$DIR/client" && npm run dev &
sleep 3

# 打开浏览器
open http://localhost:5173

echo "✅ 小说工坊已启动"
echo "   前端：http://localhost:5173"
echo "   后端：http://localhost:5000"
