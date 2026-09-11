ThinkOS Whiteboard 1.3.6 PATCH

基线：1.3.5 Low-Zoom Mixed Arrange
目标：Daily-use Closure

安装：把 PATCH ZIP 内文件按项目相对路径覆盖到 1.3.5 源码树。

核心变化：
1. 新增 F152（P0），把“左侧批量拖入 → neutral grid → Goal×Type×Time → 低倍率整理 → Nested Workbench → Archive → Restore → Undo”定义为单一发布闭环。
2. 新增 Store 回归：Restore 后一次 Undo 必须重新回到归档 snapshot，并保留 Archive placement、Restore origin、Workbench membership、incident edge；Redo 可再恢复。
3. 新增 integration：覆盖极端 world XY、4 层 Nested、Annotation、Edge、Archive/Restore/Undo、Restart。
4. 新增真实 Obsidian E2E：同一 UI 流程从左侧批量拖入连续跑到 Restore → Undo。
5. 不新增 production schema/model/UI；Arrange != Group，Drop != Semantic Arrange，history/UI state 不跨重启。

不包含：node_modules、用户 Vault 数据、AI 自动布局、自动分组、复杂 Layout 配置 UI、无证据性能重构。

本机依赖完整后阻断验证：npm run test:whiteboard:full
