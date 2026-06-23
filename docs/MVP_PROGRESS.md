# Think OS MVP1 领域收敛版进度

## MVP 目标

把插件第一版主链收敛为：

Goal × CoreBlock → Template Variant → QuickInput Form → Markdown Record

Theme 降级为目标/记录的上下文字段；周期只属于计划 / 总结类记录预设，不再是目标属性，也不再默认 day。

## 完成进度

| 序号 | MVP 项 | 状态 | 完成度 | 说明 |
|---:|---|---|---:|---|
| 1 | Template Variant 概念落到类型层 | 已完成 | 90% | `GoalTemplate` 增加 `periodPolicy`，继续兼容存储名 `goalBlockBindings`，UI 文案统一为“记录预设”。 |
| 2 | 删除 Goal.granularity 业务使用 | 已完成 | 85% | 新建目标不再写 `granularity`；Goal 总览/详情不再读取目标粒度。类型上保留 deprecated 字段用于旧数据读取。 |
| 3 | 周期只在 plan/review 生效 | 已完成 | 90% | 新增 `PeriodPolicy`、`isPeriodAwareCoreBlock`、`resolveTemplatePeriodPolicy`；任务/打卡/思考/事件不再生成周期。 |
| 4 | 移除默认 day 兜底 | 已完成 | 85% | QuickInput 和 OutputPlanner 不再对所有记录生成 `day` 周期；计划/总结默认 `week`。 |
| 5 | Runtime 走 GoalTemplateResolver 主链 | 已完成 | 80% | Resolver 合并 CoreBlock + GoalTemplate，并去掉 Theme × Block runtime fallback。 |
| 6 | QuickInput 选择 Goal + Block + Variant | 已完成 | 80% | 已支持记录预设选择；周期字段仅在当前模板支持 periodPolicy 时注入。 |
| 7 | 系统字段隐藏 | 已完成 | 75% | QuickInput 主表单隐藏 goal/theme/period/coreBlock 等系统上下文字段，通过顶部摘要显示。 |
| 8 | 一次性 settings 迁移 | 已完成脚本版 | 70% | 新增 `scripts/migration/one-shot-domain-migration.mjs`，可迁移 data.json；未自动集成到插件启动流程。 |
| 9 | 测试/构建验证 | 未完全完成 | 20% | 当前环境 npm 安装未完整完成，未能跑完 typecheck/build；已做静态代码级收敛。 |

## 第一版 MVP 验收标准

- 新建目标不再写入目标周期。
- 任务 / 打卡 / 思考 / 事件记录不会自动出现 `周期::`、`周期ID::`、`goalGranularity`。
- 计划 / 总结记录会写入 `周期粒度::`、`周期ID::`、`周期::`，默认周粒度。
- 目标 × Block 单元格中的记录预设可以保存 periodPolicy；非计划/总结显示“不适用”。
- 运行时模板选择主链为 GoalTemplate → CoreBlock → legacy block，不再回退 Theme × Block override。

## 已知限制

- 旧 Markdown 记录没有批量改写，只提供 settings/data.json 的一次性迁移脚本。
- `GoalTemplate` 存储字段仍沿用 `goalBlockBindings`，这是为了降低第一版修改风险；业务语义已改成 Template Variant。
- 没有完成 Obsidian Workspace Tab 设置页迁移；该项属于第二阶段体验优化。
