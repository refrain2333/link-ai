# link-ai Git 分支管理策略

## 概述

link-ai 采用 **Git Flow 工作流**，使用多个长期分支和临时分支来管理不同阶段的开发。

---

## 分支类型

### 1. 主分支（永久分支）

#### **main** - 生产分支
- **用途**: 存放可上线代码，每个 commit 都是一个发布版本
- **来源**: 仅从 `release` 分支或 `hotfix` 分支合并
- **保护**: ✓ 必须通过 PR 审查才能合并
- **命名**: `main`

```bash
# 查看 main 分支
git checkout main
```

#### **dev** - 开发集成分支
- **用途**: 集成各个功能分支的代码，保持开发版本
- **来源**: 从 `feat/`、`fix/` 分支合并
- **保护**: ✓ 必须通过 PR 审查才能合并
- **命名**: `dev` 或 `develop`

```bash
# 创建 dev 分支（第一次）
git checkout -b dev

# 后续切换到 dev
git checkout dev
```

---

### 2. 临时分支（短期分支）

#### **feat/** - 功能分支
- **用途**: 开发新功能
- **来源**: 从 `dev` 分支创建
- **合并到**: `dev` 分支
- **命名**: `feat/功能名称`
- **例子**: `feat/add-streaming`、`feat/jwt-refresh`

```bash
# 创建功能分支
git checkout dev
git pull origin dev
git checkout -b feat/add-streaming

# 开发完成后，推送分支
git push origin feat/add-streaming

# 创建 Pull Request 合并到 dev
```

#### **fix/** - 修复分支
- **用途**: 修复 bug
- **来源**: 从 `dev` 分支创建
- **合并到**: `dev` 分支
- **命名**: `fix/问题描述`
- **例子**: `fix/stream-timeout`、`fix/jwt-validation`

```bash
# 创建修复分支
git checkout dev
git pull origin dev
git checkout -b fix/stream-timeout

# 修复完成后，推送分支
git push origin fix/stream-timeout

# 创建 Pull Request 合并到 dev
```

#### **release/** - 发布分支
- **用途**: 准备发布新版本（最后检查、版本号更新、修复小 bug）
- **来源**: 从 `dev` 分支创建
- **合并到**: `main` 和 `dev` 分支
- **命名**: `release/v版本号`
- **例子**: `release/v1.0.0`、`release/v1.1.0`

```bash
# 创建发布分支
git checkout dev
git pull origin dev
git checkout -b release/v1.0.0

# 更新版本号、修复小 bug
# 完成后合并到 main 和 dev

# 推送分支
git push origin release/v1.0.0
```

#### **hotfix/** - 紧急修复分支
- **用途**: 紧急修复生产环境的 bug
- **来源**: 从 `main` 分支创建
- **合并到**: `main` 和 `dev` 分支
- **命名**: `hotfix/问题描述`
- **例子**: `hotfix/auth-crash`

```bash
# 创建紧急修复分支（从 main 拉出）
git checkout main
git pull origin main
git checkout -b hotfix/auth-crash

# 修复完成后合并到 main 和 dev
git push origin hotfix/auth-crash
```

---

## 工作流程示例

### 场景 1：开发新功能

```bash
# 1. 更新本地 dev 分支
git checkout dev
git pull origin dev

# 2. 创建功能分支
git checkout -b feat/add-streaming

# 3. 编写代码并提交
git add src/routes/chat.ts
git commit -m "feat(对话): 添加流式支持"

# 4. 推送功能分支
git push origin feat/add-streaming

# 5. 在 GitHub 创建 Pull Request
# - 从 feat/add-streaming 到 dev
# - 等待审查、修改、最终合并

# 6. 合并后删除本地分支
git checkout dev
git pull origin dev
git branch -d feat/add-streaming
```

### 场景 2：修复 bug

```bash
# 1. 更新本地 dev 分支
git checkout dev
git pull origin dev

# 2. 创建修复分支
git checkout -b fix/jwt-validation

# 3. 编写修复代码并提交
git add src/middleware/auth.ts
git commit -m "fix(认证): 修复 JWT 验证错误"

# 4. 推送修复分支
git push origin fix/jwt-validation

# 5. 创建 Pull Request 合并到 dev
# 6. 审查通过后合并
# 7. 删除本地分支
git branch -d fix/jwt-validation
```

### 场景 3：发布新版本

```bash
# 1. 从 dev 创建发布分支
git checkout dev
git pull origin dev
git checkout -b release/v1.0.0

# 2. 更新版本号和文档
# 编辑 package.json: "version": "1.0.0"
# 编辑 CHANGELOG.md

git add package.json CHANGELOG.md
git commit -m "chore(发布): 准备 v1.0.0 版本"

# 3. 如有小 bug，在这里修复
git commit -m "fix(发布): 修复小问题"

# 4. 推送发布分支
git push origin release/v1.0.0

# 5. 创建 Pull Request：
# - release/v1.0.0 → main
# - 审查通过后合并

# 6. 为 main 分支打标签
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 7. 将发布分支也合并回 dev
# - 创建 PR：release/v1.0.0 → dev
# - 合并

# 8. 删除发布分支
git push origin --delete release/v1.0.0
```

### 场景 4：紧急修复生产 bug

```bash
# 1. 从 main 创建紧急修复分支
git checkout main
git pull origin main
git checkout -b hotfix/auth-crash

# 2. 修复 bug
git add src/middleware/auth.ts
git commit -m "fix(认证): 紧急修复认证崩溃"

# 3. 推送分支
git push origin hotfix/auth-crash

# 4. 创建 PR 合并到 main
# 5. 快速审查并合并
# 6. 为 main 打标签（补丁版本）
git checkout main
git pull origin main
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin v1.0.1

# 7. 同时也要合并回 dev
# - 创建 PR：hotfix/auth-crash → dev

# 8. 删除修复分支
git push origin --delete hotfix/auth-crash
```

---

## 分支命名规范

### 规则

1. **只使用小写字母、数字和短横线**
2. **不使用下划线或大写字母**
3. **单词间用短横线分隔**
4. **简洁明确**

### 示例

#### ✓ 正确的命名

```bash
feat/add-streaming              # 添加流式功能
feat/jwt-refresh-token          # JWT 刷新令牌
fix/stream-timeout              # 流超时问题
fix/null-pointer-exception      # 空指针异常
hotfix/auth-crash               # 认证崩溃紧急修复
release/v1.0.0                  # 发布 v1.0.0
```

#### ✗ 错误的命名

```bash
feature/AddStreaming            # 大写字母
feat_add_streaming              # 下划线
feat/add stream                 # 空格
feature-add-streaming           # 应该用 feat 不是 feature
WIP-add-feature                 # 不要用 WIP
```

---

## 分支保护规则

对于 `main` 和 `dev` 分支，在 GitHub 上配置以下保护规则：

### 配置步骤

1. 进入 GitHub 仓库 → Settings → Branches
2. 为 `main` 和 `dev` 添加规则：

```
Branch name pattern: main
Branch name pattern: dev

Require pull request reviews before merging:
✓ Require pull request reviews before merging
✓ Require status checks to pass before merging
✓ Require branches to be up to date before merging
✓ Dismiss stale pull request approvals when new commits are pushed
```

---

## 常见命令

### 查看所有分支

```bash
# 查看本地分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 查看远程分支
git branch -r
```

### 创建和切换分支

```bash
# 创建分支
git checkout -b feat/new-feature

# 切换分支
git checkout dev

# 创建并推送分支
git push origin feat/new-feature

# 创建分支跟踪远程分支
git checkout --track origin/feat/new-feature
```

### 删除分支

```bash
# 删除本地分支
git branch -d feat/new-feature

# 强制删除本地分支
git branch -D feat/new-feature

# 删除远程分支
git push origin --delete feat/new-feature
```

### 同步分支

```bash
# 更新本地 dev 分支
git checkout dev
git pull origin dev

# 更新所有分支
git fetch origin
```

---

## 分支图示

```
main    ●─────────●───────────●
        ↑         ↑           ↑
        │ v1.0.0  │ v1.0.1    │ v1.1.0
        │         │           │
dev     ●─●─●─●───●─●───●─●───●─●
        ↑ ↑ ↑ ↑   ↑ ↑   ↑ ↑   ↑ ↑
        │ │ │ │   │ │   │ │   │ │
feat/   ──●   │   │ │   │ ●───  │
          │   │   │ │   │     │
fix/    ──────●   │ ●   │     │
              │   │ │   │     │
hotfix/ ──────────●─│───│─────●
                  │ │   │
release/────────────●───●─────

符号：
● commit
─ 分支
│ 合并
```

---

## 版本号规范（Semantic Versioning）

使用 `MAJOR.MINOR.PATCH` 格式：

### 规则

- **MAJOR** (主版本): 不兼容的 API 变更
- **MINOR** (次版本): 新增兼容功能
- **PATCH** (补丁版本): 兼容的 bug 修复

### 例子

```
v1.0.0  - 首个发布版本
v1.1.0  - 添加新功能（次版本+1）
v1.1.1  - 修复 bug（补丁版本+1）
v2.0.0  - API 重大变更（主版本+1）
v2.0.1  - 修复生产 bug（补丁版本+1）
```

---

## 初始化分支

### 第一次设置

```bash
# 确保在 main 分支
git checkout main

# 创建 dev 分支
git checkout -b dev

# 推送 dev 分支
git push -u origin dev

# 后续其他人可以直接跟踪
git checkout --track origin/dev
```

---

## 最佳实践

1. ✓ **始终从最新代码创建分支**
   ```bash
   git pull origin dev
   git checkout -b feat/xxx
   ```

2. ✓ **定期更新分支**
   ```bash
   git fetch origin
   git rebase origin/dev
   ```

3. ✓ **使用有意义的分支名**
   ```bash
   feat/add-streaming  # ✓ 好
   feat/xxx            # ✗ 不好
   ```

4. ✓ **及时删除合并后的分支**
   ```bash
   git push origin --delete feat/completed-feature
   ```

5. ✓ **在 dev 中集成，在 main 中发布**
   - 开发工作全部在 dev 及其分支上
   - 只有经过测试的代码才合并到 main

---

## 问题排查

### 查看分支历史

```bash
git log --oneline --graph --all --decorate
```

### 查看分支的提交

```bash
git log dev --not main
```

### 查看分支差异

```bash
git diff dev main
```

---

## 快速参考

| 操作 | 命令 |
|------|------|
| 新建功能分支 | `git checkout -b feat/name` |
| 新建修复分支 | `git checkout -b fix/name` |
| 推送分支 | `git push origin branch-name` |
| 删除本地分支 | `git branch -d branch-name` |
| 删除远程分支 | `git push origin --delete branch-name` |
| 查看所有分支 | `git branch -a` |
| 更新 dev | `git checkout dev && git pull` |

---

## 参考资源

- [Git Flow 工作流指南](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
- [Semantic Versioning](https://semver.org/)

