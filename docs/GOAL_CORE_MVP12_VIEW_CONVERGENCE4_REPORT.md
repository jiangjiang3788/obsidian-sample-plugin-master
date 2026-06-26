# GOAL_CORE_MVP12.4 视图收敛加强版报告

## 本版目标

本版基于 MVP12.3，修正两项产品要求：

1. Progress 目标经验卡片必须每行一个，不能在宽屏下自动变成多列网格。
2. Statistics 仍然只按目标统计，但保留原视图里的“按照周期显示”复选框。该复选框只控制年/季/月视图内部是否使用记录的 `period` 字段显示对应粒度数据，不承担全局时间筛选职责。

## 本版完成

| 模块 | 改动 | 状态 |
|---|---|---|
| Progress | 目标卡片容器从自适应多列改为单列 `minmax(0, 1fr)` | 已完成 |
| Progress | 保持每个目标一张可折叠经验卡片 | 已完成 |
| Statistics | 恢复运行时“按照周期显示”复选框 | 已完成 |
| Statistics | 复选框文案从“使用周期字段”改为“按照周期显示” | 已完成 |
| Statistics | `usePeriod` 从固定 false 改为本地状态，默认读取 `viewConfig.usePeriodField` | 已完成 |
| Statistics | 设置页增加“默认按照周期显示”配置 | 已完成 |
| Statistics | 仍然只按目标统计，不恢复分类主维度 | 已完成 |
| Statistics | 时间范围仍由外部控制栏和视图筛选管线控制 | 已保持 |
| data.json | `goalCoreMvpVersion = 14` | 已完成 |

## 设计边界

- Progress 不新增顶部控制区。
- Progress 不提供视图内创建按钮。
- Statistics 不恢复分类统计主模式。
- Statistics 的“按照周期显示”不是时间范围控制，只是原 Statistics 内部的周期字段显示开关。
- 目标、Block、主题、时间范围筛选仍统一通过控制栏和视图筛选控制。

## MVP12 计划进度表

| 编号 | 模块 | 计划项 | 进度 | 状态 |
|---|---|---|---:|---|
| 1 | 视图注册 | 移除 GoalOverview / GoalDetail 作为公开新增视图 | 90% | legacy 文件仍保留兼容 |
| 2 | 默认布局 | 默认布局不再加载 GoalOverview / GoalDetail viewType | 100% | 已改为 ProgressView / StatisticsView |
| 3 | 默认数据 | 清理旧目标视图实例 ID | 90% | 已改名为目标经验/目标统计实例 |
| 4 | Progress 主维度 | Progress 按目标分组 | 100% | 已完成 |
| 5 | Progress UI | 每个目标一张经验卡片 | 100% | 已完成 |
| 6 | Progress UI | 卡片每行一个 | 100% | MVP12.4 完成 |
| 7 | Progress UI | 卡片可折叠 / 展开 | 100% | 已完成 |
| 8 | Progress 经验 | 每个目标复用原经验算法 | 100% | 已完成 |
| 9 | Progress Block 统计 | 展示任务/计划/总结/打卡/阻碍/里程碑/思考/事件数量 | 100% | 已完成 |
| 10 | Progress 控制区 | 不新增顶部控制区 | 100% | 已完成 |
| 11 | Progress 新建入口 | 不在视图里新建数据 | 100% | 已完成 |
| 12 | Progress topN | 显示目标数量配置生效 | 100% | 已完成 |
| 13 | Progress 空状态 | 无目标数据不崩溃 | 95% | 需本地运行验证 |
| 14 | 目标分组工具 | 统一 `getItemGoalKey / buildGoalBuckets` | 100% | 已完成 |
| 15 | 未归属目标 | Statistics 显示，Progress 默认隐藏 | 100% | 已完成 |
| 16 | Statistics 主维度 | 只按目标，不按分类 | 100% | 已完成 |
| 17 | Statistics legacy 分类 | 不再使用 `viewConfig.categories` 作为柱子配置 | 100% | 已收敛 |
| 18 | Statistics 控制区 | 不新增时间范围/目标筛选控制区 | 100% | 外部控制栏负责 |
| 19 | Statistics 周期复选框 | 保留“按照周期显示”复选框 | 100% | MVP12.4 恢复 |
| 20 | Statistics 周视图 | 周内柱子代表目标 | 100% | 已完成 |
| 21 | Statistics 月视图 | 月汇总 + 每周块均按目标统计 | 100% | 已完成 |
| 22 | Statistics 季视图 | 季度/月/周结构按目标统计 | 95% | 待本地视觉验证 |
| 23 | Statistics 年视图 | 年/季/月/周结构按目标统计 | 95% | 待本地视觉验证 |
| 24 | ChartBlock | 从分类柱变成通用 bucket 柱 | 100% | 已完成 `bucketAccessor` |
| 25 | Popover | 点击目标柱显示该周期该目标数据 | 100% | 已完成 |
| 26 | Popover 新建 | Statistics popover 不提供 quickCreate | 100% | 已完成 |
| 27 | 控制栏 | 时间范围由外部控制栏控制 | 100% | 已完成 |
| 28 | 视图筛选 | 目标 / Block / 主题筛选由统一筛选面板控制 | 95% | 继续使用 pipeline |
| 29 | UI 文案 | Statistics 文案收敛到目标统计 | 95% | MVP12.4 更新周期开关文案 |
| 30 | 单元测试 | itemGoalGrouping 测试 | 80% | 已新增草案，需本地 jest |
| 31 | 单元测试 | Progress 目标经验测试 | 80% | 已更新草案，需本地 jest |
| 32 | 单元测试 | Statistics 目标周期统计测试 | 80% | 已更新草案，需本地 jest |
| 33 | Gate | 现有架构 gate | 100% | 当前环境已通过 |
| 34 | TypeScript | 完整 typecheck | 受限 | 当前容器缺 vite/tsc/jest |
| 35 | Build | 生成最新 main.js | 受限 | 需本地 `npm run build` |

## 已通过 gate

当前环境已通过 public、feature、arch、core-public、shared-public、shared-view、console、DI、settings persistence、theme tree、performance 等现有 gate。

## 本地验证建议

```bash
npm ci
npm run typecheck:src
npm test -- --runTestsByPath test/unit/itemGoalGrouping.test.ts test/unit/progressGoalMode.test.ts test/unit/statisticsGoalMode.test.ts
npm run build
```
