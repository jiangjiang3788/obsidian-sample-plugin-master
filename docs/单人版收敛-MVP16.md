# 单人版收敛 MVP16：抽离 BlockView 与 TableView

## 目标

继续按“逐个视图抽离”的方式推进 shared view 收敛。本轮处理基础列表/表格视图：`BlockView` 与 `TableView`。

## 改动

### BlockView

- 新增 `src/shared/ui/views/BlockViewModel.ts`
  - `resolveBlockViewGroupFields`
  - `buildBlockViewRenderModel`
  - `findBlockViewTimer`
  - `buildBlockViewGroupClassNames`
- 新增 `src/shared/ui/views/BlockViewItemList.tsx`
  - 承接 `TaskRow` / `BlockItem` 渲染
  - 承接 timer 查找
  - 承接 task/block 分支展示
- `src/shared/ui/views/BlockView.tsx` 从约 151 行降到约 103 行
  - 只保留容器宽度监听、render model memo、GroupedContainer 组合
  - 不再直接维护 `renderItem`
  - 不再直接调用分组构造逻辑

### TableView

- 新增 `src/shared/ui/views/TableViewModel.ts`
  - `isTableViewConfigured`
  - `getTableViewEmptyMessage`
  - `buildTableViewRenderModel`
  - `findTableViewTimer`
- 新增 `src/shared/ui/views/TableViewCell.tsx`
  - 承接空单元格
  - 承接 `TaskRow` / `ItemLink` 渲染
  - 承接 timer 查找和紧凑任务展示
- `src/shared/ui/views/TableView.tsx` 从约 80 行降到约 61 行
  - 只保留表头、行遍历、单元格组合
  - 不再直接调用 `buildTableMatrix`
  - 不再直接维护 `renderCellItem`

### 单测

- 新增 `test/unit/blockViewModel.test.ts`
- 新增 `test/unit/tableViewModel.test.ts`

### 门禁

`single-user-convergence-gate` 增加：

- 要求 `BlockViewModel.ts` / `BlockViewItemList.tsx` 存在
- 要求 `TableViewModel.ts` / `TableViewCell.tsx` 存在
- 限制 `BlockView.tsx <= 110` 行
- 限制 `TableView.tsx <= 80` 行
- 禁止 `BlockView.tsx` 回流本地 `renderItem`、`groupItemsByFields`、`timers.find`
- 禁止 `TableView.tsx` 回流本地 `buildTableMatrix`、`renderCellItem`、`timers.find`

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

原因：当前压缩包环境没有 `node_modules`，缺少 `node`、`preact`、`vite/client` 类型定义。

## 交付

本轮没有删除文件，因此交付为“新增/修改完整文件补丁包”，保留原路径。
