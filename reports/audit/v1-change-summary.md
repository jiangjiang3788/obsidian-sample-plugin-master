# V1 安全清理版变更摘要

## 目标

V1 只处理低风险、可回滚的清理与小型重复逻辑收口：

- 删除没有源码引用的候选文件。
- 删除旧路径 forwarder，减少多个入口。
- 抽出 Modal 初始化公共函数。
- 抽出 UI record action 反馈公共执行器。
- 修正仍绑定旧文件的 gate/test。

## Metrics

| 指标 | V1 前 | V1 后 | 变化 |
|---|---:|---:|---:|
| TS/TSX 文件数 | 547 | 532 | -15 |
| 源码总行数 | 63952 | 63117 | -835 |
| console 计数 | 19 | 16 | -3 |

## 删除文件

```text
src/core/utils/runtimeDiagnostics.ts
src/app/ui/components/QuickInputEditor/components/TwoLevelThemeSelector.tsx
src/app/ui/components/QuickInputEditor/components/ThemeSelector.tsx
src/shared/ui/dev/StyleCatalog.tsx
src/core/types/fieldOrigin.ts
src/shared/ui/views/StatisticsView/components/TopControls.tsx
src/shared/ui/views/timelineInteraction.ts
src/shared/ui/views/ProgressSummaryCards.tsx
src/features/theme/themeActions.ts
src/core/theme/sortThemes.ts
src/features/theme/useThemeStore.ts
src/shared/ui/views/StatisticsView.tsx
src/features/quickinput/QuickInputModal.tsx
src/features/settings/SettingsTab.tsx
src/features/progression/computeProgression.ts
src/features/progression/types.ts
```

## 新增/改动的公共小工具

```text
src/platform/modals/modalPreact.ts
  - 新增 prepareThinkModal(modal, ...classes)

src/app/actions/runUiRecordAction.ts
  - 新增 runUiRecordAction(action, options)
```

## 本环境已跑验证

通过：

```bash
node scripts/gates/legacy-forwarder-usage-gate.mjs
node scripts/gates/unused-export-candidates-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/css-boundary-gate.mjs
node scripts/gates/single-user-convergence-gate.mjs
node scripts/audit/audit-shared-ui-imports.mjs
node scripts/maintenance/remove-legacy-forwarders.mjs
```

未完成：

```bash
npm run typecheck:src
npm run build
```

原因：上传 zip 不含 `node_modules`，本环境无法完成 TypeScript/构建依赖解析；同时 `npm ci` 报告原始 `package.json` 与 `package-lock.json` 不同步，需要先在本地执行 `npm install` 刷新 lockfile 后再跑完整验证。

## 本地复验建议

```bash
npm install
npm run typecheck:src
npm run test:unit
npm run build
npm run gate
```

