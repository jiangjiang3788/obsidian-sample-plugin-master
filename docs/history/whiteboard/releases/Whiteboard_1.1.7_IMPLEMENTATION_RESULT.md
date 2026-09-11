# ThinkOS Whiteboard 1.1.7 Implementation Result

## 1. 状态

**1.1.7 代码完成 / 待用户真机验收。1.1.8 Hold。**

本版只做 1.1.7：Workbench 分组 / 命名 / 折叠 / 整组移动。继续复用 1.1.5 world-camera-screen 与 1.1.6 左侧多选/批量拖，不提前实现 1.1.8 Canvas 框选/右侧多选。

## 2. 用户可见行为

### 新建 Workbench

- 白板右上角新增“新建工作台”。
- 新工作台围绕**当前 viewport 的 world 中心**创建，Pan 到负 world 后仍在当前视野附近创建，不回夹到 0。
- 默认名称自动选择首个未占用的 `工作台 N`。
- 展开状态最小 frame 为 720×480 world units；成员卡超出右/下边界时 frame 自动扩展。
- frame 宽高是派生布局，不写入 `whiteboards.json`。

### 把卡片放进 Workbench

- 已在白板上的卡片拖进展开 Workbench，pointerup 时持久化 `item.groupId`。
- 卡片拖进另一 Workbench，可切换 membership。
- 卡片已经属于某 Workbench 时，普通拖动到 frame 外不会静默脱组；卡片提供明确“移出工作台”按钮，只解除 membership，卡片仍留在白板原 world 位置。
- 1.1.6 左侧 Record 单条/批量拖落在展开 Workbench 时，新增 Projection 直接带同一 `groupId`；整批仍走一次 `WhiteboardStore.addRecords()` mutation。

### 命名 / 折叠 / 解散

- Workbench 标题可重命名，名称 durable。
- 可折叠 / 展开，`collapsed` durable。
- 折叠只隐藏成员卡和与隐藏成员相关的 Edge；不会修改成员 x/y、Edge 数据、Record 真源，也不会让这些 Record 重新出现在左侧候选。
- “解散”只删除 Workbench metadata 并清成员 `groupId`；卡片、位置、Edge、canonical Record 全部保留。

### 整组移动

- Workbench 标题栏提供明确拖动手柄。
- pointermove 只做 preview；位移使用 `screen delta / zoom` 反算 world delta。
- preview 时 Workbench frame、成员卡与依赖成员坐标绘制的 Edge 一起移动。
- pointerup 只提交一次 Store mutation：同时更新 group anchor 与该组全部成员 durable x/y。
- 支持负 world 坐标和任意 1.1.5 camera/zoom。

### Find / 回到画布中心

- Find 仍搜索当前白板全部 item。
- 如果目标卡属于折叠 Workbench，Find 只把 ephemeral camera 对准该 Workbench frame，不自动展开、不写盘。
- “回到画布中心”现在把 Workbench frame 也纳入内容包围盒，因此只有空 Workbench、没有卡片时也能找回。

## 3. Durable 数据合同

`Think/whiteboards.json` 的 store data `version` 仍为 1。

新增可选字段：

```ts
WhiteboardBoard {
  groups?: WhiteboardGroup[];
}

WhiteboardItem {
  groupId?: string;
}

WhiteboardGroup {
  id: string;
  title: string;
  x: number;
  y: number;
  collapsed: boolean;
}
```

兼容与安全：

- 1.1.6 文件没有 `groups/groupId` 可直接恢复，不做 migration write。
- group x/y 与 item x/y 都是 durable world coordinates，可为负数。
- schema 拒绝重复 group ID。
- schema 拒绝 item 引用不存在 Workbench 的悬空 `groupId`，恢复继续 fail-closed。
- Workbench 不复制 Record 内容；canonical Record / Markdown / RecordQuery 语义未变。

## 4. 生产文件

新增：

- `src/features/whiteboard/WhiteboardWorkbenchModel.ts`
- `src/features/whiteboard/WhiteboardWorkbenchController.ts`
- `src/features/whiteboard/WhiteboardWorkbenchGroup.tsx`
- `src/styles/features/whiteboard-workbench.css`

修改：

- `src/core/whiteboard/WhiteboardSchema.ts`
- `src/core/whiteboard/WhiteboardStore.ts`
- `src/core/whiteboard/public.ts`
- `src/features/whiteboard/WhiteboardBatchPlacementModel.ts`
- `src/features/whiteboard/WhiteboardBoardTools.tsx`
- `src/features/whiteboard/WhiteboardCard.tsx`
- `src/features/whiteboard/WhiteboardRecordTransferController.ts`
- `src/features/whiteboard/WhiteboardWorkspace.tsx`
- `src/styles/main.css`
- `manifest.json`
- `package.json`
- `package-lock.json`

## 5. 明确未做

- 不做 1.1.8 Canvas 框选。
- 不做右侧多卡 selection state / Ctrl 多选。
- 不做 1.1.8 基于多选的多卡整组移动。
- 不做 1.1.9 Archive / Restore。
- 不做 1.1.10 viewport culling / spatial index。
- 不做 AI 自动聚类、自动分组、自动连线。
- 不做多白板产品能力。

## 6. 测试证据

新增 F134：`Workbench 分组 / 命名 / 折叠 / 整组移动`。

覆盖：

- Workbench min/auto-grow/collapsed frame；
- 当前 viewport world 中心创建与负 camera/zoom；
- 卡片 drop target、跨 Workbench membership、collapsed Workbench 不接收 drop；
- 工作台默认名称唯一；
- 整组拖动 `screen delta / zoom` 与成员 preview 平移；
- Store create/rename/collapse/move/dissolve；
- 整组移动单 mutation 写盘；
- 旧 1.1.6 whiteboards.json 兼容恢复；
- 重复 group ID / 悬空 groupId schema fail-closed；
- restart 后 title/collapsed/groupId/group/member world positions 恢复；
- UI collapse 隐藏成员 Card + incident Edge，同时左侧 Record Source 仍排除成员；
- UI rename / 显式移出 / 新建 Workbench；
- E2E 设计：新建 → 现有卡拖入 → groupId 落盘 → 重命名 → 折叠 → durable group 状态落盘。

## 7. 自动审计 / Gate

PASS：

- source/test TypeScript transpile syntax scan
- `test:syntax`
- `test:language`
- `test:evidence`（功能条目 101）
- `test:surface`
- `gate:architecture`
- `gate:records`
- `gate:task-session`
- `gate:energy`
- `gate:ui-runtime`
- Product gate 中 version-sync / manifest = `1.1.7`

与 1.1.6 **完全相同的既有基线红项**：

- `gate:quality`：src/test/total/as-any budget 仍分别为 `400/390`、`598/593`、`1002/987`、`620/605`；
- `gate:stability`：仓库缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI 缺失 + README release contract 缺失；除版本从 1.1.6 正常变为 1.1.7 外，失败原因一致。

未真实执行：

- Jest unit/integration；
- 完整 Typecheck；
- Vite Build；
- Obsidian E2E。

原因：交接源码没有 `node_modules`。`typecheck:src` 已实际尝试，当前首先被缺少 `node` / `preact` / `vite/client` 类型阻塞；不把未执行项写成通过。

## 8. 真机最小验收

1. Pan 到一个远离原点的位置，点“新建工作台”；确认 Workbench 出现在当前视野附近。
2. 把一张现有卡拖进 Workbench；确认卡上出现 Workbench 名称，重启后仍属于该组。
3. 从左侧多选 2 条 Record，批量拖到 Workbench 内；确认两张卡都进入该组且没有叠在同一点。
4. 点“重命名”，改名后重启；确认名称保留。
5. 点“折叠”；确认成员卡和相关连线隐藏，左侧仍不会重新出现这些已在白板中的 Record；再展开恢复。
6. 拖 Workbench 标题栏/手柄；确认整个 frame、成员卡和连线一起移动，重启后位置保留。
7. 点卡片“移出工作台”；确认卡片仍在白板，只是不再属于该组。
8. 点“解散”；确认所有成员卡/Record/Edge 都还在，只有 Workbench frame 消失。
9. 创建一个空 Workbench，Pan 远后点“回到画布中心”；确认空 Workbench 也被纳入中心计算。

## 9. 整个项目后续计划

- 1.1.0–1.1.6：已完成并保持兼容。
- 1.1.7：Workbench 分组 / 命名 / 折叠 / 整组移动，当前代码完成，待真机验收。
- 1.1.8：Canvas 框选 / 右侧多选 / 基于 selection 的整组移动。
- 1.1.9：Archive / Restore 原 world 位置。
- 1.1.10：仅真机性能真实需要时做 viewport culling / spatial 优化。
- Later：用户主动选择卡片后 AI Chat；不做后台自动推荐/聚类/连线判断。
- 最终：全量回归、数据兼容/重启验证、所有交付文档统一维护在 `doc/`、发布收口。

**Hold 1.1.8，先验收 1.1.7。**
