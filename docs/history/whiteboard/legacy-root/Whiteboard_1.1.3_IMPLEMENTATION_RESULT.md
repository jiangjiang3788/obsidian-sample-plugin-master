# ThinkOS Whiteboard 1.1.3 — 白板内定位 + 工作区收纳

## 本版唯一目标

让用户在卡片变多以后，能快速定位当前白板已经存在的卡，同时把左侧 Record Source / 筛选收起来给画布更多空间；所有这些 UI 状态均为 ephemeral，不改变白板空间数据。

## 明确不做

- 不做多白板；
- 不做白板缩放（已正式加入 1.1.5 路线）；
- 不做多选/框选；
- 不做附近记录；
- 不做 AI；
- 不改 WhiteboardStore schema；
- 不改 Record / Markdown；
- 不把白板重新放回 View/Layout。

## 实际修改

生产文件：

- `src/features/whiteboard/WhiteboardFindModel.ts`（新增）
- `src/features/whiteboard/WhiteboardFindController.ts`（新增）
- `src/features/whiteboard/WhiteboardBoardTools.tsx`（新增）
- `src/features/whiteboard/WhiteboardWorkspace.tsx`
- `src/features/whiteboard/WhiteboardCard.tsx`
- `src/features/whiteboard/WhiteboardRecordFilters.tsx`
- `src/styles/features/whiteboard.css`

治理 / 测试：

- `test/unit/whiteboardFindModel.test.ts`（新增）
- `test/unit/whiteboardFindUi.test.tsx`（新增）
- `test/system/feature-test-map.json`（新增 F096）

版本：

- `package.json` → 1.1.3
- `package-lock.json` → 1.1.3
- `manifest.json` → 1.1.3

## 核心行为

### 1. 白板右上角定位

右上角常驻 `查找白板卡片`：

- 只搜索当前 `WhiteboardBoard.items`；
- 使用 canonical Record 当前内容构造匹配文本，不复制到 Whiteboard JSON；
- 支持标题、正文、Goal、Record Type、日期、当前卡片详情；
- dangling Record 仍可用 `recordId` 定位；
- 空查询不产生任何视觉状态。

### 2. 不破坏空间记忆

有查询时：

- 当前命中项 = active highlight；
- 其他命中项 = match highlight；
- 非命中项 = dim；
- 所有卡片仍存在，XY/zIndex/Edge 完全不变；
- 不调用 `WhiteboardStore` mutation；
- 不写 `Think/whiteboards.json`。

### 3. 上一项 / 下一项

- Enter / ↓ = 下一项；
- Shift+Enter / ↑ = 上一项；
- 循环；
- active 卡片 `scrollIntoView(center)`；
- Ctrl/⌘+F 聚焦白板查找；
- Esc 清除当前白板查找。

### 4. 左侧整体收起

白板左上角提供 Record Source 收起/展开按钮：

- 收起后 Board 占满可用宽度；
- Source 组件不卸载，因此当前关键词、Goal/Type/时间筛选仍保留；
- Source 收起时不作为“右拖左移出白板”的 drop target，避免对不可见区域执行动作；
- 展开后恢复原 Source 状态。

### 5. 筛选范围折叠

`筛选范围` 标题本身可折叠：

- 折叠只隐藏 Type / Goal / Time UI；
- 已生效筛选继续生效；
- `清除筛选` 在有活动筛选时仍可见；
- 不持久化折叠状态。

## 架构调整

第一轮 Architecture Gate 抓到 `WhiteboardWorkspace.tsx` 超过 TSX 热点预算。没有提高预算，而是把 1.1.3 的定位职责拆成：

- `WhiteboardFindModel`：纯匹配/循环模型；
- `WhiteboardFindController`：ephemeral state、scroll/focus/keyboard；
- `WhiteboardBoardTools`：右上角定位 + 左侧收起按钮。

最终 `WhiteboardWorkspace.tsx` 回到约 331 行，Architecture Gate 恢复 PASS。

CSS 仍保持单 `whiteboard.css` 文件，没有新增 CSS 文件；为满足现有 largest-file 治理预算，1.1.3 新规则使用紧凑声明，`whiteboard.css` 保持 480 行以下。

## 自动检查（当前环境实际执行）

PASS：

- `npm run test:syntax`
- `npm run test:language`
- `npm run test:evidence`
- `npm run test:surface`
- `npm run gate:architecture`
- `npm run gate:records`
- `npm run gate:ui-runtime` 的非 CSS 结构检查；fresh CSS audit 后只剩既有总量预算红项
- product gate 内的 secret / version-sync / manifest 检查

版本同步：1.1.3。

### 既有基线红项（与 1.1.2 对照完全一致）

`gate:quality`：

- src explicit any `400 / 390`
- test explicit any `598 / 593`
- total `1002 / 987`
- as-any `620 / 605`

`gate:stability`：

- 源码包缺 `.github/workflows/ci.yml`

`gate:product`：

- 同样缺 CI contract；
- README 缺既有 release/acceptance 文案。

这些数字/失败项与 1.1.2 原源码对照一致，本版没有新增 any/CI/README 回归。

## 当前环境未执行

源码 ZIP 不包含 `node_modules`，因此本环境不能真实执行 Jest / 完整 Typecheck。新增测试已经写入：

- `test/unit/whiteboardFindModel.test.ts`
- `test/unit/whiteboardFindUi.test.tsx`

请在用户本地依赖环境执行。

## 用户 CMD 专项测试

```cmd
npm run build
npm run test:unit -- --runTestsByPath test/unit/whiteboardFindModel.test.ts test/unit/whiteboardFindUi.test.tsx test/unit/whiteboardRecordFilters.test.tsx test/unit/whiteboardRecordSourceQuery.test.ts test/unit/whiteboardTransferModel.test.ts test/unit/whiteboardDirectTransferUi.test.tsx
npm run test:integration -- --runTestsByPath test/integration/whiteboardRestartLifecycle.test.ts test/integration/whiteboardRecordIntegrity.test.ts test/integration/whiteboardStartupVaultRecovery.test.ts test/integration/whiteboardDiPersistencePath.test.ts
```

## 最小真机验收

1. 白板右上角能输入查找词；
2. 匹配卡高亮，其他卡变淡，但没有任何卡消失或重新排列；
3. ↑/↓ 或 Enter/Shift+Enter 能循环定位；
4. 清除查找后所有卡恢复正常；
5. 折叠“筛选范围”，筛选仍继续生效；
6. 收起整个左栏，右侧画布明显扩展；
7. 再展开左栏，之前的搜索/筛选状态仍在；
8. 重启后白板卡片/XY/Edge 仍正常；定位和折叠状态不要求恢复（ephemeral）。

## 下一步

**1.1.4 Hold。** 先确认定位与工作区收纳是否自然。

白板缩放已正式排入 **1.1.5**：有界 50%–200%、Ctrl/⌘+wheel、`- / 100% / +`，逻辑 XY/Edge 保持未缩放坐标并补全拖放坐标换算；不引入完整无限画布引擎。
