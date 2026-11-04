# CSS 设计与所有权规范

主入口：`src/styles/main.css`；组件、Feature、Override 和 Token 分别位于 `src/styles/components`、`features`、`overrides` 和 `tokens`。
用项目设计 Token 替代随意硬编码颜色；布局动态数值优先限制在需要真实几何数据的地方。
所有可重用 Button / IconButton / Modal 优先走 `src/shared/ui/` 中的现有 primitive，不同功能 View 不要复制一套视觉实现。
修改 CSS 先跑 `node scripts/audit/css-audit.mjs`、`node scripts/gates/checks/css-boundary-gate.mjs`（依赖安装后），关注 `!important`、裸色值、同一组件多重样式所有权。
此文档是现有代码的治理入口，不是像素级产品设计稿。
