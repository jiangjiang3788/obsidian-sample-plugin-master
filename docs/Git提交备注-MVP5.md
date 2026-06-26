refactor: 单人版收敛 MVP5，继续抽出 QuickInput 状态模型

本次提交继续处理核心输入入口 QuickInput 的复杂度。MVP4 已经抽出字段来源、模板默认值和时间联动逻辑，本轮继续把初始选择、目标选择回填、Block 切换保留字段、主题点击选择、状态输出和模板展示装饰抽入 QuickInputEditorModel。

主要改动：
- 新增 deriveQuickInputInitialSelection，统一从 initialFormData / context 推导初始 goal/template/cycle/timeDirection
- 新增 buildQuickInputEditorState，统一构造 QuickInputEditor 对外输出状态
- 新增 applyQuickInputGoalSelection，封装目标选择后的 goalId/goalPath/rootGoal/leafGoal/themePath 回填逻辑
- 新增 preserveQuickInputBlockSwitchState，封装切换 Block 时需要保留的字段和字段来源
- 新增 resolveQuickInputThemeSelectionOnClick，封装主题重复点击回到父主题的选择逻辑
- 新增 buildQuickInputDisplayTemplate，封装目标字段 / 主题字段选项注入
- 新增 shouldShowQuickInputTimeDirectionControl，封装时间方向控制显示判断
- 新增 buildQuickInputPeriodUi，封装周期字段和周期选项派生
- QuickInputEditorContainer.tsx 从约 459 行下降到约 377 行
- 扩展 quickInputEditorModel 单测，覆盖初始选择、Block 切换保留字段、目标选择回填、状态输出构造
- 加强 single-user-convergence-gate，将 QuickInputEditorContainer.tsx 行数限制从 520 行收紧到 400 行，并要求模型层保留关键 helper

验证：
- npm run single-user:gate 通过
- npm run gate 通过

未运行完整单测 / typecheck / build：当前压缩包环境没有 node_modules，jest 不存在。请本地执行 npm ci 后再运行新增单测、typecheck 和 build。

下一步：
- 继续把 QuickInput 的更新动作抽成 reducer / action model
- 统一 QuickInput / AI / 编辑记录输入外观层
- 开始拆分 GoalTemplateEditorModal 或 GoalTemplateMatrix
