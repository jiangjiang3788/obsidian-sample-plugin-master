# 单人版收敛 MVP21：热力图内容层与时间轴日视图轻量抽离

## 本轮目标

继续按“逐个视图抽离，但避免过度工程化”的标准推进。

本轮先盘点 `src/shared/ui/views` 剩余文件后，没有继续拆小型纯展示组件，而是只处理仍然有明确收益的两个点：

1. `HeatmapView.tsx` 仍然超过 300 行，并且同时承担数据装配、布局状态、目标/主题内容分发。
2. `TimelineViewView.tsx` 仍然直接渲染每日时间轴内部结构，包括总结列、日列 header、时间轴和日列 body。

## 主要改动

### HeatmapView

新增：

- `src/shared/ui/views/HeatmapViewContent.tsx`
- `src/shared/ui/views/HeatmapLayoutModel.ts`

调整：

- `HeatmapView.tsx` 从约 326 行下降到约 254 行。
- `HeatmapView.tsx` 保留数据装配、rating mapping cache、创建/记录管理交互和 ResizeObserver 状态。
- `HeatmapViewContent.tsx` 承接天视图、目标分组视图、普通主题视图的内容分发。
- `HeatmapLayoutModel.ts` 承接垂直布局判断、布局 Set 更新、折叠 Set 更新。

### TimelineView

新增：

- `src/shared/ui/views/TimelineView/TimelineDailyView.tsx`
- `src/shared/ui/views/TimelineView/TimelineDailyViewModel.ts`

调整：

- `TimelineViewView.tsx` 从约 174 行下降到约 111 行。
- `TimelineViewView.tsx` 只保留空态、汇总表、日时间轴分发。
- `TimelineDailyView.tsx` 承接总结进度列、日列 header、时间轴刻度、日列 body。
- `TimelineDailyViewModel.ts` 承接日列模型和时间轴刻度模型。

## 单测

新增：

- `test/unit/heatmapLayoutModel.test.ts`
- `test/unit/timelineDailyViewModel.test.ts`

覆盖：

- Heatmap 垂直布局跳过规则、阈值规则、Set 不可变更新。
- Timeline 日列 fallback、时间轴偶数小时 label。

## 门禁

加强 `scripts/gates/single-user-convergence-gate.mjs`：

- 要求 `HeatmapViewContent.tsx` 存在。
- 要求 `HeatmapLayoutModel.ts` 存在。
- 将 `HeatmapView.tsx` 行数限制从 360 收紧到 260。
- 禁止 `HeatmapView.tsx` 回流本地 `renderContent/renderThemeGroup`。
- 要求 `TimelineDailyView.tsx` 存在。
- 要求 `TimelineDailyViewModel.ts` 存在。
- 限制 `TimelineViewView.tsx <= 120`。
- 禁止 `TimelineViewView.tsx` 直接渲染 `DayColumnHeader/DayColumnBody/ProgressBlock`。

## 防过度工程化说明

本轮没有拆这些小组件：

- `TimerView.tsx`
- `TimerViewView.tsx`
- `CategoryFilter.tsx`
- `ThemeFilter.tsx`
- `WeekStatisticsView.tsx`
- `DayStatisticsView.tsx`

原因：它们当前行数不高、职责清楚，继续拆只会增加跳转成本。

后续仍按这个标准：

- 有计算、有重复规则、有测试价值：抽。
- 小于约 80 行且职责单一：不强拆。
- 已经是容器/展示分离：不强拆。

## 验证

已通过：

```bash
npm run single-user:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

失败原因仍然是当前环境缺少 `node_modules`，具体缺少：

```text
node
preact
vite/client
```

本地建议：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/heatmapLayoutModel.test.ts test/unit/timelineDailyViewModel.test.ts
npm run typecheck:src
npm run build
npm run gate
```
