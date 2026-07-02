# V26 Semantic Function Convergence - 第一版收敛包

## 范围

本版只做语义函数收敛，不做全项目目录重排，不拆 UI 大文件，不改变 release 边界。

目标是把容易漂移的重复业务语义收口到中心模块，并保留领域 facade / wrapper，降低后续 V27-V31 改造的回归面。

## 新增语义中心

- `src/core/semantics/text.ts`
  - `compactText`
  - `normalizeTextToken`
  - `compactTextWithoutLeadingHashes`
- `src/core/fields/fieldTokenSemantics.ts`
  - `normalizeFieldToken`
  - `normalizeFieldLabelToken`
  - `getTemplateFieldLookupTokens`
  - `getTemplateFieldLabelTokens`
  - `templateFieldMatchesAliases`
  - `isThemeTemplateField`
  - `isIconTemplateField`
  - `isGoalPathTemplateField`
- `src/core/view-config/filterValueSemantics.ts`
  - `normalizeViewMultiValue`
- `src/core/theme/themePathSemantics.ts`
  - `normalizeThemePath`
  - `normalizeThemePathOrNull`
  - `getThemePathCandidates`
  - `getThemePathLeaf`
  - `getThemePathParent`
  - `buildThemePathMap`

## 收敛的重复语义

- `compactText`：从 goal template / diff / display 等局部实现收敛到 `core/semantics/text.ts`。
- `normalizeToken`：从 template field / edit backfill / edit resolver / codec 等局部实现收敛到 `core/fields/fieldTokenSemantics.ts` 或 `normalizeTextToken`。
- `normalizeMultiValue`：从 view config / filter panel / rule builder 收敛到 `core/view-config/filterValueSemantics.ts`。
- `nowMs` / `elapsedMs`：从 AI cache / HTTP client / runtime 局部实现收敛到 `core/utils/timing.ts`。
- theme path 相关语义：把 `leafPath`、`pathCandidates`、theme path normalize / map 构建收敛到 `core/theme/themePathSemantics.ts`。
- theme/icon/goalPath 字段识别：收敛为 `isThemeTemplateField`、`isIconTemplateField`、`isGoalPathTemplateField`。

## 保留的兼容面

- `RuleBuilderModel.normalizeMultiValue` 仍保留为兼容导出，但内部委托 `normalizeViewMultiValue`。
- `GoalTemplateThemeModel` 仍导出 `compactText`、`normalizeThemePath`，兼容现有 goal template model 调用方。
- `AiParserTiming` 仍保留原有 timing facade 形状，内部委托 `core/utils/timing.ts`。
- goal/path 与 theme/path 仍保留各自领域入口，避免把所有调用方强制改成跨域 deep import。

## 指标变化

| 指标 | V25 基线 | V26 第一版 |
|---|---:|---:|
| src files | 694 | 698 |
| src lines | 70,878 | 70,829 |
| TS-like lines | 63,627 | 63,578 |
| files >= 500 lines | 0 | 0 |
| non-CSS files >= 500 lines | 0 | 0 |
| TS-like files >= 450 lines | 2 | 2 |
| TSX files >= 350 lines | 2 | 2 |
| explicit any | 667 | 657 |
| duplicate function-name groups | 50 | 50 |

说明：`duplicate function-name groups` 总数仍为 50，是因为 P0 语义重复消失后，队列被 `handleClose`、`listener`、`emit` 等低价值局部 UI / 事件函数名补位。语义重复已经被下压，但当前预算口径是固定展示 top 50，不等于本次没有收益。

## 验证

已通过：

```bash
npm run gate
npm run refactor:metrics -- --output reports/refactor/refactor-metrics-v26.json --markdown reports/refactor/refactor-metrics-v26.md
npm run refactor:hotspots -- --output reports/refactor/refactor-hotspots-v26.json --markdown reports/refactor/refactor-hotspots-v26.md
```

已尝试执行 `npm run typecheck`，但提供的源码包内没有 `node_modules`，因此缺少 `@types/node`、`preact`、`vite/client` 类型定义而中止；这属于依赖缺失，不是本轮改造引入的 TypeScript 诊断结果。未执行 `npm run build`。本地建议在合并前执行：

```bash
npm ci
npm run typecheck
npm run build
npm run test:unit
```

## 下一版建议

V27 不建议继续扩大目录搬迁，应接着做两件事：

1. 清理剩余 path wrapper，区分真正领域 wrapper 与重复实现。
2. 开始小范围整理文件结构，优先处理 `FloatingPanel.tsx`、`mui-theme.ts`、`errorHandler.ts` 的拆分准备。
