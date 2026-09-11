# Whiteboard 1.3.0 Implementation Result

## 本版定位

1.2.8 已完成 Semantic Zoom / Overview Locator。最新路线中的 1.2.9 是**条件性能版本**，只有真实大白板出现明确卡顿才实施。本轮没有收到性能卡顿证据，因此不做 viewport culling / spatial index，而直接进入白板跨功能稳定性收口，版本定为 **1.3.0**。

## 1. 深层 Archive / Restore 找回修复

此前 Archive durable 数据本身可恢复，但从 Root 打开归档箱恢复一个属于深层 Workbench 的卡片时，UI 只移动 camera，并不会切换到该卡所属的 Nested Canvas。结果是数据恢复成功，用户仍可能“看不到恢复的卡”。

1.3.0 修改 `WhiteboardWorkspace` 的 Restore 完成路径：

- Restore 成功后关闭归档箱；
- 清除临时 selection；
- 根据恢复 item 的原 `groupId` 调用 Nested reveal；
- 自动进入原 Workbench；
- camera/zoom 用 `resetViewOnWorldPoint()` 直接回 **100%**；
- 使用真实 Card center（`x + cardWidth/2`, `y + cardHeight/2`）作为找回目标，而不是 item 左上角或 Root canvas。

Root item 恢复时同一逻辑会自动回 Root；Nested item 则进入原组。所有 navigation/camera/zoom 仍为 ephemeral，不新增持久化字段。

## 2. 四层跨功能 durable 稳定性矩阵

新增 4 层 Workbench 组合生命周期证据，覆盖：

1. A > B > C > D 四层 `parentGroupId`；
2. D 内两个 Record Projection；
3. 两卡之间带 label 的 Edge；
4. D 内 Sticky Annotation；
5. 归档其中一个 Edge endpoint；
6. 移动最上层 A；
7. 验证 active item / archived item / Annotation / B-C-D 整棵 subtree 同步平移；
8. Restore endpoint；
9. 验证 archived Edge 恢复且 label 保持；
10. dispose + restart；
11. 再验证 group tree / XY / zIndex / Annotation / Edge label / membership 完整一致。

这组测试直接覆盖目前最容易出交叉回归的 durable 链路。

## 3. 新增白板专项测试命令

以后不用再手工拼一长串 whiteboard 测试路径。

```bash
npm run test:whiteboard
```

执行：测试体系严格审计 + 测试语法 + 全部 whiteboard unit + integration。

```bash
npm run test:whiteboard:e2e
```

执行：`build:debug` + 只运行真实 Obsidian `test/specs/whiteboard.e2e.ts`。

```bash
npm run test:whiteboard:full
```

执行前两者，作为白板专项完整验收。

中文别名：

```bash
npm run 测试:白板
npm run 测试:白板:真机
npm run 测试:白板:完整
```

`npm run test:help` 已同步这些命令。

## 4. 真机 E2E 新场景

`whiteboard.e2e.ts` 新增 1.3.0 场景：

- Root 新建父 Workbench；
- 进入父 Workbench 后创建子 Workbench；
- 进入子 Workbench；
- 从左侧把专用 Record 加入当前子画布；
- Archive；
- 退出 Root；
- 从 Root 归档箱 Restore；
- 断言自动回原 child Workbench；
- 断言 zoom=1；
- 断言 Archive panel 已关闭；
- 断言真实卡片可见；
- Reload Obsidian；
- 导航按设计回 Root，但 durable `groupId` 仍指向原 child。

## 5. 数据与架构边界

本版没有修改：

- `Think/whiteboards.json version: 1`；
- canonical Record；
- Whiteboard item/group/edge/annotation schema；
- 最大 4 层 Nested Workbench；
- absolute world XY；
- Semantic Zoom 阈值；
- locator 数据合同。

没有实施 1.2.9 的 culling / spatial index / lazy render。

## 6. 版本

- `manifest.json`: 1.3.0
- `package.json`: 1.3.0
- `package-lock.json`: 1.3.0

## 7. 自动验证

本环境真实 PASS：

- `test:syntax`；
- `test:language`；
- `test:evidence`：113 features；
- `test:surface`；
- `test:system:strict:p2`：P0 41/41、P1 67/67、P2 5/5；
- `gate:architecture`；
- `gate:records`；
- `gate:task-session`；
- `gate:energy`；
- `gate:ui-runtime`；
- `src + test + scripts` 1028 个非 `.d.ts` TS/TSX/MTS 文件 `transpileModule` 语法扫描：0 error；
- metadata JSON parse；
- `npm run test:help`。

与 untouched 1.2.8 基线逐项相同、不是 1.3.0 新增的红项：

- `gate:quality`：src/test/total explicit-any budget 与基线完全相同；
- `gate:stability`：仍缺 `.github/workflows/ci.yml`；
- `gate:product`：仍为同一 CI / README release-contract 缺口。

本 SOURCE 不含 `node_modules`。本环境实际执行：

- `npm run test:whiteboard`：system/syntax 已通过，随后明确停在 `node_modules/jest/bin/jest.js` 不存在；
- `npm run build:debug`：`vite: not found`；
- `npm run typecheck`：缺 `node` / `preact` / `vite/client` 类型定义。

因此 Jest / 完整 Typecheck / Build / 真实 Obsidian E2E 不标记为 PASS。用户本机已具备依赖时应直接执行 `npm run test:whiteboard:full`。
