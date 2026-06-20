#!/bin/bash
# 生产部署脚本（云服务器上运行）
# 构建前端后，通过 Express 统一提供静态文件服务
# 用户只需访问 http://yourdomain:5000

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📦 小说工坊部署脚本"
echo "===================="

# 1. 构建前端
echo ""
echo "📱 构建前端..."
cd "$DIR/client"
npm install
npm run build
echo "   ✅ 前端构建完成：client/dist/"

# 2. 安装后端依赖
echo ""
echo "🖥️  安装后端依赖..."
cd "$DIR/server"
npm install
echo "   ✅ 后端依赖安装完成"

# 3. 设置生产环境变量
export NODE_ENV=production
# 如果部署到生产环境，修改为你的域名
export CORS_ORIGIN=${CORS_ORIGIN:-"https://yourdomain.com"}

# 4. 启动服务（生产模式）
echo ""
echo "🚀 启动服务..."
cd "$DIR/server"
echo "   访问地址：http://0.0.0.0:${PORT:-5000}"
echo ""
exec node index.js
