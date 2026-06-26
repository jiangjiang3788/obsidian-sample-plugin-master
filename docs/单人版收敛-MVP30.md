# 单人版收敛 MVP30：Progress 技能经验视图简化落地

## 目标

本轮不继续做通用仪表盘，不做完成率，不做提醒/掉队，也不新增独立时间控制。按用户确认的小样方向，把 ProgressView 收窄为“目标大技能 + 主题小技能 + 经验条”的简洁视图。

## 设计决策

- 目标是大技能：每个目标一张大卡。
- 主题是小技能：主题细分不再并排卡片，改成卡片内纵向列表。
- 时间维度继续由现有统一控制栏和筛选链路传入，ProgressView 不重复做时间逻辑。
- MVP 先按记录数/经验展示，不显示完成率。
- 不显示提醒、掉队、异常状态。
- 最近记录入口只放在展开态，不占用默认卡片视野。
- 亮色优先，后续如需要再适配暗色变量。

## 主要改动

### ProgressView

- 移除默认 summary cards 展示。
- 根视图只负责遍历目标技能卡和维护展开状态。
- 增加 `onOpenRecord` 透传，供展开态记录入口复用现有打开记录能力。

### ProgressGoalCard

- 改成大技能卡结构：图标、标题、目标路径、等级徽章、总经验条、小技能列表。
- 大经验条使用渐变条 + 10 段刻度，不显示百分比。
- 小技能改为纵向列表，每行显示小技能名、记录数、XP、小经验条、等级。
- 展开态只显示 Block 标签和最近记录入口。

### ProgressViewModel

- 新增 1-10 级 `PROGRESS_LEVEL_META`：图标 + 等级名。
- 新增 `buildProgressSkillRows`，把 `themeBreakdown` 转成小技能行。
- 新增 `ProgressRecentRecordModel`，为展开态记录入口准备数据结构。
- `ProgressViewRenderModel.config/result` 从 `any` 收紧为 `unknown`。

### progressViewModel

- 为每个目标卡补充 `recentRecords`。
- `normalizeBlockKey` 不再使用显式 `any`，改用 `UnknownRecord` reader。
- 默认 metric 改成 `recordCount`，语义上和经验条 MVP 按记录数一致。

## 治理结果

- `src` 显式 `any` 从 MVP29 的 870 降到 865。
- total 显式 `any` 从 1036 降到 1031。
- `ProgressView` 继续保持轻量组合壳。
- 没有引入新的 Progress 时间控制、完成率逻辑或提醒逻辑。

## 验证

已通过：

```bash
npm run any-budget:gate
npm run shared-view-convergence:gate
npm run single-user:gate
npm run docs-governance:gate
npm run final-convergence:gate
npm run gate
```

未完整运行：

```bash
npm run typecheck:src
npm run test:unit
npm run build
```

原因：当前环境没有 `node_modules`，缺少 `node/preact/vite/client` 类型和 jest 命令。

## 下一步

建议先在 Obsidian 里看 ProgressView 实际视觉效果，再决定是否继续微调：

- 大技能卡间距。
- 小技能行高度。
- 等级图标文案。
- 展开态记录入口是否需要更强的跳转按钮。
