# ThinkOS Goal Center P2：数据管理打磨版

## 本版目标

本版不扩展新主链，而是在 P0/P1 的基础上继续做“概念收敛 + UI 降复杂度”：

- 数据管理页改成分区入口，而不是把目标中心和主题管理堆在一个长页面。
- 目标中心内部拆成“目标实体 / 目标模板 / 目标指标 / 候选与诊断”四个子区。
- 主题管理增加图标继承预览，明确主题只提供 metadata。
- ThemeMatrix 增加 legacy 警告，避免误以为它仍是新模板主入口。
- 保持 QuickInput 表单隐藏目标、主题、周期、核心 Block 等系统字段。

## 本版完成内容

| 模块 | 修改 | 状态 |
|---|---|---|
| 数据管理页 | 增加“目标中心 / 主题管理”分区按钮 | 已完成 |
| 目标中心 | 增加内部四分区：目标实体、目标模板、目标指标、候选与诊断 | 已完成 |
| 主题管理 | 增加主题图标继承预览 | 已完成 |
| 主题管理 | 主题列表显示本主题图标或继承来源 | 已完成 |
| ThemeMetadataResolver | 子主题存在但无图标时，也可向父主题继承图标 | 已完成 |
| ThemeMatrix | 增加 legacy 警告，不再暗示它是主模板入口 | 已完成 |
| QuickInput 字段 | 系统字段继续隐藏 | 已保持 |
| data.json | 增加 `goalCoreP2DataManagementVersion = 1` | 已完成 |

## 完整计划表与进度

| 阶段 | 模块 | 目标 | 当前进度 | 状态 |
|---|---|---|---:|---|
| Phase 0 | 深度审查 | 确认真实主链、UI 偏差、任务格式风险 | 100% | 已完成 |
| Phase 1 | 保存主链 | 提交保存切到 `Goal × Block` | 100% | P0 完成 |
| Phase 1 | 模板解析 | 保存链使用 `GoalTemplateResolver` | 100% | P0 完成 |
| Phase 1 | 任务格式 | 修复 `- [ ]` / `- [x]` 任务状态格式 | 100% | P0 完成 |
| Phase 1 | ThemeMatrix | 快速输入设置页隐藏主题模板矩阵 | 100% | P0 完成 |
| Phase 2 | 设置页结构 | 新增「数据管理」tab | 100% | P1 完成 |
| Phase 2 | 目标中心位置 | 从快速输入页迁移到数据管理页 | 100% | P1 完成 |
| Phase 2 | 主题管理 | 新增主题元数据管理器 | 90% | P2 增强图标继承 |
| Phase 2 | 系统字段隐藏 | 表单不显示目标ID、目标、主题、周期、核心Block | 90% | 已保持 |
| Phase 3 | 数据管理分区 | 数据管理页分成目标中心/主题管理 | 100% | 本版完成 |
| Phase 3 | GoalManager 降复杂度 | 目标中心内部改成四个子区 | 75% | 本版 UI 分区完成；文件拆分待后续 |
| Phase 3 | 主题图标继承 | 支持父主题图标回退并展示来源 | 100% | 本版完成 |
| Phase 3 | ThemeMatrix legacy | 给 legacy 入口加警告 | 70% | 本版完成；进一步 internal 化待后续 |
| Phase 3 | GoalManager 文件拆分 | 拆成 GoalEntityManager / GoalTemplateManager / GoalMetricManager / GoalDiagnostics | 0% | 下一版建议 |
| Phase 3 | 单元测试 | ThemeMetadataResolver 继承规则测试 | 0% | 需本地 jest |
| Phase 4 | Data Management 诊断 | 增加旧 override 数量与影响范围分析 | 0% | 下一版建议 |

## 关键设计结论

- 目标中心不应该变成一个超长页面，需要按工作流分区。
- 主题管理不应该承载模板编辑，只做 path/icon/status metadata。
- ThemeMatrix 还可以作为旧数据兼容入口存在，但必须有明确 legacy 提示。
- 主题图标继承是必要能力：目标可能绑定 `电脑/插件/目标中心`，但图标可来自 `电脑/插件` 或 `电脑`。

## 本地验证建议

```bash
npm ci
npm run typecheck:src
npm run build
```

当前容器缺少完整 `node_modules`，无法完成完整 TypeScript 构建验证。
