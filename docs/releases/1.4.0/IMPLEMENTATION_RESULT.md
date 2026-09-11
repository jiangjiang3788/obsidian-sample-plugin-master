# Think OS 1.4.0 Implementation Result

## 版本结论

Think OS 1.4.0 已完成 **Record Presentation Contract + Whiteboard Visual Cleanup + Documentation Convergence** 的源码实施。

这不是在 Whiteboard 上继续叠加局部判断，而是把“Record 类型如何排序/着色、无自然标题时如何产生可读主值、View 如何保留自己的字段配置”拆成明确层级，并将原先分散在 Whiteboard、筛选器、Goal Template、Progress 等位置的 Record Type 展示规则收敛到 Core 单一真源。

本版不改变 Canonical Record 持久化格式，不修改 `Think/whiteboards.json` schema，也不为 `primaryText` 写入 Markdown。

## 完成范围

| 模块 | 实施结果 | 状态 |
|---|---|---|
| A. Record Type 顺序 SSOT | 新增 Core presentation registry / comparator，统一类型枚举与按类型分组顺序 | 完成 |
| B. Record Type 颜色 SSOT | 11 个唯一 semantic color token；消费方通过 `data-record-type` 获取统一颜色 | 完成 |
| C. 主显示值 | 新增派生 Field `primaryText` / “主显示值”，11 类型有穷举 resolver | 完成 |
| D. View 字段自治 | 明确 `用户 fields > View 默认 > Presentation 默认`；真实 `title` 不被 fallback 偷换 | 完成 |
| E. Whiteboard 卡片层级 | 左上 Goal、右上时间、主体 primaryText、6px 类型色条 | 完成 |
| F. Whiteboard 低频动作 | 普通卡片取消常驻“归档/移出”；动作转入右键菜单，移出仍支持拖回 Record Source | 完成 |
| G. Grid / Record Source 偏好 | 独立 local UI preference；Grid 默认关闭；左栏折叠跨 remount 保持 | 完成 |
| H. 文档治理 | `doc/` 全部并入 `docs/`，历史材料归档，Gate 禁止旧目录/根散落文档回归 | 完成 |

## 1. Record Type Presentation Contract

### 唯一顺序

全局 Record Type 展示顺序固定为：

```text
任务 → 任务工作块 → 任务系列 → 精力 → 打卡 → 事件 → 思考 → 总结 → 计划 → 阻碍项 → 里程碑
```

Canonical keys：

```text
task → task-session → task-series → energy → habit → evidence → thought → review → plan → blocker → milestone
```

新增 `src/core/recordTypes/presentation.ts`，提供：

- `RECORD_TYPE_PRESENTATION_ORDER`
- `RECORD_TYPE_PRESENTATION_REGISTRY`
- `normalizeRecordTypePresentationKey()`
- `getRecordTypePresentation()`
- `getRecordTypePresentationOrder()`
- `compareRecordTypeKeys()`
- `sortRecordTypesByPresentation()`

Record Schema 继续拥有类型中文名称；Presentation Registry 只拥有 **展示顺序与颜色 identity**，避免两套中文名称真源。

### 已收敛的主要消费者

- Record Type runtime registry / Quick Input 可见类型；
- Whiteboard Record Source 类型筛选；
- Whiteboard `目标 × 类型 × 时间` 的 Type 轴；
- View Common Filter / Rule Builder 的 `coreBlock` 值列表；
- Goal Template 类型矩阵与复制逻辑；
- Settings Record Type 列表；
- Progress 视图类型 breakdown；
- 通用 `coreBlock` FieldPill / Record Type 切换与标识。

用户主动配置“按日期/评分/标题”等排序仍拥有更高优先级；全局顺序只负责 **Record Type 自身的枚举/比较语义**。

### Category 边界

`categoryKey` 没有被并入 Record Type。

1.4.0 明确：

- `coreBlock` → Record Type presentation order / color；
- `categoryKey` → 独立 Category/path 顺序与颜色；
- 两者即使中文文字相同，也不共享 owner。

## 2. 统一类型颜色

新增 11 个全局 semantic token，light/dark theme 各自有对应值：

```text
--think-record-type-task
--think-record-type-task-session
--think-record-type-task-series
--think-record-type-energy
--think-record-type-habit
--think-record-type-evidence
--think-record-type-thought
--think-record-type-review
--think-record-type-plan
--think-record-type-blocker
--think-record-type-milestone
```

新增 `src/styles/components/record-type.css`，所有需要表现 Record Type accent 的界面以 `data-record-type` 消费同一 token；不再允许 Whiteboard 自己维护另一套类型配色。

Whiteboard 普通卡片、Record Source、Archive card 与低倍率 Card locator 均复用这一套 semantic color identity。

## 3. `primaryText`：显示值与真实标题分离

新增：

- `src/core/fields/RecordPrimaryText.ts`
- Field Registry 派生字段：`primaryText`，UI 名称“主显示值”
- Field Resolver 对 `primaryText` 的统一解析

关键合同：

```text
title = 数据本身是否真的有标题
primaryText = 这个 Record 在有限 UI 中最适合被人识别的代表值
```

### 主要规则

- 有真实 title → primaryText 使用真实 title；
- Energy 无 title → 例如 `精力 65`；
- Habit 无 title、有正文 → 正文；
- Habit 无 title、只有 rating → 例如 `打卡 · 评分 4`；
- TaskSession 无 title、有正文 → 正文；
- TaskSession 无 title、只有时长 → 例如 `任务工作块 · 120 分钟`；
- 其他文本型 Record 无 title → content；
- 完全无可读值 → Record Type schema label。

11 个 canonical Record 类型都在一个穷举 resolver 表中声明，新增 Record Type 时如果没有接 presentation policy，不应靠某个 View 临时猜。

`primaryText` 是 **derived field**：不写回 `item.title`、不写 Markdown、不改变 Record schema。

## 4. View Display Fields 不被统一展示合同覆盖

1.4.0 保留已有 `ViewInstance.fields` 与 `normalizeDisplayFields()` 体系。

优先级明确为：

```text
用户显式 ViewInstance.fields
    > 当前 View 的默认 fields
    > 通用 Record Presentation 默认
```

因此：

- 用户明确选择 `title` → 就读取真实 title，空标题保持空；
- 用户选择 `primaryText` → 才启用类型感知代表值；
- 用户明确配置其他字段 → Presentation 不自动插字段、不重排用户 fields。

`primaryText` 已加入 View Field picker，成为可以主动选择的正式字段，而不是藏在 View 内部的 fallback 技巧。

通用 identity surface（例如没有显式字段语义的 ItemLink）可以消费 primaryText；有明确字段配置的 View 必须尊重自己的配置。

## 5. Whiteboard Visual Cleanup

### 普通卡片

新的默认阅读层级：

```text
Goal                                  时间
primaryText
secondary content / details（有值才显示）
```

变化：

- 左上从 Record Type 改为 Goal；
- 右上保留时间；
- 主体改用 `primaryText`；
- 左侧类型色条加宽为 6px；
- Record Type 文字不再占用卡片最宝贵的信息位置，但仍可通过颜色/tooltip/字段界面识别；
- 常驻“归档 / 移出” footer 从普通卡片移除。

### 低频动作

普通卡片右键菜单新增/保留：

- 移出工作台（有 Workbench 归属时）；
- 归档 / 批量归档；
- 移出白板 / 批量移出。

“移出白板”继续支持拖回左侧 Record Source，Record 本体不删除。

Archive 工作台中的“恢复到原位置”属于当前上下文核心动作，因此仍保留。

## 6. Grid 与左侧 Record Source 生命周期

新增 `src/features/whiteboard/WhiteboardUiPreferences.ts`。

独立 UI preference：

```ts
gridVisible: boolean
sourceCollapsed: boolean
```

存储 key：

```text
think-whiteboard-ui-preferences-v1
```

合同：

- Grid 默认 `off`；工具栏可主动切换；
- 关闭 Grid 只隐藏背景网格，不删除 Whiteboard Grid/geometry 能力；
- Source Panel 折叠状态不再只是 Workspace 本地 `useState(false)`；
- Workspace remount 后偏好仍保持；
- Pan、Zoom、拖动、Arrange、Workbench、History 不拥有“重新展开左栏”的写权限；
- 只有用户主动点击折叠/展开按钮才能改变该 preference。

这些 UI preference 不进入 `Think/whiteboards.json`，避免把个人视觉 chrome 与 durable Whiteboard 数据混为一谈。

## 7. 文档治理：`doc/` → `docs/`

1.3.7 SOURCE 中旧 `doc/` 共 **66 个文件**，已全部搬入 `docs/history/whiteboard/releases/`，随后删除 `doc/`。

同时完成：

- 根目录旧 Whiteboard baseline/result → `docs/history/whiteboard/legacy-root/`；
- 根目录 PATCH/安装说明 `.txt` → `docs/history/packaging/`；
- `docs/` 根层旧版本过程文档 → `docs/history/whiteboard/legacy-docs-root/`；
- 交接/历史材料 → `docs/history/`；
- 当前 release 证据 → `docs/releases/1.4.0/`。

项目根现在只保留 `README.md` 作为文档入口；`docs/` 根层 active truth 控制为 8 个 Markdown 文档。

`docs-governance-gate` 已增强，后续会直接拒绝：

- 重新出现 `doc/`；
- 根目录散落版本 `.md/.txt`；
- 缺少当前 `docs/releases/<version>/PLAN.md`、`IMPLEMENTATION_RESULT.md`、`TEST_REPORT.md`。

## 8. 发布/工程治理

版本已同步：

```text
package.json       1.4.0
manifest.json      1.4.0
package-lock.json  1.4.0
```

补齐 `.github/workflows/ci.yml`，CI 入口执行 `npm ci`、`npm run verify:ci`、`npm run build:release`。

项目根新增标准 `README.md`，所有实质文档仍只进入 `docs/`。

## 9. 数据兼容性

本版不需要 Whiteboard/Record 数据迁移：

- 无 Record schema 变化；
- 无 Whiteboard store schema 变化；
- `primaryText` 为运行时派生值；
- UI preference 使用独立 localStorage；
- 现有 View 显式字段配置不被自动重写；
- 现有 `title` 原值不被修补或生成。

## 10. 本版明确不做

以下问题保留为后续独立版本，不与 Presentation 重构混在一起：

1. **Large-board Safety**：9000 条 Record 极限加入导致的容量保护、虚拟化/聚合、安全恢复；
2. **Readable Wide Layout**：27 寸/16:9 阅读安全区、组内自动换行、避免超长单行的平衡布局算法。

这两项分别属于性能架构与布局算法，应拥有自己的指标、测试和回滚边界。

## 11. 主要新增/修改文件

Core：

- `src/core/recordTypes/presentation.ts`
- `src/core/recordTypes/registry.ts`
- `src/core/fields/RecordPrimaryText.ts`
- `src/core/fields/FieldRegistry.ts`
- `src/core/fields/FieldValueResolver.ts`
- `src/core/utils/itemGrouping.ts`
- `src/features/views/runtime/ProgressViewModel.ts`

Whiteboard：

- `src/features/whiteboard/WhiteboardRecordPresentation.ts`
- `src/features/whiteboard/WhiteboardCard.tsx`
- `src/features/whiteboard/WhiteboardContextMenu.tsx`
- `src/features/whiteboard/WhiteboardContextMenuController.ts`
- `src/features/whiteboard/WhiteboardUiPreferences.ts`
- `src/features/whiteboard/WhiteboardWorkspace.tsx`
- `src/features/whiteboard/WhiteboardBoardTools.tsx`
- `src/features/whiteboard/WhiteboardSemanticOverviewLayer.tsx`

Styles：

- `src/styles/tokens/data-colors.css`
- `src/styles/components/record-type.css`
- `src/styles/features/whiteboard.css`
- `src/styles/features/whiteboard-semantic-zoom.css`
- `src/styles/features/whiteboard-archive.css`

Governance：

- `scripts/gates/checks/docs-governance-gate.mjs`
- `test/system/feature-test-map.json`（新增 F153）
- `docs/releases/1.4.0/*`
