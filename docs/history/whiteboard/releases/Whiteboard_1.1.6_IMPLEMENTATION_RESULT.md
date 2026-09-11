# ThinkOS Whiteboard 1.1.6 Implementation Result

## 1. 状态

**1.1.6 代码完成 / 待用户真机验收。1.1.7 Hold。**

本版只做 1.1.6：左侧 Record 多选 / 全选当前查询结果 / 批量拖入，并包含用户本轮明确要求的两个白板小修：右上角“回到画布中心”、删除“匹配 N 条，显示前 80 条；继续缩小搜索或筛选范围”提示。

## 2. 用户可见行为

### 左侧多选

- 每条候选 Record 增加复选选择。
- 选择栏提供：`全选结果 / 取消全选 / 已选 N / 清空`。
- “全选结果”使用完整 `queryResult.matchedItems`，不是只选择 `visibleItems` 前 80 条。
- 查询/筛选变化后，已经不属于当前结果的选择自动裁掉；Record 加入白板后也会从选择中消失。

### 批量拖

- 从**已选中的任意一条**开始拖：携带整组选中 Record。
- 从**未选中的一条**开始拖：仍只拖这一条，保持 1.1.2 单条拖语义。
- 拖动 ghost 显示整批条数。
- drop 继续复用 1.1.5 `screen → world` 坐标；负 world、Pan、任意 zoom 下合同不变。
- 多条卡片从 drop 点向右下网格展开，避免全部叠在同一坐标。
- z-index 连续递增。

### 批量持久化

新增 `WhiteboardStore.addRecords()`：

- 一批 Record 在**一个 mutation / 一次 whiteboards.json 写入**中完成；
- 输入重复 `recordId` 去重；
- 已在白板中的 Projection 不重复创建；
- 写盘失败仍保持现有 fail-safe：不会发布假成功内存状态；
- canonical Record / Markdown 不复制、不修改。

### 回到画布中心

右上角新增 `◎` 按钮，accessible label 为“回到画布中心”。

- 有卡片：计算全部当前卡片包围盒中心，把该 world 点带到 viewport 中心；
- 空白板：回 world `(0, 0)`；
- 只移动 ephemeral camera；
- **不重置 zoom**；
- **不修改 WhiteboardItem x/y**；
- **不写 whiteboards.json**。

### 删除旧提示

生产源码已不再包含：

`匹配 N 条，显示前 80 条；继续缩小搜索或筛选范围`

80 条 cap 仍只负责限制左侧 DOM 渲染量，不篡改真实 matched results，也不限制“全选结果”。

## 3. 生产文件

新增：

- `src/features/whiteboard/WhiteboardRecordSelectionModel.ts`
- `src/features/whiteboard/WhiteboardBatchPlacementModel.ts`
- `src/features/whiteboard/WhiteboardRecordTransferController.ts`
- `src/styles/features/whiteboard-selection.css`

修改：

- `src/core/whiteboard/WhiteboardStore.ts`
- `src/core/whiteboard/public.ts`
- `src/features/whiteboard/WhiteboardRecordSourcePanel.tsx`
- `src/features/whiteboard/WhiteboardWorkspace.tsx`
- `src/features/whiteboard/WhiteboardBoardTools.tsx`
- `src/styles/main.css`
- `manifest.json`
- `package.json`
- `package-lock.json`

## 4. 明确未改 / 未做

- 不改 `WhiteboardSchema`；没有数据迁移。
- 不改 canonical Record schema / DataStore / Markdown 真源。
- 不改 `RecordQuery` 查询语义。
- 不重写现有生产 Card PointerEvent 拖动。
- 不做右侧 Canvas 框选/多选（1.1.8）。
- 不做 Workbench 分组（1.1.7）。
- 不做 Archive/Restore（1.1.9）。
- 不做 viewport culling / spatial index（1.1.10 条件版）。
- 不做 AI。

## 5. 测试证据

新增 F099：`Record Source 多选 / 全选结果 / 批量拖入`。

覆盖：

- 全选 9354 matched results 不受 80 条 visible cap 限制；
- 选择裁剪 / toggle；
- 拖已选 = 整组，拖未选 = 单条；
- 批量 world 网格落点、负坐标与连续 z-index；
- 画布内容包围盒中心；
- `WhiteboardStore.addRecords()` 一次写盘、输入去重、已有 Projection 不重复写；
- UI 不显示旧“匹配/显示前80条”提示；
- “回到画布中心”不触发 Store mutation；
- E2E 设计：搜索两条 → 全选结果 → 拖任一选中行 → 两条同时进入 `whiteboards.json` 且落点不同。

## 6. 自动审计 / Gate

PASS：

- source TypeScript transpile syntax scan
- `test:syntax`
- `test:language`
- `test:evidence`（功能条目 100）
- `test:surface`
- `gate:architecture`
- `gate:records`
- `gate:ui-runtime`
- version-sync / manifest = `1.1.6`

与 1.1.5 R2 **完全相同的既有基线红项**：

- `gate:quality`：src/test/total/as-any budget 仍分别为 `400/390`、`598/593`、`1002/987`、`620/605`；
- `gate:stability`：仓库缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI 缺失 + README release contract 缺失。

这些项目在原始 1.1.5 R2 SOURCE 上复跑，数值与原因相同，不是 1.1.6 新增。

未真实执行：

- Jest unit/integration；
- 完整 Typecheck；
- Vite Build；
- Obsidian E2E。

原因：交接源码没有 `node_modules`。不把未执行项写成通过。

## 7. Windows CMD 建议命令

```cmd
npm install
npm run test:syntax
npm run test:language
npm run test:evidence
npm run test:surface
npm run gate:architecture
npm run gate:records
npm run gate:ui-runtime
npm run test:unit -- --runTestsByPath test/unit/whiteboardRecordSelectionModel.test.ts test/unit/whiteboardBatchPlacementModel.test.ts test/unit/whiteboardStore.test.ts test/unit/whiteboardDirectTransferUi.test.tsx test/unit/whiteboardZoomUi.test.tsx
npm run typecheck
npm run build
npm run test:e2e -- --spec test/specs/whiteboard.e2e.ts
```

## 8. 真机最小验收

1. 左侧搜索出至少 3 条 Record，逐条勾选 2 条；确认显示“已选 2”。
2. 拖其中任意一条已选 Record 到右侧；确认两张卡一起出现且没有完全重叠。
3. 搜索得到超过 80 条结果，点“全选结果”；确认“已选 N”使用完整匹配数，而不是 80。
4. 拖一个**未选中** Record；确认只加入这一条。
5. Pan 到远处，点击右上角 `◎ 回到画布中心`；确认回到当前卡片群中心，zoom 不变化。
6. 确认左侧不再出现“匹配…显示前80条；继续缩小搜索或筛选范围”。
7. 重开 Obsidian，确认整批加入的卡片仍在原 world 位置。

## 9. 整个项目后续计划

- 1.1.0–1.1.6：当前阶段完成；1.1.6 待真机验收。
- 1.1.7：Workbench 分组 / 命名 / 折叠 / 整组移动。
- 1.1.8：Canvas 框选 / 多选 / 整组移动。
- 1.1.9：Archive / Restore 原位置。
- 1.1.10：仅真机性能真实需要时做 viewport culling / spatial 优化。
- Later：用户主动选择卡片后与 AI Chat；不做后台自动推荐/聚类/连线判断。
- 最终：全量回归、数据兼容/重启验证、文档统一维护在 `doc/`、发布收口。

**Hold 1.1.7，先验收 1.1.6。**
