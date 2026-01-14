# link-ai

一个基于 **Fastify** 构建的全功能 AI SaaS 后端，具备完整用户体系、流式对话能力和数据持久化。

## 核心特性

**用户体系** - 基于 PostgreSQL 的注册、登录、JWT 鉴权  
**AI 对话** - 集成 OpenAI/DeepSeek，支持 SSE 流式输出  
**数据持久化** - 自动保存对话记录，支持历史回溯  
**生产级安全** - 类型安全、限流、Token 黑名单  

## 技术栈

| 类别 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | 20+ (LTS) |
| 框架 | Fastify | 5.x |
| 语言 | TypeScript | 5.x |
| 数据库 | PostgreSQL | 14+ |
| ORM | Prisma | 最新版 |
| 缓存 | Redis | 6.0+ |
| AI SDK | OpenAI Node SDK | 最新版 |

## 系统架构

```
┌──────────────────────────────────────┐
│      客户端层                        │
│  小程序 / Web App / CLI 工具         │
└──────────────┬───────────────────────┘
               │ HTTP / SSE
               ▼
┌──────────────────────────────────────┐
│   link-ai Backend                    │
│  ┌──────────┐ ┌──────────┐          │
│  │ 用户模块 │ │ 对话模块 │          │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐          │
│  │ 鉴权模块 │ │ 限流模块 │          │
│  └──────────┘ └──────────┘          │
└──────────────┬───────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
  PostgreSQL Redis   OpenAI/DeepSeek
```

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 14+
- Redis 6.0+

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 到 `.env`，配置以下关键项：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/link_ai

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-xxx
```

### 数据库迁移

```bash
npx prisma migrate dev
```

### 启动服务

```bash
npm run dev
```

服务默认运行在 `http://localhost:3000`

## 项目文档

- [技术设计文档](z_docs/技术文档.md) - 系统架构、模块设计
- [说明文档](z_docs/说明文档.md) - 项目背景、功能定位

## 核心模块

### 认证模块
- 用户注册/登录
- JWT 无状态鉴权
- 密码加盐哈希存储

### AI 对话模块
- 流式对话接口（SSE）
- 对话记录持久化
- Token 计数管理

### 用户模块
- 用户信息管理
- 额度查询
- 使用统计

### 限流模块
- Redis 计数器
- 用户级速率限制
- IP 级防护

## API 示例

### 用户注册

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

### 发起对话（流式）

```bash
POST /api/chat/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "你好，帮我解释下 TypeScript"
}
```

## 开发指南

### 项目结构

```
src/
  ├── routes/        # 路由定义
  ├── services/      # 业务逻辑
  ├── middleware/    # 中间件（鉴权、限流等）
  ├── db/           # 数据库操作
  └── types/        # TypeScript 类型定义
```

### 常用命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产运行
npm start

# 数据库迁移
npx prisma migrate dev

# Prisma Studio (数据库可视化工具)
npx prisma studio
```

## 许可证

MIT

---

**项目仓库**: [github.com/refrain2333/link-ai](https://github.com/refrain2333/link-ai)
