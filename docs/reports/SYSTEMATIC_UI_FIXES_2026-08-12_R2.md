# Systematic UI fixes · round 2 · 2026-08-12

这轮根据你给的 6 张截图继续收口，目标不是“哪里难看改哪里”，而是统一成一套层级 / 密度 / 间距规则。

## 总体策略

### A. 统一“层级表达”
- 不再依赖卡片套卡片、框套框表达层级。
- 改为：
  - **字号差** 表示级别
  - **缩进 + 细引导线** 表示父子关系
  - **分隔线 + 间距节奏** 表示 section 边界

### B. 统一“密度系统”
- Block / Progress / Statistics 都收紧垂直节奏。
- 一级信息保留视觉重量，二级/三级信息减空白而不是减可读性。

### C. 统一“时间层级间距”
- 月内间距 < 月之间间距 < 季度 / 年度 / 更大周期之间间距。
- 避免所有 period 看起来都是同一级。

---

## 1) Block 视图：继续收紧，不再“框套框”

### 处理内容
- 收紧 group 之间间隔、group title padding、group content 缩进。
- 减少 task row / block item 的垂直 padding。
- 子层级缩进按 level 递减，不再每层都一样深。
- guide line 改为更轻的单线，不靠大盒子表达层级。

### 结果
- 图一会更紧凑。
- 分组结构还在，但不会“套了一层又一层壳”。

相关文件：
- `src/styles/components/grouped-container.css`
- `src/styles/features/block.css`

---

## 2) Progress / 成长（你图二说的“精力视图列表缩进”问题）

### 处理内容
- 收紧 chevron / icon 列宽。
- 减少 goal 行与 skill 行的 gap、padding、min-height。
- 主题记录展开区域左侧空白显著减少。
- 保持等级、进度条、尾部 meta 列的纵向对齐，不牺牲结构一致性。

### 结果
- 左侧空白减少，不会再像“给缩进预留了太大画布”。
- 仍保持目标 → 主题 → 记录的清晰层次。

相关文件：
- `src/styles/features/progress.css`

---

## 3) 目标标题强调：改成紫色大字，不再像普通标签

### 处理内容
- Heatmap / Energy list 中目标标题提高视觉权重：
  - 字号增大
  - 字重变重
  - 直接使用 accent 文本色
  - 去掉过于像 chip 的包裹感
- 目标变成 section heading，而不是普通 pill。

### 结果
- 你图三里“目标不明显”的问题会明显改善。

相关文件：
- `src/styles/features/heatmap.css`
- `src/styles/features/energy-task-list.css`

---

## 4) 视图设置：筛选 / 排序 UI 扁平化，去掉“框包框”

### 处理内容
- `CommonFilterPanel` 从 bordered card 改为扁平 section。
- `Accordion` 去外边框、去圆角、去卡片感，改为分段式展开。
- RuleBuilder 的已有规则区 / 添加规则区取消卡片盒子，改为顶部细分隔线。
- 保留逻辑结构，但不再视觉上“容器里再包一层容器”。

### 结果
- 图四这种“框包框”的 MUI 默认感会弱很多。
- 页面更像编辑器配置面板，而不是表单弹窗里套表单卡片。

相关文件：
- `src/features/settings/layout/DataFilterPanel.tsx`
- `src/features/settings/views/editors/CommonFilterPanel.tsx`
- `src/styles/features/settings-editors.rule-builder-panel.css`

---

## 5) Energy period map：拉开大周期间距

### 处理内容
- 为 daily dots 月/季/年视图引入：
  - `--think-energy-gap-minor`
  - `--think-energy-gap-major`
- month 内部使用较小 gap。
- quarter / year 级别使用更大的 column-gap / row-gap。

### 结果
- 图五里“季度、年度、星期之间的间隔应该大于月份之间间隔”的问题会更符合层级直觉。

相关文件：
- `src/styles/features/energy-map.css`

---

## 6) Statistics：不是单点修，而是重排节奏与密度

### 处理内容
- 引入 `sv` 层级间距 token：minor / major / section。
- year / quarter / month grid 的 gap 改成分层级节奏。
- period indentation 再收一点，减少横向挤压。
- chart block 不再统一固定大高度：
  - 年汇总更高
  - 季度 / 月度中等
  - 周级更紧凑
- month grid 的最小宽度提高，避免太挤造成“看着不舒服”。
- charts 内部数字 / 柱条 / category 行距整体压缩，减少大面积空白。

### 结果
- 图六“说不上哪不对，但整体不舒服”的问题，主要从节奏、比例、空白结构上改善。
- 不是改单个柱子，而是改整个统计视图的版式密度。

相关文件：
- `src/styles/features/statistics.grids.css`
- `src/styles/features/statistics.charts.css`

---

## 本轮实际改动文件
- `src/styles/components/grouped-container.css`
- `src/styles/features/block.css`
- `src/styles/features/progress.css`
- `src/styles/features/energy-task-list.css`
- `src/styles/features/heatmap.css`
- `src/styles/features/energy-map.css`
- `src/features/settings/layout/DataFilterPanel.tsx`
- `src/features/settings/views/editors/CommonFilterPanel.tsx`
- `src/styles/features/settings-editors.rule-builder-panel.css`
- `src/styles/features/statistics.grids.css`
- `src/styles/features/statistics.charts.css`

---

## 说明
当前容器里没有装 `vite`，所以我没有在这里完成完整 build；我执行 `npm run build` 时停在 `vite: not found`。
建议你本地拉这版源码后执行：

```bash
npm install
npm run build
npm run test
```

