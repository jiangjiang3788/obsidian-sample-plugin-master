# 单人版收敛 MVP4：QuickInput 输入模型抽取

## 背景

MVP1-MVP3 已经删除 ThemeMatrix、ThemeOverride、legacy-block 等旧系统。本轮开始进入核心输入链路的低风险收敛：先不大改 UI 行为，而是把 QuickInputEditorContainer 里的纯数据逻辑抽出去，减少核心入口组件体积，为后续统一 QuickInput / AI / 编辑记录输入模型做准备。

## 本轮目标

- 降低 `QuickInputEditorContainer.tsx` 复杂度。
- 把字段来源、目标候选、时间联动、模板默认值回填等纯逻辑集中到模型层。
- 给 QuickInput 模型层补最小单测。
- 用单人版门禁防止 QuickInput 容器重新膨胀。

## 主要改动

| 类型 | 内容 |
|---|---|
| 新增模型层 | 新增 `src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts` |
| 类型迁移 | `QuickInputEditorState`、`QuickInputEditorProps`、`QuickInputFieldSource`、`TimeDirection` 移入模型层 |
| 纯函数迁移 | `finalizeQuickInputFormData`、字段来源统计、路径清洗、目标候选排序、主题选项构建移入模型层 |
| 时间联动 | 新增 `applyQuickInputLinkedTimeChanges`，把 QuickInput 的时间联动草稿处理从容器中抽离 |
| 默认值回填 | 新增 `hydrateQuickInputTemplateDefaults`，把模板默认值/context 回填逻辑从容器中抽离 |
| 容器瘦身 | `QuickInputEditorContainer.tsx` 从约 764 行降到约 461 行 |
| 测试 | 新增 `test/unit/quickInputEditorModel.test.ts` |
| 门禁 | `single-user-convergence-gate` 新增 QuickInput 容器行数上限与模型文件存在性检查 |

## 当前边界

本轮只做“行为保持式抽取”，没有改变：

- QuickInput 的 UI 结构；
- GoalTemplateResolver 调用位置；
- AI 输入链路；
- 编辑记录链路；
- 提交流水线。

## 验收结果

已通过：

```bash
npm run gate
npm run single-user:gate
```

未运行完整测试与构建：当前压缩包环境没有 `node_modules`，`jest` 不存在，无法运行新增单测。本地执行：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/quickInputEditorModel.test.ts
npm run typecheck:src
npm run build
```

## 下一步建议

1. 将 QuickInput 状态组装进一步抽成 `buildQuickInputEditorState`。
2. 把 AI 批量确认和编辑记录入口逐步适配到同一个 QuickInput 模型外观层。
3. 继续拆 `GoalTemplateEditorModal.tsx` 或 `GoalTemplateMatrix.tsx`。
