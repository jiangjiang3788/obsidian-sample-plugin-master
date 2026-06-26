# 单人版收敛 MVP32：Progress 大技能经验条内联收窄

## 本轮目标

MVP31 已经把 Progress 视图收窄为左对齐紧凑卡片，但实际使用中，大技能经验条仍然单独占据 header 下方一行，在记录很少时会像一个孤立色块；同时卡片、图标和等级徽章仍有轻微投影感。

MVP32 只做视觉收敛，不改变 Progress 数据模型、时间控制链路、等级算法、展开态记录入口，也不继续引入完成率/提醒/掉队逻辑。

## 改动内容

- 将大技能经验条从 header 下方独立行移动到目标名称后面。
- 删除大技能经验条单独占行，避免在宽屏上出现孤立色块。
- 去掉 Progress 大技能卡片、目标图标和等级徽章上的投影。
- 保持目标名、等级徽章、小技能列表和展开态记录入口的现有结构。
- 保持 ProgressView 左对齐紧凑容器，不重新撑满大屏。

## 设计边界

默认态只保留：

```text
目标图标
目标名
目标经验条
等级徽章
小技能名
小技能等级
小技能经验条
```

默认态继续不展示：

```text
目标路径
记录数经验文案
XP 数字详情
还差多少到下一级
10 段刻度
完成率
掉队提醒
最近记录
```

最近记录仍只在展开态显示。

## 涉及文件

```text
src/shared/ui/views/ProgressGoalCard.tsx
scripts/gates/docs-governance-gate.mjs
scripts/gates/final-convergence-gate.mjs
docs/单人版收敛-MVP32.md
docs/Git提交备注-MVP32.md
```

## 验收标准

- `ProgressGoalCard.tsx` 中大技能经验条不再出现在 header 下方独立行。
- 大技能经验条和目标名处于同一 header 内容区。
- 大技能卡片、目标图标、等级徽章不再使用投影。
- 默认态不重新出现 XP 数字、目标路径、下级提示、10 段刻度。
- `npm run gate` 通过。

## 验证结果

当前环境已验证：

```bash
npm run any-budget:gate
npm run shared-view-convergence:gate
npm run docs-governance:gate
npm run final-convergence:gate
npm run gate
```

当前环境仍未完整运行：

```bash
npm run typecheck:src
npm run build
```

原因是当前环境没有 `node_modules`，缺少 `node/preact/vite/client` 类型定义。
