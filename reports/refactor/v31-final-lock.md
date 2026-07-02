# V31 Final Lock Report

版本主题：Budget / Gate / Docs Finalization（预算 / gate / 文档封版）。

V31 不继续拆业务代码，主要把 V26～V31 的深度收敛结果固化为长期维护规则：文档、预算、final gate、开发防发散提示词和回归验收清单。

## 1. 本版改造范围

| 范围 | 动作 |
|---|---|
| budget | `refactor-budget-baseline.json` 从 V30 更新为 `V31-deep-refactor-final-locked` |
| gate | 新增 `deep-refactor-final-gate.mjs`，并接入 `npm run gate` |
| release | `refactor-release-gate.mjs` 升级为 V31 release acceptance |
| docs | 更新架构报告、验收清单、最终封版说明、docs README、收敛总览 |
| prompt guardrails | 新增 `docs/开发防发散提示词.md`，把开发阶段约束沉淀到仓库 |
| reports | 生成 V31 metrics / hotspots / changed-files |

## 2. V26～V31 完整计划表

| 版本 | 主题 | 状态 | 关键产物 |
|---|---|---|---|
| V26 | 语义函数收敛 | 已完成 | 文本、field token、filter value、theme path、timing 等中心语义 |
| V27 | 大文件职责拆分 | 已完成 | `FloatingPanel`、`mui-theme`、`errorHandler` facade 化 |
| V28 | View Config / Action 收敛 | 已完成 | `core/config/views`、`app/actions/recordCreate` |
| V29 | Service Ownership 收敛 | 已完成 | `core/services/item`、core theme matcher |
| V30 | 类型债收敛 | 已完成 | src explicit any 降到 501 |
| V31 | 预算 / gate / 文档封版 | 已完成 | final gate、V31 budget、验收清单、开发提示词 |

## 3. V31 锁定指标

| 指标 | V31 |
|---|---:|
| src files | 756 |
| src lines | 71,383 |
| TS-like lines | 64,132 |
| CSS lines | 7,251 |
| files >= 500 lines | 0 |
| non-CSS files >= 500 lines | 0 |
| TS-like files >= 450 lines | 0 |
| TSX files >= 350 lines | 1 |
| large file candidates | 3 |
| explicit any | 501 |
| @core/public importers | 0 |
| @shared/public importers | 0 |
| core module public facades | 16 |
| shared module public facades | 8 |

## 4. V31 预算 baseline

```json
{
  "version": "V31-deep-refactor-final-locked",
  "largestFileLines": 480,
  "filesOver500Lines": 0,
  "nonCssFilesOver500Lines": 0,
  "tsLikeFilesOver450Lines": 0,
  "tsxFilesOver350Lines": 1,
  "largeFileCandidates": 3,
  "srcExplicitAny": 501,
  "coreRootPublicImporters": 0,
  "sharedRootPublicImporters": 0
}
```

## 5. 新增 gate

```bash
npm run deep-refactor-final:gate
```

检查内容：

```text
V31 budget version
V26-V31 架构报告内容
V31 回归验收清单
开发防发散提示词
最终封版说明
当前 live metrics 是否仍在预算内
```

## 6. 已验证

通过：

```bash
npm run any-budget:gate
npm run refactor:budget
npm run deep-refactor-final:gate
npm run refactor:release
npm run refactor:verify
npm run gate
node --check scripts/gates/deep-refactor-final-gate.mjs
node --check scripts/gates/refactor-release-gate.mjs
node --check scripts/gates/refactor-budget-gate.mjs
node --check scripts/gates/any-budget-gate.mjs
```

未在容器内完整执行：

```bash
npm run typecheck
npm run build
npm run test:unit
```

原因：源码包未安装 `node_modules`，完整类型检查、构建和单测需要在本地执行 `npm ci` 后运行。

## 7. 后续维护建议

V31 后不要继续做全局大重构。新增功能按照 `docs/开发防发散提示词.md` 先做 ownership 审查，再实现。预算只能降低，或者带报告说明调整。
