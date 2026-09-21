# ThinkOS 1.7.1 — 继续记录面板收敛计划

## 目标

本轮不进入 RecordRelation。真实目标是 **低摩擦连续记录**：完成 Task 后，用同一个 Goal 的可创建 RecordType 提供下一步入口。

## 冻结边界

1. `Continuation != Relation`：面板不承诺持久关联。
2. QuickInput 与 Continuation 不各自维护 RecordType 列表：统一消费 `getCreateAvailableRecordTypes()`。
3. RecordType 固定顺序只来自 `RECORD_TYPE_PRESENTATION_ORDER`：任务 → 精力 → 打卡 → 事件 → 感受 → 思考 → 总结 → 计划 → 阻碍项 → 里程碑。
4. template 类型：只显示同 Goal 下存在且启用的模板；direct 类型（当前为精力）保持直接可创建。
5. 普通 edit-save 不触发 Continuation；新建 done Task 或显式 complete Task 才触发。
6. 普通 QuickInput 编辑态禁止点击遮罩关闭；Record 已保存后的 Continuation 态允许 `X / 完成 / 点击遮罩` 关闭。
7. Whiteboard / Relation persistence 零改动。

## 空白问题根因

根因不在 Continuation 卡片本身，而在 QuickInput 宿主的纵向布局合同：通用 Obsidian modal bridge 给 `.modal-content` 设置了 `height: 100%`，同时 QuickInput body 使用 grow flex，导致 QuickInput 在内容较少时也会把可用高度撑开。Continuation 额外的 `min-height: 220px + align-content:center` 又放大了这个问题。

修复方式不是给某个面板写负 margin/固定高度，而是：

- QuickInput host / modal-content / inner shell 改为 intrinsic height；
- body 使用 `flex: 0 1 auto`，内容长时允许 shrink + scroll，内容短时不 grow；
- Continuation 删除人为 `min-height` 与垂直居中；
- mobile 最大高度 / keyboard overflow 逻辑继续保留。

## 验收

- 同 Goal 模板决定可见类型；排序与普通 QuickInput 完全一致。
- 点击任一类型关闭来源 modal，并打开该类型的 locked QuickInput，Goal/date 继续预填。
- 外部点击只在 Continuation 态关闭。
- QuickInput 和 Continuation 都不再出现由 flex/100% height 造成的大面积顶部/纵向空白。
- `npm run 验证:连续记录` 在已存在依赖环境中一键验证；命令不会安装依赖。
