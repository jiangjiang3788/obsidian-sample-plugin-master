# 单人版收敛 MVP6

## 本轮目标

MVP6 继续推进输入链路收敛，但不再只停留在 QuickInput 容器瘦身。本轮分两条线：

1. 继续把 QuickInput 的字段更新和时间方向切换动作抽到模型层。
2. 开始拆分下一个大文件 `GoalTemplateEditorModal.tsx`，先把原生输入控件抽成独立组件文件。

## 已完成

### 1. QuickInput 动作模型化

新增模型函数：

- `applyQuickInputFieldUpdate`
- `applyQuickInputTimeDirectionChange`

它们负责：

- 字段值写入
- 字段来源标记
- 时间联动字段自动回填
- 目标字段更新时返回 goalPath / goalId 副作用
- 主题字段更新时返回 themePath 副作用

`QuickInputEditorContainer.tsx` 现在只负责调用模型函数并写入 Preact 状态，不再直接写字段来源和时间联动细节。

### 2. QuickInput 容器继续降复杂度

`QuickInputEditorContainer.tsx` 从 MVP5 的约 377 行下降到约 331 行。

新的门禁把容器限制从 400 行进一步收紧到 350 行，防止后续逻辑重新堆回容器。

### 3. GoalTemplateEditorModal 开始拆分

新增：

- `src/features/settings/goalTemplates/GoalTemplateNativeControls.tsx`

抽出了：

- `NativeTextInput`
- `NativeSelectInput`
- `NativeTextarea`
- 原生输入控件样式
- 输入事件读取与事件阻止逻辑

`GoalTemplateEditorModal.tsx` 从约 875 行下降到约 630 行。

### 4. 单测扩展

扩展：

- `test/unit/quickInputEditorModel.test.ts`

新增覆盖：

- 字段更新模型
- 目标字段更新副作用
- backward 时间方向默认结束时间回填
- 字段来源 system_auto 标记

### 5. 门禁加强

`single-user-convergence-gate` 新增：

- `QuickInputEditorContainer.tsx <= 350 行`
- `QuickInputEditorModel.ts` 必须保留动作模型 helper
- `GoalTemplateNativeControls.tsx` 必须存在
- `GoalTemplateEditorModal.tsx <= 700 行`

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

原因仍然是当前压缩包环境没有 `node_modules`，缺少 `node` / `preact` / `vite/client` 类型定义。本地执行 `npm ci` 后再跑 typecheck/build。

## 下一步建议

1. 继续拆 `GoalTemplateEditorModal.tsx`，把 draft 构造和 patch 构造迁入 `GoalTemplateEditorModel.ts`。
2. 把 QuickInput 的状态更新进一步收敛成 reducer/action 外观层。
3. 开始整理 `GoalTemplateMatrix.tsx`，把表格 view model 抽出。
