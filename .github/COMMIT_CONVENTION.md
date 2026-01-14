# link-ai Git 提交规范

## 概述

为了保持代码历史清晰、便于追踪和回溯，所有提交必须遵循 **Conventional Commits** 规范。

---

## 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 必需部分

- **type**: 提交类型（必须）
- **scope**: 影响范围（可选，推荐）
- **subject**: 简述（必须，不超过 50 字符）

### 可选部分

- **body**: 详细说明（非必要，但推荐）
- **footer**: 页脚信息（用于关闭 issue、breaking changes）

---

## Type（提交类型）

| Type | 说明 | 例子 |
|------|------|------|
| **feat** | 新功能 | `feat(auth): add JWT refresh token` |
| **fix** | 修复 bug | `fix(chat): handle stream timeout` |
| **docs** | 文档修改 | `docs: update README` |
| **style** | 代码风格（不影响功能） | `style: format code with prettier` |
| **refactor** | 代码重构 | `refactor(services): extract common logic` |
| **perf** | 性能优化 | `perf(db): add query index` |
| **test** | 测试相关 | `test(auth): add login test cases` |
| **chore** | 维护工作 | `chore: update dependencies` |
| **ci** | CI/CD 相关 | `ci: add GitHub Actions workflow` |

---

## Scope（影响范围）

根据 link-ai 的架构，scope 应该是：

| Scope | 说明 |
|-------|------|
| `auth` | 认证模块 |
| `chat` | 对话模块 |
| `user` | 用户模块 |
| `db` | 数据库相关 |
| `middleware` | 中间件 |
| `types` | 类型定义 |
| `config` | 配置相关 |
| `prisma` | Prisma ORM |
| `redis` | Redis 缓存 |
| `openai` | OpenAI 集成 |

---

## Subject（简述）

### 规则

1. **不超过 50 字符**
2. **以动词开头**（add, fix, update, remove, 等）
3. **小写字母开头**
4. **不要加句号**
5. **使用英文或中文，保持一致**

### 好的例子

```
feat(auth): add JWT token refresh mechanism
fix(chat): resolve stream connection timeout issue
docs(readme): add quick start guide
refactor(services): extract validation logic
```

### 不好的例子

```
fix bug                          # 过于简略
fix(auth): Add JWT token.        # 大写 + 句号
update something                 # 不够具体
WIP: working on chat feature     # 不符合规范
```

---

## Body（详细说明）

当改动较大时，应该在 body 中详细解释：

```
feat(chat): add streaming response support

Implement server-sent events (SSE) for real-time chat messages.
This allows clients to receive AI responses character-by-character,
improving user experience with perceived faster response times.

- Add SSE handler in routes/chat.ts
- Implement stream buffering in services/chatService.ts
- Add connection timeout management
- Update types for streaming payload
```

### Body 编写规则

1. **每行不超过 72 字符**
2. **描述 WHY 而不是 WHAT**（WHAT 可以从代码看出）
3. **用 bullet points 列出具体改动**
4. **使用中文或英文，保持一致**

---

## Footer（页脚）

用于：
1. **关闭相关 issue**
2. **声明 breaking changes**

### 关闭 issue

```
Closes #123
Fixes #456
Resolves #789
```

### Breaking Changes

```
BREAKING CHANGE: JWT token format changed from HS256 to RS256.
Users need to re-login to get new tokens.
```

### 完整例子

```
feat(auth): migrate JWT algorithm to RS256

Update JWT signing and verification to use RS256 algorithm
for better security. Keys are now read from environment.

- Replace jsonwebtoken signing with RS256
- Update middleware to verify with public key
- Add key generation script

Closes #45

BREAKING CHANGE: Existing JWT tokens will be invalid.
All users must re-authenticate.
```

---

## 提交示例

### 示例 1：简单功能添加

```
feat(user): add user profile update endpoint
```

### 示例 2：bug 修复

```
fix(chat): handle null message content gracefully

Add null check before processing message content.
Prevents crash when client sends empty message.
```

### 示例 3：文档更新

```
docs: add database setup guide
```

### 示例 4：重构（带详细说明）

```
refactor(services): extract database operations to data layer

Move all Prisma calls from services to new db/operations.ts.
Improves separation of concerns and testability.

- Create db/userOps.ts
- Create db/messageOps.ts
- Update all services imports
- Remove direct Prisma calls from services
```

### 示例 5：性能优化

```
perf(db): add index on userId in messages table

Query performance for message history improved from 500ms to 50ms.
```

---

## 常见场景

### 新增 API 端点

```
feat(chat): add message history retrieval endpoint

Implement GET /chat/history to fetch user's past conversations.
Includes pagination support (limit, offset).

- Add route handler in routes/chat.ts
- Implement query logic in services/chatService.ts
- Add type definitions for paginated response
- Add unit tests

Closes #12
```

### 修改数据库 Schema

```
feat(prisma): add conversation model

Add conversations table to group related messages.
Users can now organize chats by topic.

- Add Conversation model to schema.prisma
- Create migration file
- Update User relations
- Add indexes on conversationId and userId

Closes #34
```

### 依赖更新

```
chore: upgrade dependencies

- typescript: 5.0 → 5.3
- fastify: 5.0 → 5.1
- prisma: 5.7 → 5.8
```

### 代码风格修复

```
style(auth): format code with prettier
```

---

## 常见错误

| 错误 | 原因 | 正确做法 |
|------|------|---------|
| `fix bug` | 过于简略 | `fix(auth): handle expired JWT tokens` |
| `Fix(auth): ...` | Type 大写 | `fix(auth): ...` |
| `fix: update...` | 没有 scope | `fix(auth): update token validation` |
| `fix(auth): Fixed...` | Subject 大写 | `fix(auth): fix token validation` |
| `fix(auth): fix...` | 动词重复 | `fix(auth): handle token validation error` |

---

## 工作流程

### 开发时

```bash
# 1. 创建特性分支
git checkout -b feat/add-streaming

# 2. 编写代码并提交（遵循规范）
git commit -m "feat(chat): add streaming support"

# 3. 推送分支
git push origin feat/add-streaming

# 4. 创建 Pull Request
```

### 合并前检查清单

- [ ] Commit message 遵循规范
- [ ] 类型（type）选择正确
- [ ] scope 在允许列表中
- [ ] subject 简明扼要
- [ ] 必要时包含详细 body
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
* 5ddf0ea (HEAD -> master) docs: add project framework documentation
* b754ae1 refactor: rename Nexus to link-ai throughout project
* debd7d2 docs: add comprehensive README
* 5ddf0ea style: remove emojis from README
* f536f7d (initial-commit) Initial commit
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
git commit -m "feat(scope): add new feature"

# 修复
git commit -m "fix(scope): fix issue description"

# 文档
git commit -m "docs: update documentation"

# 重构
git commit -m "refactor(scope): improve code structure"

# 性能
git commit -m "perf(scope): optimize performance"

# 详细提交
git commit -m "feat(auth): add login

- Add login route
- Add password verification
- Add JWT generation

Closes #42"
```

---

## 问题反馈

如果对规范有疑问或建议，请在 issue 中讨论。

