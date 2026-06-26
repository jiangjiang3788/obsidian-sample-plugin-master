# 单人版收敛 MVP31：Progress 视图紧凑化

## 背景

MVP30 已将 ProgressView 改成“目标大技能 + 主题小技能 + 经验条”。实际查看后，大屏上卡片和经验条过度撑满，默认信息仍偏多：目标路径、记录经验文案、XP 数字详情、下级提示、10 段刻度、小技能记录数和 XP 文案都会增加阅读负担。

MVP31 继续按用户截图收窄：默认视图只保留技能名、等级和经验条。记录入口仍放在展开态。

## 修改范围

- `src/shared/ui/views/ProgressView.tsx`
- `src/shared/ui/views/ProgressGoalCard.tsx`
- `scripts/gates/docs-governance-gate.mjs`
- `scripts/gates/final-convergence-gate.mjs`
- `docs/README.md`
- `docs/MVP_ACCEPTANCE.md`
- `docs/单人版收敛总览.md`
- `docs/文档治理.md`
- `docs/最终封版说明.md`
- `docs/类型治理计划.md`

## 视图变化

- ProgressView 外层设置左对齐紧凑容器，避免大屏撑满。
- 大技能卡最大宽度限制为 760px。
- 目标 header 只保留图标、目标名和等级徽章。
- 移除目标路径、记录数经验文案。
- 大经验条只保留一条主进度，不再展示 10 段刻度。
- 移除 `当前 XP / 下级 XP` 和“还差 X 条记录到 Lv.N”文案。
- 小技能行只保留小技能名、等级和小经验条。
- 小技能行移除“X 条记录 · Y XP”文案。
- 展开态记录入口仍保留，不污染默认视图。

## 验收

```bash
npm run any-budget:gate
npm run shared-view-convergence:gate
npm run docs-governance:gate
npm run final-convergence:gate
npm run gate
```

当前环境没有 `node_modules`，因此仍不能完整运行 `typecheck`、`unit test` 和 `build`。
