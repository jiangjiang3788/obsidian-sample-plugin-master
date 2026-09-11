# Whiteboard 1.2.5 R3 Test Report

## 必跑专项单测

```bash
npm run test:unit -- --runTestsByPath \
  test/unit/whiteboardContentHomeModel.test.ts \
  test/unit/whiteboardBoardToolsRecoveryUi.test.tsx \
  test/unit/whiteboardWorkbenchModel.test.ts \
  test/unit/whiteboardNestedReliabilityUi.test.tsx \
  test/unit/whiteboardCanvasBreadcrumbs.test.tsx \
  test/unit/whiteboardNestedNavigationModel.test.ts
```

预期：所有文件 PASS。特别检查：
- `whiteboardWorkbenchModel.test.ts` 不再在恰好 5px threshold 上错误期待 `null`；
- `whiteboardNestedReliabilityUi.test.tsx` 必须真正执行测试用例，不能是 suite error；若仍 suite error，提交 `reports/testing/单元测试-失败技术日志.txt`。

## 必跑真机 P1

```bash
npm run test:e2e:p1
```

或只跑白板：

```bash
npm run build:debug
npx wdio run ./test/configs/wdio.conf.mts --spec ./test/specs/whiteboard.e2e.ts
```

重点阻断场景：
1. 进入二级 Workbench 后 `data-whiteboard-active-group-id` 非空；
2. DOM 必须存在 `button[aria-label="返回上一级工作台"]` 与 `button[aria-label="退出到根白板"]`；
3. 左侧 Record 可拖入当前二级 Workbench；
4. 极端 Zoom/Pan 后点“回到画布中心”，zoom 必须为 1，且至少一个 Card/Workbench/Annotation 与 viewport 相交；
5. “适配当前画布内容”在 Root/Nested 都可用；
6. reload 后 durable membership / XY 保留，导航回 Root。

如果 P1 仍失败，请提交 `reports/testing/e2e-p1-技术日志.txt` 和 `reports/testing/e2e-p1-结构化结果.json`；构建日志不能替代 E2E 断言失败日志。
