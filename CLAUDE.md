# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

link-ai 是一个基于 Fastify 构建的 AI SaaS 后端系统，提供用户认证、AI 对话（支持 SSE 流式输出）和数据持久化功能。

**技术栈**: Node.js 20+ | Fastify 5.x | TypeScript 5.x | PostgreSQL 14+ | Prisma ORM | Redis 6.0+ | OpenAI SDK

## 常用命令

### 开发与构建
```bash
npm run dev              # 开发模式（使用 tsx watch）
npm run build            # 构建生产版本（使用 tsconfig.build.json）
npm start                # 运行生产版本
```

### 数据库操作
```bash
npx prisma migrate dev   # 创建并应用迁移
npx prisma studio        # 打开数据库可视化工具
npx prisma generate      # 重新生成 Prisma Client
```

### 包管理
项目使用 **pnpm** 作为包管理器（`packageManager: "pnpm@10.28.0"`）

## 核心架构

### 分层架构设计

系统采用分层架构，请求流程如下：
1. **接入层**: HTTP 请求进入 Fastify
2. **安检层**: CORS、Rate Limit、JWT 认证（通过 Hooks/Plugins）
3. **路由层**: 参数校验、请求分发（`src/routes/`）
4. **业务层**: 核心逻辑实现（`src/services/`）
5. **数据层**: Prisma 操作 PostgreSQL，Redis 缓存

### 目录结构

```
src/
├── routes/          # 路由定义（按功能模块）
├── services/        # 业务逻辑层
├── middleware/      # 中间件（鉴权、限流等）
├── db/             # Prisma 客户端实例
├── config/         # 环境变量配置
├── utils/          # 工具函数（logger 等）
└── index.ts        # Fastify 启动入口
```

### 关键设计模式

**路径别名**: 使用 `@/` 指向 `src/`（配置在 tsconfig.json 的 paths）

**数据库模型关系**:
- User (1) ──< (N) Chat ──< (N) Message
- 支持级联删除（onDelete: Cascade）
- 使用 JSONB 存储扩展元数据

**JWT 认证流程**:
- Payload 包含: `{ userId, name, email }`
- 默认有效期: 7 天
- 密码使用 bcrypt 加盐哈希（Salt Rounds = 10）

**流式对话实现**:
- 使用 SSE (Server-Sent Events) 推送 AI 响应
- 双向流处理：边推送给前端，边收集完整回复
- 流结束后异步落库到 Message 表

**日志系统**:
- 使用 pino + pino-pretty（开发环境）
- 分离主日志（runtime）和对话追踪日志（trace）
- 日志文件按天滚动，保留 30/90 天

### 环境变量要求

必需的环境变量（缺失会导致启动失败）:
- `DATABASE_URL`: PostgreSQL 连接串
- `JWT_SECRET`: JWT 签名密钥
- `OPENAI_API_KEY`: OpenAI API 密钥

可选环境变量:
- `NODE_ENV`: 运行环境（默认 development）
- `PORT`: 服务端口（默认 3000）
- `HOST`: 监听地址（默认 0.0.0.0）
- `OPENAI_BASE_URL`: OpenAI API 地址（默认官方地址）

### Prisma 数据模型

**核心实体**:
- `User`: 用户表（email 唯一索引，支持 USER/ADMIN 角色）
- `Chat`: 对话会话表（关联 userId，有索引）
- `Message`: 消息表（关联 chatId，存储 role/content/tokens/reasoning）
- `AIModel`: AI 模型配置表（支持多供应商、独立 API 配置）

**枚举类型**:
- `Role`: SYSTEM | USER | ASSISTANT
- `UserRole`: USER | ADMIN

### TypeScript 配置

- 启用严格模式（strict: true）
- 使用 ES2020 + ESNext 模块
- 生产构建排除 tests 目录（tsconfig.build.json）
- 支持 JSON 模块导入

## 开发注意事项

1. **模块化原则**: 按功能模块组织代码，避免按技术层级划分
2. **类型安全**: 充分利用 TypeScript 严格模式，定义清晰的接口
3. **错误处理**: 使用自定义错误类（如 AuthError），统一错误码设计
4. **安全性**:
   - 密码必须哈希存储，禁止明文
   - 登录失败使用统一错误提示，防止账号枚举
   - JWT Token 需验证有效期和签名
5. **性能优化**:
   - 利用 Prisma 的查询优化和索引
   - Redis 用于限流计数器（TTL 60秒）
   - 流式响应降低首字延迟（TTFT）

## 参考文档

- [技术设计文档](z_docs/技术文档.md) - 详细的系统架构和模块逻辑设计
- [说明文档](z_docs/说明文档.md) - 项目背景和功能定位
