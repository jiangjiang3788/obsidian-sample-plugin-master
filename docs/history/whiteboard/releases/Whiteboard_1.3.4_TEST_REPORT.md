# Whiteboard 1.3.4 Test Report

## 功能证据

本批新增：

- F147 — Archive Canvas / Independent Archive Position（P0）；
- F148 — Semantic Mixed Card + Workbench Interaction（P1）；
- F149 — Goal × Record Type × Time Semantic Layout（P1）；
- F150 — Semantic Layout Header Selection（P1）。

测试地图当前共 117 项：P0 42/42、P1 70/70、P2 5/5 证据完整。

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
- `npm run gate:ui-runtime`；
- 对 `src + test + scripts` 的 1034 个非 `.d.ts` TS/TSX/MTS 做额外 TypeScript `transpileModule` 语法扫描：0 error。

## 重点自动测试矩阵

### Archive Canvas

- 归档时同时保存 restore origin 与独立 archive position；
- Archive Canvas 重排 / 拖动只改 `archiveX/archiveY/archiveZIndex`；
- Restore strip 掉 archive placement 并恢复原 x/y/groupId；
- Restart 后两套位置都保留；
- Archive Canvas Ctrl/⌘ marquee、全选、grid、Goal×Type×Time 入口；
- 真机 E2E 写入 `whiteboards.json` 验证 archive position 改变但 restore origin 不变。

### Semantic Interaction

- 当前 Canvas direct node 过滤；
- Root 只看 Root Card + Root Workbench，不重复选 Workbench 内部 Card；
- Card + Workbench locator Ctrl/⌘ 混选；
- mixed selection drag 只调用一次 `translateNodes`；
- ancestor/descendant Workbench selection 去重；
- selected Workbench subtree 与 standalone Card 使用相同 durable delta；
- archived member restore origin 随父 Workbench 移动，但 archive placement 保持不动；
- Restart 后 durable XY/group 保留，而 selection 本身不持久化。

### Goal × Type × Time

- 第一版 preset 固定为 Goal group / Record Type x / Month y / cell grid；
- 一个 Goal 一块；
- 类型变化改变 x；月份变化改变 y；
- 同 cell 多卡不重叠；
- 无 Goal / 无时间不丢记录；
- `date/dateMs` 优先于 created；
- 自定义 `LayoutSpec` 的 group/x/y 真正驱动算法，证明接口不是假抽象；
- 原 1.1.6 batch drop grid 测试继续作为回归证据，确保默认拖入没有被语义布局接管；
- Goal / Type / Time guide 点击回选准确 itemIds；
- E2E 覆盖 Root semantic arrange、guide 回选、低倍率 Card + Workbench mixed drag 与 durable delta。

## 基线红项对照

`gate:quality` 在 untouched 1.3.0 与 1.3.4 上均仍失败，数值已收敛到完全相同：

- src explicit any：400；
- test explicit any：598；
- total：1002；
- as any：620。

因此本批没有新增 any-budget 债务。

`gate:stability` 两边均因仓库缺 `.github/workflows/ci.yml` 失败。

`gate:product` 两边均因同一 CI workflow / README release-contract 缺口失败；1.3.4 自身 version-sync 与 manifest gate 已通过。

## 本环境不能冒充 PASS 的项目

交付源码不包含 `node_modules`。因此这里无法真实执行 Jest / 完整 Typecheck / Vite Build / Obsidian E2E。最终收口必须在用户本机依赖完整环境执行：

```bash
npm run test:whiteboard:full
```

若希望先快速定位本批：

```bash
npm run test:unit -- --runTestsByPath \
  test/unit/whiteboardSemanticLayoutModel.test.ts \
  test/unit/whiteboardSemanticLayoutUi.test.tsx \
  test/unit/whiteboardArchiveUi.test.tsx \
  test/unit/whiteboardSemanticZoomUi.test.tsx \
  test/unit/whiteboardSelectionModel.test.ts \
  test/unit/whiteboardStore.test.ts

npm run test:integration -- --runTestsByPath test/integration/whiteboardRestartLifecycle.test.ts
npm run build:debug
npx wdio run ./test/configs/wdio.conf.mts --spec ./test/specs/whiteboard.e2e.ts
```

## 真机手工验收

1. 归档 3–5 张卡，进入“归档工作台”，随意 Pan/Zoom 和拖动；退出再进位置不丢。
2. 在归档工作台整理后恢复一张卡，确认回原白板 / 原 Workbench / 原位置，而不是归档工作台的新位置。
3. 白板缩到 20% 或 5%，Ctrl/⌘ 点一个 Card locator + 一个 Workbench locator，拖 Workbench locator，二者一起移动。
4. Workbench 内部卡不能在父 Canvas 同时作为独立 locator 被重复选中。
5. 选 10+ 张卡右键 `目标 × 类型 × 时间`：Goal 分块、Type 横向、月份纵向，同格多卡网格。
6. 左侧重新批量拖一批 Record：默认仍然只是普通网格落地，不自动套 Goal/Type/Time。
7. 点击 Goal 标题只选该 Goal；点击 Type / Month 标题只选对应列/行卡片。
8. 点击标题选中后，可继续“用所选创建工作台”；仅执行 Arrange 时不能自动创建 Workbench。
