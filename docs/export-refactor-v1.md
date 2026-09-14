# 导出能力收敛升级 v1

## 1. 产品目标

导出不是数据备份，而是把**当前视图中的有效信息**快速转换成适合人阅读、也适合 AI 继续处理的 Markdown。

核心契约：

- View 决定 **WHAT / SHAPE**：当前筛选后的记录、排序、分组，以及特殊视图结构。
- Record Profile 决定 **MEANING**：一条 Task / Habit / Thought 等记录真正值得输出的字段。
- Related Records 提供 **EVIDENCE**：TaskSession / TaskSeries 等内部记录作为关联证据，不默认单独输出。
- Renderer 决定 **FORMAT**：当前 v1 只负责 Markdown；输出目的地仍是剪贴板。

## 2. 默认阅读规则

- 每条记录优先使用已有 `primaryText` 语义作为主显示值。
- `id`、`seriesId`、`taskId` 等技术字段默认隐藏。
- `undefined` / `null` / 空字符串不输出，未知值不能伪装成 `0`。
- 如果某字段已经是当前分组字段，则记录内部不重复输出同一字段。
- 已完成 Task 默认不重复输出优先级；未完成 Task 或 View 明确展示 `priority` 时保留。

## 3. Task 实际时长规则

1. 存在 TaskSession 时，以 TaskSession 为唯一实际执行事实来源。
2. 多个有效 Session 的时长求和；普通视图摘要为 `实际时长：N 分钟（X 次执行）`。
3. Timeline 只统计当前日期范围内的 Session，并展开执行明细。
4. Timeline 范围边界与 Session 相交时，汇总时长按当前范围裁切。
5. 只有**完全不存在 TaskSession** 的旧 Task 才允许用 `startAt + endAt` 回退计算实际时长。
6. `expectedDurationMinutes` 永远只显示为“预计时长”，不得冒充实际时长。
7. 没有执行证据时，不输出“实际时长：0”。

## 4. 视图策略

- BlockView：记录列表，继承 `groupFields/group`。
- TableView：记录列表，`rowField -> colField` 转成两级分组。
- ExcelView：Markdown 表格，优先当前显示字段；Task 自动补充实际/预计时长列。
- TimelineView：按时间段导出 Task，实际执行范围由 TaskSession 驱动，展开 Session。
- EventTimelineView：使用 `timeField/titleField/groupByDay/groupFields`。
- StatisticsView：导出当前统计指标的聚合摘要，而不是原始 ID dump；统计单元格弹窗仍可导出详细记录。
- HeatmapView：按目标 -> 日期输出次数、评分、图片/emoji 摘要。
- ProgressView：按根目标输出记录/完成任务/类型摘要。
- EnergyView：按目标输出样本数、平均精力、最近值、近期记录摘要。
- EisenhowerView：开放统一导出入口，按四象限输出未完成 Task。

## 5. 架构收敛

旧结构：每个 View 维护一套 `idTemplate/detailFields/fieldLabels/fieldRender`，Task 又绕过配置单独硬编码。

新结构：

```text
ViewInstance + current items + relatedRecords
                 |
                 v
         ExportRuntimeContext
                 |
      +----------+-----------+
      |                      |
  View Strategy          Record Renderer
      |                      |
      +----------+-----------+
                 v
              Markdown
```

`src/core/config/views/exportConfigs.ts` 现在只保留薄策略，不再复制字段配置。

## 6. 主要代码入口

- `src/core/utils/exportUtils.ts`：统一 facade / strategy dispatch。
- `src/core/utils/export/model.ts`：导出上下文、TaskSession 聚合、字段/日期通用规则。
- `src/core/utils/export/recordRenderer.ts`：Task、普通记录、Energy、Excel 表格。
- `src/core/utils/export/timeStrategies.ts`：Timeline / EventTimeline。
- `src/core/utils/export/summaryStrategies.ts`：Statistics / Heatmap / Progress / Energy / Eisenhower。
- `src/app/dashboard/ViewContent.tsx`：缓存真正与视图运行时一致的导出源数据。
- `src/app/dashboard/useLayoutModuleActions.ts`：传入 `allRecords` 作为关联证据。

## 7. 验证状态

已通过：

- `architecture-gate.mjs`
- `records-gate.mjs`
- `quality-gate.mjs`
- `task-session-gate.mjs`
- `energy-gate.mjs`
- 16 个修改 TS/TSX 文件 TypeScript syntax transpile

`product-gate`、`ui-runtime-gate`、`stability-gate` 仍有失败，但与本次修改无关；在原始压缩包上可复现同样失败：缺失 `.github/workflows/ci.yml` / README 发布约束，以及既有 `whiteboard-layout.css` 的 `!important` 基线问题。

当前容器未能完成项目依赖安装，因此没有执行完整 Jest / Vite build / Obsidian 真机 E2E。对应单元、集成和 E2E 用例已经补齐/升级，需在依赖完整环境中执行。
