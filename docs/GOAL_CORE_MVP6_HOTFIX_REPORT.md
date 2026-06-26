# Goal Core MVP6 Hotfix Report

## 修复版本

MVP6 Hotfix 1

## 用户反馈的运行时错误

```text
TypeError: Cannot read properties of undefined (reading 'length')
    at titleFromPath
    at ensureRow
    at buildGoalOverviewModel
```

以及：

```text
TypeError: Cannot read properties of null (reading 'children')
```

## 根因

1. `src/core/goal/overview.ts` 中 `titleFromPath()` 仍按旧结构读取 `splitGoalPath(path).parts`。但当前 `splitGoalPath()` 返回的是 `{ goalPath, rootGoal, leafGoal }`，没有 `parts` 字段，导致 `parts.length` 崩溃。
2. `GoalOverviewModel.ensureRow()` 对空 goalPath 没有兜底。旧数据或异常表单数据里可能出现空目标路径。
3. `ThemeTreeSelect` 在树节点渲染时默认认为 `node.children` 一定存在。当搜索、虚节点、外部传入树或数据异常时，可能出现 `node === null` 或 `children === undefined`。

## 修复内容

### 1. 修复目标总览 titleFromPath

文件：

```text
src/core/goal/overview.ts
```

改动：

- `titleFromPath()` 改为读取 `leafGoal`。
- 空路径时返回 `未命名目标`。
- 新增 `normalizeGoalPathValue()`，统一清洗目标路径。
- `ensureRow()` 接受空值输入并安全跳过。
- 遍历记录时，如果目标路径异常，跳过该 row，不再让视图崩溃。

### 2. 修复 GoalOverviewView 对异常 row 的防御

文件：

```text
src/shared/ui/views/GoalOverviewView.tsx
```

改动：

- `GoalRow` 遇到空 row 直接返回 null。
- UI 使用 `safeTitle / safeGoalPath`。
- 搜索过滤时兼容空 `title / goalPath / themePath`。

### 3. 修复 ThemeTreeSelect children 空值问题

文件：

```text
src/shared/components/ThemeTreeSelect/Panel.tsx
src/shared/components/ThemeTreeSelect/ThemeTreeNodeItem.tsx
src/core/theme/ThemeTreeBuilder.ts
```

改动：

- `buildThemeTree()` 结果做空节点过滤。
- `searchThemeTree()` 结果做空节点过滤。
- `collect(n.children || [])`。
- `node.children || []`。
- `ThemeTreeNodeItem` 对空 node 防御。
- `getDescendantPaths()` 对空节点和空 children 防御。

## 已通过的 gate

```bash
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
```

## 仍需本地验证

当前容器没有完整 `node_modules`，所以仍需你本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 验收建议

1. 打开目标总览视图，不应再反复报 `titleFromPath` 的 `length` 错误。
2. 打开快捷输入面板，目标选择器和主题层级字段不应再报 `null.children`。
3. 使用旧数据中没有目标路径、目标为空、目标字段异常的记录，目标总览也应该降级显示或跳过，而不是崩溃。
