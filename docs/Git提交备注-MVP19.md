refactor: 单人版收敛 MVP19，轻量抽离时间导航与视图工具栏模型

本次提交继续按“逐个视图抽离”的方向推进，但同时加入防过度工程化约束：只抽仍然承担日期计算、状态派生或重复 UI 规则的共享视图，不为了拆而拆。

主要改动：
- 新增 src/shared/ui/views/TimeNavigatorModel.ts
- TimeNavigatorModel 承接当前年/月/季/周 selection、季度块、月份块、周格、className 和目标日期构造
- TimeNavigator.tsx 不再直接维护 getWeeksInYear/getMondayByWeek/getWeekRangeStr 等日期派生细节，只负责 DOM 与点击事件组合
- 新增 src/shared/ui/views/ViewToolbarModel.ts
- ViewToolbarModel 承接 VIEW_TOOLBAR_OPTIONS、view 到 dayjs unit 的映射、前后时间跳转 target、日期 label、fallback filter 判断
- ViewToolbar.tsx 不再直接维护 viewOptions、unit mapping 和 formatDateForView 调用，只负责 toolbar 组合
- 新增 test/unit/timeNavigatorModel.test.ts
- 新增 test/unit/viewToolbarModel.test.ts
- 加强 single-user-convergence-gate，要求 TimeNavigatorModel / ViewToolbarModel 存在，限制主文件行数，并防止日期计算 helper 回流

防过度工程化说明：
- 本轮刻意没有拆 TimerView / TimerViewView，因为它们已经分别是约 62 行容器和约 69 行展示组件，职责清楚
- 本轮也没有拆 CategoryFilter / ThemeFilter，因为它们都低于约 65 行，并且已经复用 FilterPopover / ThemeTreeSelectPanel
- 后续继续抽视图时，也按“有计算、有重复规则、有测试价值”作为标准

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 继续盘点剩余 shared view，只抽主文件过长或有明确派生状态的视图
- 小型纯展示组件不强拆，避免过度工程化
