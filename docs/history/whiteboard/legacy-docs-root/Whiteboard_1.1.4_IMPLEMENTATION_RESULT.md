# ThinkOS 白板 1.1.4 — 缩放与 Source 收敛实施结果

## 本版唯一目标

在不引入无限画布引擎的前提下，为独立白板增加 50%～200% 有界缩放，并保证任何缩放比例下 WhiteboardItem/Edge 继续使用稳定的未缩放逻辑坐标。

同时落实用户最新 UI/Source 决策：

- 不做多白板；
- 左侧搜索与筛选视觉上分层；
- 已加入右侧白板的 Record 不再显示在左侧候选结果；
- 右上角保留当前白板内查找。

## 实际实现

### 1. 有界 ephemeral zoom

新增：

- `src/features/whiteboard/WhiteboardZoomModel.ts`
- `src/features/whiteboard/WhiteboardZoomController.ts`

能力：

- 50%～200%；
- 10% 步进；
- `- / 100% / +`；
- `Ctrl/⌘ + wheel`；
- 按当前视口中心或 wheel 指针位置维持缩放锚点；
- zoom 不进入 WhiteboardStore，不写 `Think/whiteboards.json`。

### 2. 逻辑坐标不受缩放污染

Canvas 使用 scaled stage：scroll extent 使用缩放后的尺寸，内部 Whiteboard Canvas 保持原始逻辑尺寸并 `transform: scale(zoom)`。

- Card drag：屏幕 delta / zoom → 逻辑 XY；
- 左侧 Record drop：viewport client/scroll 坐标 / zoom → 逻辑 XY；
- Edge 继续按 WhiteboardItem 逻辑坐标计算，与 Canvas 一起 transform；
- persistent item x/y/zIndex 与 edge identity 不因 zoom 改变。

### 3. 左侧 Source 收敛

- 已在当前白板的 `recordId` 从 query matched/visible 结果中排除；
- 匹配总数也表示“当前仍可加入”的候选数；
- 移出白板后该 Record 会自然重新进入左侧结果；
- 不再显示“已在白板”占位卡。

搜索 UI 去掉重复标题/说明，只保留独立主搜索输入；筛选仍是其下方的次级折叠区域。白板右上角查找去掉额外外围 frame/shadow，和 zoom 控件并列。

## 明确未做

- 多白板；
- pan/minimap；
- 无限画布 camera；
- zoom 持久化；
- 多选/框选；
- AI；
- Record/Markdown/WhiteboardStore schema 修改。

## 自动检查

已实际执行并通过：

- `npm run test:syntax`
- `npm run test:language`
- `npm run test:evidence`
- `npm run test:surface`
- `npm run gate:architecture`
- `npm run gate:records`
- `npm run gate:ui-runtime`

Fresh CSS audit：

- 1.1.3：75 files / 9864 lines
- 1.1.4：75 files / 9864 lines
- hardcoded colors outside tokens：0
- `!important`：未新增

`gate:quality / gate:stability / gate:product` 与 1.1.3 原基线失败项一致：既有 any budget、缺 `.github/workflows/ci.yml`、README release contract；本版没有新增这些回归。

本环境无项目 `node_modules`，因此未真实执行 Jest、完整 Typecheck 与 Obsidian E2E；相关测试已写入源码，需用户本机补跑。

## 用户真机验收

1. `- / 100% / +` 能在 50%～200% 范围内工作；
2. Ctrl+滚轮围绕鼠标附近缩放，画面不明显跳走；
3. 50%、100%、200% 下拖动同一张卡，手感与最终位置正确；
4. 在 50%/200% 下从左侧拖 Record 到指定位置，落点正确；
5. 连线随缩放与拖动保持连接；
6. 缩放后 `whiteboards.json` 不因为 zoom 本身产生修改；
7. 重启后卡片仍是原逻辑 XY；zoom 回到默认 100%（第一版 intentional ephemeral）；
8. 已加入白板的 Record 不在左侧显示，移出后重新出现。

## Go / Hold

**Hold 1.1.5。** 先真机验证缩放下拖动/拖入/Edge/重启逻辑坐标闭环。
