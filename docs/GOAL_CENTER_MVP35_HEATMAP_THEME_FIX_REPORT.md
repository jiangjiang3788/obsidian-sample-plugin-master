# GOAL_CENTER_MVP35_HEATMAP_THEME_FIX_REPORT

## 背景

用户截图中的打卡视图出现了多个不同打卡图标混在同一张月份热力图里的现象。这个现象不是打卡数据本身坏了，而是 Heatmap 在迁移到目标主线后仍然用旧的 `item.theme` 作为唯一主题来源。

目标迁移后，主题可能存放在：

- `item.themePath`
- `item.theme`
- `item.extra.themePath`
- `item.extra["主题"]`

如果 Heatmap 只读 `item.theme`，就会把读不到主题的记录归到 `__default__`。一旦进入 `__default__` 模式，多个主题的打卡会被聚合到同一张日历里，于是看起来像“运动、睡眠、姨妈、家务”等混在同一个打卡视图里。

## 本版目标

- 主题不重新变成目标。
- 主题继续作为打卡视图的二级维度。
- Heatmap 按真实主题拆分，而不是落到 `__default__` 混合图。
- 旧打卡视图里的旧 `sourceBlockId` 能回退到 `core.habit`，避免点击空格新增时使用不存在的旧 block。

## 修改内容

### 1. 新增统一主题读取函数

文件：`src/core/utils/heatmap.ts`

新增：

```ts
getItemThemePath(item)
```

读取顺序：

1. `item.themePath`
2. `item.themePathNormalized`
3. `item.theme`
4. `item.extra.themePath`
5. `item.extra["主题"]`

### 2. Heatmap 聚合改为读取统一主题路径

文件：`src/core/utils/heatmapAggregation.ts`

原来按 `item.theme` 筛选和聚合；现在改为 `getItemThemePath(item)`。

### 3. Heatmap ViewModel 推断主题改为读取统一主题路径

文件：`src/features/settings/viewModels/heatmapViewModel.ts`

未显式配置 `themePaths` 时，会从所有可用主题字段推断主题，不再轻易落到 `__default__`。

### 4. Heatmap UI 渲染层同步修复

文件：`src/shared/ui/views/HeatmapView.tsx`

- 主题推断使用 `getItemThemePath`。
- 每个主题的年月日聚合使用统一主题路径。
- 旧 `sourceBlockId` 找不到时，自动回退到 `core.habit / 打卡` block。
- 点击热力图新增记录时，不再把旧的 `blk_xxx` 当成当前有效 block。

### 5. 从热力图新增记录时保留新主题路径

文件：`src/app/actions/recordCreateActions.ts`

从热力图点击创建记录时，主题上下文改用 `getItemThemePath(item)`，保证 QuickInput 能带出真实主题。

### 6. 通用聚合工具同步主题读取

文件：`src/core/utils/dataAggregation.ts`

为了避免其他图表继续只读 `item.theme`，同步改为读取统一主题路径。

## 验收方式

1. 打开“打卡”热力图。
2. 选择年/季视图。
3. 不同主题不应再全部混在 `__default__` 一张日历里。
4. 运动、睡眠、姨妈、家务等主题应按主题拆分。
5. 点击空白日期新增记录时，QuickInput 应进入“打卡”block，而不是旧的 `blk_mejsg76atopau`。
6. 新增表单中主题应能带出对应主题路径。

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
| 23 | 类型清理 | 部分完成 | 主链类型已收敛；旧记录读取类型仍保留 |
| 24 | 视图修正 | 已完成 | v14 展示目标主线 + 主题二级维度；v18 修复 Heatmap 主题读取 |
| 25 | 数据源修正 | 已完成 | v14 统一目标/主题筛选字段；v18 修复 Heatmap 聚合字段 |
| 26 | AI 输入 | 已完成 | v16 AI 接入目标 × Block 预设 |
| 27 | 迁移校验 | 已完成 | 已完成校验 UI |
| 28 | 新建记录回归 | 已完成 | v15 新增按 Block 的新建记录回归检查 |
| 29 | 编辑旧记录回归 | 已完成 | v15 新增旧记录编辑就绪检查与报告 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑 |
| 31 | 清理报告 | 已完成 | v15 新增可复制迁移收尾报告 |
| 32 | 最终清理 | 部分完成 | 旧运行链路已断开；旧 ThemeMatrix 源码仍保留为内部 legacy |
| 33 | 构建验证 | 部分完成 | v18 做了语法级检查；完整构建请本地运行 |
