# 1.0.64 记录录入闭环

本版只收敛“入口 → Goal 上下文 → GoalTemplate → RecordInputSession → 保存”主链，并重做 GoalTemplate 矩阵的新增交互；不启动 Field Foundation / Category Model 的下一阶段重构。

## 运行时规则

1. Goal-bound RecordType 在 Goal 未明确前不渲染一个看似可用的默认表单，也不猜第一个 Goal。
2. Heatmap / Timeline / 命令 / QuickInput 通过同一 Goal context 解析规则进入 Record input。
3. `GoalTemplateResolver` 是 Goal × RecordType 模板决策的唯一入口：直接 override、显式 disabled、否则 RecordType default；无父 Goal 继承。
4. RecordInputSession 内部使用 canonical `goalPath`，Markdown storage 仍由 Codec 写 `目标::`。
5. Timeline 创建任务直接使用注册的 `core.task`，不再用名称搜索后退到 `blocks[0]`。

## 这次直接修复

- 修复 `Cannot access 'withGoalContext' before initialization`。
- Heatmap 深层 Goal 上下文能正确选中根 Goal 与当前子层；无 Goal 时不再视觉选中第一项。
- 命令打开 Goal-bound RecordType 时先选择 Goal，再加载该 Goal 的 override/default 模板。
- QuickInput 主路径不再读取 `InputSettings.blocks` 复制源来显示 RecordType 名称。
- GoalTemplate 空矩阵格不再铺满 `+`；每个 Goal 行提供一个“添加模板”记录类型选择入口。
- 已配置单元格不再显示 Goal icon + “已配置”，统一显示简洁的“自定义”。
- Think OS 全局 surface 使用 flat contract：shadow token 全部为 `none`，scope 禁止宿主/feature 投影。

## 回归保护

新增 `recordInputClosure.test.ts`，覆盖：view Goal context、submit Goal context、无 first-goal guess、Goal 前置模板加载、Goal 行新增模板、全局无投影。
同时更新旧测试中已经被架构淘汰的两条期待：Energy 不再 fallback 第一 Goal；Energy menu 使用统一 Overlay 动态 z-index。
