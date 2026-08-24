# View Registry 收敛（1.0.63）

## 结论

视图的注册元数据只有一个事实源：

`src/core/config/views/registry.ts -> VIEW_DEFINITIONS`

这里统一声明：

- View ID
- 用户显示名称
- 默认 viewConfig
- 自由布局默认尺寸
- 延迟渲染占位高度
- 顶部“新增”能力
- Markdown 导出能力与导出配置

`ViewName` 与 `VIEW_OPTIONS` 直接从 `VIEW_DEFINITIONS` 派生，不再维护第二份 View ID 数组。

## Runtime / Editor 为什么没有塞进 Core Registry

Core 不能 import Preact Runtime 组件，也不能 import Settings Editor，否则依赖方向会倒置。

因此 UI 绑定保留两张**纯绑定表**：

- `src/features/views/registry.ts`：View ID -> Runtime component
- `src/features/settings/views/editors/registry.tsx`：View ID -> Settings editor

它们不再拥有 label/default/layout/capability 等业务元数据。

`view-registry-convergence-gate.mjs` 会从 `VIEW_DEFINITIONS` 自动读取全部 View ID，并要求 Runtime / Editor 绑定与之完全一致。少一个或多一个都会失败。

## 新增一个普通视图

新增 `FooView` 时固定只做三类工作：

1. 在 `VIEW_DEFINITIONS` 注册 `FooView` 的 label/defaultConfig/layout/capabilities/exportConfig。
2. 实现 Runtime component，并在 `VIEW_RUNTIME_BINDINGS` 绑定一次。
3. 实现 Settings editor，并在 `VIEW_EDITORS` 绑定一次。

不允许再修改：

- 第二份 `VIEW_OPTIONS`
- 第二份默认配置总表
- 自由布局尺寸 map
- deferred height map
- header create allowlist
- export config map
- 设置页 label map

这些都已经由 `VIEW_DEFINITIONS` 自动提供。

## 新建 / 切换视图

- 新建 ViewInstance 时，`ViewInstanceUseCase` 会从 Registry 取得默认 viewConfig。
- 设置里切换 View Type 时，会同时切换到新类型的默认 viewConfig，避免旧视图配置污染新视图。
- 视图类型下拉的中文名称直接来自 Registry。

## Runtime Adapter 的边界

`viewPropsFactory.ts` 仍允许处理真实运行时差异，例如：

- Timeline 需要完整 Record 集合
- Excel 需要字段编辑与 cell commit handler
- Statistics 需要 popover / category color handler
- Heatmap 需要打卡创建 handler
- Energy 需要 Energy domain handler

这些不是“注册元数据”，不要为了追求零 switch 把它们改成几十个 capability flag。

普通新视图如果只消费标准 `items/dateRange/module/fields/groupFields`，不需要修改 runtime adapter；只有真正需要新增运行时依赖时才增加明确适配。

## 架构硬规则

禁止重新出现：

- `MODULE_HEADER_CREATE_ALLOWLIST`
- `DEFAULT_HEIGHT_BY_VIEW`
- `recommendations: Record<ViewName, size>`
- `configMap: Record<string, ExportViewConfig>`
- 设置页自己的 View label map
- ViewConfig 中硬编码第二份 View ID 数组

这些规则由 `gate:ui-runtime -> view-registry-convergence-gate` 检查。

## 与 RecordType Registry 的关系

两个平台采用同一种扩展思路：

- `RecordTypeRegistry`：注册“系统里有什么记录类型”
- `VIEW_DEFINITIONS`：注册“系统里有什么视图及其静态能力”

领域行为仍留在各自领域模块；Registry 只负责定义与发现，不负责承载所有实现逻辑。
