refactor: 单人版收敛 MVP32，内联 Progress 大技能经验条并去除投影

本次提交继续微调 Progress 技能经验视图。MVP30 将 Progress 改成目标大技能与主题小技能结构，MVP31 将卡片收窄并去除冗余文案；本轮根据实际截图反馈进一步去掉 header 下方孤立色块和投影感，把大技能经验条移动到技能名称后面。

主要改动：
- ProgressGoalCard 将大技能经验条从 header 下方独立行移动到目标名称后面
- 移除大技能经验条单独占据的一行，避免记录较少时在卡片顶部出现孤立色块
- Progress 大技能卡片去除 box-shadow
- 目标图标去除 inset shadow
- 等级徽章去除 box-shadow
- 大技能经验条宽度收窄为紧凑内联条
- 保留小技能纵向列表结构，小技能仍只显示名称、等级和经验条
- 默认态继续不展示目标路径、记录数经验、XP 数字、下级提示、10 段刻度、完成率和掉队提醒
- 展开态记录入口继续保留，不影响 onOpenRecord 链路
- 更新 docs-governance / final-convergence gate，要求 MVP32 文档存在

验证：
- npm run any-budget:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run docs-governance:gate 通过
- npm run final-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck 和 build。
