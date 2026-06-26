# GOAL_CENTER_MVP31_GOAL_THEME_VIEW_CONVERGENCE_REPORT

## 本版目标

v14 按计划推进第 24、25 项：视图修正与数据源修正。

产品判断：目标是第一主线，主题是目标下的二级维度。主题不再决定模板，也不再作为目标创建来源；但主题仍然要保留在记录、表单、筛选、统计和进度视图中。

最终用户理解应该是：

```text
目标：#照顾好自己
  主题：健康/睡眠、健康/心情、健康/姨妈
  Block：打卡、任务、总结
```

而不是：

```text
健康/睡眠 是一个目标
健康/心情 是一个目标
```

## 本版完成内容

### 1. 新增统一主题读取能力

新增/导出：

```ts
getItemThemeKey(item)
getItemThemeLabel(item)
buildGoalThemeBreakdown(items, goals)
```

位置：

```text
src/core/goal/itemGoalGrouping.ts
src/core/goal/index.ts
src/core/public.ts
```

读取优先级：

```text
item.themePath
item.theme
readField(item, 'themePath')
readField(item, '主题')
item.extra.themePath / item.extra['主题'] / item.extra['主题路径']
未设置主题
```

### 2. 目标经验视图加入主题二级维度

`ProgressView` 现在仍然按目标显示卡片，但展开目标后会显示：

```text
主题细分
睡眠 12 条 · 12 经验
心情 8 条 · 8 经验
运动 5 条 · 5 经验
```

修改文件：

```text
src/core/progression/computeProgression.ts
src/shared/ui/views/ProgressView.tsx
```

### 3. 目标统计视图加入主题摘要

`StatisticsView` 仍然按目标作为统计柱/格子的主维度，但顶部会显示每个目标下最主要的几个主题摘要：

```text
照顾好自己 · 睡眠12 / 心情8 / 姨妈3
强健身体 · 运动10 / 身体4
```

修改文件：

```text
src/features/settings/viewModels/statisticsViewModel.ts
src/shared/ui/views/StatisticsView/StatisticsViewContainer.tsx
src/shared/ui/views/StatisticsView/StatisticsViewView.tsx
```

### 4. 数据源筛选修正

`filterByRules` 对目标和主题字段做了统一处理：

```text
themePath / rootTheme / leafTheme
goalPath / rootGoal / leafGoal
```

支持 `in / notIn` 多值时大小写一致，避免筛选主题或目标时因为大小写或数组处理导致误判。

修改文件：

```text
src/core/utils/itemFilter.ts
```

## 当前进度表

| 序号 | 事项 | 进度 | 本版变化 |
|---:|---|---|---|
| 1 | 迁移准备 / 备份 | 已完成 | v9 已新增一键备份 UI |
| 2 | 数据审计 | 已完成 | v10 已新增完整审计 UI |
| 3 | 旧记录扫描 | 已完成 | v11 已新增深度扫描 |
| 4 | 目标识别 | 已完成 | 主题归类到目标，不再主题变目标 |
| 5 | 新旧映射 | 已完成 | 支持 legacyOverrideId → goalTemplate |
| 6 | 目标模板结构 | 已完成 | goalId + coreBlockId + variantId |
| 7 | 目标库去周期/主题 | 已完成 | 周期归预设，主题归表单 |
| 8 | 迁移计划生成 | 已完成 | 已接入 UI |
| 9 | 迁移执行 | 已完成 | 可在 UI 中迁移 |
| 10 | 旧主题表单迁移 | 已完成 | 字段、输出、保存位置已迁移 |
| 11 | 模板改写 | 部分完成 | 新预设模板已改写；旧 Markdown 深度改写已推进 |
| 12 | 周期迁移 | 已完成 | 周期在预设里 |
| 13 | 主题降级 | 已完成 | 主题保留为表单默认值和统计维度 |
| 14 | 旧记录改写 | 已完成 | v12 支持任务行与块字段深度改写 |
| 15 | 任务行改写 | 已完成 | v12 支持任务行内字段改写 |
| 16 | 解析器清理 | 已完成 | v13 运行时不再回退 ThemeOverride |
| 17 | QuickInput 主链路 | 已完成 | 目标 → Block → 预设 |
| 18 | QuickInput 主题/周期同步 | 已完成 | 已同步 |
| 19 | 目标中心 UI | 已完成 | 目标 × Block 预设表 |
| 20 | 目标库 UI | 已完成 | 目标库只管目标 |
| 21 | 预设编辑 | 已完成 | 多表单表格编辑 |
| 22 | 旧配置清理 | 已完成 | v13 新增 UI 清理旧 inputSettings.overrides |
| 23 | 类型清理 | 部分完成 | GoalTemplateResolver 类型已收敛；parser 仍保留旧记录读取能力 |
| 24 | 视图修正 | 已完成 | v14 目标视图保留目标主线，并展示主题二级维度 |
| 25 | 数据源修正 | 已完成 | v14 统一目标/主题筛选字段处理 |
| 26 | AI 输入 | 待做 | 可后置 |
| 27 | 迁移校验 | 已完成 | 已完成校验 UI |
| 28 | 新建记录回归 | 待做 | 8 类 Block 待逐项验证 |
| 29 | 编辑旧记录回归 | 部分完成 | v13 增强核心 Block 提示识别 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑 |
| 31 | 清理报告 | 部分完成 | 每版报告已生成；自动迁移汇总待做 |
| 32 | 最终清理 | 部分完成 | 旧主题模板运行时链路已断开；旧 UI 入口后续继续清理 |
| 33 | 构建验证 | 部分完成 | 当前环境缺类型依赖，本地需跑 |

## 验证说明

已尝试运行：

```bash
npx tsc --noEmit --pretty false
```

当前环境仍缺少类型依赖：

```text
node
preact
vite/client
```

因此完整 typecheck 需要在本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

