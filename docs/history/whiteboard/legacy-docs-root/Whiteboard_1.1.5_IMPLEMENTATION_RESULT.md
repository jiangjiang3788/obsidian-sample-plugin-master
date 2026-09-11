# ThinkOS Whiteboard 1.1.5 Implementation Result — R2

## 状态

**1.1.5 修正版代码完成 / 待用户真机验收。1.1.6 Hold。**

本次仍只处理 1.1.5。用户真机反馈指出上一版“数学上支持负 world/Pan，但体验没有无限感，而且 Zoom 仍被 1.1.4 的 50%～200% 限制卡住”。R2 只补齐这一 1.1.5 产品缺口，不进入 Record 多选、Workbench、框选、Archive、culling 或 AI。

## 1. 问题复盘

上一版底层 `world / camera / screen` 合同是正确的，但产品体验有两个明显遗漏：

1. `WhiteboardZoomModel` 仍保留 `WHITEBOARD_ZOOM_MIN = 0.5`、`MAX = 2`，所以用户不可能继续缩小/放大；
2. Pan 后 viewport 背景完全静态，虽然 camera 已变化、负 world 已可达，但空白区域没有任何 world 参照，视觉上像“什么都没发生”。

因此上一版更像坐标底座完成，而不是“用户感觉上的假无限白板”完成。

## 2. R2 修正

### Zoom

- 1.1.5 当前实用范围：**0.5%～12800%**；这是浏览器数值/渲染安全边界，不是产品层 50%～200% 限制。
- `- / +` 从固定加减 10% 改为倍率步进：每次 ×0.8 / ×1.25。
- `Ctrl/⌘ + wheel` 改为连续指数缩放，触控板 pinch / wheel 不再一档一档跳 10%。
- 仍使用原 camera anchor 数学，缩放前后指针/视口锚点下的 world 点保持不变。
- `100%` 按钮仍只重置 zoom，不持久化 camera/zoom。

### 无限感 / Pan 反馈

新增 `WhiteboardGridModel.ts`：

- 网格位置由 `camera + zoom` 计算，world 原点与网格倍数不会漂；
- 网格随 Pan 明确移动，用户可直接看到世界空间在移动；
- 网格步长会随 zoom 自适应，极小 zoom 不糊成密线，极大 zoom 不稀到完全看不到；
- 只用 viewport CSS background，不创建超大 canvas，不进入 Store，不写盘；
- 底部增加轻量操作提示：拖空白移动 / wheel 平移 / Ctrl/⌘+wheel 缩放。

## 3. 仍保持不变的 1.1.5 合同

```text
screenLocal = (world - camera) * zoom
world       = camera + screenLocal / zoom
```

- `WhiteboardItem.x/y` 仍是 durable world 坐标，可正可负；
- `camera/zoom` 仍只在内存，不写 `whiteboards.json`；
- 卡片拖动仍是 `screen delta / zoom -> world delta`；
- Source drop 仍是统一 `screen -> world`；
- Edge/Card 共用同一个 world transform；
- find-to-card 只移动 camera；
- pointermove 不新增 Vault 高频写入；
- `WhiteboardStore / WhiteboardSchema / canonical Record / RecordQuery` 未修改；
- `WhiteboardCard.tsx` 生产 PointerEvent 拖动状态机未重写。

## 4. 本次生产文件

新增：

- `src/features/whiteboard/WhiteboardGridModel.ts`

修改：

- `src/features/whiteboard/WhiteboardZoomModel.ts`
- `src/features/whiteboard/WhiteboardZoomController.ts`
- `src/features/whiteboard/WhiteboardWorkspace.tsx`
- `src/styles/features/whiteboard.css`

测试/证据同步：

- `test/unit/whiteboardGridModel.test.ts`
- `test/unit/whiteboardZoomModel.test.ts`
- `test/unit/whiteboardZoomUi.test.tsx`
- `test/specs/whiteboard.e2e.ts`
- `test/system/feature-test-map.json`

## 5. 自动检查结果

通过：

- `npm run test:syntax`
- `npm run test:language`
- `npm run test:evidence`
- `npm run test:surface`
- `npm run gate:architecture`
- `npm run gate:records`
- `npm run gate:ui-runtime`

实施中 architecture Gate 曾因新增网格 CSS 把物理行数推过治理阈值而失败；已在不改变功能语义的前提下收敛，最终 `release-governance PASS (largest=476; any=400)`。

仍是交接基线原有红项，且已在“用户刚才收到的 1.1.5 SOURCE”上复跑确认完全相同：

- `gate:quality`：explicit-any 固定预算超限（src 400/390、test 598/593、total 1002/987、as any 620/605）；
- `gate:stability`：缺 `.github/workflows/ci.yml`；
- `gate:product`：同一 CI 缺失 + README release contract；version-sync / manifest = 1.1.5 均通过。

当前交接包无 `node_modules`，因此 Jest / 完整 Typecheck / Vite build / Obsidian Webdriver E2E 仍未在本容器真实执行；对应测试代码已同步。

## 6. Windows CMD

```bat
npm ci
npm run test:syntax
npm run test:language
npm run test:evidence
npm run test:surface
npm run gate:architecture
npm run gate:records
npm run gate:ui-runtime
npm run test:unit -- --runTestsByPath test/unit/whiteboardCameraModel.test.ts test/unit/whiteboardGridModel.test.ts test/unit/whiteboardZoomModel.test.ts test/unit/whiteboardZoomUi.test.tsx test/unit/whiteboardDragModel.test.ts test/unit/whiteboardTransferModel.test.ts test/unit/whiteboardEdgeGeometry.test.ts test/unit/whiteboardFindUi.test.tsx
npm run test:integration -- --runTestsByPath test/integration/whiteboardRestartLifecycle.test.ts
npm run build
npm run test:e2e
```

## 7. 真机最小验收

1. 看背景网格：拖动空白处上下左右移动，网格和卡片一起移动；向右拖很远仍能继续进入负 world，没有固定左上角边界感。
2. 连点 `-`：应能直接穿过 50%，继续到 40%、32%……最终可到 0.5%；连点 `+` 应穿过 200%，继续到 244%、305%……最高实用边界 12800%。
3. `Ctrl/⌘ + wheel`：应连续缩放，不再固定每次 10%；缩放时鼠标附近卡片/world 点不明显漂移。
4. 在 <50%、>200% 且 camera 非 0 时各做一次拖卡、左拖右、Edge、定位；最终 durable x/y/连线正确，Pan/Zoom 本身不改 `whiteboards.json`。

## 8. 后续计划

- 1.1.6：左侧 Record 多选 / 全选 / 批量拖；
- 1.1.7：Workbench 分组 / 命名 / 折叠 / 移动；
- 1.1.8：Canvas 框选 / 多选 / 整组移动；
- 1.1.9：Archive / Restore 原位置；
- 1.1.10：只有真实性能需要时做 viewport culling；
- Later：用户主动选卡后再接 AI。

**继续 Hold 1.1.6：先验收本次 1.1.5 R2 的“看得见的无限感 + 宽范围 Zoom”。**
