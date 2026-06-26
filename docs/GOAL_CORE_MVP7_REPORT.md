# Goal Core MVP7 架构收敛版

本版不是继续堆功能，而是按“非必要勿增实体”的方向收敛：目标是唯一主轴，Block 固定，主题只提供图标/颜色/领域上下文，周期由日期和粒度运行时推导，视图只展示不创建数据。

## 完成项

1. Block 命名收敛：`thought` 显示为“思考”，`evidence` 显示为“事件”，不再显示“闪念/思考”“闪念/事件”。
2. 核心模板清理：移除手动周期字段，模板输出 `period.id / period.label`。
3. 新增 `resolveDerivedPeriod(date, granularity)`，周期由记录日期 + 目标粒度推导。
4. QuickInput 隐藏手动周期选择，改为自动注入当前推导周期。
5. GoalTemplateResolver 主链收敛为 `Goal + Block`，主题只作为元数据，不再决定模板；旧主题模板仅作为 legacy fallback。
6. OutputPlanner 注入 `period / periodId / periodLabel`，并优先使用主题图标 `theme.icon`。
7. GoalOverview 改为 Progress 风格，只展示目标进度，不再在视图里创建数据。
8. GoalDetail 改为 Statistics 风格，只展示单目标统计和 Block 分布。
9. 视图层移除 GoalOverview/GoalDetail 的快捷创建入口，统一由快捷输入面板写数据。
10. `data.json` 升级到 `goalCoreMvpVersion = 7`，默认 Block/模板同步收敛。

## 设计原则

- Block = 固定动作类型：任务、计划、总结、打卡、阻碍项、里程碑、思考、事件。
- Goal = 业务主轴和输入上下文。
- Template = 目标 + Block 的输出策略。
- Theme = 图标、颜色、领域归属，不再作为模板主轴。
- Period = 运行时推导，不手动维护周期实体。
- View = 只读聚合，新增数据统一走 QuickInput。

## 后续建议

下一版建议继续做：

1. 隐藏/删除设置页里旧的周期管理和 Markdown 写回动作，只保留目标候选建议。
2. `GoalBlockBinding` 改名/收敛为 `GoalTemplate`，减少心智负担。
3. 把目标粒度作为目标表单的一等字段。
4. 为 `resolveDerivedPeriod`、`GoalTemplateResolver`、GoalOverview 进度计算补单元测试。
