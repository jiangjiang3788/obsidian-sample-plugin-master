# Whiteboard 1.2.8 Test Report

## 1. 专项 Jest

```bash
npm run test:unit -- --runTestsByPath \
  test/unit/whiteboardSemanticZoomModel.test.ts \
  test/unit/whiteboardSemanticZoomUi.test.tsx \
  test/unit/whiteboardContentHomeModel.test.ts \
  test/unit/whiteboardBoardToolsRecoveryUi.test.tsx \
  test/unit/whiteboardNestedReliabilityUi.test.tsx \
  test/unit/whiteboardZoomUi.test.tsx
```

必须全部 PASS。

重点：

- detail / compact / overview 阈值；
- 0.5% zoom inverse locator compensation 为 finite；
- compact 有 Card / Workbench fixed locator；
- overview 有 Card / Workbench / Annotation locator；
- 点击 locator 后 zoom=1、detail Card 恢复；
- locator focus 不调用 Store move/add/remove mutation；
- R3 Nested navigation / content-aware Home 不能回归。

## 2. 白板真 Obsidian E2E

```bash
npm run build:debug
npx wdio run ./test/configs/wdio.conf.mts --spec ./test/specs/whiteboard.e2e.ts
```

阻断场景：

1. 100% 正常 detail；
2. 缩到 20% 左右进入 compact；
3. 完整 Card 不再显示成几十像素的小卡，改成固定 screen-size 标题 locator；
4. Workbench 显示固定 screen-size locator；
5. 缩到 <10% 进入 overview；
6. Card locator 变成固定 screen-size 点标；
7. 在 overview 内继续从 ~8% 缩到 <3%，同一 marker 的 `getBoundingClientRect().width` 变化 <= 1px；
8. 点击 marker 后 zoom=100%、LOD=detail、真实 Card 重新出现；
9. Nested Workbench 中同样成立；
10. semantic zoom 前后 `Think/whiteboards.json` durable XY/groupId 不变化。

## 3. P1 真机

```bash
npm run test:e2e:p1
```

如果失败，请保留：

```text
reports/testing/e2e-p1-技术日志.txt
reports/testing/e2e-p1-结构化结果.json
reports/testing/e2e-artifacts/<本次失败目录>/
```

## 4. 完整代码测试

```bash
npm run test:full
```

## 5. 发布级测试

```bash
npm run test:release
```

发布级通过后再生成最终稳定插件 bundle。
