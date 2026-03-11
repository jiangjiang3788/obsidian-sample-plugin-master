# 本次改动：打卡视图收口与 ProgressView 独立

## 这次做了什么

### 1. 打卡视图收口
- HeatmapView 不再承担经验/等级编辑。
- 空白日期：直接新增记录。
- 有记录日期：打开“当天记录”列表。
- 当天记录列表中提供“新增记录”入口。
- 当天记录点击后打开 Obsidian 原文位置。

### 2. ProgressView 独立
- 新增独立视图 `ProgressView`。
- 它只读取当前视图筛选后的 items，不改写原始记录。
- 默认显示：总积分、等级、升级进度、分类积分、主题积分。

## ProgressView 设计

### 目标
把经验/成长系统从打卡视图完全抽离，做成一个很小但完整的新视图，为后续的积分兑换打基础。

### 当前积分规则
- 每条命中的记录获得 `basePoints`（默认 1 分）
- 若评分 `>= ratingBonusThreshold`（默认 4），额外获得 `ratingBonusPoints`（默认 1 分）
- `includedCategories` 留空表示所有基础分类都参与积分；不留空则只统计指定基础分类

### 当前等级规则
- 每 `levelStep` 分提升一级
- 当前等级 = `floor(totalPoints / levelStep) + 1`

### 视图与控制栏/筛选关系
ProgressView 直接复用当前 layout + view 的筛选结果：
- 视图默认筛选/排序先在 `useViewData` 中生效
- 控制栏临时筛选再叠加
- ProgressView 只消费最终的 items，不再重复实现一套筛选系统

### 后续可以继续做
- 分类单独加分 / 扣分规则
- 模板/来源过滤
- 周/月积分趋势
- 兑换视图

## 这次改动的主要文件
- `src/shared/ui/views/HeatmapView.tsx`
- `src/platform/modals/CheckinManagerModal.tsx`
- `src/shared/ui/heatmap/HeatmapCell.tsx`
- `src/shared/ui/views/ProgressView.tsx`
- `src/features/progression/computeProgression.ts`
- `src/features/settings/viewModels/progressViewModel.ts`
- `src/features/settings/ProgressViewEditor.tsx`
- 以及视图注册/默认配置相关文件
