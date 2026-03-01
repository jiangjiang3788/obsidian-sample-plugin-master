# docs/audit-tree-selectors.md

> 基于仓库（`obsidian-sample-plugin-split-timeline-step3`）对“主题/树状选择（Theme/Tree Selector）”相关 UI 的全仓扫描与迁移建议。

## 1. 目标

将仓库中重复出现的：
- 主题选择（Theme）
- 树状/层级选择（Tree / Hierarchy）
- 多层级 RadioGroup / Checkbox Tree
- 展开/折叠 + 搜索 + 选择子树

抽象为 **可复用的纯 View 组件**（props 驱动，不读 store、不触 ports、不做副作用），并在至少 3 处落地复用，达到：
- 重复代码减少 ≥ 30%
- 后续修改（Effect 系统、takeLatest/Abort、DataStore 拆分）时 UI 层更稳定、更易维护

---

## 2. 扫描方法（可复现）

在 repo 根目录执行（PowerShell/Git Bash 均可）：

1) 主题/树状选择关键词：
- `Theme|themes|Tree|tree|RadioGroup|Checkbox|expanded|collapse|expand|children|indent|level`

2) 递归渲染与层级缩进：
- `children.map` / `render.*Node` / `paddingLeft|marginLeft|level|depth`

3) 主题数据入口：
- `inputSettings.(themes|blocks|overrides)`
- `buildThemeTree|buildThemeMatrixTree|buildThemePathTree`

---

## 3. 现有“可复用”资产（优先复用而不是再造一套）

### 3.1 `ThemeTreeSelect`（已存在的统一组件）
- 文件：`src/shared/components/ThemeTreeSelect.tsx`
- 子组件：`src/shared/components/ThemeTreeSelect/*`
- 支持能力（已实现）：
  - 单选/多选
  - 搜索过滤
  - 展开/折叠
  - 展开到已选节点（expandToSelected）
  - 选择节点时可选择整棵子树（multiSelect 模式下已实现 descendantPaths 逻辑）
  - chips 展示已选路径

**结论**：对“需要下拉/面板式选择”的场景，可以优先把重复实现替换为 `ThemeTreeSelect`。

---

## 4. 重复实现清单（命中点）

> 下面按“复用潜力 / 迁移难度 / 推荐策略”给出可执行清单。建议 Pro 逐个按策略迁移。

### A. 高优先级（复用潜力高，推荐第一轮就做）

#### A1. ThemeFilter（主题筛选：checkbox tree + 展开折叠）
- 文件：`src/shared/ui/views/ThemeFilter.tsx`
- 当前实现：
  - `buildThemeMatrixTree` 生成树
  - 本地维护 `expandedNodes`
  - 递归渲染节点（indent = level * 16）
  - 折叠状态下点击可“选择整棵子树”
- 问题：
  - 与 `ThemeTreeSelect` 的多选子树能力高度重叠
  - 递归渲染/展开逻辑重复
- 推荐替换策略：
  - 在 `FilterPopover` 内直接用 `ThemeTreeSelect` 的 **multiSelect** 模式
  - `selectedThemes` 直接映射为 `selectedPaths`
  - 保留 `FilterPopover` 的 chips/clear/selectAll 逻辑
- 迁移难度：中（主要是 UI 形态从 checkbox list → tree select 面板；如果要保持 checkbox 形态，则需要抽一个 TreeCheckbox 组件）

#### A2. AI Chat FiltersBar 的主题过滤
- 文件：`src/features/aichat/components/FiltersBar.tsx`
- 当前实现：已引用 `ThemeTreeSelect`
- 建议：
  - 把此处当作“参考实现”，作为其他模块迁移的对齐基准

### B. 中优先级（可抽公共 Tree 组件，第二轮做）

#### B1. QuickInputEditorThemeSelector（多层级横向 RadioGroup）
- 文件：`src/app/ui/components/QuickInputEditorThemeSelector.tsx`
- 当前实现：
  - 多层级 `MuiRadioGroup row` + 递归 `renderThemeLevels`
  - 用 `activePath` 渲染“层级面包屑式选择”
- 特点：
  - UI 形态与 `ThemeTreeSelect` 不同（不是下拉列表，而是“多级联动 radio”）
- 推荐策略（两选一）：
  1) **保留 UI 形态**：抽一个通用 `CascadedRadioLevels`（纯 View）
     - 输入：`nodes + activePath + onSelect`
     - 输出：多级水平 radio + 下一层缩进
  2) **统一交互**：用 `ThemeTreeSelect (singleSelect)` 替代（风险更高，可能影响习惯）

#### B2. QuickInputEditor.tsx 内部的 themeTree 构建与 path 查找
- 文件：`src/app/ui/components/QuickInputEditor.tsx`
- 命中：`findNodePath(...)` + `buildThemeTree(...)`
- 推荐策略：
  - 抽 helper：`shared/themeTree/`（纯函数）
  - 让 QuickInput/ThemeFilter/ThemeMatrix 统一走同一套“树构建 + path 查找”工具（即使 UI 组件不同）

### C. 长线（重构收益大，但变更面也大，建议第三轮再动）

#### C1. ThemeMatrix 系列（表格 + 树节点行递归）
- 文件：
  - `src/features/settings/ThemeMatrixView.tsx`
  - `src/features/settings/ThemeTable.tsx`
  - `src/features/settings/ThemeTreeNodeRow.tsx`
- 当前实现：
  - 通过 `buildThemeMatrixTree(...)` 生成带 `level/expanded` 的树
  - `ThemeTreeNodeRow` 递归渲染子节点
  - 表格/行内动作很多（启用/禁用/批量等）
- 推荐策略（分两步，避免一次性大改）：
  1) **先抽 TreeRow 渲染骨架**（纯 View）：缩进、展开按钮、行容器
  2) 再把 ThemeMatrix 的“节点行动作”作为 render props 注入

---

## 5. 建议的抽象形态（组件库形态）

> 目标是“减少重复”，而不是“统一所有 UI 形态”。因此建议两条线并行：

### 线 1：复用 `ThemeTreeSelect`（下拉/面板式 tree select）
适用：ThemeFilter、AI Chat FiltersBar、任何需要“搜索+多选+chips”的地方。

### 线 2：抽一个通用 Tree View 基座（不绑定 Theme）
建议新建（纯 view）：`src/shared/ui/components/tree/`

- `TreeNode<T>` 类型（通用）
- `TreeList`（递归渲染基座：indent/expand/collapse）
- `TreeCheckboxList`（多选）
- `CascadedRadioLevels`（QuickInputEditor 这种多级水平 radio）

这样：
- ThemeMatrix 可以复用 TreeList 的“节点行骨架”
- ThemeFilter 若不想改交互也可复用 TreeCheckboxList
- QuickInputEditor 复用 CascadedRadioLevels

---

## 6. 分轮迁移计划（Pro 可按轮交付）

### Round 1（低风险，高收益）
目标：**立刻减少重复实现 1~2 处**，且不影响用户使用习惯太多。

- [ ] 产出审计清单（本文件完善为“可执行任务列表”，加上 LOC/截图/交互备注）
- [ ] ThemeFilter → 复用 `ThemeTreeSelect`（multiSelect）或抽 `TreeCheckboxList`（二选一）
- [ ] 补 1 个 smoke test（mount/unmount + onChange 不报错）

验收：
- 至少 2 处复用（AI Chat 已用 + ThemeFilter 新用）
- build/gate/test 通过

### Round 2（QuickInputEditor 线）
- [ ] 抽 `CascadedRadioLevels`（纯 view）
- [ ] QuickInputEditorThemeSelector 改为用 `CascadedRadioLevels`
- [ ] 抽 `themeTree helpers`（find path / build tree / filter）

验收：
- QuickInputEditor 交互一致
- 旧递归渲染函数删除

### Round 3（ThemeMatrix 线）
- [ ] 抽 `TreeRow` / `TreeTableRow` 基座（indent + expand button + row layout）
- [ ] ThemeTreeNodeRow 改为 render props 注入动作区域

验收：
- ThemeMatrix 行为一致
- ThemeTreeNodeRow 文件 LOC 下降明显（只做通用骨架）

### Round 4（收尾与防回归）
- [ ] 全仓替换剩余重复树渲染
- [ ] 可选：加门禁 `tree-selector-dup-gate.mjs`（禁止新增“手写递归树渲染”模式）

---

## 7. Pro 能不能一次性做完？

**技术上可以，但不建议**。

- 一次性做完意味着同时改：ThemeFilter + QuickInputEditor + ThemeMatrix（三条线），回归面很大。
- 建议 **至少拆成 2～3 轮**（Round 1/2/3），每轮都保证 `build/gate` 通过并可回滚。

如果你强制“一次性做完”，建议把范围限定为：
- 只做“线 1：ThemeTreeSelect 复用” + “线 2：CascadedRadioLevels 抽取”，**先不碰 ThemeMatrix**。

---

## 8. 交付物清单（交给 Pro 的要求）

- `docs/audit-tree-selectors.md`（更新为最终版：每个命中点补全“用途/交互/策略/风险/负责人”）
- 新增组件：
  - `src/shared/ui/components/tree/*`（如采纳线 2）
  - 或对 `ThemeTreeSelect` 进行轻量增强（如 ThemeFilter 需要额外能力）
- 至少 2 处落地复用（Round 1 最低要求）
- build/gate/test 全通过

[C]deepseek-v3-2-251201
[C]glm-4-7-251222
[C]gpt-5
[C]gpt-5.1
[C]gpt-5.2
[C]kimi-k2-thinking-251104
[C]kimi-k2.5
[cc]claude-sonnet-4.6
[cc]gemini-3.0-flash
[cc]gpt-5.1-codex-mini
[D]glm-5
[High]deepseek-v3.1-terminus
[High]deepseek-v3.2
[High]glm4.7
[High]gpt-oss-120b
[High]kimi-k2-instruct-0905
[High]kimi-k2-thinking
[High]minimax-m2
[High]minimax-m2.1
[High]qwen3-next-80b-a3b-thinking
[i]claude-opus-4.6
[i]gemini-2.5-flash
[i]gemini-3.1-pro-preview
[i]gpt-5.2
[k]claude-sonnet-4
[k]claude-sonnet-4-thinking
[k]claude-sonnet-4.5
[k]claude-sonnet-4.5-thinking
[L]deepseek-v3.1-terminus
[L]kimi-k2-instruct-0905
[L]minimax-m2
[L]mistral-large-3-675b-instruct-2512
[Max]gemini-2.5-pro
[Max]gemini-2.5-pro-maxthinking
[Max]gemini-2.5-pro-nothinking
[Max]gemini-2.5-pro-search
[Max]gemini-3-flash-preview
[Max]gemini-3-flash-preview-search
[Max]gemini-3-pro-preview
[Max]gemini-3-pro-preview-maxthinking
[Max]gemini-3-pro-preview-nothinking
[Max]gemini-3-pro-preview-search
[Max]gemini-3.1-pro-preview
[Max]gemini-3.1-pro-preview-maxthinking
[Max]gemini-3.1-pro-preview-nothinking
[Max]gemini-3.1-pro-preview-search
[R]claude-opus-4-6
[R]claude-opus-4-6-thinking
[R]claude-sonnet-4-6
[R]gemini-3.1-pro-preview-high
[R]gemini-3.1-pro-preview-low
[时间卡CoCo]gemini-3-pro-preview
[时间卡CoCo]gemini-3-pro-preview-maxthinking
[时间卡CoCo]gemini-3.1-pro-preview
[时间卡M]gemini-2.5-pro
[时间卡M]gemini-2.5-pro-maxthinking
[时间卡M]gemini-2.5-pro-maxthinking-search
[时间卡M]gemini-2.5-pro-nothinking
[时间卡M]gemini-2.5-pro-nothinking-search
[时间卡M]gemini-2.5-pro-preview-06-05
[时间卡M]gemini-2.5-pro-search
[时间卡M]gemini-3-pro-preview
[时间卡M]gemini-3-pro-preview-maxthinking
[时间卡M]gemini-3-pro-preview-nothinking
[时间卡M]gemini-3-pro-preview-search
[时间卡M]gemini-3.1-pro-preview
[时间卡M]gemini-3.1-pro-preview-maxthinking
[时间卡M]gemini-3.1-pro-preview-nothinking
[时间卡O]gemini-2.5-pro
[时间卡O]gemini-2.5-pro-maxthinking
[时间卡O]gemini-2.5-pro-nothinking
[时间卡O]gemini-2.5-pro-preview-06-05
[时间卡O]gemini-2.5-pro-preview-06-05-maxthinking
[时间卡O]gemini-2.5-pro-preview-06-05-nothinking
[时间卡O]gemini-2.5-pro-preview-06-05-search
[时间卡O]gemini-2.5-pro-search
[时间卡O]gemini-3-pro-high
[时间卡O]gemini-3-pro-low
[时间卡O]gemini-3.1-pro-preview
[时间卡O]gemini-3.1-pro-preview-maxthinking
[时间卡O]gemini-3.1-pro-preview-nothinking
[时间卡X]claude-opus-4-6
[时间卡X]claude-opus-4-6-thinking
[时间卡X]gemini-2.5-pro
[时间卡X]gemini-3-pro-preview
[渠道2]gemini-2.5-flash-preview-09-2025
[渠道2]gemini-2.5-pro
doubao-seed-2-0-pro-260215