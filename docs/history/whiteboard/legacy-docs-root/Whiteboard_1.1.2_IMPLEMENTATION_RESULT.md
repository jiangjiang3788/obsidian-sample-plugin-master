# ThinkOS 白板 1.1.2 — 左右直接拖实施结果

## 本版唯一目标

让“找到 Record → 加入白板 → 决定放在哪里”合成一次直接操纵，并支持把白板卡拖回左栏移出 Projection。

## 用户可感知变化

- 左侧每条搜索结果恢复为独立小卡片；筛选区仍保持平面列表/分割线风格。
- 左侧 Record 小卡片可直接拖到右侧白板指定位置。
- 右侧已有白板卡可拖回左栏；左栏会出现“松开移出白板”提示。
- 右拖左只删除 WhiteboardItem，并由 Store 清理 incident edges；canonical Record / Markdown 不删除。
- 已经在当前白板的 Record 继续禁止重复拖入，避免制造第二 Projection。
- “加入”按钮保留作为非拖拽 fallback。

## 实际修改

生产代码：

- `src/features/whiteboard/WhiteboardTransferModel.ts`（新增）
- `src/features/whiteboard/WhiteboardRecordSourcePanel.tsx`
- `src/features/whiteboard/WhiteboardWorkspace.tsx`
- `src/features/whiteboard/WhiteboardCard.tsx`
- `src/features/whiteboard/public.ts`
- `src/styles/features/whiteboard.css`

测试/治理：

- `test/unit/whiteboardTransferModel.test.ts`（新增）
- `test/unit/whiteboardDirectTransferUi.test.tsx`（新增）
- `test/unit/whiteboardWorkspace.test.tsx`
- `test/unit/whiteboardStore.test.ts`
- `test/integration/whiteboardRecordIntegrity.test.ts`
- `test/integration/whiteboardRestartLifecycle.test.ts`
- `test/specs/whiteboard.e2e.ts`
- `test/system/feature-test-map.json`（新增 F095）

版本：`package.json / package-lock.json / manifest.json` → `1.1.2`。

## 数据真源

无 schema 变更。仍然只有：

```text
Think/whiteboards.json
  boards
    items(recordId, x, y, zIndex)
    edges(fromItemId, toItemId)
```

没有复制 Record 内容，没有修改 Markdown Record。

## 交互合同

### 左 → 右

```text
source card pointerdown
→ 超过 5px threshold 才成为 drag
→ pointermove 只更新 ephemeral drag preview
→ pointerup 若落在 board viewport
→ 用 viewport rect + scroll 计算 XY
→ WhiteboardStore.addRecord() 一次
```

### 右 → 左

```text
board card 原有内部 drag
→ pointer 进入左 Source 区时显示移出提示
→ pointerup 落在 Source 区
→ removeItem() 一次
→ incident edges 同步清理
→ 原 Record / Markdown 保留
```

如果右侧卡没有落在 Source 区，则仍按原 1.1.0/1.1.1 规则保存新的 XY。

## 自动检查

已执行并通过：

- `npm run test:syntax`
- `npm run test:language`
- `npm run test:evidence`
- `npm run test:surface`
- `npm run gate:architecture`
- `npm run gate:records`
- `npm run gate:ui-runtime`
- 12 个本版 TS/TSX/MTS 文件静态 TypeScript transpile：PASS

Fresh CSS audit：

- CSS files：75
- CSS lines：9857
- whiteboard.css：472 lines
- 本版新增 hardcoded colors outside tokens：0
- 本版新增 `!important`：0
- unprefixed classes：0

`gate:quality / gate:stability / gate:product` 仍存在仓库既有基线失败：explicit-any 固定预算、缺 `.github/workflows/ci.yml`、README release contract；1.1.2 的 explicit-any 数与 1.1.1 基线一致（400 / 598 / 1002）。

## 当前环境未执行

当前交付环境没有项目 `node_modules`，因此 Jest / 完整 `tsc` / 真 Obsidian E2E 未执行。不能把静态检查冒充这些行为测试。

## 用户 CMD 专项测试

```cmd
npm run build
npm run test:unit -- --runTestsByPath test/unit/whiteboardTransferModel.test.ts test/unit/whiteboardDirectTransferUi.test.tsx test/unit/whiteboardRecordSourceQuery.test.ts test/unit/whiteboardRecordFilters.test.tsx test/unit/whiteboardDragModel.test.ts
npm run test:integration -- --runTestsByPath test/integration/whiteboardRecordIntegrity.test.ts test/integration/whiteboardRestartLifecycle.test.ts test/integration/whiteboardStartupVaultRecovery.test.ts test/integration/whiteboardDiPersistencePath.test.ts
npm run typecheck:src
npm run typecheck:test
```

真机如果 E2E 环境可用：

```cmd
npm run test:e2e:p1
```

## 用户手动验证

1. 左侧搜索一条未在白板的真实 Record，按住小卡片拖到右侧指定位置，松手后卡片应出现在该位置附近。
2. 完整重启 Obsidian，确认这张卡的位置仍恢复。
3. 再把这张白板卡拖回左侧；左栏应出现“松开移出白板”。
4. 松手后白板卡消失，但左侧搜索仍能找到原 Record，Markdown 原文件仍存在。
5. 给两张卡先画一条 A→B，再把其中一张拖回左侧；卡和 incident edge 都应从白板移除，但 Record 不删除。
6. 已在白板的 Record 小卡片应显示“已在白板”，不能再次拖入制造重复 Projection。

## 下一步

**Hold 1.1.3，等待 1.1.2 真机验证。**

下一版候选：白板内 `Ctrl+F / 定位卡片`，只高亮/淡化/bring into view，不隐藏、不重排、不写盘。
