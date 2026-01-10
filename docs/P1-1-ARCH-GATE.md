# P1-1 CI 架构门禁 (Architecture Gate)

## 概述

P1-1 架构门禁是一个自动化脚本，用于在 CI/CD 流程中强制执行架构边界约束，防止代码库出现架构回流和越界访问。

## 三大核心规则

### A) AppStore 永不回流

**规则：** `AppStore` 仅应在 `app` 层使用，`features`/`core` 层不应直接访问。

**✅ 允许：**
- `src/app/**` 中使用 AppStore
- 测试文件中使用（`__tests__/*`, `*.test.ts`, `*.test.tsx`）

**⛔ 禁止：**
- `src/features/**` 直接引用 AppStore
- `src/core/**` 直接引用 AppStore

**手动验证命令：**
```bash
rg -n "\bAppStore\b" src \
  --glob '!src/app/**' \
  --glob '!**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx' \
  --glob '!**/ARCH_CONSTRAINTS.md'
```

### B) features 禁止 import app/store/slices

**规则：** `features` 层必须通过 `useCases` 访问数据，不可直接 import slices。

**✅ 允许：**
- `src/features/**` → `useUseCases()` → `useCases.theme.*`
- `src/features/**` → `useZustandAppStore(selector)`
- `import type` 语句（类型导入不造成运行时依赖）

**⛔ 禁止：**
- `src/features/**` → `import ... from '@/app/store/slices'`
- `src/features/**` → `import ... from 'app/store/slices'`

**手动验证命令：**
```bash
rg -n "from ['\"]@/app/store/slices" src/features \
  --glob '!**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx'
```

### C) core 禁止 import features

**规则：** `core` 层是底层模块，不应依赖 `features` 层。

**✅ 允许：**
- `src/core/**` → 其他 core 模块
- `src/core/**` → 外部库

**⛔ 禁止：**
- `src/core/**` → `import ... from '@/features'`
- `src/core/**` → `import ... from 'features/'`

**手动验证命令：**
```bash
rg -n "from ['\"]@/features" src/core \
  --glob '!**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx'
```

## 使用方法

### 本地运行

```bash
# 运行架构门禁检查
npm run arch:gate

# 运行完整 CI 流程（构建 + 门禁）
npm run ci
```

### CI/CD 集成

在 GitHub Actions 或其他 CI 系统中添加：

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # 安装 ripgrep
      - name: Install ripgrep
        run: |
          sudo apt-get update
          sudo apt-get install -y ripgrep
      
      # 安装依赖
      - name: Install dependencies
        run: npm ci
      
      # 运行架构门禁
      - name: Architecture Gate Check
        run: npm run arch:gate
      
      # 构建
      - name: Build
        run: npm run build
```

### Git Hooks（可选）

使用 husky 在提交前自动检查：

```bash
# 安装 husky
npm install --save-dev husky
npx husky init

# 添加 pre-commit hook
echo "npm run arch:gate" > .husky/pre-commit
chmod +x .husky/pre-commit
```

## 依赖要求

需要安装 [ripgrep (rg)](https://github.com/BurntSushi/ripgrep):

- **Windows:** `scoop install ripgrep` 或 `choco install ripgrep`
- **macOS:** `brew install ripgrep`
- **Linux:** `apt install ripgrep` 或 `dnf install ripgrep`

## 输出示例

### ✅ 成功输出

```
╔════════════════════════════════════════════════════════╗
║         P1-1 CI 架构门禁检查 (Architecture Gate)      ║
╚════════════════════════════════════════════════════════╝

🔍 [A] 检查 AppStore 回流...
✅ 通过 - 未发现 AppStore 回流

🔍 [B] 检查 features 是否违规 import slices...
✅ 通过 - features 层未违规 import slices（import type 允许）

🔍 [C] 检查 core 是否违规 import features...
✅ 通过 - core 层未违规 import features

════════════════════════════════════════════════════════════
检查结果汇总：
  [A] AppStore 回流检查:        ✅ 通过
  [B] features→slices 检查:     ✅ 通过
  [C] core→features 检查:       ✅ 通过
════════════════════════════════════════════════════════════

🎉 所有架构约束检查通过！
   代码库符合 P1-1 架构边界要求
```

### ❌ 失败输出

```
❌ 发现 AppStore 回流违规：

违规文件：
src/features/settings/ThemeMatrix.tsx:15:  const appStore = useAppStore();

💡 修复建议：
   - features 层应使用 useUseCases() hook，而不是直接访问 AppStore
   - 例如：const useCases = useUseCases(); useCases.theme.addTheme(...)
```

## 文件清单

### 新增文件

- `scripts/arch-gate.mjs` - 架构门禁检查脚本
- `docs/P1-1-ARCH-GATE.md` - 本文档
- `src/app/ARCH_CONSTRAINTS.md` - 更新了 P1-1 规范说明

### 修改文件

- `package.json` - 添加了 `arch:gate` 和 `ci` 脚本

## 常见问题

### Q: 为什么允许 `import type`？

A: TypeScript 的 `import type` 只导入类型信息，不会在编译后的 JavaScript 中产生运行时依赖。允许类型导入可以保持类型安全，同时不违反架构边界。

### Q: 如何临时禁用检查？

A: 不建议禁用检查。如果确实需要，可以：
1. 将文件移到 `__tests__` 目录
2. 将文件重命名为 `*.test.ts`
3. 在文档中说明例外情况

### Q: 检查失败了怎么办？

A: 按照输出的修复建议进行代码重构：
1. 使用 `useUseCases()` 替代直接访问 AppStore
2. 移除对 slices 的直接 import
3. 重构依赖关系，保持正确的层级结构

## 相关文档

- [src/app/ARCH_CONSTRAINTS.md](../src/app/ARCH_CONSTRAINTS.md) - 完整的架构约束文档
- [scripts/check-boundaries.ts](../scripts/check-boundaries.ts) - P1 边界检查脚本
