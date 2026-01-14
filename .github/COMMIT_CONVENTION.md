# link-ai Git 提交规范

## 概述

为了保持代码历史清晰、便于追踪和回溯，所有提交必须遵循 **Conventional Commits** 规范。

---

## 提交格式

```
<类型>(<范围>): <简述>

<详细说明>

<页脚>
```

### 必需部分

- **类型**: 提交类型（必须）
- **范围**: 影响范围（可选，推荐）
- **简述**: 简述（必须，不超过 50 字符）

### 可选部分

- **详细说明**: 详细说明（非必要，但推荐）
- **页脚**: 页脚信息（用于关闭 issue、breaking changes）

---

## 类型（Type）

| 类型 | 说明 | 例子 |
|------|------|------|
| **feat** | 新功能 | `feat(认证): 添加 JWT 刷新令牌` |
| **fix** | 修复 bug | `fix(对话): 处理流超时` |
| **docs** | 文档修改 | `docs: 更新 README` |
| **style** | 代码风格（不影响功能） | `style: 使用 prettier 格式化代码` |
| **refactor** | 代码重构 | `refactor(services): 提取公共逻辑` |
| **perf** | 性能优化 | `perf(数据库): 添加查询索引` |
| **test** | 测试相关 | `test(认证): 添加登录测试用例` |
| **chore** | 维护工作 | `chore: 更新依赖` |
| **ci** | CI/CD 相关 | `ci: 添加 GitHub Actions 工作流` |

---

## 范围（Scope）

根据 link-ai 的架构，范围应该是：

| 范围 | 说明 |
|------|------|
| `认证` | 认证模块 |
| `对话` | 对话模块 |
| `用户` | 用户模块 |
| `数据库` | 数据库相关 |
| `中间件` | 中间件 |
| `类型` | 类型定义 |
| `配置` | 配置相关 |
| `prisma` | Prisma ORM |
| `redis` | Redis 缓存 |
| `openai` | OpenAI 集成 |

---

## 简述（Subject）

### 规则

1. **不超过 50 字符**
2. **以动词开头**（添加、修复、更新、删除 等）
3. **小写字母开头**
4. **不要加句号**
5. **使用中文，保持一致**

### 好的例子

```
feat(认证): 添加 JWT 令牌刷新机制
fix(对话): 解决流连接超时问题
docs(readme): 添加快速开始指南
refactor(services): 提取验证逻辑
```

### 不好的例子

```
fix bug                              # 过于简略
fix(认证): 添加 JWT 令牌。            # 句号
update something                     # 不够具体
WIP: 正在处理对话功能               # 不符合规范
```

---

## 详细说明（Body）

当改动较大时，应该在详细说明中解释：

```
feat(对话): 添加流式响应支持

实现服务端事件（SSE）用于实时聊天消息。
这允许客户端逐字符接收 AI 响应，
改善用户体验并提高感知响应速度。

- 在 routes/chat.ts 中添加 SSE 处理程序
- 在 services/chatService.ts 中实现流缓冲
- 添加连接超时管理
- 更新流式负载的类型定义
```

### 详细说明编写规则

1. **每行不超过 72 字符**
2. **描述为什么改，而不是改了什么**（改了什么可以从代码看出）
3. **用 bullet points 列出具体改动**
4. **使用中文，保持一致**

---

## 页脚（Footer）

用于：
1. **关闭相关 issue**
2. **声明 breaking changes**

### 关闭 issue

```
关闭 #123
修复 #456
解决 #789
```

### Breaking Changes

```
BREAKING CHANGE: JWT 令牌格式从 HS256 更改为 RS256。
用户需要重新登录以获取新令牌。
```

### 完整例子

```
feat(认证): 迁移 JWT 算法至 RS256

更新 JWT 签名和验证以使用 RS256 算法以提高安全性。
密钥现在从环境变量读取。

- 替换 jsonwebtoken 签名为 RS256
- 更新中间件使用公钥验证
- 添加密钥生成脚本

关闭 #45

BREAKING CHANGE: 现有 JWT 令牌将失效。
所有用户必须重新进行身份验证。
```

---

## 提交示例

### 示例 1：简单功能添加

```
feat(用户): 添加用户资料更新接口
```

### 示例 2：bug 修复

```
fix(对话): 正确处理空消息内容

在处理消息内容前添加空检查。
防止客户端发送空消息时的崩溃。
```

### 示例 3：文档更新

```
docs: 添加数据库设置指南
```

### 示例 4：重构（带详细说明）

```
refactor(services): 将数据库操作提取到数据层

将所有 Prisma 调用从 services 移到新的 db/operations.ts。
改善关注点分离和可测试性。

- 创建 db/userOps.ts
- 创建 db/messageOps.ts
- 更新所有 services 导入
- 从 services 中删除直接 Prisma 调用
```

### 示例 5：性能优化

```
perf(数据库): 在 messages 表的 userId 上添加索引

消息历史查询性能从 500ms 改善到 50ms。
```

---

## 常见场景

### 新增 API 端点

```
feat(对话): 添加消息历史检索接口

实现 GET /chat/history 以获取用户的过去对话。
包含分页支持（limit、offset）。

- 在 routes/chat.ts 中添加路由处理程序
- 在 services/chatService.ts 中实现查询逻辑
- 为分页响应添加类型定义
- 添加单元测试

关闭 #12
```

### 修改数据库 Schema

```
feat(prisma): 添加 Conversation 模型

添加 conversations 表以分组相关消息。
用户现在可以按主题组织聊天。

- 在 schema.prisma 中添加 Conversation 模型
- 创建迁移文件
- 更新 User 关系
- 在 conversationId 和 userId 上添加索引

关闭 #34
```

### 依赖更新

```
chore: 升级依赖

- typescript: 5.0 → 5.3
- fastify: 5.0 → 5.1
- prisma: 5.7 → 5.8
```

### 代码风格修复

```
style(认证): 使用 prettier 格式化代码
```

---

## 常见错误

| 错误 | 原因 | 正确做法 |
|------|------|---------|
| `fix bug` | 过于简略 | `fix(认证): 处理过期的 JWT 令牌` |
| `Fix(认证): ...` | 类型大写 | `fix(认证): ...` |
| `fix: 更新...` | 没有范围 | `fix(认证): 更新令牌验证` |
| `fix(认证): 修复...` | 动词重复 | `fix(认证): 处理令牌验证错误` |
| `feat: 添加新功能。` | 句号 | `feat(模块): 添加新功能` |

---

## 工作流程

### 开发时

```bash
# 1. 创建特性分支
git checkout -b feat/add-streaming

# 2. 编写代码并提交（遵循规范）
git commit -m "feat(对话): 添加流式支持"

# 3. 推送分支
git push origin feat/add-streaming

# 4. 创建 Pull Request
```

### 合并前检查清单

- [ ] 提交信息遵循规范
- [ ] 类型（type）选择正确
- [ ] 范围在允许列表中
- [ ] 简述简明扼要
- [ ] 必要时包含详细说明
- [ ] 关闭了相关 issue（如有）

---

## 工具支持

### 使用 commitizen（可选）

如果项目使用 commitizen，开发者可以运行：

```bash
git cz
```

交互式选择提交类型、范围和信息。

### 配置 Git Hook（可选）

使用 husky + commitlint 验证提交信息：

```bash
pnpm add -D husky commitlint
npx husky install
npx husky add .husky/commit-msg 'commitlint --edit'
```

创建 `commitlint.config.js`：

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci']
    ]
  }
}
```

---

## 提交历史示例

```
* 0d5e4c0 (HEAD -> master) docs: 添加 git 提交规范和 gitignore 文件
* cd2395a docs: add copilot instructions for AI coding agents
* b754ae1 refactor: 将 Nexus 重命名为 link-ai
* 5ddf0ea style: 从 README 中移除 emoji
* debd7d2 docs: 添加完整的 README
```

---

## 为什么要遵循规范？

1. ✓ **清晰的历史** - 快速了解项目演进
2. ✓ **自动化工具** - 生成 changelog、版本管理
3. ✓ **代码审查** - 审查者快速理解改动
4. ✓ **问题追踪** - 轻松关联 issue
5. ✓ **回溯 bug** - 用 `git bisect` 快速定位问题

---

## 快速参考

```bash
# 新功能
git commit -m "feat(范围): 添加新功能"

# 修复
git commit -m "fix(范围): 修复问题描述"

# 文档
git commit -m "docs: 更新文档"

# 重构
git commit -m "refactor(范围): 改进代码结构"

# 性能
git commit -m "perf(范围): 优化性能"

# 详细提交
git commit -m "feat(认证): 添加登录功能

- 添加登录路由
- 添加密码验证
- 添加 JWT 生成

关闭 #42"
```

---

## 问题反馈

如果对规范有疑问或建议，请在 issue 中讨论。


