# 单人版收敛 MVP12：Heatmap 视图渲染拆分

## 背景

MVP10/MVP11 已经把 QuickInput 与 AI 批量确认推进到统一输入外观层，并拆出 AI 批量确认模型。MVP12 开始处理 shared view 层的大文件问题，优先选择 `HeatmapView.tsx`：它同时承担数据推导、block 解析、日期格渲染、天视图渲染、主题行渲染和折叠/响应式布局，是后续 shared view 纯展示化的关键阻塞点。

本轮不删除文件，因此交付为“本轮修改/新增完整文件补丁包”。

## 本轮目标

- 让 `HeatmapView.tsx` 不再直接渲染 `HeatmapCell`。
- 把 Heatmap 的纯推导逻辑沉到 model 文件。
- 把天视图和主题行渲染拆成独立展示组件。
- 增加单测和门禁，防止后续再次把逻辑塞回主 view。

## 主要改动

### 1. 新增 `HeatmapViewModel.ts`

新增 shared view 层的渲染模型 helper：

- `inferHeatmapThemePaths`
- `selectHeatmapThemesToTrack`
- `filterGoalHeatmapGroups`
- `normalizeHeatmapBlockId`
- `inferHeatmapBlockIdByTheme`
- `resolveHeatmapCreateBlockId`
- `buildDayThemeGroups`
- `createHeatmapPresetContext`

这些逻辑原本分散在 `HeatmapView.tsx` 中，导致主 view 同时承担业务推导和 JSX 渲染。

### 2. 新增 `HeatmapThemeGroup.tsx`

承接非天视图下的主题行渲染：

- 天/日单格
- 周/月日期行
- 季/年月份网格
- 主题行折叠
- 横向/纵向布局
- `HeatmapCell` 渲染

### 3. 新增 `HeatmapDayView.tsx`

承接天视图渲染：

- 目标分组天视图
- 普通主题分组天视图
- 空格 label
- 天视图下的 `HeatmapCell` 渲染

### 4. 瘦身 `HeatmapView.tsx`

`HeatmapView.tsx` 从约 682 行下降到约 326 行。

现在主文件只保留：

- 注入数据和 fallback 数据选择
- rating mapping cache
- 创建记录 / 打开记录管理器交互
- 折叠状态和 resize 布局状态
- 组合 `HeatmapDayView` / `HeatmapThemeGroup`

### 5. 增加单测

新增 `test/unit/heatmapViewModel.test.ts`，覆盖：

- 主题路径推断和选择优先级
- block id 归一化
- `core.habit` 回退
- theme → block 推断
- 创建记录 block 解析优先级
- 天视图主题分组
- 空目标分组过滤

### 6. 加强门禁

`single-user-convergence-gate` 新增：

- 要求 `HeatmapViewModel.ts` 存在
- 要求 `HeatmapThemeGroup.tsx` 存在
- 要求 `HeatmapDayView.tsx` 存在
- 限制 `HeatmapView.tsx <= 360` 行
- 禁止 `HeatmapView.tsx` 直接渲染 `HeatmapCell`
- 限制 `HeatmapThemeGroup.tsx <= 220` 行
- 限制 `HeatmapDayView.tsx <= 140` 行

## 验证

已通过：

```bash
npm run single-user:gate
npm run gate
```

未完整通过：

```bash
npm run typecheck:src
```

失败原因仍是当前压缩包环境没有 `node_modules`，缺少 `node / preact / vite/client` 类型定义。需要本地执行 `npm ci` 后再跑 typecheck/build。

## 下一步

- MVP13：清理 Progress / Timeline / Statistics 视图重复模型，继续推进 shared view 纯展示化。
- MVP14：文档治理。这个阶段大概率会删除历史过程文档，因此需要交付完整项目包。
- MVP15：最终封版，做一次完整项目包和最终说明。
