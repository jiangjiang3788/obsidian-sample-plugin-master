# Think OS 测试体系 v2

## 这一版解决什么

v1 先建立“功能 → 风险 → 必测维度 → 证据 → 缺口”的总账。v2 开始把总账里的 P0 缺口变成真实自动化测试，优先保护用户数据、重启恢复和核心业务生命周期。

v2 不追求把数字做漂亮，而是优先回答：

1. 保存后的数据重启还在不在？
2. 修改后的数据重启是不是新值？
3. 删除后的数据会不会被缓存复活？
4. Vault create / modify / delete / rename 能不能正确驱动索引？
5. 一个损坏 Record 会不会拖垮整个 Vault？
6. 缓存损坏或删除失败时能不能重新从 Vault 建立真相？
7. Goal / Task / Energy / Timer 等核心状态重启后是否仍一致？
8. 循环任务生成下一条后，TaskSeries 指针是否仍正确？
9. 迁移前备份有一个文件失败时，其他备份会不会继续？
10. Record 路径变化时，是否“先写新位置，再删旧位置”，避免丢数据？
11. current-only 设置结构是否按当前产品契约读取，而不是偷偷猜迁移旧结构？
12. 外部移动文件后，稳定 Record ID 是否保持不变？

## v2 新增/加强的 P0 自动化测试

| 测试文件 | 中文意义 | 主要保护 |
|---|---|---|
| `test/unit/dataStoreFileScanner.test.ts` | 单文件扫描边界与异常 | F121 |
| `test/integration/recordRestartLifecycle.test.ts` | Record 创建/修改/删除重启生命周期 | F014/F015/F016 |
| `test/integration/recordMigrationSafety.test.ts` | Record 路径变化安全迁移 | F125 |
| `test/integration/dataStoreRestartRecovery.test.ts` | DataStore 暖启动、缓存恢复、损坏隔离、外部移动 | F018/F019/F020/F120/F121/F123/F126 |
| `test/integration/vaultWatcherLifecycle.test.ts` | Vault 文件事件、防抖、rename、dispose、重新注册 | F122 |
| `test/integration/settingsRestartPersistence.test.ts` | 设置与 GoalTemplate 落盘/重启恢复 | F037/F126/F127 |
| `test/integration/goalSettingsLifecycle.test.ts` | Goal 创建/修改/级联删除并重启恢复 | F031/F033/F037 |
| `test/integration/taskRestartLifecycle.test.ts` | Task 完成/重开/时间修改/TaskSession 重启恢复 | F050/F051/F052/F055 |
| `test/integration/recurringTaskRestartLifecycle.test.ts` | 循环任务下一次生成与 TaskSeries 修复 | F053/F054 |
| `test/integration/timerRestartRecovery.test.ts` | Timer 运行态/暂停态重启恢复与坏 JSON 隔离 | F056/F126 |
| `test/integration/energyRestartLifecycle.test.ts` | Energy 真 Markdown → 索引 → 重启；坏文件不从缓存复活 | F065 |
| `test/integration/migrationBackupSafety.test.ts` | 迁移前备份落盘与单文件失败隔离 | F124 |

这些文件与项目原有的 `recordRepositoryLifecycle.test.ts`、`taskSessionIntegrity.test.ts` 一起被 `npm run test:p0:data-safety` 聚合执行。

## v2 校准的功能定义

### 1. current-only 设置策略

`src/core/settings/currentSettingsSchema.ts` 明确声明：

- `policy = current-only`
- `supportsLegacyMigration = false`

因此测试体系不应该凭空要求“旧 data.json 自动迁移”。v2 改为验证：

- 当前结构能保存和重启恢复；
- GoalTemplate 引用不存在 Goal 时明确失败；
- 未声明的旧字段不会被猜成新 Goal；
- 需要支持旧设置迁移时，必须先把它作为新的产品能力实现，再登记测试。

### 2. DataManagementSettings 的真实职责

该组件只负责“记录类型 / 目标 / 指标”三个设置区的导航，不负责重建索引。v1 把它当作 P0 数据维护入口属于误判。

v2 将它调整为 P1 导航功能；真正的“重建索引与缓存恢复”仍由 F123 表示。

### 3. RecordMigrationTransaction 的真实职责

它不是“旧版本 settings migration”。它解决的是 Record 修改后目标文件发生变化时的数据安全：

1. 先写新记录；
2. 扫描确认新记录真实存在；
3. 再删除旧记录；
4. 删除失败时保留新旧两份并返回 `partial_success`，让用户人工清理，而不是冒险丢数据。

### 4. “完整”是什么意思

测试总账中的“完整”只表示：这个功能在 `required` 声明的测试维度上，都登记了对应测试证据。

它不等于“已经证明 100% 没 Bug”。特别是：

- `test:system` 只检查测试证据是否登记、文件是否存在；
- 真正是否通过，要以 Jest / WDIO 的实际执行结果为准；
- P0 功能即使单元/集成完整，如果要求 E2E 而没有 E2E，仍会保持“部分覆盖”。

## v1 → v2 当前结果

v1：

- P0 共 41 项；完整 6；部分 33；缺失 2；有缺口的 P0 共 35 项。

v2：

- P0 共 40 项；完整 12；部分 28；缺失 0；有缺口的 P0 共 28 项。

P0 总数从 41 调整为 40，不是删掉产品能力，而是把误标为 P0 的“数据管理导航壳”校准成 P1。

更重要的是：P0 已经没有“完全找不到自动化测试证据”的功能。剩余缺口主要集中在真实 Obsidian E2E、UI 用户操作和性能，而不是底层数据链完全裸奔。

## 常用命令

```bash
# 生成功能测试总账报告，不阻断开发
npm run test:system

# P0 总账若仍有必测维度缺失则失败
npm run test:system:strict

# 跑目前最关键的一组 P0 数据安全测试
npm run test:p0:data-safety

# 功能总账 + P0 数据安全测试
npm run verify:p0

# 全部 Jest
npm test

# 真实 Obsidian E2E
npm run test:e2e

# 发布完整检查
npm run verify:release
```

## v2 之后最优先的缺口

当前 P0 剩余 28 项存在维度缺口，主要集中在：

1. 真实 Obsidian E2E：Record 创建/修改/删除、Goal、GoalTemplate、Task、Timer、Energy；
2. Goal 设置 UI 与四列 Goal Cascade 真机交互；
3. Quick Input 创建、编辑、模板资格、冲突恢复的真机流程；
4. Task complete / reopen / recurrence / TaskSession / Timer 的用户旅程；
5. 大 Vault 下 RecordIndex、DataStore、扫描器和重建索引的性能；
6. 插件启动/卸载/重启的服务级组合验证。

因此 v3 最合理的方向不是继续大量补底层单测，而是建设稳定的 E2E fixture Vault、稳定 UI selector 和 P0 用户旅程。
