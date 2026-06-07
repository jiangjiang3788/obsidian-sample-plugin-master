# MVP12.3 Progress / Statistics 视图收敛加强报告

## 目标

继续严格按现有视图架构收敛：

- Progress 不新增顶部控制区，只使用外部控制栏和视图筛选后的 items。
- Progress 按目标分组，每个目标一张可折叠经验卡片。
- Statistics 不新增顶部控制区，不再按分类作为主维度。
- Statistics 严格复用原 Day / Week / Month / Quarter / Year 周期结构，柱子只代表目标。
- GoalOverview / GoalDetail 不作为公开视图继续扩展，默认数据改为 ProgressView / StatisticsView。

## 本版完成内容

| 模块 | 改动 |
|---|---|
| data.json | 将旧 `vi_goal_overview_mvp2` 改名为 `vi_progress_goal_mvp12`，viewType 保持 `ProgressView` |
| data.json | 将旧 `vi_goal_detail_mvp6` 改名为 `vi_statistics_goal_mvp12`，viewType 保持 `StatisticsView` |
| data.json | 所有 StatisticsView 清空 legacy `categories`，强制 `groupBy: goal`，关闭 `usePeriodField` |
| StatisticsViewContainer | 正常路径优先使用 feature 层注入的 `statisticsModel.filteredCategories` 作为目标 buckets |
| StatisticsViewContainer | fallback 不再接收 `selectedCategories`，避免分类选择误裁剪目标柱 |
| StatisticsViewContainer | 注释明确：时间 / 周期 / 目标 / Block / 主题筛选由外部控制栏和视图筛选负责 |
| Statistics 周期视图 | Day / Week / Month / Quarter / Year 的 cellIdentifier 从 `category` 改为 `goal` |
| 测试草案 | 修正 Progress / Statistics 目标模式测试，新增 itemGoalGrouping 测试 |
| Gate | 通过现有架构和 shared view gate |

## 完整计划进度表

| 编号 | 模块 | 计划项 | 进度 | 状态 |
|---|---|---|---:|---|
| 1 | 视图注册 | 移除 GoalOverview / GoalDetail 作为公开新增视图 | 90% | 已从默认数据和新主链收敛，legacy 文件仍保留兼容 |
| 2 | 默认布局 | 默认布局不再加载 GoalOverview / GoalDetail viewType | 100% | MVP12.3 已改为 ProgressView / StatisticsView |
| 3 | 默认数据 | 清理旧目标视图实例 ID | 90% | 已改名为 `vi_progress_goal_mvp12` / `vi_statistics_goal_mvp12` |
| 4 | Progress 主维度 | Progress 按目标分组 | 100% | 已完成 |
| 5 | Progress UI | 每个目标一张经验卡片 | 100% | 已完成 |
| 6 | Progress UI | 卡片可折叠 / 展开 | 100% | 已完成 |
| 7 | Progress 经验 | 每个目标复用原经验算法 | 100% | 已完成 |
| 8 | Progress Block 统计 | 展开卡显示任务/计划/总结/打卡/阻碍/里程碑/思考/事件数量 | 100% | 已完成 |
| 9 | Progress 控制区 | 不新增顶部控制区 | 100% | 已完成 |
| 10 | Progress 新建入口 | 不在视图里新建数据 | 100% | 已完成 |
| 11 | Progress topN | 显示目标数量配置生效 | 100% | 已完成 |
| 12 | Progress 空状态 | 无目标数据不崩溃 | 95% | 已有空状态，仍建议本地运行验证 |
| 13 | 目标分组工具 | 新增统一 `getItemGoalKey / buildGoalBuckets` | 100% | 已完成 |
| 14 | 未归属目标 | Statistics 显示，Progress 默认隐藏 | 100% | 已完成 |
| 15 | Statistics 主维度 | 只按目标，不按分类 | 100% | 已完成 |
| 16 | Statistics legacy 分类 | 不再使用 viewConfig.categories 作为柱子配置 | 100% | MVP12.3 已清空默认 categories 并绕开 selectedCategories |
| 17 | Statistics 控制区 | 不新增 / 不使用内部顶部控制区 | 100% | 已完成 |
| 18 | Statistics 周视图 | 周内柱子代表目标 | 100% | 已完成 |
| 19 | Statistics 月视图 | 月汇总 + 每周块均按目标统计 | 100% | 已完成 |
| 20 | Statistics 季视图 | 季度/月/周结构按目标统计 | 95% | 已完成主链，待本地视觉验证 |
| 21 | Statistics 年视图 | 年/季/月/周结构按目标统计 | 95% | 已完成主链，待本地视觉验证 |
| 22 | ChartBlock | 从分类柱变成通用 bucket 柱 | 100% | 已完成 `bucketAccessor` |
| 23 | Popover | 点击目标柱显示该周期该目标数据 | 100% | 已完成 |
| 24 | Popover 新建 | Statistics popover 不提供 quickCreate | 100% | 已完成 |
| 25 | 控制栏 | 时间周期只由外部控制栏控制 | 100% | 已完成 |
| 26 | 视图筛选 | 目标 / Block / 主题筛选由统一筛选面板控制 | 95% | 已保持 pipeline，不在视图内重复筛选 |
| 27 | UI 文案 | Statistics 文案从分类统计收敛到目标统计 | 90% | 编辑器已改，部分内部变量名保留兼容 |
| 28 | 单元测试 | itemGoalGrouping 测试 | 80% | 已新增测试草案，需本地 jest 验证 |
| 29 | 单元测试 | Progress 目标经验测试 | 80% | 已更新测试草案，需本地 jest 验证 |
| 30 | 单元测试 | Statistics 目标周期统计测试 | 80% | 已更新测试草案，需本地 jest 验证 |
| 31 | Gate | 现有架构 gate | 100% | 当前环境已通过 |
| 32 | TypeScript | 完整 typecheck | 受限 | 当前容器缺 vite/tsc/jest，需本地执行 |
| 33 | Build | 生成最新 main.js | 受限 | 当前容器无 vite，需本地执行 `npm run build` |

## 本地验证建议

```bash
npm ci
npm run typecheck:src
npm test -- --runTestsByPath test/unit/itemGoalGrouping.test.ts test/unit/progressGoalMode.test.ts test/unit/statisticsGoalMode.test.ts
npm run build
```

## 重点验收

1. 视图选择中不再把 GoalOverview / GoalDetail 当成新增目标视图使用。
2. Progress 没有顶部控制区。
3. Progress 每个目标一张卡片，可折叠。
4. Statistics 没有顶部控制区。
5. Statistics 周视图里柱子是目标。
6. Statistics 月视图里每周块柱子是目标。
7. 点击目标柱弹出的是当前周期下该目标的数据。
8. 目标/Block/主题/时间范围仍通过控制栏和视图筛选控制。
