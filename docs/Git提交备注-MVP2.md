refactor: 单人版收敛 MVP2，移除 ThemeOverride 与旧模板解析双系统

本次提交继续推进单人插件的破坏性收敛：插件只有一个用户，不需要公开发布，也不需要旧数据兼容，因此直接删除旧 ThemeOverride / inputSettings.overrides 路径，而不是继续维护迁移桥和双系统兼容。

主要改动：
- 删除 ThemeOverride 类型和 InputSettings.overrides 字段
- DEFAULT_SETTINGS.inputSettings 改为只包含 blocks/themes
- main.loadSettings 不再补齐 overrides
- ThemeSlice 删除 override 写操作和查询操作
- ThemeUseCase 删除 override facade
- blocks.slice 删除删除 block 时清理 overrides 的逻辑
- ThemeMetadataManager 不再展示旧主题模板数量
- dependencyResolver 不再构造 effective overrides
- editStateResolver 不再按 override 模板来源回填 block/theme
- 删除 src/core/services/TemplateResolver.ts
- inputTemplateUtils / heatmapTemplate 改为直接读取 block fallback，不再依赖 TemplateResolver
- Markdown codec 和相关类型收窄 templateSourceType，只保留 core-block / goal-template / legacy-block
- 加强 single-user-convergence-gate，防止 ThemeOverride / overrides / TemplateResolver 回流
- 新增 SINGLE_USER_CONVERGENCE_MVP2.md 记录本轮收敛范围和验收标准

验证：
- npm run gate 通过
- npm run single-user:gate 通过

未运行完整 typecheck/build：当前压缩包环境没有 node_modules，缺少 node/preact/vite/client 类型定义。本地执行 npm ci 后再跑 npm run typecheck:src / npm run build。

下一步：
- 继续把 legacy-block 压缩为纯辅助 fallback
- 统一 QuickInput / AI / 编辑记录到 RecordInputKernel
- 拆分 QuickInputEditorContainer，降低核心入口复杂度
