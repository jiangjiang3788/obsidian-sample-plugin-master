# Think OS 1.4.0 实施计划

## 版本主题

**Record Presentation Contract + Whiteboard Visual Cleanup + Documentation Convergence**

本版不是针对单个 Whiteboard 截图打补丁，而是修复“Record 如何被人看到”缺少单一 owner 的系统根因，同时收敛 Whiteboard 的日常视觉噪音与 UI preference 生命周期，并完成 `doc/` → `docs/` 文档治理。

## 一版能完成多少

1.4.0 作为一个正式版本，可以完整完成下面 A～H 八个模块，因为它们共享同一个根因：**展示语义与 View 表现边界没有被明确分层**。这些改动可以通过同一套 F153 测试合同验证，因此适合在一个版本内闭环。

本版**不纳入**两类不同根因的问题：

- 9000 条 Record 的超大白板性能/安全恢复；
- 27 寸/16:9 的宽屏平衡自动布局。

前者属于渲染/容量治理，后者属于布局算法。把它们塞入 1.4.0 会让发布边界不可验证，应进入后续独立版本。

## 总计划表

| 编号 | 模块 | 当前根因 | 1.4.0 系统性实施 | 验收标准 | 优先级 |
|---|---|---|---|---|---|
| A | Record Type 顺序 | Schema 数组、中文排序、View 局部数组并存 | Core 建立唯一 `RecordTypePresentationRegistry` / comparator | 11 类型枚举、筛选、按类型分组、Whiteboard 类型轴均按固定顺序 | P0 |
| B | Record Type 颜色 | Whiteboard/CSS/View 各自映射且多类型共色 | 建 11 个全局 semantic color token；`data-record-type` 统一解析 | 同一类型跨界面同色；11 类型 token 唯一；Category 不被吞并 | P0 |
| C | 主显示值 | `title || content || type` fallback 散落在不同 View | Field Foundation 新增派生字段 `primaryText`（UI：主显示值），11 类型穷举 resolver | 精力/打卡/任务工作块无标题有自然值；真实 `title` 不被修改 | P0 |
| D | View 字段自治 | “智能 fallback”可能覆盖用户字段选择 | 明确 `ViewInstance.fields > View 默认 > Presentation 默认` | 用户选 `title` 时空标题保持空；只有选 `primaryText` 才启用类型感知展示 | P0 |
| E | Whiteboard 卡片视觉 | 类型文字、Goal、时间、操作按钮竞争信息位 | 左上 Goal、右上时间、主体 primaryText、6px 类型色条 | 卡片无需常驻类型文字仍可识别；信息层级稳定 | P1 |
| F | Whiteboard 低频动作 | 每张卡永久“归档/移出”，大量记录时形成视觉噪音 | 移到右键菜单；移出继续支持拖回 Record Source | 卡片无常驻归档/移出；动作仍可达；多选动作可用 | P1 |
| G | Grid / 左栏状态 | Grid 永久显示；左栏折叠为组件本地 state，remount 可复位 | 建独立 Whiteboard UI Preferences；grid 默认关闭，source 折叠持久 | Pan/Zoom/拖动/重挂载不改变偏好；仅用户操作改变 | P0 |
| H | 文档治理 | `doc/`、`docs/`、根目录历史文档三套位置 | 只保留 `docs/`；历史进 `docs/history/`；版本证据进 `docs/releases/1.4.0/`；Gate 阻止回归 | `doc/` 不存在；根除 README 外无散落 md/txt；release docs 完整 | P0 |

## 全局 Record Type 合同

唯一展示顺序：

```text
任务 → 任务工作块 → 任务系列 → 精力 → 打卡 → 事件 → 思考 → 总结 → 计划 → 阻碍项 → 里程碑
```

内部 canonical key：

```text
task → task-session → task-series → energy → habit → evidence → thought → review → plan → blocker → milestone
```

规则：

1. 这个顺序只在“枚举/比较 Record Type”时生效。
2. 用户主动设置按日期、标题、评分等排序时，不得被类型顺序覆盖。
3. `categoryKey` 是 Category，不因值与类型中文名相似就共享类型排序/颜色。
4. 类型名称仍由 Record Schema 提供，Presentation Registry 不复制一份中文名称真源。

## 主显示值合同

`title` 与 `primaryText` 必须分开：

| 情况 | `title` | `primaryText` |
|---|---|---|
| 有真实标题 | 原标题 | 原标题 |
| Energy 无标题、有 score | 空 | `精力 65` |
| Habit 无标题、有正文 | 空 | 正文 |
| Habit 无标题、有 rating | 空 | `打卡 · 评分 4` |
| TaskSession 无标题、有正文 | 空 | 正文 |
| TaskSession 无标题、有时长 | 空 | `任务工作块 · 120 分钟` |
| 其他文本型 Record 无标题、有正文 | 空 | 正文 |
| 完全无可读值 | 空 | Record Type schema label |

`primaryText` 是派生 Field：不落 Markdown、不改 Record、可被 View 选择、可作为某些 View 的默认 identity 字段。

## View 字段优先级

```text
用户显式 ViewInstance.fields
    > View 自己的默认 fields
    > 通用 Record Presentation 默认
```

因此“不同 View 设置显示字段”与全局 Presentation **不冲突**：Core 只回答“这条 Record 的主识别值是什么、类型是什么”；View 决定“显示哪些字段、放在哪里”。

## Whiteboard 卡片合同

默认信息层级：

```text
Goal                                  时间
primaryText
secondary content / details（有需要才显示）
```

Record Type 使用左侧 6px semantic rail，不占据左上主要文字位置。Archive/Move 不常驻卡片 footer，进入右键/拖拽渐进披露。

## UI preference 合同

`gridVisible`、`sourceCollapsed` 是 UI chrome preference，不属于 `Think/whiteboards.json` 的 Whiteboard 业务状态。

- Grid 默认关闭；用户可在工具栏打开/关闭。
- Source Panel 的关闭状态跨 Workspace remount 保留。
- Pan、Zoom、拖卡片、Arrange、进入/退出 Workbench、Undo/Redo 都不得主动展开 Source Panel。
- 只有用户点击展开按钮才改变 collapsed 状态。

## 文档目录合同

```text
README.md                         # 唯一根入口
docs/
  README.md
  ARCHITECTURE.md
  RECORD_MODEL.md
  TESTING_RELEASE.md
  CSS_DESIGN_SPEC.md
  DEVELOPMENT_GUARDRAILS.md
  DOCUMENT_GOVERNANCE.md
  UI_REDESIGN_PLAN.md
  releases/1.4.0/
    PLAN.md
    IMPLEMENTATION_RESULT.md
    TEST_REPORT.md
  testing/
  reports/
  history/
```

旧 `doc/` 禁止重新出现。

## 测试与发布策略

F153 风险级别：P1；要求 unit + ui + regression 三维证据。

重点回归：

- 11 类型顺序精确一致；
- 11 semantic color token 唯一；
- 中文/namespace aliases 归一到同一 type identity；
- 11 类型无标题均有明确 primaryText 策略；
- `title` 与 `primaryText` 不互相伪装；
- Whiteboard 语义布局类型轴消费全局顺序；
- Card 不再常驻 Archive/Move；右键动作仍然可用；
- Grid 默认 off 且可持久；Source collapsed remount 后仍保持；
- Docs gate 阻止 `doc/` 和根散落版本文档回归。

## Definition of Done

1. F153 进入 feature-test-map，所有 required evidence 完整；
2. 静态测试体系 syntax/language/evidence/surface/strict-p2 全绿；
3. product/architecture/records/task-session/energy/ui-runtime 等可离线 Gate 全绿；
4. `doc/` 被真实合并进 `docs/history/`；
5. package/manifest/lock 同步为 1.4.0；
6. 只交付完整 SOURCE，不制作 PATCH；
7. 如果运行环境缺依赖，Jest/Typecheck/Vite/Obsidian E2E 明确记录为“未执行”，绝不写成通过。
