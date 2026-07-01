# Think OS 深度架构改造报告（V7 基线）

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
src/core/services/recordInput/EditBackfillMapper.ts
src/core/services/recordInput/RecordInputFacade.ts
src/core/services/recordInput/session/policy.ts
src/core/services/recordInput/snapshot/OutputPlanner.ts
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
src/core/services/recordInput/mutation/TaskLinePatch.ts
  负责任务行 checkbox 状态、tag、emoji date、recurrence、kv 元数据保留

src/core/services/recordInput/mutation/HeaderAppender.ts
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
