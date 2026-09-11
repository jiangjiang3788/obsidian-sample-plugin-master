# Whiteboard 1.2.4 Implementation Result

## 状态

**1.2.0–1.2.4 coherent batch：代码完成 / 待用户真机验收。**

本批次不是一次性跨多个无关模块，而是把同一条“复杂白板结构可安全编辑”的依赖链闭环：先 Undo/Redo，再 Nested Workbench，再 Annotation / Edge Label，最后 Context Menu / Arrange。

## 1.2.0 — Undo / Redo

- `WhiteboardStore` 新增 ephemeral history past/future，最大 100 个 snapshot；
- 新 mutation 进入 history，redo 在新 mutation 后清空；
- Undo/Redo 持久化目标 snapshot 后更新内存；
- Ctrl/⌘+Z、Ctrl/⌘+Shift+Z；编辑控件内不抢原生文本撤销；
- 顶部新增撤销/重做按钮；
- history 不写盘、不跨重启。

## 1.2.1 — Nested Workbench / Fullscreen Canvas

- `WhiteboardGroup.parentGroupId?`；最大深度 4；
- schema 拒绝 dangling parent、cycle、depth overflow；
- Workbench `⛶ 全屏`进入与根白板相同 viewport 的 child canvas；
- breadcrumb 支持根白板 / 祖先跳转 / 返回上一级；
- nested canvas 内继续创建 Workbench；
- Workbench 可 reparent 到其他 Workbench，禁止自身/descendant cycle；
- 移动父 Workbench 时 descendant groups、active/archived items、annotations 一次原子平移；
- Find 可 reveal 到目标所属子画布。

### 坐标决策

为了保持 1.1.9 `whiteboards.json` 向后兼容，本批次没有把既有 durable XY 强制迁移为 parent-local coordinate。

当前采用：**absolute world XY + parentGroupId + atomic subtree translate**。

对最大 4 层嵌套足够稳定，也避免破坏性数据迁移。若以后真实深层/大数据性能证明需要，再单独设计 local-coordinate migration。

## 1.2.2 — Spatial Annotation

- 新增 durable `annotations?`；
- `text / sticky` 两类；
- 双击空白创建 Text；右键空白可创建 Text/Sticky；
- inline 编辑、拖动、删除；
- annotation 可归属 Workbench，随父层移动；
- 不创建 canonical Record，不引入富文本编辑器。

## 1.2.3 — Edge Label

- `WhiteboardEdge.label?`，最长 200；
- Edge 中点可直接 `+ 标注` / 编辑现有 label；
- Enter/blur 保存，Escape 取消，空文本删除 label；
- Archived edge 原样保留 label；
- 不引入预定义 Edge Type。

## 1.2.4 — Context Menu / Arrange

右键 selection：
- 网格整理；
- 按连线整理；
- 左对齐；
- 顶部对齐；
- 水平等距；
- 垂直等距；
- 用所选创建工作台。

右键空白：
- 添加文字标注；
- 添加便签；
- 新建工作台；
- 回到当前画布中心 · 100%。

Arrange 只使用确定性模型；graph layout 只消费 selection 内已有 directed Edge，不猜关系。布局通过一次 `moveItems()` mutation 提交。

“用所选创建工作台”通过 `createGroupFromItems()` 单次 Store mutation 完成，因此一次 Undo 即可恢复。

## 兼容性

- 插件版本：`1.2.4`；
- `whiteboards.json version`：仍为 `1`；
- 新增字段均 optional；1.1.9 文件无需强制 migration；
- canonical Record / RecordQuery / DataStore 真源语义未改变；
- 1.1.5 world/camera/screen、1.1.8 R2 Ctrl/Cmd marquee、四边 drag-to-connect、1.1.9 Archive/Restore 与“回中心 + 100%”继续保留。

## 测试证据

新增/扩展 F139–F141 以及 Nested Workbench / History 相关测试证据，覆盖：
- schema / Store / persistence / restart；
- nested depth/path/cycle/reparent；
- Annotation UI / persistence；
- Edge Label UI / persistence；
- Arrange model；
- Context Menu UI；
- selection → Workbench atomic mutation；
- Obsidian E2E 路径声明。

最终可执行审计 PASS：
- `test:syntax`；
- `test:language`；
- `test:evidence`（108 features）；
- `test:surface`；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`。

Whiteboard 相关 243 个 TS/TSX/MTS 文件额外 transpile 扫描：**0 error**。

## 基线同红项

Untouched 1.1.9 与 1.2.4 对照后完全相同：
- Quality：explicit-any budget 已在基线超限；
- Stability：仓库缺 `.github/workflows/ci.yml`；
- Product：同一 CI / README release-contract 缺口。

1.2.4 没有新增这些红项。

## 未能真实执行

源码包没有 `node_modules`，实际尝试结果：
- `npm test`：提示 Jest 未安装；
- `npm run typecheck`：TS2688 缺 `node / preact / vite/client` types；
- `npm run build`：`vite: not found`；
- Obsidian E2E：无 build/真实 Obsidian 环境，未执行。

这些项目不标记为 PASS。

## 下一步

**1.2.5：Nested Navigation Polish**：Back/Forward、Fit current Workbench/content、nested Find path/reveal 与导航细节收口。

**1.2.6：Conditional Performance**：仅真实性能测试需要时做 culling / spatial / lazy render。
