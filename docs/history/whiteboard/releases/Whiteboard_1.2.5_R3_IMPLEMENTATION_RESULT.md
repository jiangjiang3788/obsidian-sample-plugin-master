# Whiteboard 1.2.5 R3 Implementation Result

## 用户反馈

1. Console 已确认 `data-whiteboard-active-group-id` 有值，但 DOM 中不存在 `button[aria-label="返回上一级工作台"]`。
2. 极端 Zoom/Pan 后点击“回到画布中心”虽然回到 100%，但可能落在所有内容包围盒的巨大空白几何中心，仍看不到 Card/Workbench。
3. 极端缩放后缺少一个始终可用的“把内容找回来”动作。

## 修复

- 顶部子画布退出按钮改为直接由 `activeGroupId` 驱动；title/path 丢失时仍渲染，并用“当前工作台”兜底。
- 新增 `getWhiteboardCanvasHomePoint`：对真实可见 Card / Workbench 基础 frame / Annotation 生成候选点，使用坐标中位数抵抗远端离群节点，然后选择一个真实候选作为 100% Home。
- 新增 `getWhiteboardWorkbenchHomePoint`：进入/返回 Nested Workbench 时优先真实直接内容或子 Workbench；空 Workbench 使用其最小 frame 中心。
- “回到画布中心”语义改为“当前画布 Home + 100%”，保证目标是可见真实内容，而不是可能为空的几何中心。
- 顶部新增“适配当前画布内容”；Root 和 Nested 都可用，最大 zoom 100%。若内容跨度大到最小 zoom 仍放不下，退化为可见 Home，避免完全迷失。
- `ThinkIconButton` 允许调用方提供 tooltip，明确当前找回的是根白板还是具体 Workbench。

## 测试修正

- 修正旧 Workbench drag threshold 测试：3/2px 小于 5px threshold；原 4/3px 恰好等于 5px，按生产合同会开始拖动，旧断言本身不正确。
- 新增 Content Home 纯模型回归：远端 1,000,000 world outlier 不得把 Home 带到空白中点。
- 新增 BoardTools UI 回归：只要 `activeCanvasId` 存在，即使 title/path 暂时缺失也必须渲染父级/根白板退出按钮。
- 新增 E2E 场景：极端 Zoom + Pan → 回到画布中心 → zoom=100% 且至少一个真实内容节点与 viewport 相交 → Fit Current Canvas。

## 本环境已执行

PASS：`test:syntax`、`test:language`、`test:evidence`、`test:surface`、`gate:architecture`、`gate:records`、`gate:task-session`、`gate:energy`、`gate:ui-runtime`。

本交付环境未带 `node_modules`，因此不能在这里真实执行 Jest / Vite build / Obsidian E2E。用户本机日志已证明 Vite build 可以成功；R3 需在用户本机重新运行专项 Jest 与 P1 E2E。
