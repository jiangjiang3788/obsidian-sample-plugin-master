# Goal Core MVP3 Report

本版继续基于 MVP2 推进，不重开结构。本版目标是把“目标中心”从可读/可迁移推进到可配置和可持续使用：

- 快捷输入面板支持直接新建目标。
- 设置页目标中心增加目标周期管理。
- 设置页目标中心增加 GoalBlockBinding 配置 UI。
- GoalUseCase 扩展周期 CRUD 和目标-核心 Block 绑定 CRUD。
- GoalTemplateResolver 支持 binding.defaultValues / binding.requiredFields 注入。
- 修复 GoalOverview 里 coreBlock 推断的一个潜在未导入 readField 问题。
- data.json 标记升级为 goalCoreMvpVersion = 3。

## 完整计划进度表

| 编号 | 模块 | 计划项 | 当前进度 | MVP3 状态 |
|---|---|---|---|---|
| 1 | 核心 Block | 8 个核心 block：task/plan/review/thought/habit/evidence/blocker/milestone | 100% | 已完成 |
| 2 | 旧 Block 映射 | 旧任务/计划/总结/打卡/闪念映射到核心 block | 100% | 已完成 |
| 3 | data 模板 | data.json 默认模板迁到核心 block ID | 100% | 已完成 |
| 4 | 目标字段 | 模板写入目标ID/目标/主题/核心Block | 100% | 已完成 |
| 5 | 目标实体 | ThinkSettings 增加 goalSettings | 100% | 已完成 |
| 6 | 核心 Block 设置 | ThinkSettings 增加 coreBlockSettings | 100% | 已完成 |
| 7 | 快捷输入上下文 | 目标升级为顶部主上下文 | 100% | 已完成 |
| 8 | 主题降级 | 主题降级为表单内 hierarchicalSingleSelect 字段 | 100% | 已完成 |
| 9 | 快捷输入新建目标 | 面板内直接新建目标并自动选中 | 100% | MVP3 已完成 |
| 10 | 字段来源 | user/context/goal_context/theme_context/template_default/system_auto 来源分层 | 80% | 已接入基础规则 |
| 11 | 目标模板解析 | goal + coreBlock + theme fallback resolver | 100% | 已完成 |
| 12 | 目标绑定 fallback | 子目标无绑定时回退父目标绑定 | 100% | 已完成 |
| 13 | 主题 fallback | 完整主题无 override 时回退父主题 | 100% | 已完成 |
| 14 | GoalBlockBinding 数据 | 目标专属核心 Block 绑定模型 | 100% | 已完成 |
| 15 | GoalBlockBinding UI | 设置页配置目标专属文件/标题/模板/启用 | 85% | MVP3 已完成基础版 |
| 16 | Binding 默认值 | binding.defaultValues 注入字段 defaultValue | 80% | MVP3 已完成解析层 |
| 17 | Binding 必填字段 | binding.requiredFields 标记字段 required | 60% | MVP3 已完成解析层，UI 校验待补 |
| 18 | 目标周期模型 | CycleDefinition 保存目标周期 | 100% | 已完成 |
| 19 | 目标周期用例 | add/update/delete cycle | 90% | MVP3 已完成基础版 |
| 20 | 目标周期 UI | 设置页添加/删除周期 | 80% | MVP3 已完成基础版 |
| 21 | 旧目标迁移 | 从旧目标字段推断目标候选 | 100% | 已完成 |
| 22 | 目标关系生成 | 从旧记录建立 GoalRecordRelation | 100% | 已完成 |
| 23 | Markdown 解析 | 解析目标ID/周期ID/核心Block | 100% | 已完成 |
| 24 | 视图字段 | 视图筛选字段目标优先 | 90% | 已完成基础调整 |
| 25 | 目标总览视图 | 聚合目标下任务/计划/总结/打卡/事件/阻碍/里程碑 | 90% | 已完成基础版，交互待增强 |
| 26 | 目标详情交互 | 在目标总览里直接创建任务/阻碍/里程碑 | 20% | 待下一版 |
| 27 | 目标指标系统 | 目标 metrics 的进度计算 | 20% | 类型已有，计算/UI 待补 |
| 28 | Markdown 写回迁移 | 把旧记录补写目标ID | 0% | 未做，建议 P2 |
| 29 | 完整类型检查 | npm run typecheck:src | 受阻 | 缺 node/preact/vite 类型依赖 |
| 30 | 完整构建 | npm run build | 受阻 | 需先安装依赖 |

## MVP3 关键代码变更

### 1. GoalUseCase 扩展

文件：`src/app/usecases/goal.usecase.ts`

新增能力：

- `restoreGoal(id)`
- `addCycle(input)`
- `updateCycle(id, patch)`
- `deleteCycle(id)`
- `upsertGoalBlockBindingDraft(input)`
- `deleteGoalBlockBinding(goalId, coreBlockId)`

目的：继续保持 UI 不直接改 settings，设置页和快捷输入都通过 usecase 写入目标数据。

### 2. 快捷输入支持直接新建目标

文件：

- `src/app/ui/components/QuickInputEditor/components/GoalSelector.tsx`
- `src/app/ui/components/QuickInputEditor/QuickInputEditorContainer.tsx`
- `src/app/ui/components/QuickInputEditor/QuickInputEditorView.tsx`

现在用户在快捷输入面板里可以输入：

```txt
产品化/插件/目标中心
```

点击“新建目标”后会：

1. 创建 GoalDefinition。
2. 自动使用当前主题字段/当前目标上下文作为 themePath。
3. 自动选中新目标。
4. 写入 goalId、goalPath、目标、themePath 等上下文。

### 3. 目标中心设置页增强

文件：`src/features/settings/input/GoalManager.tsx`

新增四个区域：

1. 目标实体
2. 旧目标字段迁移预览
3. 目标周期
4. 目标专属核心 Block 绑定

GoalBlockBinding 基础 UI 支持：

- 选择目标
- 选择核心 Block
- 启用/禁用
- 覆盖 targetFile
- 覆盖 appendUnderHeader
- 覆盖 outputTemplate
- 删除绑定

### 4. GoalTemplateResolver 增强

文件：`src/core/services/GoalTemplateResolver.ts`

`mergeTemplate()` 现在会处理：

- `defaultValues`
- `requiredFields`

这让未来设置页可以继续扩展字段默认值和必填校验，不需要重写解析器。

### 5. GoalOverview 修复

文件：`src/core/goal/overview.ts`

修复了 `readCoreBlock()` 中对未导入 `readField` 的依赖，改成使用本地 loose field reader，避免后续类型检查失败。

## 本版没有完成的事项

1. 目标详情页内直接创建任务/阻碍/里程碑还没有接入。
2. requiredFields 只进入解析层，字段提交校验还没有完整启用。
3. 目标指标 metrics 只有类型合同，尚未完成进度计算 UI。
4. Markdown 写回迁移没有做，仍然保持“不破坏旧 Markdown”的策略。
5. 当前容器缺少 node/preact/vite 类型依赖，无法完成真实 typecheck/build。

## 本地验证建议

解压后执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

当前容器验证结果：

```txt
npm run typecheck:src
失败原因：Cannot find type definition file for 'node' / 'preact' / 'vite/client'
```

这属于依赖环境问题。依赖安装完整后，优先处理真实 TypeScript 编译错误。

## 下一版建议

| 优先级 | 下一步 | 说明 |
|---|---|---|
| P0 | 完整依赖环境下修复类型检查 | 先确保 MVP3 能编译 |
| P0 | GoalBlockBinding 字段级 UI | 配置 defaultValues / requiredFields / fields patch |
| P1 | 快捷输入目标周期选择 | 选择目标后自动出现活跃周期 |
| P1 | 目标详情页快捷创建 | 从 GoalOverview 直接创建任务、阻碍、里程碑 |
| P1 | 目标指标 metrics UI | 目标次数、进度、评分、完成率 |
| P2 | Markdown 写回迁移 | 旧记录补写目标ID，需预览和回滚 |
