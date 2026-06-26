# 单人版收敛 MVP5：继续抽出 QuickInput 状态模型

## 背景

MVP1-MVP3 已经删除 ThemeMatrix、ThemeOverride、legacy-block 等旧系统。MVP4 开始处理 QuickInputEditorContainer 的复杂度，将字段来源、模板默认值、时间联动等逻辑抽入 `QuickInputEditorModel.ts`。

MVP5 继续沿着同一方向推进：把 QuickInput 的初始选择、目标选择回填、Block 切换保留字段、主题点击选择、状态输出、模板展示装饰、周期 UI 派生继续从容器中抽离。

## 本轮目标

- 继续降低 `QuickInputEditorContainer.tsx` 复杂度。
- 让 QuickInput 的核心状态输出由纯模型函数构建。
- 为后续统一 QuickInput / AI / 编辑记录输入外观层做准备。
- 加强 gate，防止容器重新膨胀。

## 主要改动

### 1. QuickInput 状态输出抽离

新增：

- `deriveQuickInputInitialSelection`
- `buildQuickInputEditorState`
- `applyQuickInputGoalSelection`
- `preserveQuickInputBlockSwitchState`
- `resolveQuickInputThemeSelectionOnClick`
- `buildQuickInputDisplayTemplate`
- `shouldShowQuickInputTimeDirectionControl`
- `buildQuickInputPeriodUi`

这些函数集中在：

```text
src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts
```

### 2. 容器瘦身

`QuickInputEditorContainer.tsx` 从 MVP4 的约 459 行继续下降到约 377 行。

容器现在更接近它应该承担的职责：

- 订阅 settings
- 持有 React/Preact state
- 触发 useCase
- 调用模型层纯函数
- 把结果传给 View

### 3. 单测补强

扩展：

```text
test/unit/quickInputEditorModel.test.ts
```

新增覆盖：

- 初始 goal/template/timeDirection 推导
- Block 切换时保留字段
- 目标选择回填且不覆盖用户字段
- `buildQuickInputEditorState` 输出周期字段、主题路径摘要和字段来源统计

### 4. 门禁加强

`single-user-convergence-gate` 将 QuickInput 容器行数限制从 520 行收紧到 400 行，并要求模型层保留关键函数。

## 验收结果

已通过：

```bash
npm run single-user:gate
npm run gate
```

未运行完整单测 / typecheck / build：当前压缩包环境没有 `node_modules`，`jest` 不存在。

本地建议执行：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/quickInputEditorModel.test.ts
npm run typecheck:src
npm run build
npm run gate
```

## 当前状态

QuickInputEditorContainer 已从“大容器 + 业务模型混合”继续向“容器只协调，模型层负责推导”收敛。

下一步可以继续做两件事：

1. 把 QuickInput 的更新动作进一步抽成 reducer / action model。
2. 把 AI 输入和编辑记录入口接到同一个 RecordInputKernel 外观层。
