#!/bin/bash

set -e

echo "=== 启动后端服务 ==="
cd backend
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "安装依赖..."
pip install -r requirements.txt

echo "初始化数据库..."
python init_db.py

echo "启动后端服务 (端口 8000)..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
