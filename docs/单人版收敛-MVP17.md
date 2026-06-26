# 单人版收敛 MVP17：Excel 单元格 / 网格交互模型抽离

## 目标

继续按“逐个视图抽离”的方向推进。本轮聚焦 `src/shared/ui/views/excel-view` 下的核心交互文件：

- `ExcelGrid.tsx`
- `ExcelCell.tsx`
- `useExcelCellEditing.ts`

MVP14 已经抽出了 `ExcelViewModel` 与 `ExcelViewToolbar`，但 Excel 的复杂度仍集中在单元格和网格层：列宽、键盘导航、粘贴矩阵、填充拖拽、单元格状态、编辑器展示、Markdown 内容展示都混在 UI 文件里。

本轮不删除文件，只抽出模型/helper 与展示子组件，因此继续交付补丁包。

## 本轮新增文件

- `src/shared/ui/views/excel-view/ExcelGridModel.ts`
- `src/shared/ui/views/excel-view/ExcelCellModel.ts`
- `src/shared/ui/views/excel-view/ExcelCellEditor.tsx`
- `src/shared/ui/views/excel-view/ExcelCellContent.tsx`
- `test/unit/excelGridModel.test.ts`
- `test/unit/excelCellModel.test.ts`

## 主要改动

### 1. ExcelGridModel

抽出网格层纯逻辑：

- `getExcelColumnBadge`
- `getExcelColumnTitle`
- `getExcelColumnWidth`
- `buildExcelColumnWidthStyle`
- `parseExcelClipboardMatrix`
- `focusExcelCellElement`
- `buildExcelGridCell`
- `findExcelGridCellPosition`
- `resolveExcelNavigationPosition`
- `selectExcelCellByPosition`
- `buildExcelFillRange`
- `buildExcelPastePlan`

`ExcelGrid.tsx` 现在主要负责：

- table/ref 生命周期
- column/header 渲染
- row/cell 组合
- 将模型层结果转交给上层回调

### 2. ExcelCellModel

抽出单元格层纯逻辑：

- `buildExcelCellUiState`
- `buildExcelCellTitle`
- `buildExcelCellClassName`
- `getExcelCellSaveState`
- `resolveExcelCellEditorKeyAction`
- `resolveExcelCellKeyAction`
- `getExcelTypedInputProps`
- `isExcelMarkdownInteractiveTarget`

`ExcelCell.tsx` 不再内联维护 title/className/键盘判断/readonly 文案等细节。

### 3. ExcelCellEditor / ExcelCellContent

将单元格内部两块展示拆开：

- `ExcelCellEditor.tsx`：负责 input / textarea / select 编辑器与 hint。
- `ExcelCellContent.tsx`：负责 Markdown 全文、content 预览和普通 displayValue。

这样 `ExcelCell.tsx` 的职责变成：

- draft 状态
- focus/select 生命周期
- 事件转发
- 组合 Editor / Content / 状态图标

### 4. 门禁加强

`single-user-convergence-gate` 新增检查：

- 要求 `ExcelGridModel.ts`、`ExcelCellModel.ts`、`ExcelCellEditor.tsx`、`ExcelCellContent.tsx` 存在。
- 限制 `ExcelGrid.tsx <= 210` 行。
- 限制 `ExcelCell.tsx <= 200` 行。
- 禁止 `ExcelGrid.tsx` 回流列宽、剪贴板、填充拖拽、本地位置 helper。
- 禁止 `ExcelCell.tsx` 回流键盘读取、readonly 文案、typed input props、markdown interactive target helper。

## 行数变化

- `ExcelGrid.tsx`：约 279 行 -> 187 行
- `ExcelCell.tsx`：约 294 行 -> 172 行

## 验证

已通过：

```bash
npm run single-user:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

当前环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。请本地执行 `npm ci` 后再跑单测、typecheck 和 build。

## 下一步

继续逐个视图抽离：

1. `ExcelCellEditing` / `useExcelCellEditing`：继续抽提交队列、pending/saved/error 状态 reducer。
2. `ExcelColumnToolbar`：抽字段分组、字段勾选、排序模型。
3. `TimerView / KanbanView / remaining shared view`：补齐模型层与 gate。
