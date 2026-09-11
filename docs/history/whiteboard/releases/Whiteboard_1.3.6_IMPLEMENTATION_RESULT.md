# Whiteboard 1.3.6 Implementation Result

## 范围

1.3.6 定位为 **Daily-use Closure**：不新增白板模型，不扩产品功能面，而是把已经存在的能力收口成一条可重复、可回归、可撤销的日常主链：

**左侧批量拖入 → 普通网格 → 目标 × 类型 × 时间 → 低倍率整理 → Nested Workbench → Archive → Restore → Undo**。

版本元数据同步为 `1.3.6`。`Think/whiteboards.json` 继续 `version: 1`，没有 schema migration，没有自动语义 drop，没有自动按 Goal/Type 创建 Workbench，也没有提前做性能重构。

## 1. 新增 F152 — Whiteboard Daily-use Closure（P0）

此前每一段能力都有自己的版本和测试，但缺少一个“从左侧收集一直走到 Restore → Undo”的连续发布契约。1.3.6 新增 F152，把以下 owner 绑定到同一条 P0 流程：

- Record Source / batch transfer；
- neutral grid placement；
- Goal × Record Type × Time semantic arrange；
- low-zoom node arrange；
- Workbench / Nested Workbench；
- Archive / Restore；
- Whiteboard history；
- Restart persistence。

F152 不复制业务逻辑，只把现有 owner 串成一个必须同时成立的日常闭环。

## 2. 左侧批量拖入仍先落 neutral grid

闭环从 4 条 Record 批量拖入开始，明确保护原合同：

- 一次 batch mutation；
- 从 drop world point 展开普通网格；
- 不因为 Record 有 Goal / Type / Time 就自动解释或分组；
- 不自动创建 Workbench。

之后只有用户主动执行 `目标 × 类型 × 时间`，才由 `WhiteboardSemanticLayoutModel` 重排 XY。

这继续保持：**Drop ≠ Semantic Arrange，Arrange ≠ Group**。

## 3. 语义整理可以继续进入低倍率操作，再回到 100%

新增连续 E2E 契约覆盖：

1. 批量 neutral grid；
2. 主动 Goal × Type × Time；
3. 点击 Goal guide 回选对应卡片；
4. 降到 compact / overview；
5. 直接对已选 locator 做低倍率整理；
6. 点击 locator 回真实对象 100%；
7. selection 仍可继续用于创建 Workbench。

这里的目标不是再新增一种 arrange，而是证明 semantic guide、low-zoom selection、arrange、focus 之间不会互相“断链”。

## 4. 同一批卡继续进入 Nested Workbench 1–4 层

E2E 从低倍率整理后的 selection 直接执行 `用所选创建工作台`，再继续创建 L2 / L3 / L4，并验证 `parentGroupId` 链真实落盘。

集成测试进一步把目标卡放入 L4，并与：

- Sticky annotation；
- Edge；
- Edge label；

一起走后续 Archive / Restore / Undo / Restart，确保 Nested、Annotation、Edge 没有因为跨功能闭环丢 membership 或关系。

仍保持最多 4 层，不开放无限嵌套。

## 5. 1.3.6 最关键的新回归合同：Restore → Undo

新增 Store 级专门测试，锁定这个边界：

1. 卡片在 Workbench 内有真实 `x/y/zIndex/groupId`；
2. Archive 后保存 Restore origin；
3. Archive Canvas 内修改 `archiveX/archiveY/archiveZIndex`；
4. Restore 回原 world 坐标与原 Workbench；
5. incident edge 随 endpoint 可用状态恢复；
6. **紧接一次 Undo**；
7. 卡片必须重新回到 `archivedItems`；
8. `archiveX/archiveY/archiveZIndex` 必须仍是 Restore 前刚整理好的 Archive placement；
9. `x/y/zIndex/groupId` 仍是 Restore origin；
10. incident edge 必须回到 `archivedEdges`；
11. Redo 可以再次恢复。

这证明 Undo 撤销的是“Restore mutation”，而不是重新计算一份近似归档状态。

## 6. Restart 合同

新增 Daily-use Closure 集成测试在 Undo 后直接 dispose / restart Store，验证：

- 4 层 `parentGroupId` 仍在；
- archived item 的 Restore origin 与 Archive placement 都在；
- annotation 仍属于原深层 Workbench；
- archived edge 仍在；
- 重启后可以再次 Restore 到正确 Workbench / world XY；
- Undo/Redo history 本身不跨重启。

继续坚持 durable / ephemeral 边界：selection、camera、zoom、layout guides、nested navigation history、undo UI state 都不写入 whiteboards.json。

## 7. 生产代码结论

静态审阅与现有契约显示，这条主链所需 runtime owner 在 1.3.5 已经具备并且数据合同相容。因此 1.3.6 **没有为了版本号人为新增 production model / schema / UI**；本版变更集中在：

- 版本元数据；
- F152 测试总账；
- Restore → Undo Store 回归；
- Daily-use Closure integration；
- Daily-use Closure 真机 E2E；
- 1.3.6 基线与测试文档。

若本机真机 E2E 暴露真实摩擦，应只修阻断 F152 主链的缺口，不顺手扩白板功能面。

## 交付结论

1.3.6 的定义是：**现有白板能力从“分别可用”升级为“同一日常工作链可连续使用、可恢复、可撤销、可重启验证”。**

真机主链绿后，按路线暂停新增白板功能，让真实使用产生下一阶段需求。
