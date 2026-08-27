# Think OS 测试体系 v4：故障注入、性能基线与 P0 收口

## 这一版解决什么

v1 建立功能测试总账；v2 补数据安全与重启；v3 引入真实 Obsidian E2E；v4 处理最后一批 P0 维度缺口，并开始向 P1 扩展。

v4 的三个关键词：

1. **故障注入**：不是只验证“成功时能保存”，而是主动制造外部文件变化、冲突和损坏数据；
2. **性能基线**：不是追求某台机器必须跑到固定毫秒，而是用规模样本阻止灾难性退化；
3. **真 UI 生命周期**：从真实 Timer 界面打开已有记录、回填、编辑、暂停/继续/完成，并验证重启后的数据。

---

## 一、P0 功能测试地图现在达到 40 / 40 维度完整

v3：

- P0 总数 40；完整 32；部分 8；缺失 0。

v4：

- P0 总数 40；**完整 40；部分 0；缺失 0。**

这里的“完整”有严格限定：

> `feature-test-map.json` 中这个 P0 功能要求的测试维度，都已经指向真实存在的测试证据文件。

它不等于：

> 当前生成环境已经实际把所有 Jest / WDIO / Obsidian 测试跑绿。

因此要区分两个概念：

- **测试设计完整性**：功能需要的测试维度有没有被设计和落地；
- **测试执行结果**：这些测试在某个具体依赖/Obsidian 环境中是否真正通过。

v4 完成的是第一件事；第二件事必须在完整依赖环境运行 `verify:p0:v4` 才能确认。

---

## 二、v4 新增的 P0 测试

| 测试 | 中文意义 | 主要功能 |
|---|---|---|
| `coreInitializationComposition.test.ts` | 核心初始化组合根 | F001 |
| `recordIndexScale.test.ts` | 20,000 RecordIndex 性能基线 | F018 |
| `dataStoreScale.test.ts` | 1,500 Markdown 文件扫描/查询/重建基线 | F120/F121/F123 |
| `quickInputConflictRecoveryPanel.test.tsx` | 冲突恢复 UI 行为 | F044 |
| `recordConflictRecoveryFlow.test.ts` | 冲突→扫描→重试组合契约 | F044 |
| `edit-recovery-timer-ui.e2e.ts` | 真机编辑、故障恢复、Timer UI | F044/F045/F056 |

### 核心初始化组合测试

它验证的不只是某个函数：

```text
SettingsRepository
  ↓
initializeCore
  ↓
Zustand Store
  ↓
UseCases
  ↓
DI Container
  ↓
Disposables 卸载订阅
```

并验证缺少关键 `SettingsPersistence` 注册时不能得到半初始化运行时。

### 冲突恢复故障注入

真实 Obsidian E2E 会执行：

```text
打开已有 Task 编辑器
  ↓
用户修改内容
  ↓
外部程序暂时改写 Markdown，让原 Record 消失
  ↓
点击保存
  ↓
必须出现冲突恢复面板
  ↓
恢复原文件
  ↓
点击“重新扫描”
  ↓
点击“重试保存”
  ↓
保存成功
```

这叫 **故障注入测试**：主动制造问题，验证产品如何恢复。

---

## 三、性能测试到底是什么

性能测试不是简单地说：

> “这个函数必须 52ms 完成。”

因为不同电脑、CI 容器、Node 版本都会影响绝对时间。

v4 使用两种规模样本：

- RecordIndex：20,000 条记录；
- DataStore：1,500 个 Markdown 文件。

测试同时验证：

1. 数量没有丢；
2. 稳定 ID 查询正确；
3. Record 位置正确；
4. 没有错误重复 ID；
5. 全量重建结果正确；
6. 时间没有发生“灾难性退化”。

当前时间阈值故意比较宽松，它是 **回归报警线**，不是硬件跑分。

运行：

```bash
npm run test:performance
```

---

## 四、v4 补上的 Timer / 编辑真实 UI

v3 已经验证 Timer Runtime：开始、暂停、重启、继续、停止、TaskSession。

v4 再补用户真正看到的控件：

```text
Timer 悬浮窗
  ↓
暂停
  ↓
继续
  ↓
完成任务
  ↓
Task 状态 = done
```

同一个真机套件还验证：

```text
Timer → 编辑任务
  ↓
Quick Input 真正打开 edit 模式
  ↓
原内容必须回填
  ↓
修改并保存
  ↓
Markdown 更新
  ↓
重启 Obsidian
  ↓
DataStore 仍是修改后的数据
```

---

## 五、开始补 P1：AI Chat

v4 第一批 P1 选择 AI Chat 会话存储，因为它有真实数据安全价值。

新增三层：

1. `chatSessionStore.test.ts`：会话、消息、过滤器、删除、损坏 JSON 备份；
2. `chatSessionRestartLifecycle.test.ts`：新 Store 实例重新加载持久化数据；
3. `ai-chat-store-runtime.e2e.ts`：真实 Obsidian/Vault 创建会话→重启恢复，并验证损坏 JSON 不阻止启动。

因此 F077 在测试地图中达到完整维度覆盖。

---

## 六、开始补 P1：Markdown 导出

v4 新增：

- `markdownExport.test.ts`；
- `markdownExportMatrix.test.ts`。

覆盖：

- 多级分组；
- 多行内容；
- Task 领域字段；
- 不输出 `undefined/null`；
- 未知 View 类型安全回退；
- Block/Table/Excel/Timeline/EventTimeline/Statistics/Heatmap 配置矩阵。

F091 仍然保留 **真实 UI / 剪贴板 E2E** 缺口，所以不会为了数字好看标成完整。

---

## 七、大 Vault 性能仍然保留一个真实 P1 缺口

F132 现在有：

- integration；
- performance；
- regression。

但仍缺：

- **真实 Obsidian 大 Vault E2E**。

内存 Vault 性能测试适合持续 CI；真实 Obsidian 大 Vault 更适合独立慢速套件。两者不能互相冒充。

---

## 八、v4 命令

```bash
# 功能测试地图
npm run test:system

# P0 测试地图必须无维度缺口
npm run test:system:strict

# v4 新增 P0 Jest 测试
npm run test:p0:v4

# 性能基线
npm run test:performance

# P0 真实 Obsidian E2E
npm run test:e2e:p0

# P0 v4 总门禁：地图 + 数据安全 + v4 Jest + 性能 + 真机
npm run verify:p0:v4

# v4 第一批 P1 Jest
npm run test:p1:v4

# P1 AI Chat 真实 Obsidian
npm run test:e2e:p1

# 第一批 P1 联合验证
npm run verify:p1:v4
```

---

## 九、发布门禁变化

`verify:release` / `verify:release:strict` 现在会额外执行：

```text
性能基线
```

原因是 P0 已经正式把性能作为 RecordIndex / DataStore / Vault scan / rebuild 的必需维度；如果发布流程不实际运行性能测试，那么“地图上有 performance 证据”没有意义。

---

## 十、下一版最合理的方向

P0 测试地图已经收口，下一阶段不应该继续为了 P0 数量堆测试。

v5 应集中 P1 用户功能：

- Goal 指标管理；
- AI Chat 界面；
- AI 自然语言录入真实流程；
- Layout 编辑器；
- BlockManager / FieldsEditor；
- 9 种 View 的共享 E2E 契约；
- Markdown 导出真实 UI；
- 真实大 Vault；
- 多 Obsidian 版本兼容矩阵。
