refactor: 单人版收敛 MVP31，收窄 Progress 技能经验卡片

本次提交继续调整 Progress 技能经验视图。MVP30 已将 ProgressView 改为目标大技能、主题小技能和经验条结构；本轮根据实际大屏查看效果进一步收窄默认信息密度，避免卡片和经验条撑满屏幕。

主要改动：
- ProgressView 外层改为左对齐紧凑容器，限制最大宽度，不再在大屏上横向撑满
- ProgressGoalCard 最大宽度限制为 760px，默认卡片更接近用户截图中的紧凑卡片
- 大技能 header 只保留目标图标、目标名和等级徽章
- 移除目标路径、记录数经验文案
- 大经验条只保留单条主进度，移除 10 段刻度
- 移除 XP 数字详情和“还差 X 条记录到 Lv.N”提示
- 小技能行改成左对齐的“小技能名 / Lv / 经验条”三列结构
- 移除小技能默认展示的记录数和 XP 文案
- 展开态记录入口继续保留，默认视图不展示记录详情
- 更新 MVP_ACCEPTANCE、收敛总览、最终封版说明和文档门禁，记录 Progress 紧凑化标准

验证：
- npm run any-budget:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run docs-governance:gate 通过
- npm run final-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义和 jest 命令。请本地执行 npm ci 后运行 typecheck、unit test 和 build。
