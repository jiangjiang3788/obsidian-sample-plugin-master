# 单人版收敛 MVP9：拆分目标预设矩阵行与单元格

## 背景

MVP8 已经把 `GoalTemplateMatrix.tsx` 中的大表格 UI 拆到 `GoalTemplateMatrixTable.tsx`，但表格文件本身仍然承担了表格容器、目标行、目标路径单元格、Block 单元格、预设卡片拖拽和添加按钮等多种职责。

本轮继续沿着“不制造新的大文件”的原则，把表格文件继续拆成三层：

```text
GoalTemplateMatrix.tsx        数据装配、状态管理、usecase 调用
GoalTemplateMatrixTable.tsx   表格壳、表头、空状态、分组装配
GoalTemplateMatrixRow.tsx     目标行、目标路径单元格、目标拖拽/删除
GoalTemplateMatrixCell.tsx    Block 单元格、添加按钮、预设卡片、预设拖拽
```

## 本轮改动

- 新增 `src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx`
- 新增 `src/features/settings/goalTemplates/GoalTemplateMatrixCell.tsx`
- 重写 `GoalTemplateMatrixTable.tsx`，让它只负责表格壳和分组渲染
- 将目标路径单元格、目标拖拽、目标删除按钮移入 Row 层
- 将添加预设按钮、预设卡片、Block 单元格拖拽移入 Cell 层
- 加强 `single-user-convergence-gate`：
  - 要求 `GoalTemplateMatrixRow.tsx` 存在
  - 要求 `GoalTemplateMatrixCell.tsx` 存在
  - 限制 `GoalTemplateMatrixTable.tsx <= 140` 行
  - 限制 `GoalTemplateMatrixRow.tsx <= 280` 行
  - 限制 `GoalTemplateMatrixCell.tsx <= 220` 行

## 文件规模变化

```text
GoalTemplateMatrixTable.tsx: 约 372 行 -> 约 100 行
GoalTemplateMatrixRow.tsx:   约 253 行
GoalTemplateMatrixCell.tsx:  约 175 行
```

这使矩阵模块形成更稳定的分层：主容器、表格壳、目标行、Block 单元格各自独立。

## 验证

已通过：

```bash
npm run single-user:gate
npm run gate
```

未运行完整 typecheck/build：当前环境没有 `node_modules`。本地请执行：

```bash
npm ci
npm run typecheck:src
npm run build
npm run gate
```

## 交付方式

本轮没有删除文件，因此只交付“新增/修改文件补丁包”，保留完整路径，可直接覆盖到项目中。
