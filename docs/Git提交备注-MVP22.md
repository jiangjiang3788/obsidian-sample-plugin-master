refactor: 单人版收敛 MVP22，加入共享视图抽离总收口门禁

本次提交继续推进单人版收敛，但不再机械拆小组件。MVP12-MVP21 已经逐个抽离 Heatmap、Progress、Timeline、Excel、Statistics、EventTimeline、TaskExecution、BlockView、TableView、TimeNavigator 和 ViewToolbar。本轮做总收口：把已经完成的抽离成果固化进门禁，并明确哪些小组件不应该为了形式统一继续拆分。

主要改动：
- 新增 scripts/gates/shared-view-convergence-gate.mjs
- 新增 npm script：shared-view-convergence:gate
- 将 shared-view-convergence:gate 接入 npm run gate
- 门禁检查 Heatmap / Progress / Timeline / EventTimeline / TaskExecution / BlockView / TableView / Excel / Statistics / TimeNavigator / ViewToolbar 的关键模型和子组件必须存在
- 门禁限制主要 shared view 文件行数，防止大容器和本地 helper 回流
- 门禁禁止典型回流点，例如 HeatmapView 直接渲染 HeatmapCell、ExcelGrid 回流粘贴/填充/导航计划、TimeNavigator 回流日期计算、Statistics 周期视图回流 period aggregation
- 门禁加入防过度工程化名单：TimerView / TimerViewView / CategoryFilter / ThemeFilter / DayStatisticsView / WeekStatisticsView 保持小组件，不强制拆 Model
- 新增 docs/单人版收敛-MVP22.md，记录共享视图抽离总收口标准、行数上限和不再强拆名单

防过度工程化说明：
- 本轮没有继续拆小组件
- 小于约 80 行且职责清楚的纯展示/筛选组件，不再为了统一形式拆 Model
- 后续只有出现明显计算、重复规则、状态派生或测试价值时才继续抽离

验证：
- npm run single-user:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck 和 build。

下一步：
- 再做一次最终非 shared view 大容器盘点
- 如果没有明确收益，不再继续拆视图，进入最终封版或文档治理
