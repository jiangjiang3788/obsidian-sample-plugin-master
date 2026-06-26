# 单人版收敛 MVP25

## 定位

MVP25 是本轮单人版破坏性收敛的最终封版。前面版本已经完成运行时旧系统删除、输入链路模型化、主要视图逐个抽离、非 shared view 大容器收口和文档治理；本轮不继续拆小组件，而是补齐最终封版说明和最终门禁。

## 本轮改动

- 新增 `scripts/gates/final-convergence-gate.mjs`。
- 新增 `npm run final-convergence:gate`，并接入 `npm run gate`。
- 新增 `docs/最终封版说明.md`。
- 更新 `docs/README.md`，把最终封版说明和 MVP25 纳入阅读入口。
- 更新 `docs/单人版收敛总览.md`，把 MVP25 作为封版阶段写入主线。
- 更新 `docs/MVP_ACCEPTANCE.md`，补充 single-user convergence gate 和 final-convergence gate 验收要求。
- 更新 `docs/文档治理.md`，补充封版后的文档维护边界。
- 更新 `scripts/gates/docs-governance-gate.mjs`，要求 MVP25 文档和最终封版说明存在。

## 封版边界

本轮明确：代码视图抽离已经完成当前阶段目标，不再继续为了形式统一拆小组件。后续只有出现明确计算、重复规则、状态派生、测试价值或大文件回流时，才继续抽模型/子组件。

## 验证

已执行并通过：

```bash
npm run final-convergence:gate
npm run docs-governance:gate
npm run single-user:gate
npm run shared-view-convergence:gate
npm run non-shared-view-convergence:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因：当前环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。需要本地执行 `npm ci` 后再运行 typecheck、unit test、build 和 release build。

## 交付说明

本轮没有删除文件，因此按约定交付为新增/修改完整文件补丁包，保留完整路径。
