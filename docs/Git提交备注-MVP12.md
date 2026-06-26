refactor: 单人版收敛 MVP12，拆分 Heatmap 视图渲染层

本次提交继续推进单人插件收敛。MVP10/MVP11 已经统一 QuickInput 与 AI 批量确认的输入外观层，并拆出 AI 批量确认模型。本轮开始清理 shared view 层的大文件，优先处理 HeatmapView。

主要改动：
- 新增 src/shared/ui/views/HeatmapViewModel.ts，承接 Heatmap 主题推断、主题选择、目标分组过滤、block id 归一化、创建记录 block 解析和天视图分组等纯 helper
- 新增 src/shared/ui/views/HeatmapThemeGroup.tsx，承接非天视图下的主题行、日期格、月份网格、折叠和响应式布局渲染
- 新增 src/shared/ui/views/HeatmapDayView.tsx，承接天视图下的目标分组和主题分组渲染
- HeatmapView.tsx 不再直接渲染 HeatmapCell，只负责数据注入/fallback、rating mapping cache、创建记录/打开记录管理器交互、折叠状态和子组件组合
- HeatmapView.tsx 从约 682 行下降到约 326 行
- 新增 test/unit/heatmapViewModel.test.ts，覆盖主题推断、block 归一化、创建 block 解析、天视图分组和空目标过滤
- 加强 single-user-convergence-gate，要求 HeatmapViewModel / HeatmapThemeGroup / HeatmapDayView 存在，限制 HeatmapView.tsx 不超过 360 行，并禁止 HeatmapView.tsx 直接渲染 HeatmapCell

验证：
- npm run single-user:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。

下一步：
- 清理 Progress / Timeline / Statistics 视图重复模型
- 做文档治理；如删除历史过程文档，则下一轮需要交付完整项目包
