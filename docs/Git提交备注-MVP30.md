refactor: 单人版收敛 MVP30，简化 Progress 为技能经验视图

本次提交根据新的 Progress 视图方向，把 ProgressView 从通用进度卡进一步收窄为“目标大技能 + 主题小技能 + 经验条”的简洁技能经验视图。不新增时间控制，不显示完成率，不显示提醒/掉队，继续复用现有控制栏筛选后的数据。

主要改动：
- ProgressView 移除默认 summary cards 展示，只保留目标技能卡列表和展开状态
- ProgressView 增加 onOpenRecord 透传，供展开态记录入口复用现有打开记录能力
- ProgressGoalCard 改成大技能卡结构：目标图标、目标名、目标路径、等级徽章、总经验条和小技能纵向列表
- 大经验条使用渐变条和 10 段刻度，不再显示完成率百分比
- 主题细分从并排卡片改成小技能纵向列表，每行显示小技能名、记录数、XP、小经验条和等级
- 展开态只保留 Block 标签和最近记录入口，避免默认视图信息过载
- ProgressViewModel 新增 1-10 级 PROGRESS_LEVEL_META、getProgressLevelMeta、buildProgressSkillRows 等展示模型 helper
- progressViewModel 为每个目标卡补充 recentRecords，供展开态记录跳转使用
- progressViewModel 的 normalizeBlockKey 改用 UnknownRecord reader，减少显式 any
- ProgressView 默认 metric 从 completionRate 调整为 recordCount，符合 MVP 先按记录数计经验的方向
- 更新 ProgressViewEditor 文案，明确 ProgressView 不展示完成率和掉队提醒
- 收紧 any-budget-gate：src 预算从 875 降到 870，总预算从 1040 降到 1035

治理结果：
- src 显式 any 从 870 降到 865
- total 显式 any 从 1036 降到 1031
- ProgressView 继续保持轻量组合壳
- 没有新增独立时间筛选逻辑，时间维度仍由统一控制栏传入

验证：
- npm run any-budget:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run single-user:gate 通过
- npm run docs-governance:gate 通过
- npm run final-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义和 jest 命令。请本地执行 npm ci 后运行 typecheck、unit test 和 build。
