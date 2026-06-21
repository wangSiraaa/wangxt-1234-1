#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/backend"

echo "=== 启动律所案件承接系统 - 后端 ==="
echo ""

if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

echo "安装依赖..."
source venv/bin/activate
pip install -q -r requirements.txt 2>&1 | tail -3

echo ""
echo "初始化数据库 (SQLite)..."
rm -f lawfirm_case.db
python init_db.py

echo ""
echo "启动后端服务 - http://localhost:8000"
echo "API文档: http://localhost:8000/docs"
echo ""
echo "测试账号 (密码均为 123456):"
echo "  partner  - 合伙人"
echo "  risk     - 风控律师"
echo "  finance  - 财务"
echo "  lawyer1  - 律师"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
