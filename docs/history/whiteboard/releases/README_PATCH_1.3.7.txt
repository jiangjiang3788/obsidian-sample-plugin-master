ThinkOS Whiteboard 1.3.7 PATCH

基线：1.3.6 Daily-use Closure
目标：Movable Guides / Annotations + Low-Zoom Left Source Drop

安装：把 PATCH ZIP 内文件按项目相对路径覆盖到 1.3.6 源码树。

核心变化：
1. 新建文字 / Sticky 在普通和低倍率都可拖；overview 的 T/◆ Locator 也可直接拖动并保存真实 world 坐标。
2. Goal / Record Type / Time guide 标签可拖，标签与边框 / 横线 / 竖线同步移动；低倍率按 zoom 换算，允许负坐标；Guide 仍不持久化，也不移动卡片。
3. compact / overview 的 Card Locator 可拖回左侧 Record Source，复用“移出白板但不删 Record”语义；纯 Card 多选支持批量，含 Workbench 时安全禁用。
4. 未落进左侧 Source 时，低倍率节点继续正常 world 平移，不增加左边界 clamp。
5. 不改 whiteboards.json schema，不改 Archive / Restore / Undo 合同。

本环境静态语法、证据、功能面、strict P2 测试体系、architecture / records / task-session / energy / ui-runtime 门禁通过。
Jest / Typecheck / Vite build / Obsidian E2E 因本环境依赖未完整安装，未声称通过。

本机依赖完整后阻断验证：npm run test:whiteboard:full
