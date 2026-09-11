# ThinkOS Whiteboard 1.1.9 Implementation Result

## 1. 状态

**1.1.9 代码完成 / 待用户真机验收。1.1.10 Hold。**

本版只实现 Archive / Restore 原 world 位置，并按用户要求把“回到画布中心”改为同时恢复 100% 视图比例。没有提前实现 viewport culling。

## 2. 用户可见行为

### Archive

- 每张白板卡新增“归档”。
- 多选状态下，在任意已选卡点击“归档”会一次归档完整 selection；点击未选卡仍只归档该卡。
- 归档后卡片从 Canvas 消失，但不是“移出白板”：canonical Record / Markdown 不删除，Record 也不会重新出现在左侧候选。
- 右上角新增“归档箱（N）”，按最近归档优先显示，并标出归档前 world 坐标。

### Restore

- “恢复”使用同一个 Whiteboard Projection ID。
- 恢复严格保留归档前 `recordId / x / y / zIndex / groupId`，不自动排版。
- 恢复后只移动 camera 让卡片可见，不修改卡片 durable XY，也不强行改变当前 zoom。
- 如果归档时属于仍存在的 Workbench，恢复后继续属于该 Workbench；若 Workbench 已被解散，解散动作会同步清掉归档条目的旧 groupId。

### Edge

- 归档任意端点时，相关 durable edge 从 active edges 暂存到 `archivedEdges`，Canvas 不再渲染悬空线。
- 恢复卡片时，仅当 edge 两端都已经 active 才恢复该 edge；另一端仍归档时继续挂起。
- Edge schema 没有升级，仍为现有 `fromItemId / toItemId` 合同。

### 回到画布中心

- 右上角“回到画布中心”现在同时执行两件事：
  1. camera 对准当前 active 卡片 / Workbench 内容中心；
  2. zoom 原子恢复到 **100%**。
- 该操作仍只改 ephemeral viewport state，不写 `whiteboards.json`，不修改任何卡片 world XY。

## 3. 数据合同

`Think/whiteboards.json` 的 `version` **仍为 1**。新增字段全部 optional：

```ts
archivedItems?: Array<WhiteboardItem & { archivedAt: number }>;
archivedEdges?: WhiteboardEdge[];
```

旧 1.1.8 R2 文件没有这两个字段时可以直接读取，不需要迁移。active + archived Projection 之间继续保持 item ID / recordId 唯一；归档 Record 不能通过普通“加入白板”路径生成第二份 Projection，只能从归档箱恢复。

## 4. Store 行为

- `archiveItems(boardId, itemIds)`：输入去重；整批 active items → archivedItems；incident edges → archivedEdges；一次 mutation / 一次写盘。
- `restoreArchivedItem(boardId, itemId)`：同 ID、同原 world 位置恢复；恢复两端均 active 的 archived edges；一次 mutation / 一次写盘。
- `removeItems/removeItem` 继续是永久移出白板 Projection 的旧语义，并会避免 archivedEdges 留下指向永久移出卡片的关系。
- `removeGroup` 同步清 active / archived item 的 groupId，避免恢复时产生悬空 Workbench 引用。

## 5. 自动证据

F136 已登记：unit / ui / integration / persistence / restart / e2e / regression。

已执行并通过：

- `test:syntax`
- `test:language`
- `test:evidence`
- `test:surface`
- `gate:architecture`
- `gate:records`
- `gate:task-session`
- `gate:energy`
- `gate:ui-runtime`
- `version-sync-gate`：1.1.9

与原 1.1.8 R2 基线对照，以下失败完全相同、没有新增：

- `gate:quality`：existing any budget（src 400/390、test 598/593、total 1002/987、as any 620/605）；
- `gate:stability`：缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI / README release contract 缺失；
- `test:result-governance`：同一 `.github/workflows/think-os-test-v9.yml` 缺失。

未伪装为通过：

- Jest：实际尝试，当前 SOURCE 缺 `node_modules/jest/bin/jest.js`；
- 完整 Typecheck：实际尝试，缺 `node` / `preact` / `vite/client` type definitions；
- Build：实际尝试，缺 `vite`；
- Obsidian 真机 E2E：需要安装依赖与真实 Obsidian 环境。

## 6. 真机最小验收

1. 把一张位于负坐标或明显偏远位置的卡归档：Canvas 消失，左侧搜索不应重新出现该 Record。
2. 打开“归档箱”，恢复该卡：应回到归档前完全相同的位置。
3. 两张有连线的卡只归档一张：线消失；恢复后线重新出现。两张都归档时，先恢复一张不应产生悬空线，第二张恢复后线才回来。
4. 多选两张卡，点其中一张“归档”：两张都应一次归档；逐张恢复后位置保持。
5. 将 zoom 调到非 100%，Pan 到远处，点击“回到画布中心”：应回到当前内容中心，并显示 100%。
6. 重启 Obsidian：归档箱内容仍在；恢复后仍是原 world 坐标。

## 7. 下一步

**Hold 1.1.10。** 只有真机大白板出现明确渲染性能问题，才实施 viewport culling / spatial 优化；否则直接进入最终全量回归与发布收口。
