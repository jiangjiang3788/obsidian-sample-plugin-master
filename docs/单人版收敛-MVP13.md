# 单人版收敛 MVP13

## 背景

MVP10-MVP12 已经完成记录输入入口与 Heatmap 大视图的主要收敛：

- `RecordInputFacade` 统一 QuickInput / AI 批量确认的提交前逻辑。
- `AiBatchConfirmModel` 拆出 AI 批量确认模型。
- `HeatmapViewModel` / `HeatmapThemeGroup` / `HeatmapDayView` 拆出 Heatmap 渲染层。

MVP13 继续处理 shared view 层的剩余重复：目标进度视图和 Timeline fallback 渲染模型。

## 本轮目标

- 让 `ProgressView.tsx` 只做容器组合，不再承接卡片、进度条、主题细分和统计卡片渲染。
- 让 `TimelineViewContainer.tsx` 不再直接维护 fallback 的 config / task / summary / daily data 构造细节。
- 不删除文件，只交付本轮修改/新增完整文件补丁包。

## 主要改动

### ProgressView 收敛

新增：

- `src/shared/ui/views/ProgressViewModel.ts`
- `src/shared/ui/views/ProgressGoalCard.tsx`
- `src/shared/ui/views/ProgressSummaryCards.tsx`

迁移内容：

- 进度百分比 clamp 与展示格式。
- 目标标题 fallback。
- 主题路径 leaf label。
- 展开卡片剩余经验计算。
- 折叠态摘要 facts。
- Block 统计行。
- 主题细分过滤。
- summary fallback 计算。

结果：

- `ProgressView.tsx` 从约 208 行下降到约 37 行。
- `ProgressView.tsx` 只保留：cards、expandedKeys、summary cards、goal cards 组合。

### TimelineView 收敛

新增：

- `src/shared/ui/views/TimelineView/TimelineViewModel.ts`

迁移内容：

- Timeline fallback config 合并。
- colorMap 构造。
- timelineTasks fallback 解析。
- summary view 判断。
- summary data 构造。
- summary category hours 构造。
- daily view data 构造。
- total summary hours 汇总。

结果：

- `TimelineViewContainer.tsx` 从约 169 行下降到约 90 行。
- Container 只保留：renderModel memo、zoom hook、timeline column click handler、View props 拼装。

### 测试

新增：

- `test/unit/progressViewModel.test.ts`
- `test/unit/timelineViewModel.test.ts`

覆盖：

- Progress 百分比、summary fallback、block rows、主题细分、折叠 facts。
- Timeline config、colorMap、summary/daily 分支、injected timelineModel 优先级。

### 门禁

加强 `scripts/gates/single-user-convergence-gate.mjs`：

- 要求 ProgressViewModel / ProgressGoalCard / ProgressSummaryCards 存在。
- 限制 `ProgressView.tsx <= 80` 行。
- 禁止 ProgressView 回流本地卡片/进度条/helper。
- 要求 TimelineViewModel 存在。
- 限制 `TimelineViewContainer.tsx <= 120` 行。
- 禁止 TimelineViewContainer 回流本地 parser/summary/daily fallback helper。

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

原因：当前压缩包环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。

## 下一步

- MVP14：文档治理，删除历史过程文档，只保留当前架构、收敛记录、Git 备注和必要验收文档。该轮大概率删除文件，需要交付完整项目包。
- MVP15：最终封版，完整包 + 最终说明；在本地 `npm ci` 后跑完整 typecheck/build/gate。
