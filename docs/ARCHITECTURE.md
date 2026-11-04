# 架构速览

主要入口：`src/main.ts` → `src/app/` 启动与组合 → `src/core/` 业务规则/端口 → `src/platform/obsidian/` Obsidian 适配层。
`src/features/` 实现 Quick Input、Timer、Whiteboard、Settings、各类 View；`src/shared/` 提供可重用 UI；`src/styles/` 管理样式。

## 工程边界

- **业务逻辑优先放在 core**，不要让核心规则直接依赖 Obsidian 运行时 API。
- Obsidian 文件读写、HTTP、通知和工作区操作通过 `platform/obsidian` 适配；不要在 View 随手写文件。
- feature 通过已有公开入口/接口调用，不绕过 `public.ts` 随意跨层依赖。
- 插件的 build external 包括 `obsidian`，由 Obsidian 运行时提供，不打包替代实现。
- 改动数据模型前先写迁移/回滚用例，再考虑界面和样式。

代码中的质量门禁集中在 `scripts/gates/`。建议先阅读 `src/main.ts` 和待改功能目录，不需要先读完所有文件。
