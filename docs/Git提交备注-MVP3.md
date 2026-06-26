refactor: 单人版收敛 MVP3，修复中文文档名并移除 legacy-block 来源

本次提交继续推进单人插件破坏性收敛。插件只有一个用户，不需要旧数据兼容，因此继续删除 legacy 运行时路径，并修复文档系统中文文件名被写成 #Uxxxx 的问题。

主要改动：
- 将 doc/ 目录下所有 #Uxxxx 形式的中文目录名和文件名恢复为真实中文
- 新增门禁，禁止 doc/ 下再次出现 #Uxxxx 编码文件名
- 将新增收敛文档改为中文文件名：单人版收敛-MVP1/MVP2/MVP3、Git提交备注-MVP1/MVP2/MVP3
- 移除 legacy-block 作为 templateSourceType 来源
- templateSourceType 收窄为 core-block / goal-template / null
- MarkdownTaskCodec / MarkdownBlockCodec 只接受 core-block / goal-template
- GoalTemplateResolver 不再从 inputSettings.blocks 回退旧 block 模板
- 删除 src/core/blocks/legacyBlockAdapter.ts
- 删除 buildLegacyCoreBlockMap / inferCoreBlockIdFromLegacyBlock public export
- 删除 CoreBlockSettings.legacyBlockMap
- getCoreBlockById 不再执行旧 block id 到 core block id 的映射
- QuickInput blockId 解析不再依赖 legacyBlockMap
- ActionService 改为通过 getEffectiveCoreBlocks(settings) 获取运行时 block
- editStateResolver 改为使用 getEffectiveCoreBlocks(settings) 作为编辑态模板候选池
- single-user-convergence-gate 增加 legacy-block / legacyBlockMap / legacyBlockAdapter 回流检查

验证：
- npm run gate 通过
- npm run single-user:gate 通过
- src 中已无 legacy-block / legacyBlockMap / legacyBlockAdapter / buildLegacyCoreBlockMap / inferCoreBlockIdFromLegacyBlock
- doc 中已无 #Uxxxx 文件名

未运行完整 typecheck/build：当前压缩包环境没有 node_modules。请本地执行 npm ci 后再运行 npm run typecheck:src 和 npm run build。

下一步：
- 拆分 QuickInputEditorContainer
- 抽出 QuickInput draft/model 纯函数
- 统一 QuickInput / AI / 编辑记录的输入模型外观层
