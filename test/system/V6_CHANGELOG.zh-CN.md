# 测试体系 v6 变更记录

## 目标

- 收口 v5 剩余 8 个 P1 测试维度缺口；
- 保持全中文公共测试输出；
- 不修改 `src` 业务实现；
- 不用外部 AI 服务或“文件存在即覆盖”的方式制造假完整度。

## 新增测试

- `test/unit/layoutEditorControlsUi.test.tsx`
- `test/integration/layoutEditorLifecycle.test.ts`
- `test/integration/moduleSettingsLifecycle.test.ts`
- `test/integration/energyViewTaskFlow.test.ts`
- `test/integration/aiBatchConfirmActionFlow.test.tsx`
- `test/integration/aiNaturalInputCommandFlow.test.ts`
- `test/specs/energy-view-task.e2e.ts`
- `test/specs/ai-natural-input.e2e.ts`
- `test/specs/layout-editor-module-settings.e2e.ts`
- `test/specs/large-vault.e2e.ts`
- `test/specs/compatibility-matrix.e2e.ts`

## 新增运行能力

- 本地 OpenAI 兼容 E2E 服务；
- `ai` 真机套件；
- `scale` 真机套件；
- `compat` 真机套件；
- 最早/最新 Obsidian 版本矩阵运行器；
- P1 严格功能地图门禁。

## v6 严格地图结果

- P0：40 完整 / 0 部分 / 0 缺失；
- P1：50 完整 / 0 部分 / 0 缺失；
- P2：0 完整 / 1 部分 / 2 缺失。

“完整”是测试证据完整，不代表当前生成环境已经执行通过。
