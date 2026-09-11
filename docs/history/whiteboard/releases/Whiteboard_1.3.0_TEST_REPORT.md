# Whiteboard 1.3.0 Test Report

## 目标

本报告针对白板“功能越多、组合后越容易互相打架”的阶段，重点验证 Nested / Archive / Restart / Edge / Annotation / Semantic Zoom 之间的边界，而不是继续增加新功能。

## 新增证据 F146

**Whiteboard Cross-feature Stability / Nested Restore Recovery**，风险等级 P0。

证据：

- UI：`test/unit/whiteboardArchiveUi.test.tsx`
- Integration/Persistence/Restart：`test/integration/whiteboardRestartLifecycle.test.ts`
- E2E/Persistence/Restart：`test/specs/whiteboard.e2e.ts`

## UI 专项

新增/更新断言：

1. Root archived item Restore 后以真实 Card center 找回，并回到 100%。
2. Archive panel Restore 成功后自动关闭。
3. 深层 archived item Restore 后：
   - `data-whiteboard-active-group-id` 切到原 child group；
   - zoom 从 125% 回 100%；
   - camera 指向该 Card center；
   - Parent exit 按钮存在。

## Durable 四层矩阵

组合：

`4-level Nested -> 2 items -> Edge(label) -> Sticky -> Archive endpoint -> Move ancestor -> Restore -> Restart`

断言：

- descendant groups 全部按同一个 delta 平移；
- active item 平移；
- archived item 同步平移；
- Annotation 同步平移；
- endpoint 归档期间 Edge 在 archivedEdges；
- Restore 后 Edge 回 active edges；
- Edge label 不丢；
- Restart 后全部 groupId / parentGroupId / XY / zIndex / label 保持；
- archivedItems / archivedEdges 最终为空。

## 真 Obsidian E2E 新路径

`Root -> Parent -> Child -> 加入 Record -> Archive -> Root -> Restore -> 自动 Child 100% -> Reload -> Root + durable child membership`

这是 1.3.0 的阻断验收路径。

## 本环境执行结果

真实 PASS：

```text
test:syntax
test:language
test:evidence (113)
test:surface
test:system:strict:p2 (P0 41/41, P1 67/67, P2 5/5)
gate:architecture
gate:records
gate:task-session
gate:energy
gate:ui-runtime
TypeScript transpile syntax scan: 1028 files / 0 errors
```

基线同红项：

```text
gate:quality   explicit-any budget，数值与 untouched 1.2.8 完全相同
gate:stability 缺 .github/workflows/ci.yml
gate:product   同一 CI / README release-contract 缺口
```

未在本交付容器真实通过：

```text
Jest / Build / Obsidian E2E
```

原因：SOURCE 不含 `node_modules`。实际尝试结果：

```text
npm run test:whiteboard -> system/syntax 通过后缺 node_modules/jest/bin/jest.js
npm run build:debug     -> vite: not found
npm run typecheck       -> 缺 node / preact / vite/client 类型定义
```

## 用户本机一条命令

依赖已经安装时：

```bash
npm run test:whiteboard:full
```

拆分定位：

```bash
npm run test:whiteboard
npm run test:whiteboard:e2e
```

如果白板完整测试失败，优先提供：

```text
reports/testing/单元测试-失败技术日志.txt
reports/testing/e2e-p1-技术日志.txt
reports/testing/e2e-p1-结构化结果.json
```

如果直接使用 `test:whiteboard:e2e`，同时保留 Webdriver/WDIO 终端输出即可。
