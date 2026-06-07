# Goal Core MVP10 架构收敛报告

## 定位

MVP10 继续沿用 MVP7-MVP9 的架构收敛方向：不增加新的业务实体，而是把已有能力进一步收敛为清晰主链：

```txt
Goal + Block -> GoalTemplate
Goal.themePath -> ThemeMetadata -> icon/color
record.date + goal.granularity -> DerivedPeriod
View -> 只读统计展示
QuickInput -> 唯一数据写入入口
```

## 本版完成

1. **ThemeMetadataResolver 接入渲染主题对象**
   - 新增 `resolveThemeForRender()`。
   - 子主题路径可以继承父主题图标，但渲染时保留用户选择/目标绑定的完整主题路径。
   - 避免 `工作/插件/目标中心` 被回退显示成 `工作/插件`。

2. **GoalTemplateResolver 主题职责进一步收敛**
   - 模板主链继续是 `Goal + Block`。
   - 主题只通过 `ThemeMetadataResolver` 返回 icon/color/path 元数据。
   - 不再让主题参与新模板决策。

3. **GoalTemplate 存储 helper**
   - 新增：
     - `upsertGoalTemplateInSettings()`
     - `removeGoalTemplateFromSettings()`
     - `removeGoalTemplatesForGoal()`
   - 应用层不再直接操作 `goalBlockBindings` 作为业务概念。
   - `goalBlockBindings` 继续作为 legacy storage 字段保留，避免破坏旧 data.json。

4. **GoalUseCase 收敛**
   - `upsertGoalTemplate()` / `deleteGoalTemplate()` 改用 GoalTemplate storage helper。
   - 删除目标时通过 helper 清理目标模板。
   - 旧 `upsertGoalBlockBinding*` 方法继续保留为 deprecated alias。

5. **目标模板默认值表单化**
   - 设置页不再要求用户手写字段默认值 JSON。
   - 按当前 Block 字段自动列出默认值输入框。
   - 空值不保存，表示继承核心 Block 默认值。

6. **新增测试草案**
   - `themeMetadataRender.test.ts`
   - `goalTemplateStorage.test.ts`

7. **data.json 升级**
   - `goalCoreMvpVersion = 10`

## 已通过 gate

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

## 受限项

当前容器没有完整 `node_modules`，所以 `npm run typecheck:src` 仍停在缺少类型包：

```txt
node
preact
vite/client
```

本地验证命令：

```bash
npm ci
npm run typecheck:src
npm test -- --runTestsByPath test/unit/themeMetadataRender.test.ts test/unit/goalTemplateStorage.test.ts
npm run build
```

## 下一步建议

1. 把 `GoalTemplate` 从 type alias 升级为正式 interface，同时让 storage adapter 负责兼容旧 `GoalBlockBinding`。
2. 把 `GoalDetail` 进一步贴近 `StatisticsView`，共用统计维度模型。
3. 给 `OutputPlanner` 增加更明确的 `themeMetadata` 入参，进一步减少隐式依赖。
4. 清理 legacy cycle methods 的 UI 入口和文档说明，保留方法仅用于旧数据兼容。
