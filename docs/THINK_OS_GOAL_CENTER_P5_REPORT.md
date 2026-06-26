# Think OS P5：目标模板变体收敛版

## 设计结论

### 1. 主题模板还有没有存在必要？

新主链里不应该再存在“主题模板”作为模板决策入口。

- 主题保留：path、icon、color、层级、启停状态。
- 主题不再决定模板。
- 旧 `ThemeOverride / Block × Theme` 只作为历史兼容和诊断信息存在。

### 2. 目标的模板是不是 Block？

不是。

- Block 是固定动作类型：任务、计划、总结、打卡、阻碍项、里程碑、思考、事件。
- 模板是输出策略：字段默认值、必填字段、输出文件、标题位置、Markdown 输出格式。

所以正确模型是：

```txt
Goal + Block -> GoalTemplate
```

### 3. 一个目标下需要多个模板怎么办？

不要回到“主题 × Block 矩阵”。

P5 引入的是：

```txt
Goal × Block × TemplateVariant
```

例如：

```txt
健康目标 × 打卡 × 运动打卡
健康目标 × 打卡 × 饮水打卡
健康目标 × 打卡 × 睡眠打卡
```

这样既能支持一个目标下同一个 Block 的多个模板，又不会让主题重新成为模板主轴。

## 本版完成内容

| 模块 | 改动 | 状态 |
|---|---|---|
| GoalTemplate 类型 | 增加 `variantId / name / description / isDefault` | 已完成 |
| 模板 ID | `getGoalTemplateId(goalId, blockId, variantId)` 支持模板变体 | 已完成 |
| 模板查找 | `findGoalTemplate()` 支持指定变体；未指定时选默认模板 | 已完成 |
| 模板列表 | 新增 `getGoalTemplateVariants()` | 已完成 |
| 存储兼容 | 仍写入 legacy `goalBlockBindings`，但支持变体字段 | 已完成 |
| GoalTemplateResolver | 支持 `templateVariantId` | 已完成 |
| 提交保存链 | 从 context/formData 读取 `templateVariantId` | 已完成 |
| QuickInput | 目标 + Block 下存在多个模板时显示“模板”选择区 | 已完成 |
| QuickInput | 选择模板后预览和保存均使用该变体 | 已完成 |
| 目标模板 UI | 支持新建/编辑/删除模板变体 | 已完成 |
| 目标模板 UI | 支持设置默认模板 | 已完成 |
| data.json | 增加 `goalCoreP5TemplateVariantVersion = 1` | 已完成 |

## 计划表与进度

| 阶段 | 模块 | 目标 | 当前进度 | 状态 |
|---|---|---|---:|---|
| Phase 0 | 深度审查 | 确认真实主链、UI 偏差、任务格式风险 | 100% | 已完成 |
| Phase 1 | 保存主链 | 提交保存切到 `Goal × Block` | 100% | 已完成 |
| Phase 1 | 模板解析 | 保存链使用 `GoalTemplateResolver` | 100% | 已完成 |
| Phase 1 | 任务格式 | 修复 `- [ ]` / `- [x]` 任务状态格式 | 100% | 已完成 |
| Phase 2 | 数据管理页 | 目标中心从快速输入迁移到数据管理 | 100% | 已完成 |
| Phase 2 | 主题管理 | 主题只做 metadata 管理 | 90% | 已完成基础版 |
| Phase 3 | GoalManager 拆分 | 目标实体/模板/指标/诊断分区 | 100% | 已完成 |
| Phase 3 | ThemeMatrix legacy | 旧主题模板矩阵降级为 legacy/internal | 80% | 已推进 |
| Phase 3 | 编辑链修复 | 修复点开编辑 `reading blocks` 崩溃 | 100% | 已完成 |
| Phase 4 | 旧 override 诊断 | 显示主题/Block override 影响范围 | 80% | 已完成基础版 |
| Phase 5 | 模板概念收敛 | 确认模板不是 Block，主题不是模板主轴 | 100% | 本版完成 |
| Phase 5 | 多模板需求 | 支持同一目标 + Block 下多个模板 | 100% | 本版完成 |
| Phase 5 | QuickInput 模板变体 | 多个模板时可选择模板变体 | 100% | 本版完成 |
| Phase 5 | 默认模板 | 每个目标 + Block 可以设置默认模板 | 90% | 本版完成基础版 |
| Phase 5 | 存储结构 | 兼容 legacy storage，新增变体字段 | 90% | 本版完成基础版 |
| Phase 6 | 模板变体排序 | 支持手动排序 | 0% | 后续可做 |
| Phase 6 | 模板变体复制 | 从已有模板复制新变体 | 0% | 后续可做 |
| Phase 6 | 模板变体诊断 | 检查重复/无默认/禁用模板 | 20% | 后续增强 |

## 已通过 gate

- public-api-gate
- feature-gate
- arch-gate
- core-public-gate
- shared-public-gate
- src-console-gate
- settings-persistence-gate
- shared-view-export-gate
- shared-view-legacy-forwarder-gate
- shared-internal-alias-gate
- mui-compat-migrated-gate
- di-gate
- dual-system-gate
- obsidian-leak-gate
- events-boundary-gate
- core-obsidian-gate
- di-resolve-gate
- modal-promise-gate
- selector-giant-subscription-gate
- theme-tree-recursion-gate
- theme-matrix-legacy-import-gate
- iconaction-gate
- data-store-boundary-gate
- performance-boundary-gate
- timer-view-runtime-boundary-gate
- shared-self-alias-migrated-gate

## 受限项

当前容器仍缺完整 `node_modules`，所以完整类型检查和构建需要本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```
