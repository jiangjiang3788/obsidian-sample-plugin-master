# Whiteboard 1.3.6 Test Report

## 功能证据

新增 F152 — `Whiteboard Daily-use Closure`（P0）。

覆盖：

- unit：Restore → Undo → Redo 的 Archive placement / Restore origin / membership / incident edge；
- integration：batch neutral grid → Goal×Type×Time → low-zoom arrange model → L1–L4 Workbench → annotation/edge → Archive → Restore → Undo → Restart；
- persistence：Store snapshot 与 `Think/whiteboards.json` durable contract；
- restart：Undo 后归档 snapshot、4 层 nested membership、annotation、edge 跨重启；
- E2E：真实 Obsidian 连续 UI 主链“左侧批量拖入 → 普通网格 → 目标×类型×时间 → 低倍率整理 → Nested Workbench → Archive Canvas move → Restore → Undo”；
- regression：继续保护 Drop ≠ Semantic Arrange、Arrange ≠ Group、Archive placement ≠ Restore origin、history 不跨重启。

功能地图更新为 **119 项：P0 43 / P1 71 / P2 5**。

## 本环境真实执行并通过

- `npm run test:syntax`；
- `npm run test:language`；
- `npm run test:evidence`；
- `npm run test:surface`；
- `npm run test:system:strict:p2`；
- `npm run gate:architecture`；
- `npm run gate:records`；
- `npm run gate:task-session`；
- `npm run gate:energy`；
- `npm run gate:ui-runtime`。

测试体系报告：**P0 43/43、P1 71/71、P2 5/5，缺失 0**。

## 与 untouched 1.3.5 对照的既有红项

`gate:quality` 在 1.3.6 与 untouched 1.3.5 数值完全相同：

- src explicit any：400 / budget 390；
- test explicit any：598 / budget 593；
- scripts：4 / 4；
- total：1002 / budget 987；
- `as any`：620 / budget 605。

因此 1.3.6 没有新增 explicit-any 债务。

另外仍是基线既有项：

- `gate:stability`：`.github/workflows/ci.yml` 缺失；
- `gate:product`：同一 CI / README release contract 未满足；
- `version-sync` 与 manifest 自身已通过，版本均为 1.3.6。

## 本环境无法真实执行

交付 SOURCE 不含 `node_modules`。

实际尝试 Typecheck 后，入口直接缺依赖类型：

- E2E：`@wdio/globals/types`、`@wdio/mocha-framework`、`node`；
- Test：`jest`、`node`、`preact`、`vite/client`。

因此本容器不能真实执行：

- Jest unit / integration；
- 完整 Typecheck；
- Vite build；
- Obsidian Webdriver E2E。

不能把“测试代码已加入”写成“Jest / 真机 E2E 已通过”。

## 用户本机阻断命令

依赖完整环境建议直接运行：

```bash
npm run test:whiteboard:full
```

若只先验证 1.3.6 核心合同：

```bash
npm run test:unit -- --runTestsByPath test/unit/whiteboardStore.test.ts
npm run test:integration -- --runTestsByPath test/integration/whiteboardDailyUseClosure.test.ts
npm run build:debug
npx wdio run ./test/configs/wdio.conf.mts --spec ./test/specs/whiteboard.e2e.ts
```

真机重点只看一件事：从左侧四条 Record 一路操作到 `Restore → Undo`，中间不要手工刷新或重建状态；最后 Undo 后目标卡应重新处于 Archive，Archive placement 保持 Restore 前的位置，Restore origin / Workbench membership 仍正确。
