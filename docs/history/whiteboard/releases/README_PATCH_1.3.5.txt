ThinkOS Whiteboard 1.3.5 PATCH

基线：1.3.4 Daily Spatial Organization
目标：Low-Zoom Mixed Node Arrange

安装：把 PATCH ZIP 内文件按项目相对路径覆盖到 1.3.4 源码树。

核心变化：
1. compact/overview 下 Card + Workbench mixed selection 可右键网格/对齐/等距整理。
2. Workbench 按 subtree frame 作为原子节点参与排布。
3. Store.moveNodes 一次 mutation 持久化 Card + Workbench moves，并保持一次 Undo。
4. 右键空白新增“网格整理当前层”。
5. 低倍率 Goal/Type/Time guide 标题使用 inverse zoom 保持可读。

不包含：node_modules、用户 Vault 数据、性能重构、AI 自动布局、复杂 Layout 配置 UI。

本机依赖完整后建议运行：npm run test:whiteboard:full
