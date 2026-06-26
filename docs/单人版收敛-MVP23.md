# 单人版收敛 MVP23：非 shared view 大容器盘点与 RuleBuilder 收敛

## 本轮目标

MVP22 已经把 shared view 的逐个抽离做了总收口。本轮不再继续拆小型 shared 组件，而是按“非 shared view 大容器盘点”的标准检查 settings、modal、app/ui 中仍然偏大的 UI 文件。

本轮使用的判断标准：

- 有明显规则归一化、状态派生、重复 patch/update 逻辑：抽
- 主文件只是小型容器或纯展示：不抽
- 已经是单一职责但行数偏高的底层 primitives：先不拆，避免把局部可读性拆散

## 实际处理范围

本轮最终只处理 `RuleBuilder`。

原因：

- `RuleBuilder.tsx` 约 487 行，明显超过普通编辑器组件体量
- 文件内部同时承担 UI 渲染、字段值扫描、filter patch 归一化、多值规则解析、规则新增/删除/更新、grid template 计算
- 这些 helper 有明确测试价值，抽出后能避免后续 CommonFilterPanel / TimelineViewEditor / EventTimelineViewEditor 等编辑器反复堆相同逻辑

## 主要改动

### 1. 新增 RuleBuilderModel

新增：

```text
src/features/settings/viewEditors/RuleBuilderModel.ts
```

承接：

- `DEFAULT_FILTER_RULE` / `DEFAULT_SORT_RULE`
- `RULE_OPERATOR_OPTIONS` / `RULE_DIRECTION_OPTIONS` / `RULE_LOGIC_OPTIONS`
- `buildUniqueFieldValues`
- `normalizeMultiValue`
- `operatorNeedsValue`
- `isMultiValueOperator`
- `getRuleValuePlaceholder`
- `formatRuleValue`
- `buildRuleLabel`
- `normalizeFilterPatch`
- `patchRule`
- `patchRuleRows`
- `patchRuleLogic`
- `removeRuleAt`
- `appendRule`
- `shouldShowRuleValueInput`
- `getPanelRuleGridTemplate`
- `getPanelAddRuleGridTemplate`

### 2. 新增 RuleBuilderValueInput

新增：

```text
src/features/settings/viewEditors/RuleBuilderValueInput.tsx
```

承接：

- `empty / notEmpty` 不渲染输入框
- `in / notIn` 多选 chip 输入
- 普通 `Autocomplete` freeSolo 输入
- panel 模式 helper text

### 3. RuleBuilder 主文件瘦身

`RuleBuilder.tsx` 从约 487 行下降到约 300 行。

现在主文件只保留：

- `newRule` 状态
- `rows` 增删改回调组合
- compact / panel 两种 UI 结构
- `FieldPickerAutocomplete` 与 `RuleBuilderValueInput` 拼装

### 4. 新增非 shared view 收口门禁

新增：

```text
scripts/gates/non-shared-view-convergence-gate.mjs
```

并新增 npm script：

```text
npm run non-shared-view-convergence:gate
```

已接入：

```text
npm run gate
```

门禁检查：

- `RuleBuilderModel.ts` 必须存在
- `RuleBuilderValueInput.tsx` 必须存在
- `RuleBuilder.tsx <= 320` 行
- `RuleBuilderValueInput.tsx <= 80` 行
- RuleBuilder 不得回流 `normalizeFilterPatch / normalizeMultiValue / formatRuleValue / operatorOptions` 等本地 helper
- 明确记录部分文件已审查但暂不强拆，避免过度工程化

### 5. 新增单测

新增：

```text
test/unit/ruleBuilderModel.test.ts
```

覆盖：

- 多值归一化
- empty / notEmpty value 处理
- field / op 变化时的 filter patch 归一化
- 规则新增、删除、patch 的不可变更新
- rule label 和 panel grid template
- DataStore 字段唯一值扫描

## 防过度工程化说明

本轮没有拆这些文件：

```text
src/app/ui/primitives/FloatingPanel.tsx
src/shared/components/ThemeTreeSelect/Panel.tsx
src/platform/modals/NamePromptModal.tsx
```

原因：

- `FloatingPanel` 虽然行数高，但属于底层交互 primitive，拆错会增加状态分散风险
- `ThemeTreeSelect/Panel` 已经是专用组合面板，继续拆收益不明显
- `NamePromptModal` 体量可控，不需要为了形式统一抽 Model

后续如果继续动它们，需要满足更高标准：必须能明确减少重复逻辑，或拆出可测试的非 UI 状态模型。

## 验证

已通过：

```bash
npm run single-user:gate
npm run shared-view-convergence:gate
npm run non-shared-view-convergence:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因：当前环境没有 `node_modules`，缺少 `node / preact / vite/client` 类型定义。

## 下一步

MVP24 建议做最终代码封版：

1. 运行 shared + non-shared 视图门禁总检查
2. 盘点仍超过阈值的大文件，但不再默认拆
3. 输出“继续拆 / 不再拆”名单
4. 如果没有明显收益，转入文档治理或完整包封版
