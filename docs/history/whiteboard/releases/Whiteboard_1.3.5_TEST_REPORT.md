# Whiteboard 1.3.5 Test Report

## 功能证据

新增 F151 — `Whiteboard Low-Zoom Mixed Node Arrange`（P1）。

覆盖：

- unit：mixed Card + Workbench grid / align / distribute；
- unit+persistence：`WhiteboardStore.moveNodes` 一次 mutation 移动 standalone Card + Workbench subtree；
- UI：低倍率 mixed selection 右键菜单、Workbench locator context menu、Card-only action 禁用规则；
- UI：Workspace 低倍率 mixed selection 执行 arrange 后调用一次 `moveNodes`；
- E2E：真实 Obsidian 低倍率 Card + Workbench mixed selection → 右键网格整理 → durable XY 持久化；
- regression：保留 1.3.2 mixed drag、1.3.3 Goal×Type×Time、1.3.4 guide selection。

功能地图更新为 **118 项：P0 42 / P1 71 / P2 5**。

## 本环境真实执行并通过

- `npm run test:syntax`；
- `npm run test:language`；
- `npm run test:evidence`；
- `npm run test:surface`；
- `npm run gate:architecture`；
- `npm run gate:records`；
- `npm run gate:task-session`；
- `npm run gate:energy`；
- `npm run gate:ui-runtime`；
- TypeScript `transpileModule` 额外扫描 `src + test + scripts`：**1036 个非 .d.ts TS/TSX/MTS，0 syntax error**。

## 与 1.3.4 基线一致的既有红项

当前与 untouched 1.3.4 对照：

- `gate:quality`：仍是原有 explicit-any budget 超限，数值完全相同；
- `gate:stability`：仍是原有 `.github/workflows/ci.yml` 缺失；
- `gate:product`：仍是同一 CI / README release contract；
- version-sync / manifest 已同步到 1.3.5。

1.3.5 没有新增上述红项。

## 本环境无法真实执行

交付 SOURCE 不含 `node_modules`，因此：

- Jest unit/integration 不能在本容器真实运行；
- 完整 Typecheck 在入口即缺 `node / preact / vite/client` 类型；
- Vite Build / Obsidian E2E 不能在本容器真实执行。

不能把“测试代码已加入”写成“Jest/E2E 已通过”。

## 用户本机阻断命令

依赖完整环境直接运行：

```bash
npm run test:whiteboard:full
```

专项快速验证：

```bash
npm run test:unit -- --runTestsByPath test/unit/whiteboardNodeArrangeModel.test.ts test/unit/whiteboardContextMenuUi.test.tsx test/unit/whiteboardSemanticZoomUi.test.tsx test/unit/whiteboardStore.test.ts
npm run build:debug
npx wdio run ./test/configs/wdio.conf.mts --spec ./test/specs/whiteboard.e2e.ts
```

真机重点：缩到 compact/overview → Ctrl/⌘ 混选 Card + Workbench → 右键 Workbench locator → 网格/对齐 → 检查 subtree 与 standalone Card 一次移动、Undo 一步恢复、重启后位置仍在。
