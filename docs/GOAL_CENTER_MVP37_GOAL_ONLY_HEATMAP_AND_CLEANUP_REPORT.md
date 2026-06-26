# GOAL_CENTER_MVP37_GOAL_ONLY_HEATMAP_AND_CLEANUP_REPORT

## 目标

本版在目标迁移已经完成的前提下继续收尾：

1. 打卡视图的年 / 季 / 月 / 周 / 天视图都以目标为第一层分组。
2. 每个目标下面显示多个打卡预设/打卡模板，而不是继续按旧主题混在一张热力图里。
3. 目标中心移除“迁移”和“高级”入口，保留普通用户日常需要的目标、预设表、指标。

## 修复原因

上一版只在部分渲染路径上支持目标分组，但周视图和天/日视图仍可能落回旧主题展示，主要原因是：

- Heatmap 的行数据主要从当前日期范围内已有记录反推；如果某个周/天没有某个预设的记录，这个预设行就不会出现。
- 旧 viewConfig.themePaths 仍会限制部分主题，导致已经能识别到目标预设的记录也可能被旧主题列表挡掉。
- 日视图存在“天 / 日 / day”命名差异，部分入口可能没有走目标分组分支。

## 本版实现

### 1. Heatmap 数据模型改成目标 × 打卡预设

文件：

- `src/features/settings/viewModels/heatmapViewModel.ts`

改动：

- 从 `goalSettings.goalBlockBindings` 预先建立所有 `core.habit` 打卡预设行。
- 即使当前日期范围没有记录，也显示目标下的打卡预设行。
- 记录能匹配到目标预设时，不再受旧 `themePaths` 过滤影响。
- 预设主题读取时忽略 `{{goal.themePath}}` 占位符，优先使用真实主题或 legacyThemePath。

最终结构：

```text
目标
  打卡预设 A / 主题 A / 日期格
  打卡预设 B / 主题 B / 日期格
```

### 2. Heatmap 渲染统一日/周/月/季/年

文件：

- `src/shared/ui/views/HeatmapView.tsx`

改动：

- `天 / 日 / day` 统一为日视图。
- 周视图、月视图、年视图、季视图都复用目标分组结果。
- 行 key 使用 `presetKey`，避免同一个主题下多个预设被复用成同一行。

### 3. 目标中心去掉迁移和高级入口

文件：

- `src/features/settings/input/GoalManager.tsx`

改动：

- 删除“迁移”页签。
- 删除“高级”页签。
- 删除对 `ThemeOverrideMigrationPanel` 和 `GoalDiagnosticsSection` 的引用。
- 目标中心只保留：

```text
目标
预设表
指标
```

同时删除未再引用的 UI 文件：

- `src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx`
- `src/features/settings/input/goalManager/GoalDiagnosticsSection.tsx`

## 验收

1. 打卡视图年 / 季 / 月 / 周 / 天都应该先显示目标标题。
2. 每个目标下面应该显示多个打卡预设行，例如睡眠打卡、早餐打卡、运动打卡。
3. 同一天多个打卡不应该只混成一个旧主题数字，而应该落在对应预设行里。
4. 目标中心不再出现“迁移”和“高级”。
5. 主题仍保留为打卡预设的二级信息，不重新变成目标。

## 构建说明

当前沙盒缺少 `vite`、`node/preact/vite/client` 类型依赖，无法在这里完整执行 `npm run build`。请在本地执行：

```bash
npm run build
```
