# 单人版收敛 MVP24：文档治理

## 背景

MVP1-MVP23 已经完成核心代码收敛、shared view 抽离、非 shared view 大容器盘点和多层 gate 收口。继续做代码拆分的边际收益已经下降，因此 MVP24 转入文档治理。

本项目是单人自用插件，不需要长期保留每一次探索、迁移、pass、audit 的过程文档。文档根目录应该优先服务当前维护：入口清楚、验证路径清楚、收敛历史可查、Git 备注可复制。

## 本轮删除

本轮删除 81 个旧过程文档，主要包括：

- `DATA_REVIEW_MVP*.md`
- `FIRST_PASS_CHANGES.md` 到 `TENTH_PASS_CHANGES.md`
- `GOAL_CENTER_*.md`
- `GOAL_CORE_*.md`
- `THINK_OS_*.md`
- `MVP*_PROGRESS.md` / `MVP_PROGRESS.md`
- `RELEASE_READINESS_MVP*.md`

这些文档多为旧阶段过程记录，内容与当前中文单人版收敛记录、验收文档和 gate 重叠，继续保留会增加检索成本。

## 本轮保留

继续保留：

- `docs/README.md`
- `docs/MVP_ACCEPTANCE.md`
- `docs/INITIAL_PLAN_PROGRESS.md`
- `docs/单人版收敛-MVP*.md`
- `docs/Git提交备注-MVP*.md`

新增：

- `docs/文档治理.md`
- `docs/单人版收敛总览.md`
- `scripts/gates/docs-governance-gate.mjs`
- `npm run docs-governance:gate`

## 门禁

新增 `docs-governance:gate`，并接入 `npm run gate`。

门禁检查：

- 关键文档入口必须存在。
- 旧过程报告不能重新出现在 `docs/` 根目录。
- 中文文件名不能退回 `#Uxxxx` 乱码形式。
- `docs/` 根目录 markdown 数量不能重新膨胀。
- `docs/README.md` 必须说明文档治理和当前入口。

## 交付规则

本轮删除了文件，因此按约定交付完整项目包，而不是补丁包。

## 验证

已执行：

```bash
npm run docs-governance:gate
npm run single-user:gate
npm run shared-view-convergence:gate
npm run non-shared-view-convergence:gate
npm run gate
```

未完整执行：

```bash
npm run typecheck:src
```

原因：当前环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。
