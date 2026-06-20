# 律所案件承接系统

基于 FastAPI + React 18 + TypeScript + Chakra UI + PostgreSQL 构建的律所案件承接管理系统。

## 功能特性

### 核心业务流程
1. **合伙人登记案件** - 录入潜在客户和对方当事人信息
2. **利益冲突检查** - 风控律师出具冲突结论（无冲突/间接冲突/直接冲突）
3. **预算确认** - 财务确认预付款预算
4. **案件承接** - 预算确认后可正式承接并分配律师
5. **案卷材料** - 管理案件相关材料

### 业务规则
- 存在**直接冲突**不能立案（自动驳回）
- **预算未确认**不能分配律师
- **已归档案件**只能追加补充材料，不能修改承接结论

### 角色权限
- **合伙人 (partner)**: 创建案件、提交冲突检查、分配律师、确认承接、归档案件
- **风控律师 (risk_control)**: 录入/修改冲突检查结论
- **财务 (finance)**: 确认/拒绝预算
- **律师 (lawyer)**: 查看案件信息

## 技术栈

### 后端
- FastAPI - Web 框架
- SQLAlchemy 2.0 - ORM
- PostgreSQL - 数据库
- Pydantic v2 - 数据验证
- JWT - 身份认证

### 前端
- React 18
- TypeScript
- Chakra UI - UI 组件库
- React Router v6 - 路由
- Zustand - 状态管理
- Axios - HTTP 客户端
- Vite - 构建工具

## 快速开始

### 前置要求
- Python 3.10+
- Node.js 18+
- PostgreSQL 12+

### 数据库准备
```sql
CREATE DATABASE lawfirm_case;
```

### 启动后端

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 修改 .env 中的数据库连接信息

# 初始化数据库和测试数据
python init_db.py

# 启动服务
uvicorn app.main:app --reload --port 8000
```

或直接运行脚本：
```bash
chmod +x start-backend.sh
./start-backend.sh
```

### 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

或直接运行脚本：
```bash
chmod +x start-frontend.sh
./start-frontend.sh
```

## 测试账号

系统初始化后包含以下测试账号（密码均为 `123456`）：

| 用户名 | 角色 | 说明 |
|--------|------|------|
| partner | 合伙人 | 可创建和管理案件 |
| risk | 风控律师 | 可进行冲突检查 |
| finance | 财务 | 可确认预算 |
| lawyer1 | 律师 | 可查看分配的案件 |
| lawyer2 | 律师 | 可查看分配的案件 |

## 项目结构

```
.
├── backend/                 # 后端代码
│   ├── app/
│   │   ├── api/            # API 路由
│   │   │   ├── auth.py
│   │   │   ├── cases.py
│   │   │   ├── clients.py
│   │   │   ├── conflict_checks.py
│   │   │   ├── budgets.py
│   │   │   ├── materials.py
│   │   │   └── users.py
│   │   ├── core/           # 核心配置
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   └── security.py
│   │   ├── models/         # 数据库模型
│   │   ├── schemas/        # Pydantic Schema
│   │   ├── services/       # 业务逻辑
│   │   └── main.py         # 应用入口
│   ├── init_db.py          # 数据库初始化脚本
│   └── requirements.txt
└── frontend/               # 前端代码
    ├── src/
    │   ├── components/     # 公共组件
    │   ├── pages/          # 页面组件
    │   ├── services/       # API 服务
    │   ├── types/          # TypeScript 类型
    │   ├── hooks/          # 自定义 Hooks
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## API 文档

启动后端后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
