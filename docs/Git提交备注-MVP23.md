refactor: 单人版收敛 MVP23，抽离 RuleBuilder 模型并加入非 shared view 门禁

本次提交继续推进单人版收敛。MVP22 已完成 shared view 抽离总收口，本轮转向非 shared view 大容器盘点，并继续保留防过度工程化约束：只处理仍然有明确状态派生、规则归一化和测试价值的文件，不为了形式统一拆小组件。

主要改动：
- 新增 src/features/settings/viewEditors/RuleBuilderModel.ts
- RuleBuilderModel 承接规则默认值、operator/direction/logic options、字段唯一值扫描、多值归一化、filter patch 归一化、rule label、规则新增/删除/更新和 panel grid template 等非 UI 逻辑
- 新增 src/features/settings/viewEditors/RuleBuilderValueInput.tsx
- RuleBuilderValueInput 承接 empty/notEmpty 跳过输入、in/notIn 多选 chip 输入和普通 freeSolo value 输入
- RuleBuilder.tsx 从约 487 行下降到约 300 行，只保留 compact/panel UI 结构、newRule 状态和子组件组合
- 新增 test/unit/ruleBuilderModel.test.ts，覆盖多值归一化、filter patch、规则不可变更新、rule label、grid template 和 DataStore 字段唯一值扫描
- 新增 scripts/gates/non-shared-view-convergence-gate.mjs
- 新增 npm run non-shared-view-convergence:gate，并接入 npm run gate
- 门禁要求 RuleBuilderModel / RuleBuilderValueInput 存在，限制 RuleBuilder.tsx 不超过 320 行，并防止 normalizeFilterPatch / normalizeMultiValue / formatRuleValue / operatorOptions 等 helper 回流

防过度工程化说明：
- 本轮没有拆 FloatingPanel，因为它是底层交互 primitive，拆错会增加状态分散风险
- 本轮没有拆 ThemeTreeSelect/Panel，因为它已经是专用组合面板，继续拆收益不明显
- 本轮没有拆 NamePromptModal，因为体量可控，不需要为了形式统一抽 Model
- 后续只有能明确减少重复逻辑或抽出可测试非 UI 状态模型时，才继续拆非 shared view

验证：
- npm run single-user:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run non-shared-view-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 做最终代码封版盘点
- 如果没有明确收益，不再继续拆视图
- 转入文档治理或完整包封版
