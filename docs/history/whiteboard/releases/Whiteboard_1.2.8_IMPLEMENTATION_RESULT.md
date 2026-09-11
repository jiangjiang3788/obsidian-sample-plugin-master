# Whiteboard 1.2.8 Implementation Result

## 本批范围

本次一次连续完成三个强相关小版本，最终插件版本号为 **1.2.8**：

- 1.2.6 — Semantic Zoom / LOD；
- 1.2.7 — Overview Locators；
- 1.2.8 — Locator Focus Recovery。

没有进入无证据的 viewport culling / spatial index。

## 用户问题

原宽范围 Zoom 虽然数学上支持 0.5%–12800%，但 Card / Workbench 会随 world transform 一路缩小。到很小 zoom 后，内容会变成几乎不可见的像素，用户只能知道“白板还在”，却不知道卡片/工作台实际在哪里。

## 1.2.6 — Semantic Zoom

新增 `WhiteboardSemanticZoomModel`，按 zoom 自动切三档：

- detail：>=35%；
- compact：10%–35%；
- overview：<10%。

compact/overview 不再继续渲染不断缩小的完整 Card；完整编辑 UI 只留在 detail。

低 zoom 时：

- Workbench header 隐藏，frame 继续表达 world 范围；
- Edge control 隐藏，path 降权；
- 底部明确提示当前是简化视图还是概览模式。

## 1.2.7 — Fixed-screen Locators

新增 `WhiteboardSemanticOverviewLayer`。

locator 的位置仍来自真实 world x/y，但视觉 transform 使用 `1 / zoom` 补偿，因此最终 screen size 不会跟着 zoom 一路缩小。

表现：

- compact Card：固定屏幕尺寸的小标题卡；
- overview Card：固定屏幕尺寸点标，hover/focus/selected/find-active 可显示标题；
- Workbench：固定 `▣ title` locator；
- Annotation：overview 下显示轻量 Text / Sticky locator；
- selected / find / drop-target 继续高亮。

极限 0.5% zoom 时 inverse compensation 为 200，仍保持 locator 可见。

## 1.2.8 — Click-to-recover

locator 不只是装饰：

- 点击 Card locator → Card world center + zoom 100%；
- 点击 Workbench locator → Workbench 稳定 anchor + zoom 100%；
- 点击 Annotation locator → Annotation center + zoom 100%。

回到 100% 后重新进入 detail representation，用户可以继续正常编辑，而不是在极小 zoom 里直接操作复杂 Card UI。

## 数据边界

本批没有修改：

- Whiteboard schema；
- `whiteboards.json version: 1`；
- Record canonical truth；
- Card / Workbench durable x/y；
- groupId / parentGroupId；
- Edge / Annotation / Archive 数据合同。

semantic level / locator / camera / zoom 全是 ephemeral UI。

## 测试

新增：

- `test/unit/whiteboardSemanticZoomModel.test.ts`；
- `test/unit/whiteboardSemanticZoomUi.test.tsx`；
- `test/specs/whiteboard.e2e.ts` semantic overview 场景；
- F143 / F144 / F145 测试证据。

本环境真实 PASS：

- `test:syntax`；
- `test:language`；
- `test:evidence`（112 features）；
- `test:surface`；
- `test:system:strict:p2`（P0 40/40、P1 67/67、P2 5/5）；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`；
- 全项目 `src + test + scripts` 1028 个非 `.d.ts` TS/TSX/MTS 文件额外 transpile syntax scan：0 error。

基线同红项：

- `gate:quality` explicit-any budget 与 untouched 1.2.5 R3 数值完全相同；
- `gate:stability` 仍缺 CI workflow；
- `gate:product` 仍为同一 CI / README release-contract 缺口。

本 SOURCE 不含 `node_modules`，所以本环境不能真实运行 Jest / 完整 Typecheck / Vite build / Obsidian E2E。这些必须在用户本机依赖完整环境运行，不能伪写成 PASS。
