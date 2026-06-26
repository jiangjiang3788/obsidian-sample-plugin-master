# 单人版收敛 MVP7：预设编辑模型层抽取

## 背景

MVP4-MVP6 已经把 QuickInput 的主要输入模型抽出，QuickInput 容器降到 350 行以内。MVP7 开始处理下一个大文件：`GoalTemplateEditorModal.tsx`。

本插件只有一个用户，不需要旧数据兼容和保守过渡，因此本轮继续按“单一主线 + 可测试纯模型”的方向推进。

## 本轮目标

1. 把记录预设编辑弹窗里的 draft 构造、主题字段、patch 构造、继承/覆盖切换等业务逻辑移到模型层。
2. 让 `GoalTemplateEditorModal.tsx` 更接近 UI 容器，而不是同时承担领域计算。
3. 增加单测和门禁，防止大文件回涨。
4. 本轮不删除文件，因此交付为“涉及修改/新增文件补丁包”。

## 主要改动

- 新增 `src/features/settings/goalTemplates/GoalTemplateEditorModel.ts`
- `GoalTemplateEditorModal.tsx` 从约 630 行降到约 302 行
- 抽出以下能力：
  - `makeDraftFromTemplate`
  - `makeNewDraft`
  - `buildInheritedDraft`
  - `buildTemplatePatchFromDraft`
  - `buildInheritedTemplatePatchFromDraft`
  - `buildDraftDiffSummary`
  - `applyThemePathToDraft`
  - `switchDraftToOverride`
  - `createCopiedDraft`
  - `sortGoalTemplateVariants`
  - `buildThemeOptions`
  - `buildThemeByPath`
- 新增 `test/unit/goalTemplateEditorModel.test.ts`
- 加强 `scripts/gates/single-user-convergence-gate.mjs`

## 验收结果

已通过：

```bash
npm run single-user:gate
npm run gate
```

未运行完整 typecheck/build：当前工作环境没有 `node_modules`，仍缺少 `node/preact/vite/client` 类型定义。请本地执行：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/goalTemplateEditorModel.test.ts
npm run typecheck:src
npm run build
npm run gate
```

## 下一步建议

1. 继续拆 `GoalTemplateEditorModal` 的 JSX 区块，例如 metadata section、field section、footer action section。
2. 开始拆 `GoalTemplateMatrix` 的数据模型与表格展示。
3. 把 QuickInput / AI / 编辑记录抽成统一 RecordInput facade。
