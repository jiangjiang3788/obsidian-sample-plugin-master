# 单人版收敛 MVP15：抽离 EventTimeline 与 TaskExecution 视图

## 背景

本轮继续按“逐个视图抽离”的方向推进，不做文档治理，也不删除文件。MVP12 已处理 Heatmap，MVP13 已处理 Progress / Timeline，MVP14 已处理 Excel / Statistics。本轮处理 EventTimelineView 与 TaskExecutionView。

## 改动范围

### EventTimelineView

- 新增 `src/shared/ui/views/EventTimelineView/EventTimelineViewModel.ts`
- 新增 `src/shared/ui/views/EventTimelineView/EventTimelineEventList.tsx`
- 重写 `EventTimelineViewContainer.tsx`，让容器只负责 props 解包、render model memo 和 view 组合
- 重写 `EventTimelineViewView.tsx`，让 view 只负责空状态、非分组容器、GroupedContainer 和 EventTimelineEventList 组合
- 将 displayFields/groupFields/viewConfig/timeField/date range 过滤/排序/groupedTree/task display title 等逻辑抽到模型层

### TaskExecutionView

- 新增 `src/shared/ui/views/TaskExecutionViewModel.ts`
- 新增 `src/shared/ui/views/TaskExecutionChipGrid.tsx`
- 新增 `src/shared/ui/views/TaskExecutionContextMenu.tsx`
- 重写 `TaskExecutionView.tsx`，让主文件只保留 menu 状态、外部点击关闭、Escape 关闭和子组件组合
- 将 chip tone、task map、selected task、记录链接 label、完成次数 label 等逻辑抽到模型层

## 文件行数变化

- `EventTimelineViewContainer.tsx`：约 136 行 -> 100 行
- `EventTimelineViewView.tsx`：约 157 行 -> 93 行
- `TaskExecutionView.tsx`：约 168 行 -> 69 行

## 新增测试

- `test/unit/eventTimelineViewModel.test.ts`
- `test/unit/taskExecutionViewModel.test.ts`

覆盖内容：

- EventTimeline view config 默认值
- EventTimeline display text 清洗与截断
- EventTimeline 按日期范围过滤与排序
- EventTimeline groupedTree 构造与注入优先级
- EventTimeline task display title fallback
- TaskExecution recurrence chip tone
- TaskExecution task map / selected task
- TaskExecution context menu label

## 门禁更新

`single-user-convergence-gate` 新增：

- 要求 `EventTimelineViewModel.ts` 存在
- 要求 `EventTimelineEventList.tsx` 存在
- 限制 `EventTimelineViewContainer.tsx <= 120` 行
- 限制 `EventTimelineViewView.tsx <= 120` 行
- 禁止 EventTimeline 容器/视图重新出现本地 time/display helper
- 要求 `TaskExecutionViewModel.ts` 存在
- 要求 `TaskExecutionChipGrid.tsx` 存在
- 要求 `TaskExecutionContextMenu.tsx` 存在
- 限制 `TaskExecutionView.tsx <= 90` 行
- 禁止 TaskExecutionView 回流本地 VM interface、chip tone、task map helper

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

原因：当前环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。

## 交付方式

本轮没有删除文件，因此继续交付“修改/新增完整文件补丁包”，保留完整路径，可直接覆盖到项目中。
