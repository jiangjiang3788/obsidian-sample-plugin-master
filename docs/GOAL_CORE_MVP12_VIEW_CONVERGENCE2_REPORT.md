# MVP12.2 视图收敛加强版报告

## 版本定位

本版继续围绕用户确认的视图原则做收敛：

- `ProgressView` 只做目标经验卡片。
- `StatisticsView` 只按目标分组，不再把分类作为主统计维度。
- 时间周期统一由外部控制栏控制。
- 目标 / Block / 主题等条件统一由视图筛选控制。
- 视图只展示，不负责创建数据。
- `GoalOverviewView` / `GoalDetailView` 只保留 legacy 兼容文件，不再注册为新视图。

## 本版相对 MVP12 第一版的新增收敛

### 1. ProgressView 编辑器去 legacy 化

上一版仍暴露 `legacy` 旧积分成长模式。本版移除编辑器中的 legacy 切换，ProgressView 只作为目标经验卡片视图配置。

保留配置：

- 显示目标数量
- 基础积分
- 每级积分
- 评分加分阈值
- 评分额外积分
- 展开卡片时是否显示 Block 统计

不再暴露：

- 旧积分成长模式
- 主题积分配置
- 分类积分作为主模式
- 时间 / 目标筛选控件

### 2. StatisticsView 编辑器只保留目标统计展示配置

上一版编辑器仍保留 `groupBy = category/block` 选择和分类配置。本版移除这些 UI。

保留配置：

- 显示目标数量
- 柱状高度模式
- 最小可见高度

不再暴露：

- 统计维度切换
- 分类配置
- 分类 alias 调整
- 内部周期控制

### 3. StatisticsView 彻底取消视图内创建入口

虽然上一版 popover 内已禁用 quickCreate，但 viewPropsFactory 仍会向 StatisticsView 传入 `onQuickCreate`，并且模块头创建 allowlist 仍包含 `StatisticsView`。

本版收敛为：

- `StatisticsView` 不再接收 `onQuickCreate`。
- `MODULE_HEADER_CREATE_ALLOWLIST` 移除 `StatisticsView`。
- 新增数据统一走快捷输入面板主入口。

### 4. 目标图标更贴近主题 metadata

`buildGoalBuckets()` 新增 `themes` 选项。

目标 bucket 的图标解析顺序：

1. 目标自身 icon
2. 目标绑定主题 `themePath` 的图标
3. 父主题图标回退
4. 默认目标图标 / 未归属符号

这样 `ProgressView` 和 `StatisticsView` 都能继续利用主题的图标价值，但主题不参与模板决策。

### 5. Progress topN 生效

上一版 Progress 编辑器有显示目标数量，但模型未截断。现在 `buildProgressViewModel()` 会按目标经验/记录数排序后应用 `topN`。

### 6. Statistics topN 生效且不再误用分类筛选

上一版 Statistics 会接收 `selectedCategories`，这容易把“分类筛选”误当成“目标 bucket 筛选”。本版改为：

- 视图筛选仍通过 `useViewData / applyViewQueryPipeline` 过滤 items。
- Statistics 内部不再使用 `selectedCategories` 过滤 bucket。
- `topN` 根据当前已过滤数据的目标记录数截断。

## 代码改动重点

- `src/features/settings/viewEditors/ProgressViewEditor.tsx`
- `src/features/settings/viewEditors/StatisticsViewEditor.tsx`
- `src/features/settings/layout/viewPropsFactory.ts`
- `src/app/actions/recordCreateActions.ts`
- `src/core/goal/itemGoalGrouping.ts`
- `src/features/settings/viewModels/progressViewModel.ts`
- `src/features/settings/viewModels/statisticsViewModel.ts`
- `src/features/settings/viewModels/viewModelRegistry.ts`
- `src/core/config/viewConfigs.ts`

## 验证

已通过以下 gate：

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/dual-system-gate.mjs
node scripts/gates/obsidian-leak-gate.mjs
node scripts/gates/events-boundary-gate.mjs
node scripts/gates/core-obsidian-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/di-resolve-gate.mjs
node scripts/gates/modal-promise-gate.mjs
node scripts/gates/selector-giant-subscription-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/iconaction-gate.mjs
node scripts/gates/data-store-boundary-gate.mjs
node scripts/gates/performance-boundary-gate.mjs
node scripts/gates/timer-view-runtime-boundary-gate.mjs
node scripts/gates/shared-self-alias-migrated-gate.mjs
```

## 仍需本地验证

当前容器缺少完整 `node_modules`，无法执行完整 TS 构建。请本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 下版建议

- 给 `itemGoalGrouping` 增加单元测试。
- 给 `ProgressView` 目标卡片模型增加单元测试。
- 给 `StatisticsView` 周/月目标聚合增加单元测试。
- 进一步清理 legacy `GoalOverviewView` / `GoalDetailView` 文件的 public 暴露。
