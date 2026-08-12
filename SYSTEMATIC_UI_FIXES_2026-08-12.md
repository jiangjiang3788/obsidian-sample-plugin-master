# Systematic UI fixes · 2026-08-12

本轮不是补丁式修复，而是按“视图契约统一”做的系统性收口。

## 1. Statistics 视图
- 移除顶部目标胶囊（goal theme summary strip）。
- 移除 Statistics 外层面板框，改为无额外外包裹框的纯内容呈现。
- 保留统计主体视图逻辑，不改数据结构。

## 2. 完成任务 / 未完成任务 / 通用 TaskRow
- 统一 `TaskRow` 的基线对齐规则。
- checkbox / 任务标题 / 计时按钮按同一行垂直居中。
- 用共享样式修正，而不是在每个视图单独补丁。

## 3. 精力视图（Energy）
- 顶部不再显示“任务”标题。
- 目标标题改成与任务 chip 同风格。
- 任务分组（例：日常任务 / 天任务）视觉上只显示图标，不显示文字。
- 空 cadence 行不显示。
- 一个目标下如果所有 cadence 都为空，则整个目标不显示。

## 4. EventTimeline 视图
- 改为连续主轴，消除“线断断续续”的视觉问题。
- hover 时取消整行位移，避免线条跟着移动导致断裂感更明显。
- 保留卡片 hover，但把交互重点放到卡片，而不是整条时间线位移。

## 5. 额外并入的两类小问题
- EventTimeline 的 groupFields 归一化改为走 `normalizeViewGroupFields`，与系统视图域策略一致。
- 保留 / 兼容 verify:ci 的跨平台执行思路，不走局部脚本旁路。

## 改动文件
- `src/features/views/runtime/StatisticsView/StatisticsViewView.tsx`
- `src/styles/features/statistics.base.css`
- `src/styles/features/statistics.summary.css`
- `src/styles/components/task-row.css`
- `src/features/views/models/energyTaskListModel.ts`
- `src/features/views/runtime/EnergyTaskList.tsx`
- `src/styles/features/energy-task-list.css`
- `src/styles/features/event-timeline.css`
- `src/features/views/runtime/EventTimelineView/EventTimelineViewModel.ts`
- `test/unit/features/views/energyTaskListModel.test.ts`
- `test/unit/eventTimelineViewModel.test.ts`

## 说明
当前交付环境无法在线安装依赖，因此无法在容器里跑完整 npm test / verify。
源码已按系统性修改完成，建议在你的本地项目环境直接执行：

```bash
npm install
npm run test
npm run verify:ci
```

