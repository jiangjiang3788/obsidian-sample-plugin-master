# Record 模型与数据安全

当前核心决策以 `architecture/ADR-Record-Domain-Convergence.md` 为参考：

- `recordType` 表示**这是什么记录**。
- `goalPath` 表示**这条记录服务哪个目标**。
- 旧 `category` 不再是独立的规范业务身份，修改此模型时必须确认现有迁移政策。

不要直接根据文件名推断 Goal 或记录类型，也不要在 React/Preact UI 层拼接持久化 Markdown。
关键入口位于 `src/core/records/`、`src/core/recordInput/`、`src/core/goal/`、`src/platform/obsidian/`。

**数据安全最低要求**：测试 Vault 独立、修改前备份、保存失败不丢内容、重启后可读、重复操作幂等，并覆盖旧数据升级场景。
任何影响存储格式的改动先审阅 `test/integration/` 中的重启与迁移测试。
