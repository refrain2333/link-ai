# link-ai 编码代理指导手册

## 项目概述

**link-ai** 是一个 Fastify + TypeScript 构建的企业级 AI SaaS 后端。核心是三层分离的架构：**路由层** → **服务层** → **数据层**。

**技术栈**: Fastify 5.x | TypeScript 5.x | Prisma ORM | PostgreSQL | Redis | pnpm

---

## 架构核心

### 分层模型

```
请求 → Routes → Services → DB (Prisma) + Cache (Redis)
       ↓
   中间件（auth、限流、错误处理）
```

**重点**:
- **routes/** - 只负责解析请求、调用 service、返回响应
- **services/** - 核心业务逻辑（不涉及 HTTP）
- **db/** - Prisma 和 Redis 客户端单例
- **middleware/** - 跨域、JWT、限流在此处理

### 关键文件关系

| 文件 | 职责 | 例子 |
|------|------|------|
| `src/index.ts` | Fastify 启动 + 插件注册 | 挂载路由、中间件 |
| `src/routes/auth.ts` | HTTP 路由定义 | `POST /auth/login` |
| `src/services/authService.ts` | 业务逻辑实现 | JWT 生成、密码验证 |
| `prisma/schema.prisma` | 数据库 Schema | User、Message 表定义 |

---

## 开发工作流

### 启动开发环境

```bash
pnpm dev          # 开发模式（tsx watch，文件改动自动重启）
pnpm build        # 编译 TS → JS
pnpm start        # 生产运行
```

### 数据库操作

```bash
pnpm prisma:migrate    # 修改 schema 后创建迁移
pnpm prisma:studio     # 打开数据库 UI（http://localhost:5555）
pnpm prisma:reset      # 重置数据库（开发用）
```

**流程**: 修改 `prisma/schema.prisma` → `pnpm prisma:migrate` → 自动生成迁移文件 + 更新 DB

---

## 关键约定

### 1. TypeScript 严格模式

```typescript
// ✅ 必须: 所有函数有返回类型
async function findUser(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } })
}

// ❌ 避免: 隐式 any
function findUser(id) { }  // Error: 会触发 strict 检查
```

**配置**: `tsconfig.json` 的 `"strict": true`

### 2. 请求/响应类型化

```typescript
// src/types/request.ts
export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: UserDTO
}

// src/routes/auth.ts 使用这些类型
```

### 3. 环境变量管理

- **开发**: `.env` (Git 忽略)
- **模板**: `.env.example` (Git 提交)
- **必需变量**: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `REDIS_URL`

```typescript
// src/config/constants.ts
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'
```

### 4. 错误处理统一格式

```typescript
// 所有错误响应遵循这个格式
interface ErrorResponse {
  code: -1
  message: string
  data: null
}

// 例: 用户未授权
{ code: -1, message: "Unauthorized", data: null }
```

### 5. 中间件链式调用

Fastify 中间件在 `src/middleware/` 文件中定义，在 `src/routes/index.ts` 中统一注册：

```typescript
// src/middleware/auth.ts
export async function authMiddleware(request: FastifyRequest) {
  const token = request.headers.authorization?.split(' ')[1]
  if (!token) throw new Error('No token')
  request.user = verifyJWT(token)
}

// src/routes/index.ts
fastify.addHook('preHandler', authMiddleware)
```

---

## 常见任务速查

### 新增 API 端点

1. **定义路由** (`src/routes/`)
2. **实现服务** (`src/services/`)
3. **声明类型** (`src/types/`)
4. **在 `src/index.ts` 注册**

```typescript
// 1. routes/example.ts
fastify.post<{ Body: ExampleRequest }>('/example', async (req) => {
  const result = await exampleService.process(req.body)
  return { code: 0, data: result }
})

// 2. services/exampleService.ts
export async function process(input: string) {
  // 业务逻辑
  return await prisma.model.create({ data: input })
}

// 3. types/index.ts
export interface ExampleRequest { /* ... */ }

// 4. index.ts
await fastify.register(exampleRoutes)
```

### 修改数据库表

1. 编辑 `prisma/schema.prisma`
2. 运行 `pnpm prisma:migrate`
3. 输入迁移名称 (自动生成迁移文件)
4. 修改后端代码使用新字段

```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String?  // 新增字段
}
```

### 添加 Redis 缓存

```typescript
// src/db/redis.ts - 连接已配置
import { redis } from './redis'

// src/services/userService.ts - 使用缓存
async function getUser(id: string) {
  const cached = await redis.get(`user:${id}`)
  if (cached) return JSON.parse(cached)
  
  const user = await prisma.user.findUnique({ where: { id } })
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user))
  return user
}
```

### 实现限流

限流在 `src/middleware/rateLimit.ts` 使用 Redis 计数：

```typescript
async function rateLimitMiddleware(req: FastifyRequest) {
  const key = `ratelimit:${req.ip}:${req.url}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 60)
  
  if (count > 100) throw new Error('Rate limit exceeded')
}
```

---

## 文件位置索引

| 需求 | 文件位置 |
|------|---------|
| 添加认证 | `src/routes/auth.ts` + `src/services/authService.ts` |
| 修改用户表 | `prisma/schema.prisma` |
| 新增 API | `src/routes/[feature].ts` + `src/services/[feature]Service.ts` |
| JWT 验证 | `src/middleware/auth.ts` |
| 类型定义 | `src/types/[model].ts` |
| 常量配置 | `src/config/constants.ts` 或 `.env` |
| 数据库连接 | `src/db/prisma.ts` 和 `src/db/redis.ts` |

---

## 初新开发者需知

1. **Prisma 是 ORM**: 不要写 SQL，用 `prisma.model.create()` 等方法
2. **pnpm 不是 npm**: 用 `pnpm add` 而非 `npm install`
3. **TypeScript 必须编译**: `pnpm build` 后才能 `pnpm start`
4. **`.env` 不提交 git**: 使用 `.env.example` 作为模板
5. **开发用 `pnpm dev`**: 自动监听文件变化并重启

---

## 🚀 立即开始编码

参考 [项目框架文档](z_docs/项目框架文档.md) 了解完整的文件结构。项目采用**约定大于配置**，严格遵循分层模型确保代码可维护性。

