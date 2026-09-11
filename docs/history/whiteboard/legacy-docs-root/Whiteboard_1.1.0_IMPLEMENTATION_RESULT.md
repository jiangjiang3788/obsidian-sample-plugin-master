# ThinkOS 白板 1.1.0 — Implementation Result

## 结论

实施状态：**代码完成，待用户本地 Jest / Typecheck / 真机体验验收。**

本版唯一目标已按代码边界完成：白板退出 ThinkOS 普通 View/Layout 体系，成为独立的 ThinkOS 一级 Workspace；新 durable state 使用 `Think/whiteboards.json`；旧 Association 数据按用户决定视为测试数据，不迁移。

## 用户可感知变化

- 普通 View 体系恢复为 10 种，不再有 AssociationView。
- Settings 的“添加 View”中不再出现白板/关联空间。
- Dashboard Layout 不再承载白板。
- Ribbon 增加“ThinkOS 白板”。
- Command Palette 增加“打开 ThinkOS 白板”。
- 白板打开在独立 Workspace Leaf 中。
- 页面永久左右分栏：左侧基础 Record Source，右侧白板。
- 1.1.0 左侧仅做关键词检索；Goal / Record Type / 时间筛选明确留到 1.1.1。
- 右侧保留卡片 XY 拖动、A→B、删除线、restart 恢复。
- 同一 Record 在同一白板默认不重复创建 projection。

## 数据真源

### Record

保持不变：Markdown Record / RecordRepository / DataStore 为 canonical business truth。

### Whiteboard

新路径：

```text
Think/whiteboards.json
```

默认 Board ID：

```text
whiteboard-default
```

只保存：board title、WhiteboardItem(recordId/x/y/zIndex)、WhiteboardEdge、modified。

## 历史测试数据处理

用户明确允许删除旧 Association 测试数据，因此本版不做迁移：

- 新 WhiteboardStore 成功 initialize 后清理 `Think/association-spaces.json`；
- Settings load 时识别旧 `AssociationView`；
- 清理旧 `viewInstances`；
- 清理 Layout `viewInstanceIds` 和 `viewPlacements` 中对应引用；
- 清理后的 Settings 立即重新写入 `data.json`；
- 不删除或修改任何 Markdown Record。

## 主要新增文件

```text
src/core/whiteboard/WhiteboardSchema.ts
src/core/whiteboard/WhiteboardStore.ts
src/core/whiteboard/public.ts

src/features/whiteboard/WhiteboardRoot.tsx
src/features/whiteboard/WhiteboardWorkspace.tsx
src/features/whiteboard/WhiteboardRecordSourcePanel.tsx
src/features/whiteboard/WhiteboardCard.tsx
src/features/whiteboard/WhiteboardDragModel.ts
src/features/whiteboard/WhiteboardEdgeGeometry.ts
src/features/whiteboard/WhiteboardEdgeLayer.tsx
src/features/whiteboard/WhiteboardRecordPresentation.ts
src/features/whiteboard/public.ts
src/features/whiteboard/registerFeature.ts

src/platform/obsidian/ThinkWhiteboardView.tsx
src/styles/features/whiteboard.css
```

## 主要修改范围

- App Services / DI / lifecycle：WhiteboardStore 独立接入，不强迫普通 Dashboard renderer 依赖 WhiteboardStore。
- startup：workspace/layout ready 后恢复 WhiteboardStore。
- main settings load：清理不再注册的旧 AssociationView settings shell。
- View registry/defaults/types/runtime/editor：移除 AssociationView。
- Dashboard View props/content：移除 Association 专用 wiring。
- Platform PluginHost：增加 Ribbon structural port。
- Feature boot：注册 standalone whiteboard workspace + Ribbon + Command。
- Test governance / feature map / E2E：普通 View 数恢复为 10，白板独立作为 F094。
- version：`package.json` / lock root / `manifest.json` = `1.1.0`。

## 删除的旧实现

```text
src/core/association/*
src/features/views/runtime/AssociationView/*
src/features/settings/views/editors/AssociationViewEditor.tsx
src/styles/features/association-view.css
```

旧 Association 专项 tests 也由 Whiteboard 专项 tests 替换。

## 自动检查结果（当前执行环境）

### PASS

- `npm run test:syntax`
- `npm run test:language`
- `npm run test:evidence`
- `npm run test:surface`
- `npm run gate:architecture`
- `npm run gate:records`
- 所有本版新增/修改 TS/TSX/MTS 文件 TypeScript `transpileModule` 静态转译：PASS

产品面审计结果：

```text
运行时普通 View：10
Settings View editor：10
```

### 已知红 Gate，但与 1.0.78 基线完全一致

`gate:ui-runtime`：

```text
CSS files 75 > budget 72
CSS lines 9647 > budget 8500
```

1.0.78 原基线 fresh run 也是同样 `75 / 9647`。

`gate:quality`：

```text
src any 400
test any 598
scripts any 4
total 1002
as any 620
: any 310
```

1.0.78 原基线数字完全相同。

`gate:stability`：原仓库缺 `.github/workflows/ci.yml`。

`gate:product`：同样缺 CI + README release acceptance 条目；version/manifest/secret checks 本版本身通过。

### 当前环境未执行

当前 artifact 环境没有项目 `node_modules`，因此没有冒充执行：

- `npm run typecheck:src`
- `npm run typecheck:test`
- Whiteboard Jest unit/integration
- Obsidian E2E
- production `npm run build`

这些需要用户在现有 Windows 项目环境补跑。

## 用户 CMD 专项验证

```cmd
npm run build
```

```cmd
npm run test:unit -- --runTestsByPath test/unit/whiteboardStore.test.ts test/unit/whiteboardWorkspace.test.tsx test/unit/whiteboardDragModel.test.ts test/unit/whiteboardEdgeGeometry.test.ts test/unit/whiteboardRecordPresentation.test.ts test/unit/whiteboardStartupRestore.test.ts test/unit/whiteboardWorkspaceRegistration.test.ts test/unit/whiteboardLegacyViewCleanup.test.ts test/unit/obsidianVaultPortStartupRead.test.ts
```

```cmd
npm run test:integration -- --runTestsByPath test/integration/whiteboardRestartLifecycle.test.ts test/integration/whiteboardRecordIntegrity.test.ts test/integration/whiteboardStartupVaultRecovery.test.ts test/integration/whiteboardDiPersistencePath.test.ts
```

```cmd
npm run typecheck:src
npm run typecheck:test
```

如果真机 E2E 环境可用：

```cmd
npm run test:e2e:p1
```

## 用户最小真机验收

1. 升级、build、Reload Obsidian。
2. 原 Dashboard / Layout 中旧“关联空间”测试模块应消失，其他普通 View 不受影响。
3. Settings 的普通 View 类型中不再出现 Association/白板。
4. Ribbon 点“ThinkOS 白板”，应打开独立 Workspace 页面，而不是插进 Dashboard Layout。
5. 左侧输入关键词，结果变化时右侧已经存在的卡不能消失/重排。
6. 通过 1.1.0 的“加入”按钮加入一条真实 Record；重复加入同一 Record 不应生成第二张卡。
7. 右侧拖动卡片，画 A→B，确认交互仍正常。
8. 确认 Vault 出现 `Think/whiteboards.json`。
9. 完整重启 Obsidian，卡片位置和 edge 仍恢复。
10. 确认旧 `Think/association-spaces.json` 被清理；任何 Markdown Record 均未被删除/改写。

## 1.1.1 Go / Hold

Go 条件：
- standalone 白板入口/重启恢复稳定；
- 普通 View/Layout 没有被白板污染；
- 历史测试 Association 壳清理正确；
- 用户认同“左找记录、右组织记录”的分栏模型。

满足后下一版只做 **1.1.1 左侧 Retrieval：keyword + Record Type + Goal + 时间/dateRole**。

Hold 条件：
- 白板仍出现在普通 View/Layout；
- whiteboards.json 重启恢复失败；
- 清理旧 AssociationView 时误伤普通 View；
- 左侧搜索仍会影响右侧已摆卡。
