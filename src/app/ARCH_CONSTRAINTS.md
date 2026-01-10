# 架构约束文档

## 概述

本文档定义了项目的架构约束，确保各模块的写入口唯一性和数据流清晰。

---

## P1-1 CI 防回流固化

### 概述

P1-1 规范通过 CI 门禁脚本确保架构边界不被破坏。该脚本在每次 PR 前自动运行，防止架构回流和越界访问。

### 核心规则

#### A) AppStore 永不回流

**规则：** AppStore 仅应在 `app` 层使用，`features`/`core` 层不应直接访问 AppStore。

**✅ 允许：**
- `src/app/**` 中使用 AppStore
- 测试文件 (`__tests__/*`, `*.test.ts`, `*.test.tsx`) 中使用

**⛔ 禁止：**
- `src/features/**` 直接引用 AppStore
- `src/core/**` 直接引用 AppStore

**验收命令：**
```bash
# 检查是否有违规（应无输出或仅在 app 层/测试文件）
rg -n "\bAppStore\b" src \
  --glob '!src/app/**' \
  --glob '!**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx' \
  --glob '!**/ARCH_CONSTRAINTS.md'
```

#### B) features 禁止 import app/store/slices

**规则：** features 层必须通过 `useCases` 访问数据，不可直接 import slices。

**✅ 允许：**
- `src/features/**` → `useUseCases()` → `useCases.theme.*`
- `src/features/**` → `useZustandAppStore(selector)`

**⛔ 禁止：**
- `src/features/**` → `import ... from '@/app/store/slices'`
- `src/features/**` → `import ... from 'app/store/slices'`

**验收命令：**
```bash
# 检查是否有违规 import slices（应无输出）
rg -n "from ['\"]@/app/store/slices" src/features \
  --glob '!**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx'
```

#### C) core 禁止 import features

**规则：** core 层是底层模块，不应依赖 features 层。

**✅ 允许：**
- `src/core/**` → 其他 core 模块
- `src/core/**` → 外部库

**⛔ 禁止：**
- `src/core/**` → `import ... from '@/features'`
- `src/core/**` → `import ... from 'features/'`

**验收命令：**
```bash
# 检查是否有违规 import features（应无输出）
rg -n "from ['\"]@/features" src/core \
  --glob '!**/__tests__/**' \
  --glob '!**/*.test.ts' \
  --glob '!**/*.test.tsx'
```

### 运行门禁检查

#### 手动运行

```bash
# 运行架构门禁检查
npm run arch:gate

# 运行完整 CI 流程（构建 + 门禁）
npm run ci
```

#### CI 集成

在 CI/CD pipeline 中添加：

```yaml
# .github/workflows/ci.yml
- name: Architecture Gate Check
  run: npm run arch:gate
```

#### Git Hooks（可选）

使用 husky 在 pre-commit 时检查：

```bash
# .husky/pre-commit
npm run arch:gate
```

### 失败输出示例

当违反架构约束时，脚本会输出：

```
❌ 发现 AppStore 回流违规：

违规文件：
src/features/settings/ThemeMatrix.tsx:15:  const appStore = useAppStore();

💡 修复建议：
   - features 层应使用 useUseCases() hook，而不是直接访问 AppStore
   - 例如：const useCases = useUseCases(); useCases.theme.addTheme(...)
```

### 依赖要求

需要安装 [ripgrep (rg)](https://github.com/BurntSushi/ripgrep):

- **Windows:** `scoop install ripgrep` 或 `choco install ripgrep`
- **macOS:** `brew install ripgrep`
- **Linux:** `apt install ripgrep` 或 `dnf install ripgrep`

---

## S5 架构约束 - Layout/ViewInstance

### 概述

S5（真源唯一）规范确保 ViewInstance / Layout 的 CRUD 和 reorder 只存在一个写入口。
UseCases 是唯一“对外写入口”；store actions 是内部实现细节；SettingsRepository 是唯一持久化写入口。

### 核心原则

#### 1. 唯一写入口（Facade 模式）

```
features 层 → useCases.layout.* → slice actions → SettingsRepository
```

**✅ 允许的调用路径：**
- `src/features/**` → `useCases.layout.*`

**⛔ 禁止的调用路径：**
- `src/features/**` → `viewInstance.slice` 的 vi* actions
- `src/features/**` → `viewInstance.usecase`
- `src/features/**` → `group.usecase`
- `src/features/**` → 已废弃的旧 API

#### 2. 层级职责

| 层级 | 文件 | 职责 | 可被调用者 |
|------|------|------|-----------|
| Features | `src/features/**` | UI 组件 | - |
| UseCase (Facade) | `layout.usecase.ts` | 唯一写入口 | features |
| UseCase (Internal) | `viewInstance.usecase.ts` | 已禁用 | - |
| UseCase (Disabled) | `group.usecase.ts` | 已禁用 | - |
| Slice | `layout.slice.ts` | 底层实现 | useCases |
| Slice | `viewInstance.slice.ts` | 底层实现 | useCases |
| Repository | `SettingsRepository.ts` | 持久化 | slices |

### API 映射

#### Layout 操作

| 操作 | UseCase API | 内部实现 |
|------|-------------|----------|
| 添加布局 | `layoutUseCase.addLayout()` | `state.addLayout()` |
| 更新布局 | `layoutUseCase.updateLayout()` | `state.updateLayout()` |
| 删除布局 | `layoutUseCase.deleteLayout()` | `state.deleteLayout()` |
| 移动布局 | `layoutUseCase.moveLayout()` | `state.moveLayout()` |
| 复制布局 | `layoutUseCase.duplicateLayout()` | `state.duplicateLayout()` |
| 重排布局 | `layoutUseCase.reorderLayouts()` | `state.reorderLayouts()` |

#### View 操作

| 操作 | UseCase API | 内部实现 |
|------|-------------|----------|
| 添加视图 | `layoutUseCase.addView()` | `state.viAddViewInstance()` |
| 更新视图 | `layoutUseCase.updateView()` | `state.viUpdateViewInstance()` |
| 删除视图 | `layoutUseCase.deleteView()` | `state.viDeleteViewInstance()` |
| 移动视图 | `layoutUseCase.moveView()` | `state.viMoveViewInstance()` |
| 复制视图 | `layoutUseCase.duplicateView()` | `state.viDuplicateViewInstance()` |

### 禁用功能

#### Group 功能

Group 移动/分组存在问题，当前策略是**完全禁用**：

- `group.usecase.ts` - 所有方法抛出异常
- `group.slice.ts` - 保留但不使用
- `GroupStore.ts` - 已禁用

#### Legacy Stores

以下 legacy stores 已禁用，构造函数会抛出异常：

- `ViewInstanceStore.ts`
- `GroupStore.ts`
- `LayoutStore.ts`

---

## S6 架构约束 - ThemeMatrix

### 概述

S6 规范确保 ThemeMatrix 的写操作只存在一个写入口，明确数据边界。

### 核心原则

#### 1. 唯一写入口（Facade 模式）

```
ThemeMatrix UI → useCases.theme.* → Zustand Store actions → SettingsRepository
```

**✅ 允许的调用路径：**
- `src/features/settings/ThemeMatrix.tsx` → `useCases.theme.*`
- `src/features/settings/ThemeTable.tsx` → `useCases.theme.*`
- `src/features/settings/ThemeTreeNodeRow.tsx` → `useCases.theme.*`

**⛔ 禁止的调用路径：**
- `src/features/**` → `theme.slice` 的 actions（直接调用）
- `src/features/**` → 已废弃的旧 API
- `src/features/**` → `SettingsRepository.update()`（直接调用）
- `src/features/**` → `useStore(state => state.settings)` 进行写操作

#### 2. 数据边界

| 数据类型 | 存储位置 | 说明 |
|----------|----------|------|
| 主题定义 (ThemeDefinition) | settings.inputSettings.themes | 业务数据，持久化 |
| 覆盖配置 (ThemeOverride) | settings.inputSettings.overrides | 业务数据，持久化 |
| 选中态 (selectedThemes/selectedCells) | 组件 state | UI 临时态，不持久化 |
| 展开态 (expandedNodes) | 组件 state | UI 临时态，不持久化 |
| 编辑模式 (mode) | 组件 state | UI 临时态，不持久化 |
| hover 状态 | 组件 state | UI 临时态，不持久化 |

#### 3. 层级职责

| 层级 | 文件 | 职责 | 可被调用者 |
|------|------|------|-----------|
| Features | `ThemeMatrix.tsx` | UI 组件 | - |
| Features | `ThemeTable.tsx` | UI 组件 | - |
| Features | `ThemeTreeNodeRow.tsx` | UI 组件 | - |
| UseCase (Facade) | `theme.usecase.ts` | 唯一写入口 | features |
| Slice | `theme.slice.ts` | 底层实现 | useCases |
| Service | `ThemeMatrixService.ts` | 业务逻辑 | features (只读) |
| Service | `ThemeScanService.ts` | 扫描逻辑 | features (通过 writeOps) |
| Repository | `SettingsRepository.ts` | 持久化 | slices |

### API 映射

#### Theme 操作

| 操作 | UseCase API | 内部实现 |
|------|-------------|----------|
| 添加主题 | `themeUseCase.addTheme(path)` | `state.addTheme()` |
| 更新主题 | `themeUseCase.updateTheme(id, updates)` | `state.updateTheme()` |
| 删除主题 | `themeUseCase.deleteTheme(id)` | `state.deleteTheme()` |
| 批量更新 | `themeUseCase.batchUpdateThemes(ids, updates)` | `state.batchUpdateThemes()` |
| 批量删除 | `themeUseCase.batchDeleteThemes(ids)` | `state.batchDeleteThemes()` |
| 批量更新状态 | `themeUseCase.batchUpdateThemeStatus(ids, status)` | `state.batchUpdateThemeStatus()` |
| 批量更新图标 | `themeUseCase.batchUpdateThemeIcon(ids, icon)` | `state.batchUpdateThemeIcon()` |

#### Override 操作

| 操作 | UseCase API | 内部实现 |
|------|-------------|----------|
| 更新/插入覆盖 | `themeUseCase.upsertOverride(data)` | `state.upsertOverride()` |
| 删除覆盖 | `themeUseCase.deleteOverride(blockId, themeId)` | `state.deleteOverride()` |
| 批量更新覆盖 | `themeUseCase.batchUpsertOverrides(overrides)` | `state.batchUpsertOverrides()` |
| 批量删除覆盖 | `themeUseCase.batchDeleteOverrides(selections)` | `state.batchDeleteOverrides()` |
| 批量设置状态 | `themeUseCase.batchSetOverrideStatus(cells, status)` | `state.batchSetOverrideStatus()` |

### UI 读取路径

UI 读取 theme 相关数据应使用 Zustand selector：

```typescript
// ✅ 推荐：使用 useZustandAppStore selector
import { useZustandAppStore } from '@/app/AppStoreContext';

const themes = useZustandAppStore(state => state.settings.inputSettings.themes);
const overrides = useZustandAppStore(state => state.settings.inputSettings.overrides);

// ⛔ 禁止：使用已废弃的 API
```

### 服务层约束

#### ThemeMatrixService / ThemeScanService

这些服务应通过配置注入：

```typescript
// ✅ 推荐：通过配置注入
const themeService = new ThemeMatrixService({
    getSettings: () => settingsRepository.getSettings(),
    writeOps: {
        addTheme: (path) => useCases.theme.addTheme(path),
        updateTheme: (id, updates) => useCases.theme.updateTheme(id, updates),
        // ...
    },
    themeManager,
});
```

### 迁移指引

#### API 使用示例

```typescript
// ✅ React 组件内读取状态
import { useZustandAppStore } from '@/app/AppStoreContext';
const themes = useZustandAppStore(state => state.settings.inputSettings.themes);

// ✅ React 组件内写入状态
import { useUseCases } from '@/app/AppStoreContext';
const useCases = useUseCases();
useCases.theme.addTheme(path);

// ✅ 非 React 场景使用 DI 获取
import { container } from 'tsyringe';
import { USECASES_TOKEN, type UseCases } from '@/app/usecases';
const useCases = container.resolve<UseCases>(USECASES_TOKEN);
useCases.theme.addTheme(path);

// ✅ 非 React 场景只读访问
import { container } from 'tsyringe';
import { getZustandState, STORE_TOKEN, type AppStoreInstance } from '@/app/store/useAppStore';
const store = container.resolve<AppStoreInstance>(STORE_TOKEN);
const themes = getZustandState(store, s => s.settings.inputSettings.themes);
```

### 验收标准

1. ✅ ThemeMatrix UI 文件中不出现已废弃的 API import
2. ✅ 所有写操作都经过 `useCases.theme.*`
3. ✅ UI 临时态不写入 settings
4. ✅ 服务层通过配置注入依赖

### 文件清单

#### 唯一写入口
- `src/app/usecases/theme.usecase.ts` - ✅ Facade

#### 底层实现（仅供 useCases 使用）
- `src/app/store/slices/theme.slice.ts`

#### UI 组件（已迁移）
- `src/features/settings/ThemeMatrix.tsx`
- `src/features/settings/ThemeTable.tsx`
- `src/features/settings/ThemeTreeNodeRow.tsx`
- `src/features/settings/InputSettings.tsx`

#### 服务层
- `src/core/theme-matrix/ThemeMatrixService.ts`
- `src/core/theme-matrix/ThemeScanService.ts`

---

## ESLint 规则

项目配置了 ESLint 规则禁止 features 层直接 import slices：

```javascript
// .eslintrc-architecture.js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/app/store/slices/*', '../app/store/slices/*'],
        message: '[S5/S6] features 层禁止直接 import slices，请使用 useCases'
      }]
    }]
  }
}
```

---

## 查询操作

### 查询操作

| 操作 | UseCase API |
|------|-------------|
| 获取所有布局 | `layoutUseCase.getLayouts()` |
| 获取单个布局 | `layoutUseCase.getLayout(id)` |
| 按父级获取 | `layoutUseCase.getLayoutsByParent(parentId)` |
| 获取顶级布局 | `layoutUseCase.getTopLevelLayouts()` |
| 获取所有主题 | `themeUseCase.getThemes()` |
| 获取单个主题 | `themeUseCase.getTheme(id)` |
| 获取所有覆盖 | `themeUseCase.getOverrides()` |
| 获取特定覆盖 | `themeUseCase.getOverride(blockId, themeId)` |
