# ThinkOS Goal Core MVP8 架构收敛版报告

## 本版定位

MVP8 不继续堆功能，而是把前几版里偏重的管理能力收敛为更小、更稳定的目标中心模型：

- Block 固定为 8 个动作：任务、计划、总结、打卡、阻碍项、里程碑、思考、事件。
- 目标是快捷输入主上下文。
- 模板主链收敛为 `Goal + Block`。
- 主题只作为图标、颜色、领域元数据，不再决定模板。
- 周期由记录日期 + 目标时间粒度运行时推导，不再手动创建。
- 迁移功能只做候选建议，不再批量写回 Markdown。
- 视图只展示数据，不负责创建数据。

## 本版完成内容

### 1. 目标设置页收敛

`GoalManager` 从“目标 + 周期 + Markdown 写回 + 绑定管理”的重型面板，收敛为：

1. 目标实体与时间粒度。
2. 旧目标字段候选建议。
3. 旧记录字段补齐建议（只读）。
4. 目标指标。
5. 目标模板（Goal + Block）。

### 2. 周期改为时间粒度推导

新增目标时可以选择：

- 日
- 周
- 月
- 季度
- 年

手动周期创建 UI 已从设置页移除。运行时继续使用 `resolveDerivedPeriod(date, granularity)` 推导当前周期。

### 3. 迁移功能降级为安全建议

`Markdown` 回填不再展示写回按钮；`applyMarkdownGoalBackfill()` 在 MVP8 中变为安全 no-op。

旧目标迁移只创建目标实体，不再持久化 `GoalRecordRelation`。目标和记录的关系由视图/查询层根据记录字段运行时推导。

### 4. 目标模板命名收敛

设置页中的“目标专属核心 Block 绑定”改为用户更容易理解的“目标模板（Goal + Block）”。

底层仍兼容旧 `GoalBlockBinding` 类型，避免大规模破坏，但 UI 和产品语义已经转向：

```txt
Goal + Block -> Template
```

### 5. 增加核心单元测试草案

新增：

- `test/unit/goalPeriod.test.ts`
- `test/unit/goalTemplateResolver.test.ts`

用于覆盖：

- 周/季度周期推导。
- 非法粒度回退到 week。
- 主题只做 metadata，不再主导模板。
- 目标模板优先于核心 Block 默认模板。

当前容器没有完整 `node_modules`，所以测试文件已加入，但需要本地 `npm ci` 后执行。

## 代码改动摘要

### 修改

- `src/features/settings/input/GoalManager.tsx`
- `src/app/usecases/goal.usecase.ts`
- `data.json`

### 新增

- `test/unit/goalPeriod.test.ts`
- `test/unit/goalTemplateResolver.test.ts`

## 验证结果

已通过 gate：

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

受限项：

```bash
npm test -- --runTestsByPath test/unit/goalPeriod.test.ts test/unit/goalTemplateResolver.test.ts
```

当前容器中 `jest` 不存在，`npm ci` 也无法在当前会话内稳定完成，因此单元测试和完整 build 需要你本地执行。

## 完整计划进度表

| 编号 | 模块 | 目标设计 | 当前进度 | 状态 |
|---|---|---|---:|---|
| 1 | Block 命名 | 固定为任务/计划/总结/打卡/阻碍项/里程碑/思考/事件 | 100% | 已完成 |
| 2 | Block 模型 | Block 固定枚举，不作为用户随意实体 | 90% | 已完成主链，旧配置仍兼容 |
| 3 | 目标上下文 | 目标是 QuickInput 顶层上下文 | 100% | 已完成 |
| 4 | 目标字段 | 用户无需自己添加目标字段，系统自动注入 | 95% | 已完成主链 |
| 5 | 主题角色 | 主题只提供图标/颜色/领域 | 85% | 主链已去主题模板，旧兼容仍存在 |
| 6 | 模板解析 | `Goal + Block -> Template` | 90% | 已收敛，底层类型仍叫 GoalBlockBinding |
| 7 | 主题图标 | `goal.themePath -> theme.icon -> renderData` | 90% | 已接入模板输出 |
| 8 | 周期 | 日期 + 目标时间粒度自动推导 | 95% | 已完成，手动周期 UI 已移除 |
| 9 | 目标时间粒度 | 目标可配置 day/week/month/quarter/year | 100% | MVP8 完成 |
| 10 | GoalOverview | Progress 风格，只展示目标进度 | 95% | 已收敛 |
| 11 | GoalDetail | Statistics 风格，只展示单目标统计 | 85% | 基础完成 |
| 12 | 视图内创建 | 统一移除，数据创建走快捷输入 | 100% | 已完成 |
| 13 | 迁移功能 | 只做候选建议，不写回 Markdown | 90% | MVP8 已降级 |
| 14 | GoalRecordRelation | 不再持久化新增关系，运行时推导 | 80% | 新迁移不再写关系，旧字段保留兼容 |
| 15 | 指标系统 | 指标属于目标，视图运行时统计 | 80% | 表单化完成，预设可继续增强 |
| 16 | data.json | 默认数据版本升级 | 100% | `goalCoreMvpVersion = 8` |
| 17 | 核心测试 | Period / GoalTemplateResolver 单测 | 60% | 文件已加，待本地依赖执行 |
| 18 | 完整类型检查 | `npm run typecheck:src` | 受限 | 需本地依赖 |
| 19 | 完整构建 | `npm run build` | 受限 | 需本地依赖 |

## 下一版建议

MVP9 建议继续做“命名和类型清理”，不要加新功能：

1. 把 `GoalBlockBinding` 渐进改名为 `GoalTemplate`，保留兼容 alias。
2. 把 `CycleDefinition` 从主设置 UI 和新逻辑中完全隔离为 legacy 类型。
3. 给 `ThemeMetadataResolver` 单独建文件，把 theme icon/color 逻辑从模板解析器中拆出来。
4. 给 `GoalOverview` 和 `GoalDetail` 增加空值防御测试。
5. 本地完整跑通 `npm ci && npm run typecheck:src && npm run test:unit`。
