# Whiteboard 1.3.7 Implementation Result

## 范围

1.3.7 是 1.3.6 Daily-use Closure 真机使用后的 **interaction hotfix**，只修两类阻断，不新增白板 schema / durable model：

1. 创建的文字 / 便签，以及 Goal × Record Type × Time 整理产生的标注块与参考框线，需要能继续移动；
2. compact / overview 低倍率下，Card Locator 需要保留 detail 模式“拖回左侧 Record Source = 移出白板”的完整 drop 语义，同时普通空间移动不能被左边界夹紧。

版本元数据同步为 `1.3.7`。`Think/whiteboards.json` 继续 `version: 1`，无 migration。

## 1. 文字 / 便签：所有倍率都可移动

`WhiteboardAnnotation` 原本已有 detail / compact 的拖动入口，但本版把 drag session 补强为：

- screen delta 按当前 zoom 换算 world delta；
- 不限制 `x >= 0`，可以进入负 world 坐标；
- pointer capture + pointercancel 不提交；
- 以 ref 保存最终 preview，避免 pointerup 时 React/Preact state closure 竞态；
- 拖动时显示 grabbing 状态。

在 overview 极低倍率，真实 Annotation 被 `T / ◆` Locator 替代。1.3.7 给 Locator 增加同样的拖动能力：拖动直接调用 `moveAnnotation` 保存真实 world 坐标；单击仍保持“回到 100% 定位”的原行为。

因此文字 / 便签不再出现“低倍率只能看见定位点但不能移动”。

## 2. Goal / 类型 / 时间标注块与框线可移动

`WhiteboardSemanticLayoutOverlay` 的 Goal、Record Type、Time guide 从“只能点击回选”升级为：

- 拖动标签即可移动该 guide；
- 标签和对应 Goal 边框 / Type 横线 / Time 竖线作为一个视觉单元同步移动；
- screen delta / zoom 换算 world delta，低倍率手感与真实画布一致；
- 允许移动到负 world 坐标；
- 拖动结束后的 click 被短暂抑制，防止一次拖动又误触“回选卡片”；
- 主白板和 Archive Canvas 使用同一套交互。

Guide 仍是 **ephemeral layout UI**：移动 guide 只移动 guide 自己，不会偷偷改卡片 XY、Record 字段或 Workbench membership；再次执行语义整理时可重新生成。继续保持 `Arrange != Group`。

## 3. 低倍率 Card Locator 可拖回左侧 Record Source

1.3.2 之后 compact / overview 已支持 Locator 平移，但此前这套 semantic drag 没有走 detail Card 的 source-drop 分支，因此低倍率把 Card 拖到左侧不会“移出白板”。

1.3.7 在 selection controller 与 workspace 之间补上统一 source-drop contract：

- semantic Card drag 持续上报当前 client point；
- 指针进入左侧 Record Source 时显示既有 remove drop target；
- pointerup 位于左栏时，复用 `removeItem/removeItems`，只把 Whiteboard projection 移除，**不删除 canonical Record**；
- drop 被消费后不再执行 `translateNodes`，避免“先移除又平移”；
- 多选纯 Card 可整批拖回左栏；
- selection 含 Workbench 时不触发 source removal，避免误删 subtree；
- 未落在左栏时仍按低倍率 semantic drag 正常平移，world 坐标不做左边界夹紧。

source-drop 命中逻辑抽到 `WhiteboardSemanticSourceDropController`，避免继续扩大 `WhiteboardWorkspace.tsx`，并保持 release-governance 架构门禁通过。

## 4. 回归证据

新增 / 扩充 UI 回归：

- `whiteboardAnnotationUi.test.tsx`：20% 下文字拖动按 zoom 换算，并可得到负 X；
- `whiteboardSemanticLayoutUi.test.tsx`：10% 下 Type guide 标签与框线联动，支持负 X，并抑制拖后误 click；
- `whiteboardSemanticZoomUi.test.tsx`：低倍率 Card Locator 拖入 Record Source 后调用 remove，不再 translate；overview Annotation Locator 可拖到负 X。

功能地图不新增功能条目，仍为 119 项；把修复证据归入既有 F139 / F148 / F150。

## 5. 明确不做

- 不新增 guide durable schema；
- 不把语义 guide 移动解释为卡片分组或字段编辑；
- 不让 Workbench 混合 selection 拖进左栏时发生删除；
- 不改变 Archive / Restore / Undo 数据合同；
- 不改变 1.3.6 Daily-use Closure 的主流程定义。

## 交付结论

1.3.7 把 1.3.6 真机暴露出的“看得到但拖不动 / 低倍率 drop 语义断裂”补齐：**文字、语义标注 Guide 在低倍率仍是可操作空间对象；Card Locator 也与 detail Card 共享左侧移出白板语义。**
