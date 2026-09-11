# ThinkOS 白板 — 实施基线 v1.3.0

> 当前版本：**1.3.0 Whiteboard Stability Closure**。
> 当前产品定义：白板是 ThinkOS 一级工作区，不是普通 Dashboard View。
> 所有新/更新交付文档统一放项目根目录 `doc/`。

## 1. 产品真源与边界

- canonical Record 唯一业务真源仍是 Markdown Record + RecordRepository / DataStore。
- Whiteboard 只保存 Projection、空间位置、Workbench、Edge、空间标注和归档状态；不复制 Record 正文。
- 左侧搜索/筛选继续唯一复用 `RecordQuery`；右侧白板不受左侧过滤隐藏或重排。
- camera / zoom / semantic LOD / overview locator / selection / marquee / context menu / nested active canvas / navigation history / Undo history 均为 ephemeral，不写 `whiteboards.json`。
- `Think/whiteboards.json` 继续使用 `version: 1`；1.3.0 不增加 durable 字段，不做数据迁移。

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
  parentGroupId?: string;
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
  label?: string;
}
```

## 3. 坐标 / 导航 / Zoom 合同

- Durable item/group/annotation `x/y` 是 absolute world coordinate，可为负数。
- `screenLocal = (world - camera) * zoom`；反算 `world = camera + screenLocal / zoom`。
- zoom 继续支持 0.5%–12800% 实用宽范围；camera/zoom 不持久化。
- Nested Workbench 最多 4 层，采用 `parentGroupId + absolute world XY + atomic subtree translate`，不做破坏性 parent-local migration。
- “回到画布中心”语义是：选择当前画布一个真实 content-aware Home，并恢复 100%，不能落在巨大空白包围盒中心。
- “适配当前画布内容”最多放大到 100%；极端跨度无法完整 fit 时优先保证真实内容可找回。

## 4. 已完成主路线

### 1.1.0–1.1.5

- 一级 Whiteboard Workspace；
- Record Source Retrieval；
- 左右直接拖；
- Find / UI 收纳；
- Zoom / world-camera-screen / 四向 Pan / 负坐标 / 自适应网格。

### 1.1.6–1.1.9

- 左侧 Record 多选 / 全选当前结果 / 批量拖；
- Workbench 分组 / 命名 / 折叠 / 整组移动；
- Canvas `Ctrl/⌘ + 拖空白` 框选 / 右侧多选 / 多选整组移动；
- 多选拖入 Workbench / 多选移出白板；
- 卡片四边 drag-to-connect；
- Archive / Restore 原 world 位置；
- “回到画布中心”恢复 100%。

### 1.2.0–1.2.5 R3

- Whiteboard Undo / Redo；
- Workbench → Nested Canvas，最多 4 层；
- breadcrumb / Back / Forward / Parent / Root 防困导航；
- Text / Sticky Annotation；
- Edge free-text label；
- 右键菜单 / grid / graph / align / distribute / Selection → Workbench；
- Nested Find 路径；
- Fit Content；
- 左侧 Record → Nested Workbench pointer-world drop；
- R3 content-aware Home，解决极端 Zoom/Pan 后“回 100% 仍落空白”的问题。

## 5. 1.2.6 — Semantic Zoom / LOD（✅ 本批完成）

唯一目标：**缩小时不要把完整卡片和工作台一路线性缩成无法辨认的像素。**

定义三档视觉层级：

- `detail`：`zoom >= 35%`
  - 正常 Card / Workbench / Annotation 交互；
  - 保持已有拖动、选择、连线、编辑语义。
- `compact`：`10% <= zoom < 35%`
  - 不继续显示不断缩小的完整 Card；
  - Card 改为固定屏幕尺寸的标题 locator；
  - Workbench header 改为固定屏幕尺寸 locator；
  - Workbench world frame 保留，帮助判断空间范围；
  - Edge 控件隐藏、Edge path 降低视觉权重；
  - 这一层主要用于观察空间和快速找回，不在低 zoom 直接编辑复杂卡片内容。
- `overview`：`zoom < 10%`
  - Card 改为固定屏幕尺寸点标；
  - Workbench 继续显示固定屏幕 locator；
  - Text / Sticky 也显示轻量 locator；
  - Edge path 进一步降权；
  - 底部显示“概览模式”提示。

LOD 只由当前 zoom 推导，不写 Store。

## 6. 1.2.7 — Overview Locators（✅ 本批完成）

- locator 放在 world 坐标点，但使用 `1 / zoom` 视觉补偿，因此最终 screen size 基本恒定；
- 即使 zoom 到最小 0.5%，Card/Workbench 位置仍有可见标记；
- compact Card locator 显示截断标题；overview Card 以小点表示，hover/focus/selected/find-active 时显示标题；
- Workbench locator 显示 `▣ + title`；collapsed Workbench 使用折叠 frame 的稳定中心；
- Annotation locator 使用 Text / Sticky 区分；
- selection / find / source-drop target 在 locator 上继续有高亮反馈；
- locator 不创建新 durable model，不改变 Edge/Record/Workbench membership。

## 7. 1.2.8 — Overview Focus Recovery（✅ 本批完成）

- compact / overview locator 都可以点击；
- 点击 Card locator：以真实 Card world center 为目标，恢复 100%；
- 点击 Workbench locator：以工作台稳定 frame anchor 为目标，恢复 100%；
- 点击 Annotation locator：以标注真实 world center 为目标，恢复 100%；
- 回到 100% 后重新进入 detail UI，可继续正常拖卡、编辑、连线；
- locator focus 只改 camera/zoom，不调用 WhiteboardStore mutation。


## 8. 1.3.0 — Cross-feature Stability Closure（✅ 代码完成 / 待用户本机 Jest + 真机 E2E）

这一版不继续堆新白板能力，优先把 1.1.x–1.2.8 已有能力做跨功能收口。

- 深层 Workbench 中的归档卡从归档箱恢复后：
  - 自动关闭归档箱；
  - 清空临时 selection；
  - 自动进入原 `groupId` 对应的 Nested Workbench；
  - 视图恢复到 100%；
  - 精确以真实 Card center 找回，而不是停在 Root 或空白 world 点。
- 四层 Workbench 的 durable 稳定性矩阵覆盖：
  - ancestor subtree move；
  - active + archived item 同步平移；
  - Annotation 同步平移；
  - Edge archive/restore；
  - Edge label；
  - Restore；
  - Restart。
- 新增白板专项测试入口：
  - `npm run test:whiteboard`：测试体系 + 语法 + whiteboard unit + integration；
  - `npm run test:whiteboard:e2e`：build 当前源码 + 只跑 `whiteboard.e2e.ts`；
  - `npm run test:whiteboard:full`：前两者串联；
  - 中文别名：`测试:白板` / `测试:白板:真机` / `测试:白板:完整`。
- `npm run test:help` 已同步这些白板专项命令。
- 1.2.9 Performance 仍保持条件版本；用户当前没有提供真实性能卡顿证据，因此本次明确跳过，不做 culling/spatial index。

## 9. 测试证据

新增功能地图：

- F143 — Whiteboard Semantic Zoom / LOD；
- F144 — Whiteboard Overview Locators；
- F145 — Whiteboard Overview Focus Recovery；
- F146 — Whiteboard Cross-feature Stability / Nested Restore Recovery。

自动审计当前通过：

- `test:syntax`；
- `test:language`；
- `test:evidence`（113 features）；
- `test:surface`；
- `test:system:strict:p2`（P0 41/41、P1 67/67、P2 5/5）；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`；
- `src + test + scripts` TypeScript/TSX/MTS 额外 parser/transpile 扫描：1028 files / 0 syntax error（排除 `.d.ts` emit）。

与 untouched 1.2.8 基线相同、不是本批新增的红项：

- `gate:quality`：existing explicit-any budget；
- `gate:stability`：缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI / README release-contract 缺口。

本交付环境没有 `node_modules`，因此 Jest / 完整 Typecheck / Vite Build / 真 Obsidian E2E 不能在这里真实执行；必须在用户本机依赖完整环境复跑，不能标记为 PASS。

## 10. 当前真机阻断验收

1. 100% → 20%：进入 `compact`，完整 Card 不再继续缩小，出现固定大小 Card title locator；Workbench 有固定标题 locator。
2. 20% → 5% → 1%：进入 `overview`，Card 点标和 Workbench locator 的屏幕尺寸基本不随 zoom 继续缩小。
3. 在 1% 左右 Pan 很远，仍能根据 locator 看出内容位置。
4. 点击任意 Card locator：zoom 回 100%，该卡进入当前视野。
5. 点击 Workbench locator：zoom 回 100%，工作台真实位置进入视野。
6. selected / find-active Card 在 overview locator 上有明显高亮。
7. 在 Nested Workbench 里同样执行 1–6，locator 只针对当前可见 canvas 内容。
8. 回到 100% 后拖卡 / 多选 / 连线 / Source drop / Annotation / Workbench 操作继续正常。
9. Semantic zoom 全过程不改变 `whiteboards.json` durable XY/groupId/edge/annotation。
10. 从 Root 打开归档箱恢复一个深层 Workbench 卡片：自动进入原 Workbench、归档箱关闭、zoom=100%、卡片可见。
11. 四层 ancestor Workbench 移动后，active item / archived item / Annotation 一起平移；Restore 后 Edge label 恢复；Restart 后仍一致。
12. 用户本机执行 `npm run test:whiteboard:full`，whiteboard unit/integration/build/真实 Obsidian E2E 全绿后，1.3.0 才进入稳定发布候选。

## 11. 下一阶段路线

### 1.2.9 — Performance（条件版本，当前跳过）

1.2.8 semantic LOD 上线后当前没有真实性能卡顿证据，因此 1.3.0 不提前做性能重构。以后只有真机压力测试出现明确卡顿才实施：

- viewport culling；
- Edge culling；
- spatial index；
- nested canvas lazy render / marker clustering。

没有性能证据就跳过，不为理论性能提前增加复杂度。

### 1.3.0 — 稳定版收口（当前）

- 1–4 层 Nested × Zoom/Pan × Source drop × 多选 × Undo × Archive × Find × Annotation × Edge × Arrange 联动；
- restart / 历史版本数据兼容；
- 极端 world 坐标 / 0.5%–12800% zoom；
- 真 Obsidian `whiteboard.e2e.ts`、P1、完整测试；
- 所有文档继续只放 `doc/`；
- 最终稳定发布包必须包含与源码对应的构建产物。

### Later — User-triggered AI Chat

只有用户主动选择 Card / Workbench 并点击“和 AI 聊”时构造 context；禁止后台自动推荐、聚类、自动连线或因果判断。

## 12. 明确不做

- 不做 AI 自动聚类/关系猜测；
- 不做固定复杂 Edge Type；
- 不做无限递归 Workbench（当前最大 4 层）；
- 不引入 tldraw / React Flow / Excalidraw；
- 不在没有性能证据时提前做 spatial index；
- 不做 parent-local durable coordinate 强制迁移；
- 不做 rich-text annotation editor。
