#!/bin/bash

echo "=== 启动前端服务 ==="
cd frontend

if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

echo "启动前端开发服务器 (端口 3000)..."
npm run dev
