# Think OS 深度架构改造报告（V31 封版）

> V31 是 V26～V31 深度收敛的封版入口。本报告前半部分保留 V7～V25 的历史架构记录，后半部分记录本轮 V26～V31 的最终结构、预算和后续开发约束。当前维护原则是：不要继续大拆已经小而清晰的组件；新增功能必须先做 ownership 判断、复用已有语义中心，并通过 gate 预算。

## V31 当前快照

| 指标 | V31 锁定值 |
|---|---:|
| `src` 文件数 | 756 |
| `src` 总行数 | 71,383 |
| TS-like 行数 | 64,132 |
| CSS 行数 | 7,251 |
| `>= 500` 行文件 | 0 |
| 非 CSS `>= 500` 行文件 | 0 |
| TS-like `>= 450` 行文件 | 0 |
| TSX `>= 350` 行文件 | 1 |
| explicit any | 501 |
| `@core/public` importers | 0 |
| `@shared/public` importers | 0 |
| core module public facades | 16 |
| shared module public facades | 8 |

---

# 历史架构改造记录（V7～V25）

> V7 的目标不是先移动大量业务代码，而是建立后续 V8-V13 可以反复运行的改造指标、热点队列和不退化预算。后续每一版都应该让这些指标下降，或者明确说明为什么暂时不能下降。

## 1. 当前架构判断

当前项目已经有清晰外层分层：

```text
platform  Obsidian API、Modal、Vault、运行时端口
app       usecase、store、actions、运行时 UI 组合
features  settings / timer / aiinput / aichat 等功能入口
core      目标、模板、字段、记录输入、AI、布局等领域能力
shared    跨领域 UI、hooks、utils、primitives
styles    tokens / foundations / primitives / components / features / overrides
```

结论：外层边界已经存在，当前深度改造重点不是“重建架构”，而是处理模块内部的三类发散：

1. 同一语义被多个模块重复解释，例如路径、字段选项、记录输入上下文。
2. 大文件把输入、状态、计算、渲染和 IO 混在一起。
3. public 门面过宽，依赖关系虽然被 gate 约束，但领域边界仍不够细。

## 2. V7 基线指标

本报告由 `npm run refactor:metrics` 和 `npm run refactor:hotspots` 支撑。当前基线为：

| 指标 | 当前值 | 说明 |
|---|---:|---|
| `src` 文件数 | 578 | 包含 TS/TSX/JS/CSS |
| `src` 总行数 | 69,749 | 后续拆分不一定减少总行数，但应降低热点文件复杂度 |
| TS-like 行数 | 62,589 | `.ts/.tsx/.js/.jsx/.mjs/.mts/.cts` |
| CSS 行数 | 7,160 | 当前 CSS 文件数仍由 CSS gate 管控 |
| `>= 500` 行文件 | 12 | V12 前后应明显下降 |
| TSX `>= 350` 行文件 | 4 | V9/V12 重点处理 |
| 显式 `any` | 827 | V13 应降低预算 |
| `src/core/public.ts` 命名导出 | 316 | V13 应转向模块级 public |
| `src/core/public.ts` `export *` | 3 | 保持不增长 |
| `src/shared/public.ts` 命名导出 | 0 | 主要通过 export-star 聚合 |
| `src/shared/public.ts` `export *` | 39 | V13 应评估拆分到 shared/ui/public 等 |
| 重复函数名组 | 50 | 这是启发式指标，供定位散落函数使用 |
| `@core/**` deep import | 0 | 现有边界良好，后续必须保持 |
| `@shared/**` deep import | 0 | 现有边界良好，后续必须保持 |

## 3. 最大热点文件

| 排名 | 文件 | 行数 | 改造归属 |
|---:|---|---:|---|
| 1 | `src/styles/features/settings-editors.css` | 761 | V12，CSS 大文件拆分或规则分区 |
| 2 | `src/styles/features/excel.css` | 724 | V12，CSS 大文件拆分或规则分区 |
| 3 | `src/styles/features/statistics.css` | 704 | V12，统计视图样式分区 |
| 4 | `src/core/ai/AiNaturalLanguageRecordParser.ts` | 678 | V12，AI parser 拆分 |
| 5 | `src/styles/features/view-shell.css` | 588 | V12，view shell 样式分区 |
| 6 | `src/app/ui/components/QuickInputEditor/components/Fields.tsx` | 575 | V9，字段 renderer 拆分 |
| 7 | `src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts` | 560 | V9，editor 模型拆分 |
| 8 | `src/core/layout/freeformLayout.ts` | 552 | V12，freeform 几何逻辑拆分 |

说明：CSS 大文件在视觉改造后上升较多，V12 会单独处理。业务风险最高的是 QuickInput、RecordInput 提交、AI Parser 与 freeform layout。

## 4. 语义热点

| 语义 | 当前匹配数 | 首要问题 | 计划版本 |
|---|---:|---|---|
| 路径 / 层级语义 | 746 | goalPath、themePath、folderPath、normalize/split/leaf/parent 散落 | V8 |
| 布局 / 浮窗几何流程 | 281 | freeform、FloatingPanel、resize、drag、viewport 混合 | V12 |
| 字段值 / 选项语义 | 178 | option label/value、field source、defaultValue 规则散落 | V8/V9 |
| Store / Settings 写入流程 | 116 | slice、usecase、SettingsRepository 写入协调重复 | V11 |
| 记录输入 / 提交流程 | 76 | QuickInput、OutputPlanner、InputService、convert/duplicate 流程需要工作流化 | V9/V10 |
| AI 解析 / 检索流程 | 48 | prompt、snapshot、JSON parse、batch normalize 聚合 | V12 |

## 5. 改造目标架构

目标不是把所有代码都塞进 core，而是明确每层职责：

```text
core
  semantics/       通用语义：路径、字段值、选项、文本
  fields/          字段定义、字段值、字段行为
  goal/            目标、目标模板、模板 variant
  recordInput/
    session/       草稿与状态机
    editor/        默认值注水、字段来源、编辑模型
    planning/      输出计划、render context
    mutation/      写入、补丁、删除、迁移
  layout/          freeform 几何纯函数
  ai/              AI 领域解析与检索

app
  usecases/        create/update/convert/duplicate/delete 工作流
  store/           状态缓存，避免承载业务写入规则
  ui/              组合 hooks 与具体 UI

features
  settings/timer/aiinput/aichat 等功能入口

platform
  Obsidian 端口与 Modal 生命周期

shared
  真正跨领域复用的 UI、hooks、utils
```

## 6. 七版执行计划

| 版本 | 主题 | 核心产物 | 验收标准 |
|---|---|---|---|
| V7 | 改造审计与边界基线 | `refactor:metrics`、`refactor:hotspots`、`refactor:budget`、本报告 | 指标可重复生成，预算 gate 通过，不大改业务 |
| V8 | 路径 / 字段值 / 选项语义收敛 | `core/semantics` 或等价领域中心 | 局部 normalize/readOptionText 明显减少，路径/字段测试通过 |
| V9 | QuickInput 深拆与 editor 收敛 | QuickInput Model/Fields/Container 拆分，editor 服务沉淀 | QuickInput 创建、编辑、转换、另存不退化 |
| V10 | RecordInput 提交事务收敛 | Create/Update/Convert/Duplicate/Delete workflows | 迁移、另存、删除失败 partial_success 有测试 |
| V11 | Store / Settings / Layout / Theme 写入收敛 | slice 变薄，写入流程进入 usecase/helper | 设置、主题、布局主要操作正常 |
| V12 | 大 UI / AI / Layout 文件拆分 | FloatingPanel、AI Parser、ThemeTree、LayoutEditor 等拆分 | 大文件数下降，行为不变 |
| V13 | Public API 与预算 gate 固化 | 模块级 public、any 预算下降、大文件预算下降 | 预算 gate 进入主 gate 或 release 检查 |

## 7. V7 新增命令

```bash
npm run refactor:metrics
npm run refactor:hotspots
npm run refactor:budget
npm run refactor:verify
```

其中：

- `refactor:metrics` 生成完整 JSON 和 Markdown 指标。
- `refactor:hotspots` 生成后续版本的候选文件队列。
- `refactor:budget` 使用 V7 基线做不退化检查。
- `refactor:verify` 串联以上三项。

V7 的 `refactor:budget` 暂时没有接入主 `npm run gate`，因为 V8-V12 还会移动大量代码。V13 时应降低预算并决定是否接入主 gate。

## 8. 后续每版的完成定义

每一版都要满足：

1. 相关单测通过。
2. 现有架构 gate 不退化。
3. `npm run refactor:verify` 可以运行。
4. 本报告中的对应指标下降，或者在版本说明中解释为什么未下降。
5. 不为了拆文件而拆文件；拆分必须让领域职责更清楚。

## 9. V8 执行结果：路径 / 字段值 / 选项语义收敛

V8 已建立 `src/core/semantics/` 作为内部语义中心，先收敛最容易漂移的两类规则：

```text
src/core/semantics/path.ts
  统一 slash 层级路径的 normalize / split / root / leaf / parent / depth / relative / common parent

src/core/semantics/option.ts
  统一 primitive 与 { value, label } 选项对象的读取、匹配和稳定 option object 输出
```

本版已把这些旧位置改成领域 wrapper 或委托实现：

```text
src/core/utils/pathSemantic.ts
src/core/fields/pathSemantics.ts
src/core/goal/path.ts
src/core/theme/themeSemantics.ts
src/core/theme/themePathParser.ts
src/core/utils/pathUtils.ts
src/core/fields/TemplateFieldAdapter.ts
src/core/fields/FieldBehavior.ts
src/core/recordInput/EditBackfillMapper.ts
src/core/recordInput/RecordInputFacade.ts
src/core/recordInput/session/policy.ts
src/core/recordInput/snapshot/OutputPlanner.ts
src/core/goal/templateDisplay.ts
```

同时把 QuickInput 层级选择中的局部路径解释改为使用 core public 语义：

```text
src/app/ui/components/QuickInputEditor/components/HierarchySingleSelect.tsx
src/app/ui/components/QuickInputEditor/components/GoalSelector.tsx
src/app/ui/components/QuickInputEditor/quickInputPathModel.ts
```

新增测试：

```text
test/unit/hierarchyPathSemantics.test.ts
test/unit/fieldOptionSemantics.test.ts
```

V8 指标相对 V7：

| 指标 | V7 | V8 |
|---|---:|---:|
| 路径 / 层级语义匹配 | 746 | 738 |
| 显式 any | 827 | 820 |
| `core/public.ts` 命名导出 | 316 | 316 |
| `@core/**` deep import | 0 | 0 |
| CSS 行数 | 7160 | 7160 |

注意：V8 新增了语义中心和测试，所以总源码行数会上升；这不是回退。关键是 public 面没有扩大、deep import 没有出现、显式 any 下降，并且路径/选项规则开始从多个局部实现改为统一来源。

## 10. V10 执行结果：RecordInput 提交事务收敛

V10 的重点是把 `RecordInputUseCase` 中的记录写入流程从单个大方法拆成明确的工作流对象，避免 create / update / path migration / delete 继续挤在一个 usecase 文件里。

新增工作流目录：

```text
src/app/usecases/recordInput/workflows/
  CreateRecordWorkflow.ts
  UpdateRecordWorkflow.ts
  DeleteRecordWorkflow.ts
  RecordMigrationTransaction.ts
  types.ts
  index.ts
```

`RecordInputUseCase` 现在保留为 app 层门面，负责暴露原有 API：

```text
submitCreateRecord → CreateRecordWorkflow
submitUpdateRecord → UpdateRecordWorkflow
submitDeleteRecord → DeleteRecordWorkflow
```

路径变化时的安全迁移被收敛到独立事务对象：

```text
RecordMigrationTransaction
  1. 先写入新位置
  2. 刷新并定位新记录
  3. 再删除旧记录
  4. 删除失败时返回 partial_success，保留新旧两份并提示用户手动检查
```

这让编辑、转换记录类型时的数据安全规则更明确：

```text
转换 / 路径变化：先写新位置，再删旧位置
另存为新记录：仍走 create，不删除旧记录
普通编辑：原位置 replace / patch
删除失败：不伪装成完全成功
```

同时把 `InputService` 中的写入细节拆成小的 core mutation helper：

```text
src/core/recordInput/mutation/TaskLinePatch.ts
  负责任务行 checkbox 状态、tag、emoji date、recurrence、kv 元数据保留

src/core/recordInput/mutation/HeaderAppender.ts
  负责在 markdown heading 下追加内容
```

新增测试：

```text
test/unit/taskLinePatch.test.ts
test/unit/headerAppender.test.ts
```

V10 指标相对 V8：

| 指标 | V8 | V10 |
|---|---:|---:|
| 显式 any | 820 | 820 |
| `core/public.ts` 命名导出 | 316 | 316 |
| `@core/**` deep import | 0 | 0 |
| CSS 行数 | 7160 | 7160 |
| RecordInput 工作流文件 | 0 | 5 |

注意：V10 是事务职责收敛版，源码总行数会上升；这是因为新增了工作流和测试。关键指标是 public 面没有扩大、deep import 没有出现、CSS 没有变化，并且 `RecordInputUseCase` 从直接承载 create/update/delete 细节，降级为工作流门面。

## 11. V11 执行结果：Store / Settings / Layout / Theme 写入收敛

V11 的重点不是改变设置页行为，而是把 Zustand slice 里重复的写入包装和业务数据变更规则拆出去，让 slice 退回到更薄的状态层。

新增 store mutation 层：

```text
src/app/store/mutations/
  settingsMutationRunner.ts      统一 initialized / loading / error / SettingsRepository.update 包装
  layoutSettingsMutations.ts     Layout 纯 settings draft 变更
  themeSettingsMutations.ts      Theme 路径、排序、状态、图标等纯变更
  generalSettingsMutations.ts    Settings / inputSettings / aiSettings / activeThemePaths 纯变更
```

收敛前，`layout.slice.ts`、`theme.slice.ts`、`settings.slice.ts` 都重复承担：

```text
检查 isInitialized
设置 loading/error
try/catch
调用 settingsRepository.update
读取 error.message
执行具体 draft mutation
```

收敛后职责变成：

```text
slice
  只保留 action wiring、loading/error、查询方法

settingsMutationRunner
  统一 SettingsRepository 写入生命周期

*SettingsMutations
  只处理 ThinkSettings draft 的纯数据变更
```

关键行数变化：

| 文件 | V10 | V11 |
|---|---:|---:|
| `src/app/store/slices/layout.slice.ts` | 524 | 241 |
| `src/app/store/slices/theme.slice.ts` | 372 | 175 |
| `src/app/store/slices/settings.slice.ts` | 305 | 141 |

V11 指标相对 V10：

| 指标 | V10 | V11 |
|---|---:|---:|
| `>= 500` 行文件 | 12 | 11 |
| 显式 any | 820 | 789 |
| `@core/**` deep import | 0 | 0 |
| `core/public.ts` 命名导出 | 316 | 316 |
| CSS 行数 | 7160 | 7160 |

注意：V11 新增了 mutation helper 文件，所以总文件数和总行数会上升一点；这是为了把大 slice 的隐式业务规则变成小而明确的纯函数。关键收益是三个 store slice 变薄、显式 any 明显下降，并且 SettingsRepository 仍是唯一持久化写入口。

## 12. V12 执行结果：大 UI / AI / Layout 文件拆分

V12 的目标是做低风险结构拆分，不改变运行时业务语义。重点处理了 AI 解析入口、主题树构建器、自由布局几何模型、浮窗几何样式和布局设置面板。

新增拆分模块：

```text
src/core/ai/
  AiParserTiming.ts       parser trace / timing / slow-step warning
  AiParserSnapshot.ts     AI snapshot compact 模型
  AiParserNormalize.ts    AI 输出 target / fieldValues 规范化
  AiParserJson.ts         JSON 兜底解析
  AiParserPrompts.ts      system/user prompt 构造

src/core/theme/
  ThemeTreeTypes.ts       主题树公共类型
  ThemeTreeBuild.ts       主题树构建与排序
  ThemeTreeQueries.ts     flatten / search / ancestor / descendant / leaf 查询

src/core/layout/
  freeformLayoutConfig.ts     自由布局默认配置、归一化、snap、推荐尺寸
  freeformLayoutPlacement.ts  placement 几何、默认布局、resolve、move、resize
  freeformLayoutZIndex.ts     置顶与 zIndex 归一化

src/app/ui/primitives/
  floatingPanelGeometry.ts    FloatingPanel 事件坐标、尺寸约束、style builder

src/features/settings/components/
  LayoutEditorControls.tsx    Layout 基础设置与 freeform 设置子组件
```

保留兼容 facade：

```text
src/core/ai/AiNaturalLanguageRecordParser.ts
  继续导出 cleanAiFieldValues / normalizeParsedBatch，测试与下游无需改 import

src/core/theme/ThemeTreeBuilder.ts
  继续导出 ThemeTreeBuilder / buildThemeTree / flattenThemeTree / searchThemeTree

src/core/layout/freeformLayout.ts
  继续作为旧公共路径，统一 re-export 拆出的自由布局函数
```

关键行数变化：

| 文件 | V11 | V12 |
|---|---:|---:|
| `src/core/ai/AiNaturalLanguageRecordParser.ts` | 678 | 206 |
| `src/core/layout/freeformLayout.ts` | 552 | 30 |
| `src/core/theme/ThemeTreeBuilder.ts` | 502 | 84 |
| `src/app/ui/primitives/FloatingPanel.tsx` | 521 | 470 |
| `src/features/settings/components/LayoutEditorPanel.tsx` | 511 | 310 |

V12 指标相对 V11：

| 指标 | V11 | V12 |
|---|---:|---:|
| `>= 500` 行文件 | 11 | 6 |
| TSX `>= 350` 行文件 | 4 | 3 |
| 显式 any | 789 | 784 |
| `core/public.ts` 命名导出 | 316 | 316 |
| `@core/**` deep import | 0 | 0 |
| CSS 行数 | 7160 | 7160 |

注意：V12 没有触碰 CSS，也没有扩宽 `core/public.ts` / `shared/public.ts`。新增文件数会上升，但大文件和显式 `any` 都下降。下一版 V13 应把这些收敛成果固化到预算 gate：降低大文件预算、降低 any 预算，并开始规划模块级 public facade。

## 13. V13 执行结果：Public API 与预算 gate 固化

V13 的目标不是继续大规模移动业务代码，而是把 V7～V12 的结构收益变成强约束，避免后续开发重新发散。

### 13.1 模块级 public facade

V13 保留根级兼容入口：

```text
@core/public
@shared/public
```

同时新增更窄的模块级 public facade，作为后续逐步迁移 import 的目标：

```text
@core/goal/public
@core/fields/public
@core/recordInput/public
@core/layout/public
@core/theme/public
@core/semantics/public

@shared/ui/public
@shared/utils/public
```

新增源码文件：

```text
src/core/goal/public.ts
src/core/fields/public.ts
src/core/recordInput/public.ts
src/core/layout/public.ts
src/core/theme/public.ts
src/core/semantics/public.ts
src/shared/ui/public.ts
src/shared/utils/public.ts
```

这些文件当前作为“窄门面”存在，根级 `@core/public` / `@shared/public` 仍然兼容旧调用。后续迁移时，业务代码可以从根级大门面逐步切到模块级门面，而不是继续扩大根级 public。

### 13.2 public gate 升级

V13 抽出 public facade 配置：

```text
scripts/gates/public-facades.config.mjs
```

并升级：

```text
scripts/gates/public-api-gate.mjs
scripts/gates/shared-public-gate.mjs
```

新规则：

```text
允许：@core/public
允许：@core/<domain>/public
禁止：@core/<domain>/<internal-file>

允许：@shared/public
允许：@shared/<module>/public
禁止：@shared/<module>/<internal-file>
```

另外修复了旧 gate 对 import 字符串的漏检问题：现在只去注释，不再把 import/export 的模块字符串清空。

### 13.3 预算 gate 从 V7 baseline 切到 V13 locked budget

V7 的 `refactor-budget-gate` 只是“不退回基线”。V13 将它改成锁定预算，并接入主 `npm run gate`：

```text
npm run gate
  ...
  npm run any-budget:gate
  npm run refactor:budget
  ...
```

锁定预算：

| 指标 | V7 基线 | V13 锁定 |
|---|---:|---:|
| 最大文件行数 | 780 | 761 |
| `>= 500` 行文件 | 12 | 6 |
| 非 CSS `>= 500` 行文件 | 未单独约束 | 2 |
| TS-like `>= 450` 行文件 | 未单独约束 | 6 |
| TSX `>= 350` 行文件 | 4 | 3 |
| 显式 any | 827 | 784 |
| core module public facades | 未约束 | 6 |
| shared module public facades | 未约束 | 2 |
| core/shared deep import | 0 / 0 | 0 / 0 |

### 13.4 any 预算同步下调

`any-budget-gate` 也从宽预算切到当前锁定预算：

| 指标 | 旧预算 | V13 锁定 |
|---|---:|---:|
| src explicit any | 870 | 784 |
| test explicit any | 165 | 165 |
| scripts explicit any | 15 | 4 |
| total explicit any | 1035 | 953 |
| `as any` | 516 | 495 |
| `: any` | 435 | 375 |

这不是说项目已经没有类型债，而是把当前债务固定住：以后新增 `any` 必须先减少其它位置，或者有明确预算调整理由。

### 13.5 V13 后续维护规则

后续开发建议按这个顺序处理 import：

```text
1. 新代码优先使用模块级 public facade。
2. 旧代码暂时可以继续使用 @core/public / @shared/public。
3. 不允许新增 @core/** / @shared/** 内部深导入。
4. 根级 public 不再随意扩张；新增导出优先进入模块级 public。
5. 每轮重构后只能降低预算，不能静默提高预算。
```

## 14. V14：QuickInput 真实深拆

V14 是第二轮深化的第一版，目标是把上一轮仍然留在热点榜上的 QuickInput 大文件真正拆开。

### 14.1 拆分结果

| 文件 | V13 | V14 |
|---|---:|---:|
| `src/app/ui/components/QuickInputEditor/components/Fields.tsx` | 574 行 | 77 行 |
| `src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts` | 559 行 | 57 行 |
| 非 CSS `>= 500` 行文件 | 2 | 0 |
| TSX `>= 350` 行文件 | 2 | 1 |
| 显式 any | 784 | 756 |

### 14.2 QuickInput 字段渲染分层

`Fields.tsx` 现在只负责字段分组和组合渲染，具体字段类型进入独立 renderer：

```text
src/app/ui/components/QuickInputEditor/fields/
  FieldRenderer.tsx
  FieldFrame.tsx
  TextFieldRenderer.tsx
  OptionFieldRenderer.tsx
  HierarchyFieldRenderer.tsx
  TagFieldRenderer.tsx
  ImageFieldRenderer.tsx
  RatingFieldRenderer.tsx
  TimeFieldsSection.tsx
  fieldChoices.ts
  fieldSemantics.ts
  inputEvents.ts
  types.ts
```

渲染规则：

```text
Fields.tsx
  → groupQuickInputFields
  → QuickInputFieldRenderer
      → 按 field type 分发到具体 renderer
```

这样后续新增字段类型时，不再继续把 `Fields.tsx` 撑大。

### 14.3 QuickInputEditorModel 门面化

`QuickInputEditorModel.ts` 现在退化为兼容门面，真实逻辑拆到：

```text
src/app/ui/components/QuickInputEditor/model/
  types.ts
  hydrateDefaults.ts
  initialSelection.ts
  editorState.ts
  displayTemplate.ts
```

对外 import 仍保持兼容：

```ts
import { buildQuickInputEditorState } from './QuickInputEditorModel';
```

但内部职责已经变成：

```text
types.ts              类型和 QuickInput editor contract
hydrateDefaults.ts    模板默认值 / context 回填 / 系统字段注入
initialSelection.ts   初始目标 / 预设 / 时间方向解析
editorState.ts        对外 QuickInputEditorState 构造
displayTemplate.ts    展示模板、主题选项、周期 UI 派生
```

### 14.4 CSS gate 兼容

由于字段 renderer 被拆到新 TSX 文件，原先在 `Fields.tsx` 里的静态 `sx/style` 不再允许原样迁移。V14 将固定视觉迁入：

```text
src/styles/overrides/quick-input-modal.css
```

新增类名均使用 `think-qif-*` 前缀，CSS 仍保持：

```text
hardcodedColorsOutsideTokens = 0
!important 数量不增加
CSS 文件数不增加
```

## 15. V15 CSS 大文件模块化

### 15.1 改造目标

V15 不改变视觉行为，只把 4 个最大 feature CSS 文件改成稳定 facade：

```text
src/styles/features/settings-editors.css
src/styles/features/statistics.css
src/styles/features/excel.css
src/styles/features/view-shell.css
```

这些 facade 继续被 `src/styles/main.css` 直接引用，但内部只保留按旧级联顺序排列的
`@import`。实际规则拆到领域子文件。

### 15.2 拆分结果

```text
settings-editors.css
  settings-editors.base.css
  settings-editors.rule-builder-base.css
  settings-editors.theme-metadata.css
  settings-editors.goal-template.css
  settings-editors.statistics-categories.css
  settings-editors.rule-builder-panel.css
  settings-editors.block-editor.css
  settings-editors.goal-theme-extensions.css
  settings-editors.fields-editor.css
  settings-editors.view-editor.css

statistics.css
  statistics.base.css
  statistics.controls.css
  statistics.grids.css
  statistics.charts.css
  statistics.popover.css
  statistics.responsive.css
  statistics.summary.css

excel.css
  excel.base.css
  excel.table-cells.css
  excel.columns.css
  excel.grid-interactions.css
  excel.content-expanded.css
  excel.surface.css

view-shell.css
  view-shell.modules.css
  view-shell.toolbar.css
  view-shell.freeform-base.css
  view-shell.freeform-resize.css
  view-shell.freeform-management.css
  view-shell.normalization.css
```

### 15.3 指标变化

| 指标 | V14 | V15 |
|---|---:|---:|
| CSS 文件数 | 36 | 65 |
| CSS 行数 | 7185 | 7251 |
| 单个 CSS 最大文件 | 760+ 行 | 479 行 |
| 拆分目标 facade 行数 | 587～760 行 | 7～11 行 |
| hardcodedColorsOutsideTokens | 0 | 0 |
| `!important` | 7 | 7 |

CSS 文件数上涨是有意的模块化成本；换来的是大 CSS 文件消失、可读性和变更边界更好。
`css-boundary-gate` 与 `css-audit` 也已更新为忽略 `@import` URL，避免把拆分文件名误判为 class selector。


## 16. V16 AI / Retrieval / GoalTemplate 编辑模型收敛

### 16.1 改造目标

V16 处理 V15 后仍接近 500 行的两个领域热点：

```text
src/core/ai/RetrievalService.ts
src/features/settings/goalTemplates/GoalTemplateEditorModel.ts
```

目标不是改变功能，而是把“服务门面”和“领域计算”分离：

```text
RetrievalService       只保留索引生命周期和搜索编排
retrieval/*            负责文本规范化、索引文档、过滤、结果映射
GoalTemplateEditorModel 只保留 feature 级兼容 facade
model/*                负责 draft、theme、field、patch、variant 的内聚计算
```

### 16.2 Retrieval 拆分结果

```text
src/core/ai/RetrievalService.ts
src/core/ai/retrieval/RetrievalTypes.ts
src/core/ai/retrieval/RetrievalText.ts
src/core/ai/retrieval/RetrievalIndex.ts
src/core/ai/retrieval/RetrievalFilters.ts
src/core/ai/retrieval/RetrievalResultMapper.ts
```

职责边界：

```text
RetrievalText          normalize / extra KV / SearchResult 字段读取 / 中文 tokenization
RetrievalIndex         MiniSearch 配置 + Item → SearchIndexDocument
RetrievalFilters       themePath / type / templateId / categoryKey 过滤
RetrievalResultMapper  SearchResult → Item 兜底映射
RetrievalService       buildIndex / ensureIndex / search / getItemsByIds
```

### 16.3 GoalTemplateEditorModel 拆分结果

```text
src/features/settings/goalTemplates/GoalTemplateEditorModel.ts
src/features/settings/goalTemplates/model/GoalTemplateEditorTypes.ts
src/features/settings/goalTemplates/model/GoalTemplateThemeModel.ts
src/features/settings/goalTemplates/model/GoalTemplateFieldModel.ts
src/features/settings/goalTemplates/model/GoalTemplateDraftModel.ts
src/features/settings/goalTemplates/model/GoalTemplatePatchModel.ts
src/features/settings/goalTemplates/model/GoalTemplateVariantModel.ts
```

职责边界：

```text
GoalTemplateEditorTypes  draft / option / edit mode 类型
GoalTemplateThemeModel   themePath、主题字段、图标、defaultValues 合并
GoalTemplateFieldModel   required fields、字段结构比较、字段默认值 map
GoalTemplateDraftModel   新建 draft、继承 draft、周期策略、名称推导
GoalTemplatePatchModel   draft → compact GoalTemplate patch、diff summary
GoalTemplateVariantModel variant 排序、复制、主题选项、主题切换
```

外部调用继续使用原来的 facade：

```ts
import { makeNewDraft, buildTemplatePatchFromDraft } from './GoalTemplateEditorModel';
```

### 16.4 指标变化

| 指标 | V15 | V16 |
|---|---:|---:|
| `RetrievalService.ts` | 495 行 | 153 行 |
| `GoalTemplateEditorModel.ts` | 495 行 | 46 行 |
| 非 CSS `>=500` 行文件 | 0 | 0 |
| TS-like `>=450` 行文件 | 4 | 2 |
| large candidates | 10 | 4 |
| src explicit any | 756 | 756 |

V16 后，AI 检索和目标预设编辑都从“单文件模型”变成了“门面 + 内聚 helper”结构，后续 V17 做模块 public 实际迁移时可以更清楚地判断哪些 API 应该进入 public、哪些只属于 feature 内部。

## 17. V17 Public API 实际迁移

### 17.1 改造目标

V13 只建立了模块级 public facade，但大部分上层代码仍继续通过根入口导入：

```text
@core/public
@shared/public
```

V17 的目标是让这些模块级 facade 真正被使用，把依赖从“一个超大公共仓库”迁移到领域窄入口。

### 17.2 新增核心模块 public facade

```text
@core/utils/public        → src/core/utils/public.ts
@core/types/public        → src/core/types/public.ts
@core/blocks/public       → src/core/blocks/public.ts
@core/services/public     → src/core/services/public.ts
@core/ports/public        → src/core/ports/public.ts
@core/ai/public           → src/core/ai/public.ts
@core/view/public         → src/core/view/public.ts
@core/records/public      → src/core/records/public.ts
@core/progression/public  → src/core/progression/public.ts
@core/bootstrap/public    → src/core/bootstrap/public.ts
```

这些 facade 和 V13 已有的：

```text
@core/goal/public
@core/fields/public
@core/recordInput/public
@core/layout/public
@core/theme/public
@core/semantics/public
```

共同形成 core 的模块级公共面。

### 17.3 新增 shared 模块 public facade

```text
@shared/hooks/public
@shared/components/public
@shared/debug/public
@shared/patterns/public
@shared/types/public
@shared/styles/public
```

它们和已有的：

```text
@shared/ui/public
@shared/utils/public
```

共同替代根级 `@shared/public` 的直接使用。

### 17.4 Gate 变化

V17 同步升级了架构 gate：

```text
arch-gate
  非 core 层访问 core 时，允许 root public 与模块级 public facade。

public-api-gate / shared-public-gate
  允许 public-facades.config.mjs 中登记的模块级 facade。

refactor-budget-gate
  新增 root public importers / import statements 预算。
```

V17 后预算锁定为：

```text
@core/public importing files       0
@core/public import statements     0
@shared/public importing files     0
@shared/public import statements   0
core module public facades         16
shared module public facades       8
```

### 17.5 指标变化

| 指标 | V16 | V17 |
|---|---:|---:|
| `@core/public` importing files | 264 | 0 |
| `@shared/public` importing files | 96 | 0 |
| core module public facades | 6 | 16 |
| shared module public facades | 2 | 8 |
| 非 CSS `>=500` 行文件 | 0 | 0 |
| src explicit any | 756 | 756 |

V17 后，根级 public 仍然保留为兼容入口和历史文档锚点，但第一方源码不再直接依赖它。后续新增 core/shared 跨层依赖时，应优先选择模块级 public facade；只有确实没有合适模块边界时，才考虑扩展 public facade 配置。

### 17.6 下一版方向

V18 进入类型收敛，目标是把 `src explicit any` 从 756 继续下降，并优先处理：

```text
src/app/ui/primitives/FloatingPanel.tsx
src/app/actions/recordCreateActions.ts
src/core/goal/overview.ts
src/features/settings/goalTemplates/GoalTemplateNativeControls.tsx
```

## 18. V18 类型与 explicit any 收敛

### 18.1 改造目标

V17 已经把 public API 迁移到模块级 facade，但源码里仍有较多显式 `any`。V18 的目标不是一次性禁用 `any`，而是优先处理高频、低风险、用户主链相关的类型债务，把预算从 V17 的宽口径继续下压。

优先处理区域：

```text
src/app/ui/primitives/FloatingPanel.tsx
src/app/actions/recordCreateActions.ts
src/core/goal/overview.ts
src/features/settings/goalTemplates/GoalTemplateNativeControls.tsx
```

### 18.2 主要改造

#### FloatingPanel 事件适配

原先 `FloatingPanel.tsx` 为了同时支持 mouse / touch / Preact JSX / DOM listener，大量使用：

```ts
handler as any
```

V18 增加本地事件适配函数：

```ts
toDomListener
toMouseEvent
toTouchEvent
```

并把 DOM listener 和 JSX handler 的 `any` cast 替换成 `unknown -> 目标事件类型` 的窄化形式。这样保留原交互行为，但不再把类型风险扩散到整个组件。

#### 视图创建动作上下文类型化

`recordCreateActions.ts` 原先把 Obsidian app、inputBlocks、QuickInput context 都写成 `any`。V18 改为：

```ts
QuickInputApp = ConstructorParameters<typeof QuickInputModal>[0]
QuickInputBlockLike = { id: string; name?: string | null }
Record<string, unknown>
```

这样 header / timeline / heatmap / statistics 创建入口仍然复用原 QuickInputModal，但 action 层不再依赖宽泛 `any`。

#### 目标总览松散字段读取收敛

`core/goal/overview.ts` 需要兼容旧数据里的中文字段、extra 字段和历史别名。V18 保留这种兼容性，但把读取方式从 `(item as any)` 收敛为：

```ts
LooseRecord = Record<string, unknown>
readLooseField(...): unknown
```

这样“兼容旧字段”仍然存在，但不会再把整个 Item 降级为 `any`。

#### 原生设置控件事件类型化

`GoalTemplateNativeControls.tsx` 原先为阻止编辑器事件冒泡大量使用 `stopEditorEvent as any`。V18 改为直接使用 `Event` 入参的 handler，并让 Preact 事件回调自然传入，减少 UI 表单层 `any`。

### 18.3 Gate 变化

V18 下调 `any-budget-gate`：

```text
src explicit any: 756 → 671
total explicit any: 925 → 840
as any: 492 → 419
: any: 351 → 341
```

并同步下调 `refactor-budget-gate` 中的 `srcExplicitAny` 预算：

```text
srcExplicitAny: 756 → 671
```

### 18.4 指标变化

| 指标 | V17 | V18 |
|---|---:|---:|
| src explicit any | 756 | 671 |
| total explicit any | 925 | 840 |
| `as any` | 492 | 419 |
| `: any` | 351 | 341 |
| 非 CSS `>=500` 行文件 | 0 | 0 |
| TS-like `>=450` 行文件 | 2 | 2 |
| TSX `>=350` 行文件 | 2 | 2 |
| root public importers | 0 | 0 |

V18 后，`any` 仍然没有完全清零，但已经从“无差别兜底类型”转为预算化债务。下一轮如果继续降低，应优先处理 view model、GoalTemplateMatrix、ActionService 和 RecordInputFacade 这些仍在榜单上的文件。

## 19. V19 预算锁定与回归验收封版

### 19.1 改造目标

V19 不继续大规模移动业务代码，而是把 V14～V18 的第二轮深化成果固化成可执行的 release gate 与人工验收清单。目标是防止以下指标反弹：

```text
大文件重新出现
@core/public / @shared/public 根入口重新被第一方源码使用
module public facade 被删除或绕过
src explicit any 重新增长
QuickInput / RecordInput / CSS / AI / Settings 主链缺少人工验收入口
```

### 19.2 主要改造

新增 `scripts/gates/refactor-release-gate.mjs`，它检查：

```text
package.json 中 gate / refactor:verify 已接入 refactor:release
scripts/gates/refactor-budget-baseline.json 已升级到 V19-refactor-release-locked
MVP_ACCEPTANCE.md 包含第二轮深度改造封版验收
REFACTOR_ACCEPTANCE_CHECKLIST.md 包含 QuickInput、RecordInput、Settings、CSS、AI、三端、Public API、类型预算、发布命令回归项
ARCH_REFACTOR_REPORT.md 保留 V19 封版章节
当前 refactor metrics 仍满足：>=500 行文件为 0、root public importers 为 0、src explicit any <= 671
```

同时更新：

```text
package.json
  refactor:release
  refactor:verify
  gate

scripts/gates/refactor-budget-baseline.json
  version: V19-refactor-release-locked

scripts/gates/refactor-budget-gate.mjs
scripts/gates/any-budget-gate.mjs
  文案升级为 V19 locked budget
```

### 19.3 V19 锁定预算

| 指标 | V19 预算 |
|---|---:|
| 最大文件行数 | 480 |
| `>= 500` 行文件 | 0 |
| 非 CSS `>= 500` 行文件 | 0 |
| TS-like `>= 450` 行文件 | 2 |
| TSX `>= 350` 行文件 | 2 |
| large candidates | 5 |
| src explicit any | 671 |
| `@core/public` importers | 0 |
| `@shared/public` importers | 0 |
| core module public facades | >= 16 |
| shared module public facades | >= 8 |

### 19.4 封版验收命令

本地完整验收：

```bash
npm ci
npm run refactor:verify
npm run gate
npm run typecheck
npm run build
```

快速架构验收：

```bash
npm run refactor:verify
npm run gate
```

### 19.5 第二轮结论

第二轮 V14～V19 完成后，架构治理状态从“已经有指标与部分拆分”推进到“复杂度预算被锁定、public 依赖真实迁移、主链回归清单可执行”。后续如果继续深化，优先方向不再是大文件拆分，而是更细粒度的领域语义收敛：目标/主题路径剩余热点、字段值语义剩余重复、以及 explicit any 的下一轮下压。


## 20. V20 文件夹归属重排基线与本地 data.json 策略

### 20.1 改造目标

V20 开始第三轮整理：重点从“大文件与 public API 治理”转向“文件归属治理”。本版不大规模移动业务文件，而是建立 V21～V25 的目录迁移地图，并调整单人使用场景下的本地数据策略。

### 20.2 本地 data.json 策略

根目录 `data.json` 现在被视为本地 Obsidian 插件运行态文件：

```text
secret-gate 不再因为根目录 data.json 存在而失败
package-release 不再因为根目录 data.json 存在而失败
release 包仍然只复制 manifest.json、main.js、styles.css
release-boundary 仍然禁止 data.json 进入发布包
.gitignore 仍然忽略 data.json
```

这符合单人使用模式：本地可以有当前数据，发布包不能泄漏本地数据。

### 20.3 新增文件夹治理命令

新增：

```bash
npm run folder:map
npm run folder:verify
```

`folder:map` 生成下一轮移动候选表；`folder:verify` 检查 `docs/FOLDER_REORG_PLAN.md`、data.json 策略和 V21～V25 迁移阶段是否存在。

### 20.4 后续目录移动顺序

```text
V21 QuickInput：把快捷面板收进 features/quickinput
V22 Settings / Views：把业务视图从 shared 移到 feature 归属
V23 Core：合并 core recordInput，并删除旧兼容 facade / fallback
V24 Shared / Platform：shared 只留通用能力，platform 明确为 Obsidian adapter
V25 Schema / Release：只支持当前 schema，锁目录预算并生成 release 包
```

详细迁移表见 `docs/FOLDER_REORG_PLAN.md`。


## 21. V21 QuickInput 目录归属重排

### 21.1 改造目标

V21 执行第三轮目录治理的第一步：把快捷面板从 app-wide UI 和 platform 业务 UI 中收敛到 `features/quickinput`。本版不改变 QuickInput 行为，重点是 ownership 清晰化。

### 21.2 目录变化

```text
src/app/ui/components/QuickInputEditor/**
  → src/features/quickinput/editor/**

src/platform/obsidian/modals/QuickInputModalHeader.tsx
src/platform/obsidian/modals/QuickInputModalFooter.tsx
src/platform/obsidian/modals/QuickInputConflictRecoveryPanel.tsx
src/platform/obsidian/modals/useQuickInputSubmit.ts
src/platform/obsidian/modals/useQuickInputOutputPlan.ts
src/platform/obsidian/modals/quickInputOperationMode.ts
src/platform/obsidian/modals/quickInputOriginalLink.ts
src/platform/obsidian/modals/quickInputEnvironment.ts
  → src/features/quickinput/modal/**
```

`src/platform/obsidian/modals/QuickInputModal.tsx` 保留为 Obsidian adapter，只负责：

```text
Obsidian Modal 生命周期
prepareThinkModal / mountWithServices / unmountPreact
资源路径 getResourcePath 注入
移动端键盘检测
遮罩点击保护
Notice port 注入
```

### 21.3 Obsidian API 边界

QuickInput feature 不直接 import `obsidian`。`Notice` 仍在 `src/platform/obsidian/modals/quickInputNotice.ts` 中创建，并以 `showNotice` port 传入 feature modal content。这样满足 obsidian-leak gate，同时让业务 UI 离开 platform。

### 21.4 保留在 app 的部分

`src/app/actions/recordCreateActions.ts` 本版暂时不移动。原因是它是跨统计、时间线、热力图、视图 header 的应用层创建入口聚合，并且需要稳定导出给 `recordUiActions`。如果未来要移动，应先引入 QuickInput capability/open port，避免 feature 反向依赖 app public 造成循环。

### 21.5 验收结果

已通过：

```bash
npm run gate
npm run refactor:verify
npm run folder:verify
```

当前指标：

```text
@core/public importers: 0
@shared/public importers: 0
non-CSS files >= 500 lines: 0
src explicit any: 668 / 671
QuickInput editor old source files: 0
QuickInput modal business old source files: 0
```


## 22. V22 Settings / Views 目录归属重排

### 22.1 改造目标

V22 执行第三轮目录治理的第二步：把业务视图从 `shared/ui` 中移出，并把 Settings 里的 view runtime / editor / model 收到同一个 feature ownership 下。

### 22.2 目录变化

```text
src/shared/ui/views/**
  → src/features/settings/views/runtime/**

src/features/settings/viewEditors/**
  → src/features/settings/views/editors/**

src/features/settings/viewModels/**
  → src/features/settings/views/models/**
```

新增 feature facade：

```text
src/features/settings/views/public.ts
```

它统一导出运行视图、视图工具条、timeline parser、view editor registry 和 view render model registry。

### 22.3 Shared 边界

`@shared/ui/public` 与 `@shared/public` 已移除业务视图导出。后续 shared 只保留 primitives、forms、icons、通用 UI 组件和通用工具。业务视图由 `@features/settings/views/public` 暴露。

### 22.4 关键调用点

```text
src/features/settings/index.ts
  DashboardViewComponents 从 @features/settings/views/public 获取

src/features/settings/layout/LayoutRenderer.tsx
  ViewToolbar 从 @features/settings/views/public 获取

src/features/settings/layout/statisticsPopoverBridge.tsx
  PopoverContent 从 @features/settings/views/public 获取
```

### 22.5 验收目标

```text
src/shared/ui/views 不存在
src/features/settings/viewEditors 不存在
src/features/settings/viewModels 不存在
shared public 不再导出业务 runtime views
settings views feature public 可作为唯一业务视图入口
```

## 23. V23 Core 领域目录收敛

### 23.1 改造目标

V23 执行第三轮目录治理的第三步：把 RecordInput 从 `core/services` generic bucket 中移出，并把任务记录 / 记录提交相关工具从 `core/utils` 放回对应领域。项目现在只服务当前个人数据，不再为了旧 schema 保留额外迁移层；但写入安全与提交冲突恢复继续保留。

### 23.2 RecordInput 目录合并

```text
src/core/services/recordInput/**
  → src/core/recordInput/**
```

`src/core/recordInput/public.ts` 现在直接导出领域内的 session、submit result、refresh coordinator、mutation helper、OutputPlanner、RecordInputFacade 与 RecordInputKernel。`core/public.ts` 也同步改为从 `./recordInput/**` 导出。

### 23.3 core/utils ownership 收窄

本版移走的工具：

```text
src/core/utils/taskTime.ts          → src/core/records/task/taskTime.ts
src/core/utils/taskStatus.ts        → src/core/records/task/taskStatus.ts
src/core/utils/taskUtils.ts         → src/core/records/task/taskUtils.ts
src/core/utils/mark.ts              → src/core/records/task/mark.ts
src/core/utils/recordSubmitFeedback.ts → src/core/recordInput/feedback.ts
src/core/utils/recordSubmitRecovery.ts → src/core/recordInput/recovery.ts
src/core/utils/recordDebug.ts       → src/core/recordInput/debug.ts
```

`src/core/records/task/index.ts` 作为任务记录子领域入口；`src/core/records/index.ts` 和 `src/core/records/public.ts` 继续向外提供 records 领域 public surface。为了避免外层一次性改动过大，`src/core/utils/index.ts` 与 `src/core/utils/public.ts` 仍对这些工具做稳定再导出。

### 23.4 保留与边界

本版没有移动 app 层工作流：

```text
src/app/usecases/recordInput/workflows/**
```

原因是 create / update / convert / duplicate / delete 工作流属于应用事务编排，依赖 DataStore、InputService 与 UI 提示策略，不应进入 core 领域层。

本版也没有移动 `core/types/recordInput.ts` 与 `core/types/recordSnapshot.ts`。这些类型已通过 `@core/recordInput/public` 对外暴露；后续如果继续去中心化，会先保证外部调用只依赖 recordInput public，再移动底层类型文件。

### 23.5 验收目标

```text
src/core/services/recordInput 不存在
src/core/recordInput 包含领域实现与 public facade
src/core/utils 不再包含 taskTime / taskStatus / taskUtils / mark / recordSubmitFeedback / recordSubmitRecovery / recordDebug
src/core/records/task 包含任务记录规则
src/core/recordInput 包含提交反馈、恢复和调试工具
app/usecases/recordInput/workflows 仍保留在 app 层
```


## 24. V24 Shared / Platform 瘦身

### 24.1 改造目标

V24 执行第三轮目录治理的第四步：让 `platform` 明确成为 Obsidian 适配层，让 `shared` 只保留真正跨 feature 的 UI / hooks / utils。业务运行视图的子组件不再通过 shared public 暴露。

### 24.2 Platform 目录明确化

```text
src/platform/*
  → src/platform/obsidian/*
```

新增：

```text
src/platform/obsidian/public.ts
```

`main.ts`、settings 入口和布局新增弹窗现在优先从 `@/platform/obsidian/public` 获取 Obsidian adapter entrypoint。`src/platform` 根目录不再直接放 `.ts/.tsx` 适配器文件。

### 24.3 Shared 业务视图组件迁出

```text
src/shared/ui/items/**       → src/features/settings/views/runtime/components/items/**
src/shared/ui/heatmap/**     → src/features/settings/views/runtime/components/heatmap/**
src/shared/ui/statistics/**  → src/features/settings/views/runtime/components/statistics/**
src/shared/ui/timeline/**    → src/features/settings/views/runtime/components/timeline/**
```

`@shared/ui/public` 与 `@shared/public` 已移除这些业务组件导出。shared 继续保留 primitives、forms、icons、markdown、recordOrigin handler 等通用能力。

### 24.4 Obsidian Modal forwarder 删除

删除：

```text
src/shared/ui/composites/dialogs/NamePromptModal.ts
```

`NamePromptModal` 是 Obsidian Modal 实现，归属 `src/platform/obsidian/modals/NamePromptModal.tsx`，并通过 `src/platform/obsidian/public.ts` 提供平台入口。

### 24.5 验收目标

```text
src/platform 根目录直接文件数为 0
src/platform/obsidian 包含所有 Obsidian adapter
src/shared/ui/items 不存在
src/shared/ui/heatmap 不存在
src/shared/ui/statistics 不存在
src/shared/ui/timeline 不存在
src/shared/ui/public 不再导出业务 runtime 组件
npm run gate 通过
npm run folder:verify 通过
```

## 25. V25 当前版 schema 锁定与目录封版

### 25.1 改造目标

V25 是第三轮目录治理的封版：不再继续移动大目录，而是把当前目录归属、当前版 settings schema、release 包边界和 gate 规则固定下来。项目是单人使用，因此不维护旧 `data.json` schema migration；用户数据需要自行保持当前版本结构。

### 25.2 当前版 schema 策略

新增当前 schema 锁定模块：

```text
src/core/settings/currentSettingsSchema.ts
src/core/settings/public.ts
```

策略为：

```text
THINK_SETTINGS_SCHEMA_POLICY = 'current-only'
supportsLegacyMigration = false
```

`main.ts` 的设置加载现在统一走：

```text
toCurrentThinkSettings(await this.loadData())
```

如果没有本地数据，则使用 `DEFAULT_SETTINGS`；如果存在本地数据，则必须声明当前 `schemaVersion`。这避免旧结构被静默迁移或半兼容读取。

### 25.3 本地 data.json 与发布包边界

V20 已允许根目录存在本地 `data.json`，V25 保持该策略：

```text
本地开发：允许 data.json
secret-gate：不因根目录 data.json 失败
release package：仍然禁止 data.json
release 包内容：manifest.json / main.js / styles.css
```

### 25.4 新增 gate

新增：

```text
npm run schema:gate
scripts/gates/current-schema-gate.mjs
```

并接入：

```text
npm run gate
npm run refactor:verify
```

V25 后，schema 策略、folder reorg 计划、release 预算、public API、CSS 和 any 预算都会一起参与主 gate。

### 25.5 验收目标

```text
npm run folder:verify 通过
npm run schema:gate 通过
npm run refactor:verify 通过
npm run gate 通过
src/core/settings/currentSettingsSchema.ts 存在
src/platform 根目录无直接适配器文件
src/shared 不再导出业务 runtime view 组件
release 包不包含 data.json
```

## 26. V26 语义函数收敛

V26 的目标是处理散落函数、重复功能函数，不做大范围目录搬迁。它把常见的业务语义集中到更明确的中心模块，让领域文件可以保留 wrapper，但不再各自重复解释相同规则。

主要产物：

```text
src/core/semantics/text.ts
src/core/fields/fieldTokenSemantics.ts
src/core/view-config/filterValueSemantics.ts
src/core/theme/themePathSemantics.ts
src/core/utils/timing.ts
```

收敛对象包括：

```text
compactText
normalizeToken
normalizeMultiValue
nowMs / elapsedMs
leafPath / pathCandidates
isThemeField / isIconField
theme path normalize / parent / leaf / map build
```

V26 的规则是：同一种业务语义只允许有一个权威实现；领域模块可以用 wrapper 表达上下文，但不能重新 split / trim / filter / lowercase 一套规则。

## 27. V27 大文件职责拆分

V27 处理容易继续膨胀的职责桶，不改变业务行为，保留旧 import path 作为 compatibility facade。

主要拆分：

```text
src/app/ui/primitives/FloatingPanel.tsx
src/shared/styles/mui-theme.ts
src/shared/utils/errorHandler.ts
```

拆分后的职责边界：

| 原文件 | V27 后职责 |
|---|---|
| `FloatingPanel.tsx` | facade、header、resize handles、interaction hook、lifecycle hook、event bridge |
| `mui-theme.ts` | palette、typography、controls、forms、surfaces、overlays、theme factory |
| `errorHandler.ts` | error type、classification、message、logger、safe execution 分离 |

V27 后，TS-like `>= 450` 行文件降为 0，大文件不再作为继续开发的默认承载点。

## 28. V28 View Config / Action 收敛

V28 处理两个横向增长桶：

```text
src/core/config/viewConfigs.ts
src/app/actions/recordCreateActions.ts
```

新结构：

```text
src/core/config/views/
  types.ts
  exportConfigs.ts
  defaults/
    block.ts
    eventTimeline.ts
    excel.ts
    heatmap.ts
    progress.ts
    statistics.ts
    table.ts
    taskExecution.ts
    timeline.ts

src/app/actions/recordCreate/
  types.ts
  openCreateModal.ts
  viewHeaderCreateAction.ts
  timelineCreateAction.ts
  heatmapCreateAction.ts
  statisticsCreateAction.ts
```

V28 的规则是：新增 view default 进入 `core/config/views/defaults/<view>.ts`；新增 create action 进入 `app/actions/recordCreate/<source>CreateAction.ts`；旧 `viewConfigs.ts` 与 `recordCreateActions.ts` 只做兼容门面。

## 29. V29 Service Ownership 收敛

V29 处理 service ownership 的两个热点：

```text
src/core/services/ItemService.ts
src/features/settings/theme/ThemeManager.ts
```

`ItemService` 拆成：

```text
src/core/services/item/
  ItemService.ts
  ItemLocator.ts
  ItemMutationWriter.ts
  TaskCompletionMutation.ts
  InlineFieldMutation.ts
  GoalTemplateMigrationMutation.ts
  MigrationBackupService.ts
  itemId.ts
  lineMetadata.ts
  types.ts
```

`ThemeManager` ownership 调整为：

```text
src/core/theme/ThemeManager.ts
src/core/theme/themeMatching.ts
src/core/theme/themeManagerSemantics.ts
src/features/settings/theme/ThemeManager.ts   # compatibility facade
```

V29 后，app bootstrap 从 `@core/theme/public` 注册 matcher，不再从 settings feature 中直接拿 runtime matcher。core 负责 theme matching 领域语义；app 负责组装；features/settings 只负责 settings UI 与交互。

## 30. V30 类型债收敛

V30 的目标是降低 explicit any，并把类型预算锁进 gate。

重点处理：

```text
src/features/settings/views/models/heatmapViewModel.ts
src/features/settings/views/models/statisticsViewModel.ts
src/features/settings/views/runtime/TimelineView/TimelineViewModel.ts
src/features/settings/views/runtime/StatisticsView/StatisticsViewModel.ts
src/core/records/RecordNormalizer.ts
src/core/services/ActionService.ts
src/core/recordInput/RecordInputFacade.ts
src/core/types/quickInput.ts
```

结果：

| 指标 | V29 | V30 |
|---|---:|---:|
| explicit any | 648 | 501 |
| files `>= 500` lines | 0 | 0 |
| TS-like files `>= 450` lines | 0 | 0 |
| `@core/public` importers | 0 | 0 |
| `@shared/public` importers | 0 | 0 |

V30 后新增 `any` 会被 `any-budget:gate` 和 `refactor:budget` 阻止，除非明确更新预算并说明原因。

## 31. V31 预算 / gate / 文档封版

V31 不继续拆业务代码，目标是把 V26～V31 的深度收敛结果变成长期维护规则。

### 31.1 V31 版本计划完成情况

| 版本 | 主题 | 状态 | 封版产物 |
|---|---|---|---|
| V26 | 语义函数收敛 | 完成 | 中心语义模块与兼容 wrapper |
| V27 | 大文件职责拆分 | 完成 | UI/style/error facade 化 |
| V28 | View Config / Action 收敛 | 完成 | `core/config/views` 与 `app/actions/recordCreate` |
| V29 | Service Ownership 收敛 | 完成 | `core/services/item` 与 core theme matcher |
| V30 | 类型债收敛 | 完成 | explicit any 降至 501 并锁预算 |
| V31 | 预算 / gate / 文档封版 | 完成 | final gate、验收清单、开发提示词、封版报告 |

### 31.2 V31 锁定预算

```text
scripts/gates/refactor-budget-baseline.json
version = V31-deep-refactor-final-locked
```

| 预算项 | V31 锁定值 |
|---|---:|
| 最大文件行数 | 480 |
| files >= 500 lines | 0 |
| non-CSS files >= 500 lines | 0 |
| TS-like files >= 450 lines | 0 |
| TSX files >= 350 lines | 1 |
| large file candidates | 3 |
| src explicit any | 501 |
| duplicate function-name groups | 50 |
| core root public importers | 0 |
| shared root public importers | 0 |
| core deep imports | 0 |
| shared deep imports | 0 |
| core module public facades | >= 16 |
| shared module public facades | >= 8 |

### 31.3 新增 final gate

新增：

```text
npm run deep-refactor-final:gate
scripts/gates/deep-refactor-final-gate.mjs
```

并接入主 gate：

```text
npm run gate
```

该 gate 检查：

```text
V31 budget version
V26-V31 架构报告内容
V31 回归验收清单
开发防发散提示词
最终封版说明
当前 live metrics 是否仍在预算内
```

### 31.4 后续开发规则

1. 新功能先判断 ownership，再写代码。
2. 新增函数前必须搜索同义语义；能复用中心语义就不要新增局部实现。
3. facade 只做导出与兼容，不写新业务逻辑。
4. shared 不是业务垃圾桶，只放通用 UI、hooks、utils、styles、types。
5. 单文件超过 300 行要说明原因，超过 380 行要优先拆分。
6. 不要继续大拆已经小而清晰的组件。
7. 预算只能降低或带说明调整，不能静默放宽。

### 31.5 V31 完成定义

V31 完成后，至少应通过：

```bash
npm run refactor:verify
npm run gate
npm run deep-refactor-final:gate
npm run any-budget:gate
```

完整本地发布前仍需执行：

```bash
npm ci
npm run typecheck
npm run build
npm run test:unit
npm run gate
```
