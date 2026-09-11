# ThinkOS 白板 — 实施基线 v1.2.5

> 当前版本：**1.2.5 Nested Navigation Polish：Back/Forward + Fit Content + Nested Find Path。**
> 当前产品定义：白板是 ThinkOS 一级工作区，不是普通 Dashboard View。
> 所有新/更新交付文档统一放在项目根目录 `doc/`。

## 1. 产品真源与边界

- canonical Record 唯一业务真源仍是 Markdown Record + RecordRepository / DataStore。
- Whiteboard 只保存 Projection、空间位置、Workbench、Edge、空间标注和归档状态；不复制 Record 正文。
- 左侧搜索/筛选继续唯一复用 `RecordQuery`，右侧白板不受左侧过滤隐藏或重排。
- camera / zoom / selection / marquee / context menu / nested active canvas / Undo history 均为 ephemeral，不写 `whiteboards.json`。
- `Think/whiteboards.json` 继续使用 `version: 1`；1.2.5 不增加 durable 字段，1.2.4/1.1.9 数据可直接读取，不做迁移。

## 2. 当前 durable whiteboard 模型

```ts
WhiteboardBoard {
  title: string;
  items: WhiteboardItem[];
  edges: WhiteboardEdge[];
  groups?: WhiteboardGroup[];
  annotations?: WhiteboardAnnotation[];
  archivedItems?: WhiteboardArchivedItem[];
  archivedEdges?: WhiteboardEdge[];
  modified: number;
}

WhiteboardItem {
  id: string;
  recordId: string;
  x: number;
  y: number;
  zIndex?: number;
  groupId?: string;
}

WhiteboardGroup {
  id: string;
  title: string;
  x: number;
  y: number;
  collapsed: boolean;
  parentGroupId?: string; // 1.2.1
}

WhiteboardAnnotation {
  id: string;
  kind: "text" | "sticky";
  text: string;
  x: number;
  y: number;
  zIndex?: number;
  groupId?: string;
}

WhiteboardEdge {
  id: string;
  fromItemId: string;
  toItemId: string;
  label?: string; // <= 200 chars
}
```

### 2.1 坐标合同

- Durable item/group/annotation `x/y` 继续是 absolute world coordinate，可为负数。
- `screenLocal = (world - camera) * zoom`；反算 `world = camera + screenLocal / zoom`。
- 为兼容 1.1.9，1.2.1 **没有强制迁移成 parent-local XY**。
- Nested Workbench 通过 `parentGroupId` 表达层级；移动父 Workbench 时，在一次 Store mutation 中平移整个 descendant subtree 的 group / active item / archived item / annotation world XY。
- 当前最多 4 层，因此采用“absolute world + atomic subtree translate”比破坏性坐标迁移风险更低。若未来深层/超大嵌套出现真实性能压力，再评估 local-coordinate migration。

## 3. 已完成版本路线

### 1.1.0–1.1.3

- 一级白板 Workspace；
- Record Source Retrieval；
- 左右直接拖；
- 白板内 Find / 工作区收纳。

### 1.1.4–1.1.5

- Zoom；
- 假无限白板 world/camera/screen；
- 四向 Pan、负 world、0.5%–12800% 实用宽范围 Zoom；
- camera-aware grid；
- Find 通过 camera 定位。

### 1.1.6

- 左侧 Record 多选；
- 当前查询结果全选；
- 批量拖入白板；
- “回到画布中心”；
- 删除“匹配 N 条，显示前 80 条……”提示。

### 1.1.7

- Workbench 分组 / 命名 / 折叠 / 整组移动；
- 卡片和 Record drop 可进入 Workbench。

### 1.1.8 R2

- `Ctrl/⌘ + 拖空白` Canvas 框选；
- 右侧多选 / selection 整组移动；
- 多选拖入 Workbench / 多选移出白板；
- 卡片四边 drag-to-connect。

### 1.1.9

- Archive / Restore 原 world 位置；
- incident Edge 安全归档/恢复；
- “回到画布中心”同时恢复 zoom 100%。

## 4. 1.2.0 — Whiteboard Undo / Redo（✅ 代码完成）

唯一目标：**让批量、结构和整理操作变得可逆，用户敢于操作。**

- `WhiteboardStore` 内维护 ephemeral past/future history，最大 100 个 snapshot；
- 新 mutation 自动进入 history 并清 redo；`ensureBoard` 不进入 history；
- Undo/Redo 先持久化目标 snapshot，再替换内存状态并通知 UI；
- `Ctrl/⌘+Z` Undo，`Ctrl/⌘+Shift+Z` Redo；输入框/textarea/select/contentEditable 内不拦截编辑器自己的撤销；
- 顶部增加 Undo / Redo 按钮；
- history 不持久化，重启后清空。

## 5. 1.2.1 — Workbench → Nested Canvas（✅ 代码完成）

唯一目标：**Workbench 不再只是大框，而是可以进入专注工作的子画布。**

- Workbench 新增 `parentGroupId`，最多 **4 层**；
- schema fail-closed 拒绝悬空 parent、循环引用、深度 >4；
- Workbench 按钮为 `⛶ 全屏`，进入后占用与根白板相同的 viewport；
- 顶部 breadcrumb：`白板 > 父工作台 > 子工作台`，可返回上级/任意祖先；
- 当前子画布内可以继续创建 Workbench；
- Workbench 可拖入另一 Workbench 重新挂父级，禁止拖入自身或后代；
- 父 Workbench 移动时，整个 descendant subtree 一次原子平移；
- Find 可以 reveal 到目标卡所属子画布；
- active nested canvas / breadcrumb navigation 只影响 ephemeral UI，不写盘。

## 6. 1.2.2 — Whiteboard Annotation（✅ 代码完成）

唯一目标：**给空间结构增加解释层，但不污染 canonical Record。**

- 双击空白创建 Text annotation；
- 右键空白可添加“文字标注”或“便签”；
- Text / Sticky 均属于 Whiteboard durable state，不创建 Record；
- 支持多行编辑、拖动、删除；新建空标注自动进入编辑；
- 标注可属于 Workbench，并随父 Workbench/subtree 移动；
- 当前 annotation 采用简洁文本编辑，不引入富文本编辑器。

## 7. 1.2.3 — Edge Annotation（✅ 代码完成）

唯一目标：**从“知道两张卡有关”升级为“知道是什么关系”。**

- Edge 增加 optional `label`；
- 在线中点显示已有 label 或 `+ 标注`；
- 点击后 inline 编辑，Enter/blur 保存，Escape 取消；
- 空文本移除 label；
- Archive/Restore edge 时 label 自然随 edge 保留；
- 不引入固定 Edge Type taxonomy，先允许自由文本观察真实使用模式。

## 8. 1.2.4 — Context Menu / Arrange（✅ 代码完成）

唯一目标：**把高频结构操作移到上下文里，减少顶栏堆按钮，并让多选节点可确定性整理。**

### 8.1 右键卡片 / selection

- 网格整理；
- 按连线整理；
- 左对齐；
- 顶部对齐；
- 水平等距；
- 垂直等距；
- **用所选创建工作台**。

整理结果通过一次 `moveItems()` mutation 提交，Undo 一步即可撤回。

“用所选创建工作台”通过一次原子 mutation 创建 Workbench 并修改 selection 的 membership，Undo 一步恢复。

### 8.2 右键空白

- 添加文字标注；
- 添加便签；
- 新建工作台；
- 回到当前画布中心 · 100%。

### 8.3 整理原则

- 第一阶段只做 deterministic layout，不做 AI 自动整理；
- graph layout 只根据当前 selection 内显式 directed edges 排层；
- cycle 不能卡死，剩余节点仍安全落位；
- 不自动生成关系、不改变 canonical Record。


## 9. 1.2.5 — Nested Navigation Polish（✅ 代码完成）

唯一目标：**让 3–4 层 Nested Workbench 真正“进得去、退得出、找得到、看得全”。**

- 子画布增加浏览器式 Back / Forward 历史；breadcrumb 跳转、进入 Workbench、返回父级都会进入 history；
- 返回父级独立使用 `↑`，避免和 Back `←` 语义混淆；
- breadcrumb 明确标记当前层，并在回到根白板后保留 Forward 能力；
- 当前 Workbench 增加“适配当前工作台内容 / Fit Content”；
- Fit Content 统一计算当前可见 Card、空子 Workbench、Text/Sticky Annotation 的 world bounds；
- Fit 只缩小到能完整容纳内容，**不会把小内容放大超过 100%**；空工作台回到该 Workbench 自身中心；
- Nested Find 命中深层卡片时进入目标子画布，并在搜索区显示 `白板 › … › 当前工作台` 路径；
- Back/Forward history、active canvas、camera、zoom 全部继续是 ephemeral UI state，不写 `whiteboards.json`；
- 未改变 Workbench durable XY、parentGroupId、Record/Edge/Annotation 数据合同。

## 10. 当前未做 / 明确边界

- 不做 AI 自动推荐 / 聚类 / 自动连线 / 因果判断；
- 不做固定复杂 Edge Type；
- 不做无限递归 Workbench，当前最大深度 4；
- 不引入 tldraw / React Flow / Excalidraw / third-party infinite-canvas engine；
- 不因为“理论上可能更快”提前上 spatial index / viewport culling；
- 不在 1.2.5 做 parent-local durable coordinate 迁移；
- 不做 rich-text annotation editor。

## 11. 下一阶段路线

### 1.2.6 — Performance（条件版本）

只有真机大白板 / 深层 Workbench 出现明确性能问题时再实施：
- viewport culling；
- Edge culling；
- spatial index；
- nested canvas lazy render。

没有性能证据就跳过。

### Later — User-triggered AI Chat

只有用户主动选择卡片/Workbench 并点击“和 AI 聊”时构造 context；禁止后台主动推荐、聚类、自动连线或因果判断。

## 12. 1.2.5 自动验收基线

已通过的仓库可执行审计：
- `test:syntax`；
- `test:language`；
- `test:evidence`（109 features）；
- `test:surface`；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`。

额外 Whiteboard 相关 TS/TSX/MTS transpile 扫描：0 error。

与 untouched 1.2.4 基线完全相同、非本版新增的红项：
- `gate:quality`：existing explicit-any budget；
- `gate:stability`：仓库缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI / README release-contract 缺口。

已实际尝试但因 SOURCE 未携带 `node_modules` 阻塞：
- `npm test`：Jest 未安装；
- `npm run typecheck`：缺 `node / preact / vite/client` 类型；
- `npm run build`：`vite` 未安装；
- Obsidian E2E 因无 build/真机环境未执行，不能标记为 PASS。

## 13. 当前真机验收重点

- Undo / Redo 覆盖移动、批量移动、Workbench、Annotation、Edge label、Arrange 等本轮 Store mutation；
- `⛶ 全屏`进入 Workbench 后 viewport 行为与根白板一致；Back / Forward / 父级 / breadcrumb 均可导航；
- Fit Content 能完整包含卡片、空子工作台与 Annotation，且 zoom 不超过 100%；
- Nested Find 命中深层卡后自动 reveal，并显示完整工作台路径；
- 能创建 3–4 层嵌套，不能创建第 5 层/循环嵌套；
- 移动父 Workbench 后子 Workbench、active/archived 卡片、Annotation 保持相对关系；
- 双击/右键添加 Text/Sticky，重启后恢复；
- Edge label 编辑、归档/恢复、重启后保留；
- 右键 selection 的 grid/graph/align/distribute 可用，并能一步 Undo；
- “用所选创建工作台”是一次操作并能一步 Undo；
- 1.1.9 “回到画布中心 + 100%”继续兼容。
