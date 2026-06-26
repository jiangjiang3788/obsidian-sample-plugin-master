# 单人版收敛 MVP8

## 本轮目标

MVP8 继续执行“补丁包优先”交付策略：本轮没有删除文件，因此只交付新增/修改文件完整包，保留原始路径。

本轮不再只处理一个点，而是同时推进三件事：

1. 将 `GoalTemplateMatrix.tsx` 的表格渲染抽出为独立组件。
2. 将矩阵筛选、排序、拖拽重排等纯逻辑继续下沉到 `goalTemplateMatrixModel.ts`。
3. 增加单测和门禁，防止矩阵主容器重新膨胀。

## 主要改动

- 新增 `GoalTemplateMatrixTable.tsx`，承接目标矩阵表格、行、单元格、预设卡片和拖拽 UI。
- 扩展 `goalTemplateMatrixModel.ts`：
  - `filterVisibleGoalTemplateMatrixGoals`
  - `splitGoalsByRoot`
  - `buildNextActiveBlockIds`
  - `toggleGoalPath`
  - `toggleGoalCollapsed`
  - `orderDraggedGoalSiblings`
  - `reorderPresetTemplatesInCell`
  - `getPresetCardName`
  - `goalTemplateKey`
  - `goalTemplateVariantId`
- `GoalTemplateMatrix.tsx` 从 742 行下降到约 327 行。
- 新增 `test/unit/goalTemplateMatrixModel.test.ts`，覆盖筛选、树折叠、block chip 切换、目标分组、目标拖拽排序、预设排序。
- 加强 `single-user-convergence-gate`，要求 `GoalTemplateMatrixTable.tsx` 存在，并限制 `GoalTemplateMatrix.tsx` 不超过 360 行。

## 验收结果

已通过：

```bash
npm run single-user:gate
npm run gate
```

未运行完整 typecheck/build：当前环境没有 `node_modules`。

本地建议：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/goalTemplateMatrixModel.test.ts
npm run typecheck:src
npm run build
npm run gate
```

## 下一步建议

- 继续拆 `GoalTemplateMatrixTable.tsx` 的行/单元格组件，或者先转向 AI/编辑记录输入模型统一。
- 建立 `RecordInputFacade`，把 QuickInput / AI / 编辑记录的输入外观层统一起来。
- 对 `GoalTemplateEditorModel` 和 `QuickInputEditorModel` 做类型收紧，减少 `any`。
