ThinkOS 1.1.8 Whiteboard Canvas Selection PATCH

基线：ThinkOS 1.1.7 SOURCE
目标版本：1.1.8

本版只做：
- Shift + 拖动空白框选右侧可见卡片
- Ctrl/⌘/Shift + 点击逐条多选
- 右上角已选数量 / 清空
- Escape 清除 Canvas selection
- 拖任一已选卡片，整组选中卡以同一 world delta 实时预览
- Edge / Workbench frame 跟随多选 preview
- WhiteboardStore.moveItems() 单 mutation 原子提交全部 durable XY
- 多选状态完全 ephemeral，不写 whiteboards.json
- 多选移动保留 Workbench membership
- 普通空白拖动继续 Pan

不做：1.1.9 Archive/Restore、1.1.10 culling、AI、第三方 infinite-canvas engine。

所有本次新增/更新交付文档位于项目 doc/ 目录。
