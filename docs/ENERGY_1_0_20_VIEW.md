# Think OS Energy 1.0.20 — EnergyView UI Integration

## 目标
把 Energy 从 ProgressView 的隐藏展开区域提升为一级 Dashboard View。

## 关键结果
- `EnergyView` 加入 `VIEW_OPTIONS`，可在视图设置中直接选择。
- 独立默认配置与设置编辑器：7 天窗口、最近记录数、最多目标数、可选目标路径、时间线/上下文/效果开关。
- EnergyView 使用全部 DataStore Item 构建自己的最近窗口，不会被布局的“天/周/月”日期范围意外裁掉 7 天时间线。
- 每个 Goal 单独计算时间线、Missing、上下文和恢复/消耗观察，避免跨 Goal 混算。
- ProgressView 只保留轻量 Energy 摘要，并明确提示完整分析使用 EnergyView。
- 原始 Energy Markdown 不迁移、不改写。

## 使用
在 Dashboard 中新增/编辑一个 View Instance，把视图类型选择为 `精力 / EnergyView`。
