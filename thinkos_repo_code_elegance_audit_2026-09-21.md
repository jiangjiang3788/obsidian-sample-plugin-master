# Think OS 全仓库代码优雅度审核报告

日期：2026-09-21  
审核对象：用户上传的 `obsidian-sample-plugin-master(4).zip`，并叠加本轮 QuickInput 已确认的最新补丁链，形成当前有效源码快照。  
审核范围：`src/` + `test/`，共 1177 个文件。  
审核方式：静态源码审查、TypeScript AST 指标分析、import/re-export 依赖图、重复实现扫描、CSS 结构/体量检查、热点文件人工复核。

> 限制：上传快照没有仓库根部的 `package.json`、`tsconfig.json`、`scripts/`、完整 `docs/` 和依赖，因此本报告不能声称执行了完整的 `tsc`、ESLint、Jest、Playwright 或仓库自带 arch-gate。涉及“可能违反治理预算”的地方会明确标注为“需在完整仓库验证”。

---

## 1. “代码优雅”到底是什么

优雅不等于代码短，也不等于文件少，更不等于“用了很多设计模式”。

对这个仓库，我建议用下面 9 条定义优雅：

1. **局部可推理**：读一个模块时，不需要同时在十几个文件之间跳转才能理解状态如何变化。
2. **变化局部化**：新增一个记录字段、一个 RecordType 或一个交互规则时，修改集中在少数明确位置，而不是 UI、Parser、持久化、View 各补一次特殊分支。
3. **依赖单向**：core / app / features / platform 的依赖方向清楚，不通过 barrel/re-export 绕成环。
4. **不变量显式**：例如“RecordType 全局可切换”“Goal × RecordType 决定模板”“TaskSession 是执行事实”等，应由类型、模型或一个明确 policy 表达，而不是依靠多个组件约定。
5. **抽象服务于稳定概念**：重复且语义相同的规则应该共用；偶然长得一样的 3 行代码没必要强行抽象。
6. **相同问题走相同路径**：确认弹窗、错误报告、日期归一化、字段语义解析，不应各模块各写一套。
7. **平台副作用在边界**：Obsidian API、`window.confirm`、文件 IO、Notice 等尽量停留在 platform/app boundary，核心业务保持可测试。
8. **失败可见**：可以 best-effort，但不应该大量静默吞错，让真实问题只能靠用户截图发现。
9. **能删掉旧东西**：兼容层有退出条件；“临时 bridge / legacy facade”不能永久成为正式结构。

一个很实用的判断句是：

> **需求变了以后，我能不能在动手前准确预测“应该改哪一层、哪几个文件”？如果答案经常是“先全仓库搜一圈”，就不够优雅。**

---

## 2. 仓库概况

### 2.1 规模

| 项目 | 当前快照 |
|---|---:|
| TypeScript/TSX 源码文件 | 753 |
| 源码 TS/TSX 行数 | 约 73,041 |
| CSS 文件 | 85 |
| CSS 行数 | 约 10,713 |
| 测试文件总数 | 334 |
| 测试 TS/TSX/MTS 行数 | 约 27,827 |
| Unit 测试文件 | 215 |
| Integration 测试文件 | 61 |
| E2E specs | 26 |
| `public.ts` façade | 33 |

### 2.2 静态指标

| 指标 | 数量 | 说明 |
|---|---:|---|
| `any` 类型节点 | 372 | 不算灾难，但有几个 core 热点可以明显收紧 |
| 类型断言 | 730 | 边界代码可以接受；业务核心应减少 |
| 非空断言 | 51 | 总量不高 |
| 空 `catch {}` | 49 | 很多是 cleanup/best-effort，但静默失败策略过于分散 |
| `window.confirm` | 10 | app/features 中直接使用，与已有 Ui/Modal Port 不完全一致 |
| TODO/FIXME/HACK | 3 | 技术债注释不多 |
| 无源码入边候选 | 3 | 见“兼容/死代码”章节 |

### 2.3 先说优点

这个仓库**不是典型的“GPT 拼出来的 spaghetti”**。相反，它已经有相当明显的工程治理意识：

- 有 `core / app / features / platform / shared` 的层次；
- core 对外普遍通过模块级 `public.ts` 暴露，外层几乎没有直接钻入 core implementation；
- 有 Port/DI、UseCase、schema、record codec、record input workflow 等明确概念；
- QuickInput 已经有 reducer/model，而不是所有状态全堆在 JSX；
- CSS 有 token / primitive / component / feature / override 层；
- 测试量很可观，并且有 CSS governance、public API、contract、fault/governance 这类测试意识；
- `ARCH_CONSTRAINTS.md` 把 Goal、TaskSession、持久化等关键 domain invariant 写得很清楚。

所以现在的问题不是“推倒重写”，而是：**架构方向总体对，但迭代过程中出现了边界漂移、兼容残留和几个越来越重的热点。**

---

# 3. 最高优先级问题

## A. 存在真实的 import/re-export 循环依赖

这是本次审核里最值得优先处理的问题。

把 `export ... from` 也纳入依赖图后，当前源码形成了 **2 个强连通循环依赖组**。

### A1. Core 循环

一条实际路径是：

```text
core/utils/itemFilter
  -> core/fields/FieldValueResolver
  -> core/fields/RecordPrimaryText
  -> core/records/public
  -> core/records/RecordRepository
  -> core/services/DataStore
  -> core/services/dataStore/DataStoreIndex
  -> core/query/RecordQuery
  -> core/utils/itemFilter
```

最明显的诱因在：

- `src/core/fields/RecordPrimaryText.ts:2` 只是为了 `RecordType`，却从整个 `@/core/records/public` 导入；
- `src/core/records/public.ts:5` 又把 `RecordRepository` 这种带 DataStore/IO 依赖的实现一并 export 出去。

这意味着“一个纯展示 helper 想拿一个 type”会把 repository、store、query 整条链拖进依赖图。

### 建议

优先做**窄依赖**，不要先大重构：

- `RecordPrimaryText` 直接从 `records/schema/types` 或一个 **type-only domain barrel** 引入 `RecordType`；
- 把 `records/public.ts` 分成“domain/types API”和“repository/infrastructure API”，不要在同一个 barrel 里混合；
- core 内部原则上尽量 import 具体内部模块，不绕自己的 mega public barrel。

这类修改通常很小，但会显著改善依赖图。

---

## A2. app / feature / platform 的 façade 自引用循环

最短的一条循环是：

```text
platform/obsidian/modals/AiBatchConfirmModal.tsx
  -> @/app/public
  -> app/ui/modals/AiBatchConfirmModal.ts
  -> platform/obsidian/modals/AiBatchConfirmModal.tsx
```

证据：

- `src/platform/obsidian/modals/AiBatchConfirmModal.tsx:7-17` 从 `@/app/public` 取 hooks/services/QuickInputEditor；
- `src/app/public.ts:81-83` 又 re-export 各种 Modal；
- `src/app/ui/modals/AiBatchConfirmModal.ts:1` 再把 platform Modal re-export 回去。

QuickInput 也存在同类结构：

```text
features/quickinput/editor/QuickInputEditorContainer
  -> app/public
  -> features/quickinput/editor
```

### 为什么不优雅

`app/public` 同时承担：

- app hooks/store/usecase 的“上游 API”；
- feature UI 的 re-export；
- platform Modal adapter 的 re-export。

于是它既是上游，又把下游重新包回来，依赖方向自然会成环。

### 建议

不要继续扩大 `app/public.ts`。建议拆成两个明确方向：

- `app/runtime/public`：hooks、selectors、usecases、services contracts；供 feature/platform 依赖；
- UI/adapter 不再从同一个 runtime façade 反向 re-export。

更简单一点也可以：**直接从 `app/public.ts` 删除 feature/platform UI 的 re-export，只保留 app 自己拥有的 runtime API。**

`main.ts` / composition root 需要具体 Modal 时，直接依赖 platform adapter 是合理的。

---

# 4. 架构文档与真实代码已经漂移

## B. `core/public.ts` 的“唯一门面”规则已经不是真实规则

`src/core/public.ts:6-7` 写得非常明确：

> core 对外唯一门面；app/features/shared 只能 import 这个文件。

但当前源代码实际情况是：

- **源码中 `@core/public` / `@/core/public` 的使用数：0**；
- **源码中 `@core/*/public` 的使用文件数：321**。

也就是说，真实架构已经演进成：

> **模块级 public façade**（`@core/types/public`、`@core/fields/public`、`@core/services/public`……）

而不是一个 `core/public.ts` mega façade。

这其实是好事——模块级 façade 往往比 mega barrel 更清楚。但注释和治理规则还停留在旧设计。

### 建议

二选一，不要同时声称两套规则：

1. **推荐**：正式承认模块级 public 是标准；`core/public.ts` 只作为外部/测试兼容入口，逐步减少；
2. 或者真的强制所有外层代码改回 `@core/public`，但这会让 328 行 mega barrel 更重，我不建议。

这里的“优雅”不是少一个文件，而是**团队脑中的架构和代码真实依赖一致**。

---

# 5. QuickInput 是当前最明显的“局部复杂度热点”

你最近连续碰到 QuickInput 的布局、Goal、Recent preset、Energy、Modal 高度等问题，本质上和这里的代码形状高度相关。

## C1. `QuickInputEditor` 责任过多

`src/features/quickinput/editor/QuickInputEditorContainer.tsx`

- 文件约 417 行；
- `QuickInputEditor()` 本体约 **372 行**；
- 估算分支复杂度约 **23**。

它同时负责：

- session reducer 初始化 / reset；
- RecordType 列表；
- Recent Goal 内容查询；
- Goal compatibility；
- GoalTemplate runtime resolve；
- base template fallback；
- period policy；
- task timing mode；
- default hydration；
- field update；
- time direction；
- RecordType switch；
- Goal preset 行为；
- Energy direct branch；
- 最终 View props 组装。

这就是为什么一个看似 UI 的需求很容易牵动多个行为。

### 怎么改才“优雅”，又不重蹈“GPT 过度拆文件”

**不要一口气新建十个 hook/model。**

先把同一文件里的逻辑收成 3 个清晰块即可：

```text
1. deriveRuntime()     // RecordType / Goal / Template / Period 的纯派生
2. derivePresets()     // 最近 Goal + 内容的纯查询/选择
3. session actions     // update field / switch type / select goal
```

其中能放进现有 `QuickInputEditorModel.ts` 的纯函数，优先放已有 model，不必另建新目录。

目标是让组件本体变成：

```text
读状态 -> 派生 runtime -> 绑定 action -> render
```

而不是继续把更多业务判断塞进 JSX container。

---

## C2. `QuickInputModalContent` 也是 controller 聚合点

`src/features/quickinput/modal/QuickInputModalContent.tsx`

- 文件约 349 行；
- 主函数约 **310 行**；
- 估算复杂度约 **41**。

它同时控制：

- edit / convert / duplicate；
- recurrence series；
- submit / delete；
- conflict recovery；
- task lifecycle；
- Energy direct submit；
- continuation；
- modal footer/header。

这里适合抽的不是“UI 小组件”，而是**动作 controller**：

- Task lifecycle / recurrence action；
- Energy capture action；
- recovery action。

`useQuickInputSubmitController` 已经证明这个方向是可行的，继续沿同一种模式即可。

---

## C3. `EnergyQuickCapturePanel` 状态过散

`EnergyQuickCapturePanel` 主体约 234 行，内部有多个 `useState`：

- pendingScore
- isDetailed
- brainScore
- physicalScore
- isSavingDetailed
- captureMode
- retrospectiveDate
- retrospectiveTime
- showTargetEditor

单独看每个 state 都没问题，但它们其实构成一个明确的“小状态机”。

建议用一个小 reducer 或一个本地 state object 表达：

```text
mode: quick | detailed
captureTime: realtime | retrospective
scores
saving
editingTarget
```

这样 transition 会比 9 个 setter 更容易推理。

---

# 6. Core 有两个“分支爆炸”函数

## D1. Markdown decoder

`src/core/records/codec/MarkdownRecordCodec.ts`：

- `decodeRecordContentLines()` 约 **191 行**；
- 估算复杂度约 **98**；
- 同时维护大量局部变量 + 一个很长的 `else if (key === ...)` 链。

当前仓库已经有：

- Record schema；
- Field codec；
- field contract。

说明模型基础已经具备，但 decoder 还没有完全吃到这些抽象。

### 更优雅的方向

把解析分成：

```text
universal envelope decoder
common field decoder table
Task decoder
TaskSession decoder
custom-field fallback
body decoder
```

例如用 canonical key -> decoder 的映射，而不是每增加一个字段就在 190 行函数中插一个 `else if`。

“加一个字段”理想上应该主要改 schema/codec 定义，不应该再让主 parser 的分支数继续增长。

---

## D2. `buildRecordOutputPlan()`

`src/core/recordInput/snapshot/OutputPlanner.ts`

- 主函数约 **169 行**；
- 估算复杂度约 **80**。

它同时做：

- RecordType resolve；
- Task status；
- recurrence validation；
- time normalization；
- task fields；
- custom fields；
- series creation；
- Timeline completed execution；
- TaskSession creation；
- generic draft；
- target file/header render。

建议拆成业务语义明确的纯函数：

```text
buildTaskOutput(...)
buildTaskSeriesOutput(...)
buildGenericOutput(...)
buildTargetLocation(...)
```

主 planner 只负责 dispatch。

这里的拆分是“按领域分支”，不是为了追求小文件。

---

# 7. `shared` 层并不真正 shared

当前至少 12 个 `src/shared/**` 文件直接依赖 core。

例子：

- `src/shared/ui/GroupedContainer.tsx` 依赖 `RecordViewItem` / `GroupNode`；
- `src/shared/utils/linkedTimeFields.ts` 直接使用 Task time policy；
- `src/shared/types/actions.ts` 直接知道 TaskBlock / ViewInstance / EnergyTaskExecutionStart；
- error helpers 直接依赖 `UiPort`。

### 为什么这是问题

目录名 `shared` 给人的心理模型是：

> 不知道业务领域，可被任意上层复用。

但现在其中一部分其实是 Think OS domain-aware shared code。

这会让依赖方向变模糊，也容易把“方便放这里”的代码逐渐堆进去。

### 建议

不用一次搬完。先立规则：

- `shared/ui/primitives`、纯 hooks/utils 保持不依赖 core；
- domain-aware 的 shared UI 放到 `features/views/shared`、`app/ui` 或对应 core domain；
- `linkedTimeFields` 这种 Task 规则应靠近 Task/QuickInput，而不是 shared utils。

---

# 8. 类型安全：整体可控，但有几个明显可收紧的热点

AST 静态统计：

- `any`：372；
- 类型断言：730；
- 非空断言：51。

不能只看数字判坏：Preact/Obsidian event bridge、外部数据边界出现断言很正常。

真正值得优先处理的是**核心业务文件中的 any**。

例如 `src/core/recordInput/normalization.ts:11-32`：

```ts
field: any
fields: any[]
```

但这里明明已经有 TemplateField/CaptureTemplate 类型体系。这个 `any` 会让字段语义重构失去编译器保护。

另一个例子：`RendererService` constructor 有 **11 个参数**，并且 `app: any`。它已经在内部重新组装 `Services`，说明构造参数本身可以进一步变成一个 `RendererDeps` / `Services + host deps` 对象。

### 原则

- 边界 any：允许，但集中、注释；
- domain/core any：优先消灭；
- 不要为了“0 any”去写更难读的泛型体操。

---

# 9. 有一些真正值得合并的重复规则

AST body 扫描发现多处完全/近似重复逻辑。

值得统一的例子：

- option/scalar value 读取：至少 3 处同语义实现；
- datetime normalization：至少 3 处；
- local date part：至少 2 处；
- `isRecord` / unknown record guard：重复；
- energy date ordinal / session local parts：core/energy 内重复。

这些属于**同一领域规则**，未来很可能一起变化，适合合并。

不建议合并的例子：

- pointer listener cleanup；
- 简单 JSX map wrapper；
- 3 行 `getBoundingClientRect`。

它们只是代码长得一样，抽出来反而增加跳转成本。

这就是“优雅 DRY”和“机械 DRY”的区别。

---

# 10. 副作用边界不完全一致

仓库已经有 `UiPort` / `ModalPort`，但源码仍有 **10 处 `window.confirm`**，分布在：

- QuickInput；
- GoalTemplate settings；
- dashboard layout；
- view actions。

这会造成：

- 测试要 patch global window；
- 文案/行为不统一；
- 如果未来迁移环境，feature 直接绑浏览器 API。

建议统一成一个 `confirm` capability/UiPort 方法，或者至少一个 app-level confirm helper。

同时 AST 找到 **49 个空 `catch {}`**。其中不少是 unload/cleanup、DOM best-effort，这类可以接受；但建议统一成：

```text
safeCleanup(label, fn)
```

开发模式下记录 `devWarn`，生产环境不打扰用户。这样既保留 best-effort，又不完全失去诊断能力。

---

# 11. 兼容代码 / 无入边代码已经开始积累

静态依赖图找到 3 个没有源码入边的候选：

1. `src/features/settings/tabs/EnergySettingsSection.tsx`
   - test changelog 已明确说它不是注册入口；
   - 现在仍留在正式源码。

2. `src/features/whiteboard/WhiteboardArchivePanel.tsx`
   - 源码中没有 runtime import；
   - 只在 test governance map 里出现。

3. `src/core/types/fields.ts`
   - 文件自己声明“兼容门面”；
   - runtime 没有使用，主要剩一处测试兼容导入。

这类文件最容易制造“这里是不是还在用？”的认知成本。

建议建立一个很轻的兼容清理规则：

```text
@deprecated since x.y
replacement: ...
remove-after: ...
```

到版本就删，不要无限续命。

---

# 12. CSS：体系是好的，但规模和覆盖层需要继续治理

当前：

- 85 个 CSS 文件；
- 约 10,713 行；
- 最大文件：
  - `quick-input-editor.css` 558 行；
  - `whiteboard.css` 455 行；
  - `timeline.css` 446 行。

好的一面：tokens / primitives / components / features / overrides 已经分层。

## 关于我们刚做的 QuickInput 固定高度

`quick-input-modal.css:65-68`：

```css
--think-qif-record-type-zone-height: 60px;
--think-qif-goal-zone-height: 280px;
--think-qif-fields-zone-height: 330px;
--think-qif-modal-fixed-height: 822px;
```

**这本身不算“不优雅”。**

因为它们已经是：

- 有语义名字；
- 单一 owner；
- 所有 RecordType 共用；
- 是一次测量后的 design contract，而不是每次业务计算。

真正需要避免的是：以后又在别的文件写第二套 `822/330/280` 数字。

建议补一个 layout contract E2E：切遍所有 RecordType，断言 Modal outer height 不变；展开“更多选项”时允许变高。这样这 4 个常量就成为**受测试保护的设计常量**。

## 治理预算需要核对

`test/unit/cssGovernance.test.ts:46-48` 声明预算：

- `important <= 12`
- CSS 行数 `<= 10350`
- CSS 文件 `<= 84`

当前上传快照的原始物理统计已经约为：

- 85 CSS 文件；
- 当前补丁态约 10,713 行。

但 `scripts/audit/css-audit.mjs` 不在上传包里，因此无法确认它的过滤规则。**完整仓库里应跑一次并更新预算或清理超额，不能让治理测试和真实仓库长期不同步。**

---

# 13. 测试体系很强，但也有“巨型测试文件”

优点：测试量很大，且不是只测 happy path。

但有几个文件已经很难导航：

- `test/specs/whiteboard.e2e.ts`：约 958 行；
- `test/unit/quickInputEditorModel.test.ts`：约 501 行；
- `test/unit/whiteboardStore.test.ts`：约 455 行；
- `test/unit/app/actions/recordUiActions.test.ts`：约 404 行。

建议按行为切分，而不是按实现切分，例如：

```text
quickInputEditor.defaults.test
quickInputEditor.goalSelection.test
quickInputEditor.timeDirection.test
quickInputEditor.recordTypeSwitch.test
```

这样失败信息会比一个 500 行综合测试文件清楚。

另外 `test/system/feature-test-map.json` 有约 4591 行，而且仍引用一些无 runtime 入边文件。这个 map 适合增加自动校验/生成机制，否则很容易成为“治理数据本身需要治理”。

---

# 14. 其它值得优化但不需要立刻动的地方

## RendererService 构造器参数过多

`src/app/dashboard/RendererService.ts` constructor 约有 11 个参数。

建议传：

```ts
RendererService({ host, services, timerService, store })
```

或者直接利用已有的 `Services` aggregate。

## WhiteboardStore 很大，但并非最差热点

`WhiteboardStore.ts` 约 449 行，不过大量 mutation 已经下沉到单独模块，Store 本身更多是 transaction/persistence façade。

因此它不像 `MarkdownRecordCodec` 那样需要优先拆。

真正可以改善的是：

- 部分方法压成单行，阅读体验差；
- persistence/history/mutation queue 可以在以后按 owner 拆，但不急。

---

# 15. 我不建议做的“伪优雅优化”

以下事情很容易让代码看起来工程化，实际上更难维护：

1. **为了把组件压到 100 行，给每 10 行逻辑新建一个 hook 文件。**
2. **把所有重复 3 行代码都做成 helper。**
3. **追求 0 个 `any`，结果写出复杂泛型和强制 cast wrapper。**
4. **为了“没有 magic number”重新把 QuickInput 高度做成动态公式。** 你这里的固定设计常量反而更符合需求。
5. **再造一个全局 Service/Manager 解决局部问题。**
6. **继续扩大 mega public barrel。**

真正的目标是减少“需要同时记住的概念数”。

---

# 16. 推荐优化顺序

## 第一阶段：先修结构性问题，不改产品行为

1. 加 import + re-export cycle gate；
2. 打断 core 循环；
3. 打断 `app/public` ↔ platform/features 循环；
4. 确定正式 façade 策略：模块级 `@core/*/public` 为准；
5. 更新架构文档，使其与真实依赖一致。

这是收益最大、风险相对最低的一批。

## 第二阶段：QuickInput 收敛

保持所有当前 UX 不变，只整理 controller：

- `QuickInputEditor` 抽纯派生；
- `QuickInputModalContent` 抽 task/energy/recovery action；
- Energy local state 合并；
- 为固定高度做 E2E contract。

**不要改 UI，不要顺便“重做设计”。**

## 第三阶段：Core parser / output planner

先增加 karakterization tests，再做 table-driven/refactor：

- Markdown decoder；
- OutputPlanner。

这是高价值但高风险区域，应最后动。

## 第四阶段：清理技术债

- shared domain leakage；
- dead/compat files；
- core any；
- duplicated date/scalar helpers；
- direct confirm；
- silent catch；
- large test files / governance map。

---

# 17. 建议建立的“优雅度硬规则”

不是绝对阈值，而是 PR review 触发器：

1. 新代码不得新增 import cycle；
2. feature/platform 不得 import 会反向 re-export 自己的 façade；
3. core 业务函数复杂度 > 25 时需要解释或拆分；
4. UI controller > 200 行时检查是否混合了数据派生、action 和 view；
5. core 新增 `any` 需要理由；
6. 新 `window.confirm` / Notice / filesystem API 不得出现在 domain/core；
7. 空 catch 只允许 cleanup/best-effort，并走统一 helper；
8. compatibility shim 必须写替代路径与删除条件；
9. CSS magic value 若是产品设计常量，必须命名并单点定义；
10. 抽象前先回答：“这两段代码未来必须一起变化吗？”——不是就不要 DRY。

---

# 18. 最终判断

这个仓库的主要问题不是“代码写得烂”，而是一个已经迭代较多的系统正在经历典型的第二阶段技术债：

> **原本正确的分层还在，但 public façade、兼容层、UI controller 和 schema/codec 周边已经积累到需要一次“收敛”，否则以后每个小功能都会越来越贵。**

如果只选三件事做，我建议：

1. **先打断循环依赖并重新定义 public API 边界；**
2. **再把 QuickInput 的 controller 责任收敛，但不新增大量小文件；**
3. **最后把 Markdown parser / OutputPlanner 从长分支改成 schema/strategy 驱动。**

这三件做完，代码的“优雅感”会比单纯减少行数、统一格式、删几个 `any` 明显得多。
