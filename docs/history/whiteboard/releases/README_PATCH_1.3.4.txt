ThinkOS Whiteboard 1.3.4 PATCH

基线：1.3.0 Whiteboard Stability SOURCE
目标：一次连续完成 1.3.1–1.3.4。

本批：
1. 归档升级为全屏 Archive Canvas，并分离 archivePosition / restoreOrigin。
2. 低倍率 locator 支持 Card + Workbench 混选与原子拖动。
3. 新增“Goal × Record Type × Time”语义布局：Goal 分块、Type 横向、月份纵向、cell 内网格。
4. Goal / Type / Time 标题可回选对应卡片集合。

默认左侧批量拖入仍是普通网格；语义布局必须用户主动触发。
第一版不开放横/纵/分组配置 UI，但底层 LayoutSpec 已保留通用接口。
Arrange 不自动创建 Workbench。

所有新/更新说明文档都在 doc/。

用户本机建议：
  npm run test:whiteboard:full

然后重新 build / 加载 Obsidian 当前源码产物。
