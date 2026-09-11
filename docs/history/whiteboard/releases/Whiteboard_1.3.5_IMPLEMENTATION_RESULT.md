# Whiteboard 1.3.5 Implementation Result

## 范围

1.3.5 只解决一个日常使用缺口：**低倍率 semantic locator 不再只能看/选/拖，也可以直接整理当前层 Card + Workbench。**

版本元数据同步为 `1.3.5`。没有开放布局轴配置，没有改 Record 真源，没有 schema migration，也没有提前实施性能重构。

## 1. 低倍率 mixed selection 可直接整理

compact / overview 下继续用现有规则：

- Ctrl/⌘ 点选或框选当前 Canvas 的直属 Card + Workbench；
- Workbench 继续作为 subtree 原子节点；
- 右键任一已选 locator 后可执行：
  - 网格整理；
  - 左对齐；
  - 顶部对齐；
  - 水平等距；
  - 垂直等距。

右键 Workbench locator 现在也会打开“整理所选节点”菜单，不再被当成空白区菜单。

`按连线整理`、`目标 × 类型 × 时间`、`用所选创建工作台` 仍是 Card-only 行为；mixed selection 含 Workbench 时这些入口禁用，避免把不同语义混成一个不可预测操作。

## 2. Workbench 以真实 subtree frame 参与排布

新增 `WhiteboardNodeArrangeModel`。排布输入是当前层的原子节点：

- Card：使用固定卡片 world 尺寸；
- Workbench：使用当前 Workbench subtree 的真实 frame；
- Grid 会按每列/每行的最大节点尺寸留空间，避免把大型 Workbench 当成一个小点导致重叠。

低倍率 Locator 只是交互代理，durable XY 仍是原 world 坐标。

## 3. Card + Workbench 一次原子持久化

`WhiteboardStore` 新增 `moveNodes`，底层由 `moveWhiteboardNodes` 完成：

- Card move + Workbench move 在一次 Store mutation 中提交；
- 只产生一次 persistence write / 一次 Undo history；
- Workbench subtree 会整体平移；
- 如果同时传入祖先/后代 Workbench，只移动根选择，避免 double translate；
- 如果 item 已被所选 Workbench subtree 覆盖，也不会重复移动。

没有改变 `whiteboards.json version: 1`。

## 4. 当前层也可直接网格整理

右键空白新增 `网格整理当前层`。它同时处理当前 Canvas 的直属 Card + Workbench，适合先缩小鸟瞰，再一键把整个当前层收拢成稳定网格。

原来的 `目标 × 类型 × 时间整理当前工作台` 继续只处理 Record 卡片，不自动改 Workbench 结构。

## 5. 低倍率语义布局标题保持可读

Goal / Record Type / Time guide 原本位于 world layer，在极低倍率下会跟着缩小。1.3.5 为 guide label 和关键边框增加 inverse-zoom 视觉补偿：

- 低倍率下标题保持固定屏幕可读；
- guide 仍对应原 world 区域；
- 标题继续可点击回选对应卡片；
- guide 继续是 ephemeral UI，不写盘。

## 数据与产品边界

继续保持：

- canonical Record 仍是唯一业务真源；
- Arrange 只改 spatial state；
- Arrange != Group；
- 当前 Canvas 只操作直属节点；
- camera / zoom / selection / locator / layout guide 均不持久化；
- 不开放 group/x/y 配置面板；
- 不做 AI 自动布局；
- 不做无性能证据的 culling/spatial index。

## 交付结论

1.3.5 把“低倍率鸟瞰”从只支持 **选择 + 移动** 补成 **选择 + 移动 + 整理**，同时保持 Workbench subtree 原子语义和一次 Undo/持久化合同。
