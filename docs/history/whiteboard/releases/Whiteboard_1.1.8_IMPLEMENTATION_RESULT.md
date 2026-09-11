# ThinkOS Whiteboard 1.1.8 R2 Implementation Result

## 1. 状态

**1.1.8 R2 代码完成 / 待用户真机验收。1.1.9 Hold。**

本次不是进入 1.1.9，而是按真机反馈收口 1.1.8：

1. 多选卡片可以整批拖入 Workbench；
2. 多选卡片可以整批移出白板；
3. 框选手势改成 `Ctrl/⌘ + 拖动空白`；
4. 卡片四边直接拖出连线，删除旧“连线 → 连到这里”两步按钮。

## 2. 用户可见行为

### Ctrl/⌘ + 空白拖动框选

- 普通拖空白继续是 1.1.5 Pan。
- `Ctrl/⌘ + 拖动空白` 才进入 Canvas marquee。
- Shift 单独拖空白不再框选。
- `Ctrl/⌘ + Shift + 拖动空白` 可在既有 selection 上追加框选结果。
- 框选仍使用统一 screen → world 合同，支持负 camera 与任意 zoom。

### 多选拖入 Workbench

- 选择多张卡后，拖任意一张已选卡进入展开 Workbench，整批卡片保持相对位置移动。
- pointermove 期间只有 ephemeral preview。
- pointerup 通过一次 `WhiteboardStore.moveItems(..., targetGroupId)` 同时保存全部 XY，并把全部已选卡赋到目标 `groupId`。
- 如果没有实际命中 Workbench，则保留各卡原 membership；不会因为拖出当前 Workbench 就自动解除分组。
- 折叠 Workbench 仍不可作为 drop target。

### 多选移出白板

- 选择多张卡后，把任意一张已选卡拖到左侧 Record Source，整批 selection 一次移出白板。
- 在任意已选卡片点击“移出”时，同样移出整个 selection；点击未选卡仍只移出该卡。
- 批量移出通过 `WhiteboardStore.removeItems()` 单个 mutation 完成，并同步删除所有 incident edges。
- canonical Record / Markdown 永不删除；只是删除白板 Projection。

### 四边直接拖线

- 每张卡的上 / 右 / 下 / 左四边各有直接拖线 handle。
- 从任意边 handle 按下并拖动时，显示 world-space 临时 Edge preview。
- 拖到另一张卡时目标卡高亮；松开即创建 A→B durable edge。
- 不再出现卡片 footer 中的“连线”“连到这里”“取消连线”按钮。
- Edge schema 不升级；仍只有 fromItemId / toItemId，不引入复杂 edge type 或 AI 自动关系。

## 3. Store / 数据合同

`Think/whiteboards.json version` 仍为 1。

### `moveItems`

```ts
WhiteboardStore.moveItems(boardId, moves, targetGroupId?)
```

- 无 `targetGroupId`：只更新 XY/zIndex，保留每张卡自己的 groupId；
- 有 `targetGroupId`：同一次 mutation 更新 XY 并把整批卡片加入该 Workbench；
- target group 不存在时 fail-closed；
- 任一 itemId 缺失时整批不做部分提交。

### `removeItems`

```ts
WhiteboardStore.removeItems(boardId, itemIds)
```

- 输入去重；
- 单个 mutation 删除全部目标 WhiteboardItem；
- 同步删除 incident edges；
- 不触碰 canonical Record。

Selection / marquee / connection preview / camera / zoom 全部保持 ephemeral。

## 4. 自动证据

本轮更新了 F135 与 F094 证据合同：

- unit：Workbench strict hit target、Store multi-group assignment、batch remove、connection preview geometry；
- UI：Ctrl/⌘ 空白框选、Shift 单独不框选、多选拖入 Workbench、多选移出、四边拖线并创建 edge；
- persistence/restart：继续复用 1.1.8 durable XY / Workbench / Edge 现有恢复合同；
- regression：普通 Pan、单卡 Workbench、单卡右拖左、旧 Edge 数据格式继续兼容。

已执行通过：

- `test:language`
- `test:evidence`
- `test:surface`
- `gate:architecture`
- `gate:records`
- `gate:task-session`
- `gate:energy`
- `gate:ui-runtime`
- changed TS/TSX TypeScript transpile syntax scan：0 error

与原 1.1.8 基线对照：

- `gate:quality` 红项数值保持相同（existing any budget）；
- `gate:stability` 保持同一缺 CI workflow 红项；
- `gate:product` 保持同一 CI / README release contract 红项；
- version sync 仍为 1.1.8。

未伪装为通过：完整 Jest / Typecheck / Build / Obsidian E2E。当前 SOURCE 仍未携带 `node_modules`；完整 Typecheck 实际尝试被缺少 `node/preact/vite` types 阻塞。

## 5. 真机最小验收

1. 普通拖空白应 Pan；Ctrl/⌘ + 拖空白应框选；Shift 单独拖空白不应框选。
2. Ctrl/⌘ 点击两张卡，拖其中一张进 Workbench，两张应一起加入同一工作台并保持相对位置。
3. 两张保持选中后拖到左栏，或点其中一张“移出”，两张都应从白板消失，但左侧 Record 仍存在。
4. 任意卡上/右/下/左边缘拖到另一张卡，都应出现临时线并在松开后生成 A→B 连线。
5. footer 不应再出现“连线 / 连到这里”两步操作。
6. 重启后 durable XY / groupId / edges 保持，selection 与 connection preview 不保持。

## 6. 下一步

**Hold 1.1.9。** 先真机确认 1.1.8 R2，再进入 Archive / Restore 原 world 位置。
