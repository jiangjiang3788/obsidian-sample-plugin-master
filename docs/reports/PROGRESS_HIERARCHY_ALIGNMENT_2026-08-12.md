# Progress hierarchy alignment · 2026-08-12

本轮继续收敛成长视图的列表层级，不新增 ViewType、周期或独立筛选系统。

## 修改
- 目标名称字号提升为一级视觉层级。
- 主题名称字号降低，且只在名称列内部缩进。
- 目标行与主题行共用同一套 6 列布局：展开符 / 图标或缩进 / 名称 / 等级 / 进度 / 数值。
- Lv 与进度条现在严格纵向对齐，不再受目标图标、主题缩进影响。
- 小屏仍使用相同列语义，只缩短列宽和字体，不改变对齐规则。
- 主题展开记录仍复用 Statistics / BlockView / TaskRow 渲染链。
- 之前 EventTimeline 连续主轴修改保留在同一源码中。

## 验证
`npm run gate`：product / architecture / records / task-session / energy / ui-runtime / quality / stability 全部 PASS。
