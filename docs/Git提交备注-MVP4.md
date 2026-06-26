refactor: 单人版收敛 MVP4，抽出 QuickInput 输入模型层

本次提交继续推进单人插件收敛。MVP1-MVP3 已删除 ThemeMatrix、ThemeOverride、legacy-block 等旧系统，本轮开始处理核心输入入口 QuickInput 的复杂度问题。

主要改动：
- 新增 src/app/ui/components/QuickInputEditor/QuickInputEditorModel.ts
- 将 QuickInputEditorState / QuickInputEditorProps / QuickInputFieldSource / TimeDirection 移入模型层
- 将 finalizeQuickInputFormData 移入模型层并继续从 QuickInputEditor 对外导出
- 将字段来源初始化、字段来源统计、路径清洗、主题选项构建、目标候选排序等纯函数移入模型层
- 新增 applyQuickInputLinkedTimeChanges，抽离时间 / 结束 / 时长联动草稿处理
- 新增 hydrateQuickInputTemplateDefaults，抽离模板默认值与 context 回填逻辑
- QuickInputEditorContainer.tsx 从约 764 行降到约 461 行
- 新增 test/unit/quickInputEditorModel.test.ts，覆盖字段来源、模板默认值回填、时间联动草稿清理
- 加强 single-user-convergence-gate，要求 QuickInputEditorModel 存在，并限制 QuickInputEditorContainer.tsx 不超过 520 行

验证：
- npm run gate 通过
- npm run single-user:gate 通过

未运行完整测试 / typecheck / build：当前压缩包环境没有 node_modules，jest 不存在。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续抽出 buildQuickInputEditorState
- 统一 QuickInput / AI / 编辑记录的输入模型外观层
- 拆分 GoalTemplateEditorModal 或 GoalTemplateMatrix
