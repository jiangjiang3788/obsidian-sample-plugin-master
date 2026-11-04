# UI 设计治理计划（整理后的当前入口）

源码里的原有测试仍以 `Phase 3` 作为 UI 治理协议的兼容标识。
这里的 Phase 3 只表示先前的界面规范阶段名称，**不等于本次已经验证或完成任何 UI 改版**。

- 保持界面组件由 `src/shared/ui` primitives 管理；功能组件不得重新发明相同 Button 行为。
- 视觉 Token 和 CSS 规则统一放到 `src/styles/`；避免视图自建一套主题。
- 具体 UI 需求应拆成独立 Issue、测试、实现、回归验证四步。
- 实际视觉评审需要在 Obsidian Desktop 和移动端验证，当前没有完成真机测试。
