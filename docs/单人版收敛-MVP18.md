# 单人版收敛 MVP18：继续抽离 Excel 编辑与字段工具栏

## 背景

MVP14 已经抽出 ExcelView 顶层模型和工具栏，MVP17 进一步抽出 ExcelGrid / ExcelCell 的交互模型、编辑器和内容展示。本轮继续向内处理剩余复杂点：`useExcelCellEditing` 的提交队列 / 保存状态 / 批量提交计划，以及 `ExcelColumnToolbar` 的字段排序 / 字段菜单 / chip 展示。

本轮没有删除文件，因此交付为“本轮修改 / 新增完整文件补丁包”，保留原始路径。

## 改动清单

### 1. 新增 ExcelCellEditingModel

新增文件：

- `src/shared/ui/views/excel-view/ExcelCellEditingModel.ts`

承接逻辑：

- Set 状态不可变更新
- 单格编辑校验计划
- 批量编辑提交计划
- validation error 批量写入 / 清空
- commit 失败信息归一化
- normalizedValue 合并规则
- fill drag 目标单元格过滤
- fill drag 批量编辑计划

### 2. 收敛 useExcelCellEditing

修改文件：

- `src/shared/ui/views/excel-view/useExcelCellEditing.ts`

变化：

- 删除本地 `addPendingKey / addPendingKeys / removePendingKey / removePendingKeys / uniqueKeys`
- 删除 hook 内直接拼装 batch validation 计划的逻辑
- hook 继续保留 Preact state / ref / callback 生命周期编排
- `commitBatchEdits` 改为调用 `buildExcelCellCommitPlan`
- `commitEdit` 改为调用 `buildExcelSingleCellEditPlan`
- `finishFillDrag` 改为调用 `buildExcelFillDragBatchEdits`

行数从约 280 行下降到约 231 行。

### 3. 新增 ExcelColumnToolbarModel

新增文件：

- `src/shared/ui/views/excel-view/ExcelColumnToolbarModel.ts`

承接逻辑：

- 字段移动
- 字段添加 / 移除
- 拖拽 drop 后字段排序
- 可添加字段 options 构造
- 字段菜单 model 构造
- 字段能否删除 / 移动判断

### 4. 拆分 ExcelColumnToolbar 展示组件

新增文件：

- `src/shared/ui/views/excel-view/ExcelColumnChipList.tsx`
- `src/shared/ui/views/excel-view/ExcelColumnContextMenu.tsx`

修改文件：

- `src/shared/ui/views/excel-view/ExcelColumnToolbar.tsx`

变化：

- `ExcelColumnToolbar.tsx` 不再直接维护 chip map 渲染细节
- `ExcelColumnToolbar.tsx` 不再直接维护 context menu DOM 细节
- `ExcelColumnChipList` 承接字段 chip、拖拽、右键、双击隐藏
- `ExcelColumnContextMenu` 承接隐藏、移到最前、移到最后、查看字段说明
- `ExcelColumnToolbar.tsx` 从约 190 行下降到约 119 行

### 5. 新增单测

新增文件：

- `test/unit/excelCellEditingModel.test.ts`
- `test/unit/excelColumnToolbarModel.test.ts`

覆盖：

- Excel editing set helper
- 单格编辑计划
- 批量提交计划
- fill drag batch edit 过滤
- 字段排序 / 添加 / 删除
- 可添加字段 options
- 字段菜单 model

### 6. 加强门禁

修改文件：

- `scripts/gates/single-user-convergence-gate.mjs`

新增约束：

- 要求 `ExcelCellEditingModel.ts` 存在
- 要求 `ExcelColumnToolbarModel.ts` 存在
- 要求 `ExcelColumnChipList.tsx` 存在
- 要求 `ExcelColumnContextMenu.tsx` 存在
- 限制 `useExcelCellEditing.ts <= 240` 行
- 限制 `ExcelColumnToolbar.tsx <= 130` 行
- 禁止 `useExcelCellEditing.ts` 回流本地 set / batch validation helper
- 禁止 `ExcelColumnToolbar.tsx` 回流本地 `moveItem`、字段 chip map 和 context menu DOM

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

原因仍然是当前环境没有 `node_modules`，缺少：

```text
node
preact
vite/client
```

## 本地建议验证

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/excelCellEditingModel.test.ts test/unit/excelColumnToolbarModel.test.ts
npm run typecheck:src
npm run build
npm run gate
```

## 下一步

继续逐个视图抽离，建议 MVP19：

- 抽 `ExcelColumnToolbar` 二级细化后的 keyboard / accessibility helper，或
- 转向 `TimerView / KanbanView / remaining shared view` 补齐模型层与 gate。
