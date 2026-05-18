#!/bin/bash

# AI 股票分析面板 - 快速启动脚本
# 用法: ./scripts/start.sh

set -e

echo "🚀 AI 股票分析面板 - 快速启动"
echo "================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 版本过低，需要 20+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装根目录依赖..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd client && npm install && cd ..
fi

# 检查环境变量
if [ ! -f "server/.env" ]; then
    echo "⚠️  未找到 server/.env，请复制 .env.example 并配置"
    echo "   cp server/.env.example server/.env"
    echo "   # 然后编辑 .env 填入 API Key"
    read -p "是否现在打开编辑器？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        code server/.env 2>/dev/null || nano server/.env
    fi
fi

# 启动开发服务器
echo ""
echo "🎯 启动开发服务器..."
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm run dev
