# Think OS 测试修复 v9.7

本版以 Windows 真正执行结果为依据修复，不再把“有测试文件”当成“测试通过”。

## 用户实跑暴露的问题

- 单元：138 个文件，7 个文件失败，8 个用例失败。
- 组合：50 个文件，主要有 3 个明确失败文件。
- 覆盖率：复现上述单元/组合失败。
- 性能：4/4 实际通过，但中文 Reporter 误报“存在失败”。
- 故障实验室：底层 24 个自动化用例实际全部通过，但结构化结果/故障报告误判全部失败。
- 本地插件工作区如果没有 `.github`，结果治理审计会把“没有 CI workflow”误当成功能测试失败。

## 本版修复分类

### 真业务 Bug

1. `VaultWatcher` 释放后，旧 delete 回调仍可能修改 DataStore。
   - 修复：所有 delete 回调在 `disposed` 后立即返回。

2. AI Chat 会话订阅闭包一直持有初始 `currentSessionId=null`，新消息写入后 UI 可能不刷新。
   - 修复：使用活动会话 ref，让 SessionStore 通知始终刷新当前会话消息。

### 过时或不严谨的测试

- DataStoreFileScanner：section tag 的当前规范入口是 `Record.tags`，不是不存在的 `sectionTags` 字段。
- ModuleSettings：设置持久化使用 canonical key（`content/status/goalPath`），测试不再错误期待中文展示标签写盘。
- Freeform Layout：组合测试改用完整合法 `DEFAULT_SETTINGS` 快照，不再用缺少 `goalSettings` 的无效 fixture。
- GoalTemplate / GoalMetric：等待真实异步保存完成，不再用“点击后立即断言”。
- FieldsEditor：使用真实 focus → input → blur / click 事件顺序。
- AI Chat View：使用受控输入 Harness，并补 MessageRenderPort 测试边界。
- AI Chat Container：等待真实异步链完成，并验证回复确实回到界面。
- CSS governance：本地补丁交付说明不再冒充正式源码文档违规；正式源码包仍要求根目录只保留 README。

### 测试基础设施 Bug

- Jest 中文 Reporter：不再依赖不可靠的 `results.success`，改由“失败文件/失败用例/运行时错误/中断”计算结果。
- 历史趋势 / 发布质量报告 / 故障实验室报告：统一根据结构化 counts 判定通过，兼容旧的错误 `success=false` 记录。
- 本地插件目录没有 `.github` 时，跳过 CI workflow 文件存在性检查；真正 CI 环境仍强制要求 workflow。
- 真机测试：只要配置了 HTTP(S)_PROXY，会自动为 Node 24 子进程补 `NODE_USE_ENV_PROXY=1`，无需每次手工设置。

## 真实数据策略

个人插件允许使用真实设置，但必须使用测试沙盒中的副本。当前真机测试：

- 测试 Vault：`test/vaults/simple`
- 当前插件 `data.json`：随插件副本进入测试沙盒，可验证真实 Goal / Template 兼容性
- 自动化写入：限制在测试 Vault / `E2E` 命名空间
- 原始日常 Vault：不直接做破坏性写入

详细说明见 `docs/testing/REAL_DATA_TESTING.zh-CN.md`。

## 验证边界

本交付环境没有项目 `node_modules`，因此本版完成的是：

- 变更文件语法解析；
- 中文输出审计；
- 93 项测试证据审计；
- 产品功能面审计；
- P0/P1/P2 严格测试地图；
- 结果治理审计；
- CI 矩阵审计。

最终“全部跑绿”必须在已经安装依赖的 Windows 项目中重新执行：

```bash
npm run 测试:单元
npm run 测试:组合
npm run 测试:性能
npm run 测试:故障
npm run 测试:真机
```
