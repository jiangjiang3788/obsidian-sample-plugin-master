# 单人版收敛 MVP19：轻量抽离 TimeNavigator / ViewToolbar，并加入防过度工程化约束

## 本轮目标

继续按“逐个视图抽离”推进，但本轮明确加入防过度工程化判断：

- 不为了每个小组件都强行拆模型层。
- 只处理仍然承担日期计算、状态派生或重复 UI 规则的共享视图。
- 对已经足够薄的视图，例如 `TimerView` / `CategoryFilter` / `ThemeFilter`，本轮不拆。

## 本轮处理的视图

### TimeNavigator

`TimeNavigator.tsx` 原本同时维护：

- 当前年 / 季 / 月 / 周选择状态
- 年度周数量
- 季度块与月份块状态
- 周格 className / title / 周末日期
- 目标日期构造

本轮新增：

- `src/shared/ui/views/TimeNavigatorModel.ts`

抽出的 helper：

- `buildTimeNavigatorSelection`
- `buildTimeNavigatorQuarterBlocks`
- `buildTimeNavigatorWeekCells`
- `buildTimeNavigatorCellClass`
- `buildTimeNavigatorYearTarget`
- `buildTimeNavigatorQuarterTarget`
- `buildTimeNavigatorMonthTarget`

`TimeNavigator.tsx` 现在只负责：

- 组合 selection / quarterBlocks / weekCells
- 绑定点击事件
- 渲染时间导航 DOM

### ViewToolbar

`ViewToolbar.tsx` 原本同时维护：

- 年 / 季 / 月 / 周 / 天视图选项
- 当前 view 到 dayjs unit 的映射
- 前后时间跳转 target
- 当前日期 label
- fallback filter 是否展示

本轮新增：

- `src/shared/ui/views/ViewToolbarModel.ts`

抽出的 helper：

- `VIEW_TOOLBAR_OPTIONS`
- `getViewToolbarUnit`
- `buildViewToolbarDateLabel`
- `buildViewToolbarDateTargets`
- `shouldRenderViewToolbarFallbackFilters`

`ViewToolbar.tsx` 现在只负责：

- toolbar DOM
- 外部 filter slot / fallback filter 组合
- layout settings 按钮

## 为什么没有抽 TimerView / CategoryFilter / ThemeFilter

本轮刻意没有继续拆这些文件：

- `TimerView.tsx`：约 62 行，已经是容器层，职责清楚。
- `TimerViewView.tsx`：约 69 行，已经是纯展示。
- `CategoryFilter.tsx`：约 58 行，逻辑单一。
- `ThemeFilter.tsx`：约 63 行，已经复用 `ThemeTreeSelectPanel`。

继续拆这些文件只会增加文件数量和跳转成本，收益不明显。因此本轮选择“有计算、有重复规则、有测试价值”的 `TimeNavigator` 和 `ViewToolbar`。

## 测试

新增：

- `test/unit/timeNavigatorModel.test.ts`
- `test/unit/viewToolbarModel.test.ts`

覆盖内容：

- TimeNavigator selection / quarter blocks / week cells / className
- ViewToolbar view options / date unit / previous-next-today targets / fallback filters

## 门禁

更新 `scripts/gates/single-user-convergence-gate.mjs`：

- 要求 `TimeNavigatorModel.ts` 存在
- 要求 `ViewToolbarModel.ts` 存在
- 限制 `TimeNavigator.tsx <= 100` 行
- 限制 `ViewToolbar.tsx <= 130` 行
- 防止日期计算和 view-unit 映射 helper 回流到主组件

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

原因：当前环境没有 `node_modules`，缺少 `node` / `preact` / `vite/client` 类型定义。

## 下一步建议

继续逐个视图抽离，但保持防过度工程化标准：

1. 只抽主文件超过约 120 行、或包含明显计算/派生状态/重复规则的视图。
2. 小于 80 行且职责清楚的视图不强拆。
3. 优先补齐 remaining shared view 的门禁，而不是无条件新增组件。
