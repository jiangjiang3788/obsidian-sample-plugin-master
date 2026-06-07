# Goal Core MVP11 架构收敛报告

## 定位

MVP11 继续沿着“非必要勿增实体”的方向做代码概念收敛，不新增新的重型功能：

- Block 固定为 8 个动作类型。
- Goal + Block 决定模板。
- Theme 只提供图标、颜色、领域 metadata。
- Period 由记录日期 + 目标粒度运行时推导。
- 旧 Cycle / Relation / Binding 保留为 legacy storage，不作为新业务语言。

## 本版完成

| 模块 | 本版动作 | 状态 |
|---|---|---|
| GoalTemplate | 从 type alias 升级为正式 interface | 已完成 |
| legacy storage | 新增 `fromLegacyGoalTemplateStorage` / `toLegacyGoalTemplateStorage` 适配器 | 已完成 |
| 业务 API | `GoalUseCase.upsertGoalTemplate()` 改为接收 `GoalTemplate` | 已完成 |
| public API | 新主链不再从 `@core/public` 暴露 `GoalBlockBinding` | 已完成 |
| storage helper | `upsertGoalTemplateInSettings()` 内部统一处理旧存储字段 | 已完成 |
| GoalDetail | 从 Overview row 包装升级为 Statistics 风格模型 | 已完成 |
| GoalDetail UI | 增加周期分布、状态摘要、Block 分布 | 已完成 |
| data.json | `goalCoreMvpVersion = 11` | 已完成 |

## 设计说明

### GoalTemplate 正式化

MVP10 里 `GoalTemplate` 仍然是 `GoalBlockBinding` 的别名。MVP11 后：

```ts
export interface GoalTemplate {
  id: string;
  goalId: GoalId;
  coreBlockId: string;
  enabled: boolean;
  fields?: TemplateField[];
  outputTemplate?: string;
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
  createdAt?: string;
  updatedAt?: string;
}
```

底层仍写入 `goalSettings.goalBlockBindings`，但只有 `src/core/goal/templates.ts` 知道这个 legacy 字段名。新代码只使用 `GoalTemplate`。

### GoalDetail 贴近 StatisticsView

MVP11 的 GoalDetail 不再只是取 GoalOverview 的第一行，而是额外构建统计模型：

- 总记录数
- 任务完成 / 未完成
- 完成率
- Block 分布
- 周期分布
- 当前推导周期

它仍然只展示数据，不创建数据；数据创建统一保留在快捷输入面板。

## 验证

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

`npm run typecheck:src` 仍受当前容器依赖环境限制，缺少：

- node
- preact
- vite/client

本地建议执行：

```bash
npm ci
npm run typecheck:src
npm test -- --runTestsByPath test/unit/goalTemplateStorage.test.ts test/unit/themeMetadataRender.test.ts
npm run build
```

## 下一版建议

| 优先级 | 下一步 | 目的 |
|---|---|---|
| P0 | 继续把 `GoalBlockBinding` 从 `core/goal/index.ts` 隐藏，只留 types.ts legacy | 进一步减少旧概念外泄 |
| P0 | 给 GoalDetail statistics model 增加单元测试 | 稳定单目标统计页 |
| P1 | 把 GoalManager 内部变量从 binding* 全部改成 template* | UI 源码语言和产品语言一致 |
| P1 | 把 legacy addCycle/updateCycle 方法从 UseCase 主体移入 legacy section | 让周期推导主链更清晰 |
