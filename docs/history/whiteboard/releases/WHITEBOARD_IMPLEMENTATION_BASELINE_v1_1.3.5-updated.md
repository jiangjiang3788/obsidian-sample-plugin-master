# ThinkOS 白板 — 实施基线 v1.3.5

> 当前版本：**1.3.5 Low-Zoom Mixed Arrange**。
> 白板仍是 ThinkOS 一级工作区，不是普通 Dashboard View。
> 所有新增/更新交付文档继续统一放项目根目录 `doc/`。

## 1. 产品真源与基本合同

- canonical Record 唯一业务真源仍是 Markdown Record + RecordRepository / DataStore；Whiteboard 只保存 projection / spatial state。
- 左侧检索继续唯一复用 `RecordQuery`；右侧白板永远不被左侧过滤隐藏或重排。
- `Think/whiteboards.json` 继续 `version: 1`。
- Durable world `x/y` 允许负数；camera / zoom / LOD / locator / selection / marquee / layout guide / nested navigation history / undo UI state 均为 ephemeral。
- Nested Workbench 最多 4 层，继续 `parentGroupId + absolute world XY + atomic subtree translate`；不做破坏性 parent-local migration。
- `screenLocal = (world - camera) * zoom`，`world = camera + screenLocal / zoom`。
- Zoom 继续 0.5%–12800%；低倍率使用 semantic locator 保证对象位置可见、可找回。

## 2. 当前 durable whiteboard 模型

```ts
WhiteboardBoard {
  title;
  items: WhiteboardItem[];
  edges: WhiteboardEdge[];
  groups?: WhiteboardGroup[];
  annotations?: WhiteboardAnnotation[];
  archivedItems?: WhiteboardArchivedItem[];
  archivedEdges?: WhiteboardEdge[];
  modified;
}

WhiteboardItem {
  id; recordId;
  x; y; zIndex?;
  groupId?;
}

WhiteboardArchivedItem extends WhiteboardItem {
  archivedAt;
  archiveX?; archiveY?; archiveZIndex?;
}

WhiteboardGroup {
  id; title;
  x; y;
  collapsed;
  parentGroupId?;
}

WhiteboardAnnotation {
  id;
  kind: "text" | "sticky";
  text;
  x; y; zIndex?;
  groupId?;
}

WhiteboardEdge {
  id;
  fromItemId;
  toItemId;
  label?;
}
```

Archive 坐标合同：

- `x/y/zIndex/groupId` = Restore origin；
- `archiveX/archiveY/archiveZIndex` = Archive Canvas 内独立位置；
- 归档空间重排不能覆盖 Restore origin；
- 父 Workbench subtree 在主白板移动时，归档成员 Restore origin 跟随 parent tree；Archive Canvas placement 不跟着主画布漂移。

## 3. 已完成主路线

### 1.1.0–1.1.9

独立 Whiteboard Workspace → Record Source Retrieval → 左右拖 → Find → Zoom/Pan/world-camera-screen → 左侧批量选择 → Workbench → Canvas 多选 → drag-to-connect → Archive/Restore。

### 1.2.0–1.2.5 R3

Undo/Redo → Nested Workbench（最多 4 层）→ breadcrumb/Back/Forward/Parent/Root → Text/Sticky → Edge label → 右键 arrange → Nested Find/Fit → pointer-world nested drop → content-aware Home。

### 1.2.6–1.2.8

Semantic Zoom / compact / overview → fixed-screen locator → locator 点击回真实对象 100%。

### 1.3.0

跨功能 Stability Closure；新增白板专项测试入口；性能优化继续保持“有真实证据才做”。

## 4. 1.3.1 — Archive Canvas（✅ 代码完成）

- 归档从侧栏升级为全屏空间工作台；
- Pan / Zoom / Ctrl/⌘ marquee / multi-select / multi-drag；
- Grid 与 Goal×Type×Time arrange；
- Center 100% / Fit Content；
- Archive placement 与 Restore origin 分离；
- old archived item 无 archiveX/Y 时稳定 fallback，零迁移读取。

## 5. 1.3.2 — Semantic Interaction（✅ 代码完成）

- compact / overview locator 可直接选择与拖动；
- Ctrl/⌘ 点选 / 框选可混选当前 Canvas 直属 Card + Workbench；
- Workbench 作为 subtree 原子节点；
- 当前 Canvas 不重复暴露嵌套内部节点；
- mixed selection 一次 `translateNodes` 写盘 / 一次 Undo history；
- ancestor + descendant group / group + internal Card 自动去重，防止 double translate；
- detail 模式仍保持原卡片选择体验。

## 6. 1.3.3 — Goal × Record Type × Time（✅ 代码完成）

唯一公开 preset：

- `groupBy = Goal`；
- `x = Record Type`（canonical order）；
- `y = Time`（month / ascending）；
- `cellLayout = grid`。

产品约束：

- 一个 Goal 一块；
- Goal 下横向类型，纵向时间；
- 同 cell 多卡局部网格；
- 无 Goal / 无时间有稳定 fallback；
- 默认批量拖入仍为 neutral grid；
- Arrange 只改 XY，绝不自动创建 Workbench。

底层 `WhiteboardLayoutSpec` 已真正驱动 group/x/y，未来可开放配置；第一版明确不暴露轴/分组设置面板。

## 7. 1.3.4 — Layout Header Selection（✅ 代码完成）

- Goal 区块标题可选中整个 Goal 的卡；
- Record Type 列标题可选中该类型卡；
- Time 行标题可选中该月卡；
- 标题回选后可以继续拖动 / 归档 / 创建 Workbench；
- guide 不持久化；Arrange != Group。

## 8. 测试与发布基线

功能地图：118 项；P0 42/42、P1 71/71、P2 5/5 证据完整。

本环境已真实通过：

- test:syntax / language / evidence / surface / system:strict:p2；
- gate:architecture / records / task-session / energy / ui-runtime；
- 1036 个非 `.d.ts` TS/TSX/MTS 额外 transpile 语法扫描 0 error。

已和 untouched 1.3.0 对照：

- `gate:quality` 仍为既有 any budget，1.3.4 数值已与基线完全相同；
- `gate:stability` 仍为既有缺 CI workflow；
- `gate:product` 仍为同一 CI / README release contract；version-sync / manifest 自身通过。

交付容器没有 `node_modules`，所以 Jest / 完整 Typecheck / Vite build / Obsidian E2E 必须在用户本机依赖完整环境跑。稳定候选阻断命令：

```bash
npm run test:whiteboard:full
```

## 9. 1.3.5 — Low-Zoom Mixed Arrange（✅ 代码完成）

- compact / overview 下 mixed Card + Workbench selection 可直接右键整理；
- 支持网格、左/顶对齐、水平/垂直等距；
- Workbench 使用 subtree 真实 frame，作为原子节点参与排布；
- `WhiteboardStore.moveNodes` 一次 mutation 提交 itemMoves + groupMoves，一次 Undo / persistence；
- mixed selection 含 Workbench 时禁用 Card-only 的“按连线 / Goal×Type×Time / 用所选创建工作台”；
- 右键空白可“网格整理当前层”；
- Goal / Type / Time guide 在低倍率使用 inverse zoom 保持标题可读。

## 10. 下一阶段路线

### 1.3.6 — Daily-use Closure（下一步）

不再优先加模型，先把完整真实工作链路测通并修真实摩擦：

- 批量 Record → neutral grid → Goal×Type×Time；
- semantic overview mixed selection → move / arrange → 100% focus；
- Nested Workbench 1–4 层；
- Archive Canvas → arrange → restore origin；
- layout header selection → create Workbench / archive；
- Undo/Redo × Arrange × Archive × Nested × Edge × Annotation；
- Restart / 旧数据兼容 / 极端 XY / 极端 Zoom。

1.3.6 真机绿后冻结白板新增功能一段时间，让真实使用产生下一阶段需求。

### Performance（仍为条件项）

只有真机大白板明确出现性能瓶颈才实施 viewport/Edge culling、spatial index、locator clustering、lazy render。没有证据就跳过。

### Later — User-triggered AI Chat

只有用户主动选择 Card / Workbench 并点击“和 AI 聊”时构造 context；不做后台自动推荐、聚类、自动连线或因果判断。

## 11. 明确不做

- 不默认把拖入动作升级成语义解释；
- 不自动按 Goal/Type 生成 Workbench；
- 不开放第一版复杂布局配置 UI；
- 不做 AI 自动聚类/关系猜测；
- 不做无限递归 Workbench；
- 不在没有性能证据时提前做 spatial index；
- 不做强制 parent-local durable migration。
