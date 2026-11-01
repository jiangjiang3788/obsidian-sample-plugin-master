# 时间轴桌面端：选中后显示边界把手（2026-11-01）

## 用户体验调整

桌面端不再默认展示每个任务的开始/结束两个边界把手。现在三端统一采用单选入口：

- 单击任务后选中该任务，只显示当前选中任务可用的边界把手。
- 再单击其他任务，选中状态切换，上一任务的把手隐藏。
- Esc 可清除当前选中；空白区单击仍沿用桌面原有的快速创建语义，不改成纯取消选中（因此不要把空白单击当作纯粹的取消选中动作）。
- 桌面鼠标/笔仍可直接拖动任务主体平移时间；选中后拖动上/下把手分别调整开始/结束时间。
- 手机端继续采用轻触选中、长按后拖动；触摸命中区域保持 16px。
- 点状任务不显示不存在的结束边界；跨日任务仍只显示实际起止边缘；短任务保留左右分离的命中区。

## 源码同步

- `src/styles/features/timeline.css`：边界把手默认隐藏，仅在 `--edit-mode`（全局选中）或 `--touch-armed` 状态显示；删除重复的移动端隐藏规则。
- `src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx`：更新交互提示文案。
- `src/shared/ui/timeline/TimelineTouchGesture.ts`：让 `register()` 类型签名显式接受可选 `armed` 回调，与调用方及内部候选结构一致。
- `test/unit/timelineTaskDragUi.test.tsx`、`test/unit/timelineResponsiveWidthContract.test.ts`、`scripts/testing/verify-timeline-viewport-offline.cjs`：更新选择后拖动的行为契约。

## 未改变

没有改变任务数据模型、时间精度、保存处理器、鼠标主体拖动、移动端长按策略、双击编辑、Ctrl/⌘+单击打开原文、空白区创建、缩放、滚动及日期列结构。

## 验证边界

本次源包不包含已编译的 `main.js` / `styles.css`，因此不能直接安装。离线源码检查可验证 TS/TSX 语法、CSS 解析和轴向手势模拟；完整 Jest、项目级类型检查、Vite 构建和桌面/iOS/Android Obsidian 实机验收仍需在具备依赖及设备的环境完成。
