# Think OS Goal Core MVP9 架构收敛报告

## 定位

MVP9 继续沿用“非必要勿增实体”的方向，不新增重量级功能，重点做代码概念收敛和主链清理：

- Block 固定为 8 个动作类型。
- Goal 是输入、模板、视图的唯一主轴。
- Template 主链是 Goal + Block。
- Theme 只作为 ThemeMetadata，提供 icon / color / 领域路径。
- Period 由 date + goal.granularity 运行时推导。
- Cycle / GoalRecordRelation / goalBlockBindings 仍保留为 legacy storage 兼容字段，不再作为新主链概念使用。

## 本版完成

| 模块 | 改动 | 状态 |
|---|---|---|
| 目标模板命名 | 新增 `GoalTemplate` 类型别名和 helper，代码层开始从 `GoalBlockBinding` 收敛到 `GoalTemplate` | 已完成 |
| 模板 ID | 新增 `getGoalTemplateId(goalId, coreBlockId)`，新保存的目标模板使用 `goal-template.*` 前缀 | 已完成 |
| 模板查找 | 新增 `findGoalTemplate()` / `getGoalTemplates()` / `getGoalTemplateCandidateGoalIds()` | 已完成 |
| GoalTemplateResolver | 主链明确为 `Goal + Block`，返回 `templateSourceType = goal-template` | 已完成 |
| 主题职责 | 新增 `ThemeMetadataResolver`，主题只解析 icon / color / metadata，不再作为模板主链 | 已完成 |
| 主题父级兜底 | `ThemeMetadataResolver` 支持 `工作/插件/目标中心` 回退到 `工作/插件` 的 icon | 已完成 |
| QuickInput | 移除对手动 CycleDefinition 列表的依赖；周期继续使用 derived period | 已完成 |
| 视图模型 | GoalOverview / GoalDetail 不再从 ViewContent 传入 cycles | 已完成 |
| legacy 标注 | `CycleDefinition`、`GoalRecordRelation`、`GoalBlockBinding` 增加 deprecated / legacy 注释 | 已完成 |
| GoalUseCase | 新增 `upsertGoalTemplate`、`upsertGoalTemplateDraft`、`deleteGoalTemplate`，旧 binding 方法保留为 deprecated alias | 已完成 |
| 设置页 | GoalManager 使用 goalTemplates 命名和新 usecase 方法 | 已完成 |
| 测试草案 | 新增 ThemeMetadataResolver 测试、GoalOverview 空值防御测试 | 已完成 |
| data.json | `goalCoreMvpVersion = 9`，默认清空 legacy cycles / relations | 已完成 |

## 本版验证

已通过以下 gate：

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/dual-system-gate.mjs
node scripts/gates/obsidian-leak-gate.mjs
node scripts/gates/events-boundary-gate.mjs
node scripts/gates/core-obsidian-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/di-resolve-gate.mjs
node scripts/gates/modal-promise-gate.mjs
node scripts/gates/selector-giant-subscription-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/iconaction-gate.mjs
node scripts/gates/data-store-boundary-gate.mjs
node scripts/gates/performance-boundary-gate.mjs
node scripts/gates/timer-view-runtime-boundary-gate.mjs
node scripts/gates/shared-self-alias-migrated-gate.mjs
```

`npm run typecheck:src` 在当前容器仍受依赖缺失限制：

```text
Cannot find type definition file for 'node'
Cannot find type definition file for 'preact'
Cannot find type definition file for 'vite/client'
```

## 本地建议验证

```bash
npm ci
npm run typecheck:src
npm test -- --runTestsByPath \
  test/unit/goalPeriod.test.ts \
  test/unit/goalTemplateResolver.test.ts \
  test/unit/themeMetadataResolver.test.ts \
  test/unit/goalOverview.emptyValues.test.ts
npm run build
```

## 下一步建议

MVP10 建议继续做“删除或隐藏 legacy 入口”，而不是加新功能：

1. 从 public API 中逐步弱化 `GoalBlockBinding` 命名，只在 legacy/storage 层可见。
2. GoalManager 中把目标模板默认值 JSON 改为表单化，但不新增实体。
3. GoalDetail 继续向 Statistics 风格收敛，去掉与详情页编辑相关的残留概念。
4. 把 `CycleDefinition` 相关 usecase 移到 legacy 区域或隐藏导出。
5. 给 `ThemeMetadataResolver` 接入 OutputPlanner 的 renderData 入口，进一步统一 `theme.icon` 来源。
