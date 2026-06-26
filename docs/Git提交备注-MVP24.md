refactor: 单人版收敛 MVP24，治理 docs 根目录并加入文档门禁

本次提交转入文档治理。MVP1-MVP23 已完成核心代码收敛、shared view 抽离、非 shared view 大容器盘点和多层 gate 收口；继续拆小组件的边际收益下降，因此本轮清理旧过程文档，让 docs 根目录只保留当前维护真正需要的入口、验收、收敛记录和 Git 备注。

主要改动：
- 删除 81 个旧过程文档，包括 DATA_REVIEW_MVP*.md、*_PASS_CHANGES.md、GOAL_CENTER_*.md、GOAL_CORE_*.md、THINK_OS_*.md、MVP*_PROGRESS.md、MVP_PROGRESS.md、RELEASE_READINESS_MVP*.md
- 新增 docs/文档治理.md，记录 docs 根目录保留范围、删除范围和防过度文档化规则
- 新增 docs/单人版收敛总览.md，汇总 MVP1-MVP24 的单人版收敛主线、质量入口和不再强拆边界
- 更新 docs/README.md，补充文档治理、当前入口和不再保留的历史过程文档说明
- 新增 scripts/gates/docs-governance-gate.mjs
- 新增 npm run docs-governance:gate，并接入 npm run gate
- 文档门禁会阻止旧过程报告重新回流，检查关键入口文档存在，检查中文文件名不退回 #Uxxxx，并限制 docs 根目录 markdown 数量重新膨胀

验证：
- npm run docs-governance:gate 通过
- npm run single-user:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run non-shared-view-convergence:gate 通过
- npm run gate 通过

本轮删除了文件，因此按约定交付完整项目包，而不是补丁包。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck 和 build。
