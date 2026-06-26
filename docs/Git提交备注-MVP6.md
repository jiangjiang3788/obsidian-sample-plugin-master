refactor: 单人版收敛 MVP6，抽出 QuickInput 动作模型并拆分预设编辑控件

本次提交继续推进单人插件收敛。MVP4/MVP5 已经将 QuickInput 的初始选择、状态输出、默认值回填、目标选择和展示模板逻辑抽到模型层，本轮继续把字段更新和时间方向切换动作模型化，同时开始处理下一个大文件 GoalTemplateEditorModal。

主要改动：
- 新增 applyQuickInputFieldUpdate，封装 QuickInput 字段写入、字段来源标记、目标字段副作用和主题字段副作用
- 新增 applyQuickInputTimeDirectionChange，封装 forward/backward 时间方向切换、结束时间默认值和 system_auto 字段来源标记
- QuickInputEditorContainer.tsx 不再直接维护字段更新和时间方向联动细节
- QuickInputEditorContainer.tsx 从约 377 行下降到约 331 行
- 扩展 quickInputEditorModel 单测，覆盖字段更新和 backward 时间方向默认结束时间
- 新增 src/features/settings/goalTemplates/GoalTemplateNativeControls.tsx
- 从 GoalTemplateEditorModal.tsx 抽出 NativeTextInput / NativeSelectInput / NativeTextarea 和原生控件样式
- GoalTemplateEditorModal.tsx 从约 875 行下降到约 630 行
- 加强 single-user-convergence-gate，将 QuickInput 容器限制收紧到 350 行，并要求 GoalTemplateNativeControls 存在、GoalTemplateEditorModal 不超过 700 行

验证：
- npm run single-user:gate 通过
- npm run gate 通过

未完整运行 typecheck/build：当前压缩包环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后再运行 npm run typecheck:src 和 npm run build。

下一步：
- 抽出 GoalTemplateEditorModel，迁移 draft 构造、默认值清理、patch 构造和 diff 摘要
- 将 QuickInput 更新动作进一步收敛成 reducer/action 外观层
- 拆分 GoalTemplateMatrix 的数据模型与表格展示
