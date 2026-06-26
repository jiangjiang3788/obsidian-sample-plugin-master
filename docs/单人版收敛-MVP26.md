# 单人版收敛 MVP26：类型治理第一刀

MVP25 已完成最终封版、文档治理和 gate 收口。MVP26 不继续拆视图，也不做大范围业务重构，而是转入类型治理。

## 本轮目标

- 建立显式 `any` 预算门禁。
- 新增动态输入安全读取工具。
- 为后续逐版降低 `any` 建立基线和文档。
- 不做机械替换，不追求一版清零。

## 主要改动

### 1. 新增 any 预算门禁

新增：

```text
scripts/gates/any-budget-gate.mjs
```

新增 npm script：

```bash
npm run any-budget:gate
```

并接入：

```bash
npm run gate
```

当前 MVP26 基线：

| 范围 | 当前计数 | 预算 |
|---|---:|---:|
| `src` | 1087 | 1090 |
| `test` | 164 | 165 |
| `scripts` | 2 | 15 |
| 总计 | 1253 | 1260 |
| `as any` | 583 | 585 |
| `: any` | 555 | 560 |

门禁会输出 top files，方便后续优先处理。

### 2. 新增 UnknownRecord 安全读取工具

新增：

```text
src/core/utils/unknownRecord.ts
```

并通过：

```text
src/core/utils/index.ts
```

导出。

这些 helper 用于 AI 输出、Markdown frontmatter、JSON 设置、localStorage 和旧插件数据等动态边界，避免把不可信输入直接 `as any` 传入模型层。

### 3. 新增单测

新增：

```text
test/unit/unknownRecord.test.ts
```

覆盖 record 判定、基础字段读取、数组过滤、嵌套 record、alias fallback。

### 4. 新增类型治理文档

新增：

```text
docs/类型治理计划.md
```

记录基线、预算、治理原则、允许暂缓的边界、后续优先级和最小 MVP 标准。

## 防过度工程化说明

本轮没有把所有 `any` 机械替换为 `unknown`，也没有大范围改业务文件。原因是：

- 动态数据边界需要 decoder，而不是简单类型断言。
- 一次性清零会导致大量假类型，反而降低可维护性。
- 第一版类型治理的收益在于可度量、可防反弹、可逐步下降。

## 验证

已通过：

```bash
npm run any-budget:gate
npm run docs-governance:gate
npm run final-convergence:gate
npm run gate
```

当前环境没有 `node_modules`，因此仍无法完整运行：

```bash
npm run typecheck:src
npm run test:unit
npm run build
```

本地应执行：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/unknownRecord.test.ts
npm run typecheck:src
npm run build
npm run gate
```
