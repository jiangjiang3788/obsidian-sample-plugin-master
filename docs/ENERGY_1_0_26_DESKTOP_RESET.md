# Think OS Energy 1.0.26 — Desktop Reset

## 范围

本版刻意只跑通桌面端，不扩展 iOS / Android 统一入口。

### 完成

- EnergyView 首屏继续保持「周期状态 + 精力地图 + 本周期短句」。
- 删除首屏对旧 `EnergyAdvancedPanel` 的依赖；“更多”改为简单的一行列表，不再复用旧 Effects / Patterns / Management / Weekly / Experiment UI。
- 实时 Energy 点改为独立 `EnergyDot` visual primitive：按钮本身完全透明/reset，内部 glyph 才负责填充，避免 Obsidian button 样式把实时点渲染成空心。
- 补录仍为空心虚线点，选中仍有外圈。
- 增加 `energySettings.defaultThemePath`。
- 默认精力主题不放在 EnergyView，而放在：`设置 → 数据管理 → 记录类型 → 精力记录默认值`。
- Energy 快捷录入默认只展示“记录到”的弱提示，不展示大块 Goal 选择器；需要时点“修改目标”才展开。
- Theme 不在快捷录入临时选择；默认主题统一从记录类型设置读取。

### 默认主题优先级

1. 调用方显式传入的 `themePath`；
2. `energySettings.defaultThemePath`；
3. 当前 Goal 自带 `themePath`；
4. 空。

默认主题只是 Energy 记录元数据，不进入 GoalTemplateResolver，不生成 Energy 模板。

## 暂不做

- Android Widget / iOS 统一记录协议
- 推荐 UI
- 推荐反馈闭环
- 停止点提醒
- 保存力量行动层

这些等桌面版 UI 与记录链真实使用稳定后再接。
