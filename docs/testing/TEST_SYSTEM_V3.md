# Think OS 测试体系 v3：真实 Obsidian E2E

## 这一版解决什么

v1 建立“功能测试总账”；v2 优先补数据安全、重启恢复和核心业务生命周期；v3 开始把测试真正放进 **真实 Obsidian + 真实临时 Vault** 中运行。

这版最重要的变化不是增加多少测试文件，而是把下面两件事分开验证：

1. **UI 真机测试**：真的打开 Think OS 界面、点击、输入、提交；
2. **Runtime 真机测试**：在真实 Obsidian 运行时、真实 Vault、真实插件服务中验证索引、文件监听、重启、计时器等。

这样既不会只看 DOM，也不会把“调用业务函数”冒充成用户 UI 测试。

---

## v3 新增的真实 Obsidian 测试

| 测试文件 | 中文意义 | 主要保护 |
|---|---|---|
| `test/specs/plugin-lifecycle.e2e.ts` | 插件启动、禁用、重新启用 | F001 / F130 |
| `test/specs/settings-goal.e2e.ts` | 从真实设置 UI 创建/删除 Goal，并验证重启 | F031 / F033 / F126 |
| `test/specs/quick-input-task.e2e.ts` | 四列 Goal 真钻取 + Quick Input 真提交 + 重启 | F035 / F036 / F040 / F041 / F043 / F014 |
| `test/specs/vault-index.e2e.ts` | 外部文件 create/modify/delete → VaultWatcher → DataStore；重建索引 + 重启 | F120 / F121 / F122 / F123 |
| `test/specs/timer-runtime.e2e.ts` | Task → Timer 开始/暂停 → Obsidian 重启 → 继续/停止 → TaskSession | F050 / F051 / F055 / F056 / F126 |
| `test/specs/record-mutation.e2e.ts` | Record 修改、时间更新、路径迁移、删除、重启 | F015 / F016 / F020 / F052 / F125 |
| `test/specs/energy-runtime.e2e.ts` | Energy 真 Markdown / DataStore / 重启恢复 | F065 / F126 |
| `test/specs/recurrence-runtime.e2e.ts` | 循环任务生成下一条、TaskSeries 指针、重启 | F053 / F054 |

另外新增：

- `test/specs/support/thinkE2e.ts`：真实 Obsidian 测试公共夹具与等待器；
- `test/integration/goalCascadeEligibilityFlow.test.ts`：组合层锁定“只有直接模板才具备创建资格，祖先模板绝不下传”；
- `scripts/testing/run-e2e-suite.mjs`：跨平台选择 E2E 套件；
- `test/configs/wdio.conf.mts`：支持 smoke / ui / runtime / p0 / all 分组。

---

## 三类 E2E，用中文理解

### 1. 启动检查（smoke）

回答：

> 插件至少能不能在真实 Obsidian 里启动？核心服务和关键命令有没有注册？禁用再启用会不会挂？

运行：

```bash
npm run test:e2e:smoke
```

### 2. UI 真机测试（ui）

回答：

> 用户真的去点 Think OS 设置、选择四层 Goal、填写 Quick Input、点击提交，能不能完成任务？

运行：

```bash
npm run test:e2e:ui
```

### 3. Runtime 真机测试（runtime）

回答：

> 在真实 Obsidian/Vault 中，文件监听、索引、重建、Timer、Record 修改、Energy、循环任务是否真的协同工作？重启以后数据还对不对？

运行：

```bash
npm run test:e2e:runtime
```

### P0 真机套件

把上面三类关键 P0 一起跑：

```bash
npm run test:e2e:p0
```

功能总账 + v2 数据安全 + v3 真机一起检查：

```bash
npm run verify:p0:e2e
```

---

## v3 修正了一个重要发布问题

旧的 `test:e2e` 直接启动 WDIO，但不会强制先构建当前源码。

这会产生一种危险：

> 源码已经改了，但 `main.js` 还是上一次构建的；E2E 实际测的是旧插件。

v3 改为：

```text
当前源码
  ↓
npm run build:debug
  ↓
启动真实 Obsidian
  ↓
运行 E2E
```

因此：

```bash
npm run test:e2e
```

现在一定先执行 `build:debug`，再启动 E2E。

---

## 四列 Goal 为什么同时需要“组合测试 + 真机 UI”

这条是 Think OS 的核心产品契约：

```text
一级 Goal：有直接 task 模板 → 可以创建
二级 Goal：没有直接模板 → 只能导航
三级 Goal：有自己的直接模板 → 可以创建
```

即使二级的父 Goal 有模板，也不能偷偷继承。

v3 用两层同时锁定：

1. `goalCascadeEligibilityFlow.test.ts`：直接检查 GoalUseCase → SettingsRepository → QuickInput 资格计算；
2. `quick-input-task.e2e.ts`：真实打开 Quick Input，逐列点击四层 Goal，确认二级不能被选成创建目标，三级能创建并真正写入 Vault。

这比只测一个函数或者只看 UI 都可靠。

---

## v2 → v3 当前结果

v2：

- P0 共 40 项；完整 12；部分 28；缺失 0。

v3：

- P0 共 40 项；**完整 32；部分 8；缺失 0**。

也就是说，这一版不是简单“多了几个 test 文件”，而是把 Record、Goal、Quick Input、Task、Timer、Energy、VaultWatcher、索引重建、循环任务等核心功能补到了真实 Obsidian 层。

---

## 为什么剩下 8 个 P0 没有硬标“完整”

当前仍有 8 个 P0 存在真实测试维度缺口：

| ID | 功能 | 剩余缺口 | 为什么保留 |
|---|---|---|---|
| F001 | 插件核心初始化/卸载 | 模块组合 | 真机生命周期已有，但 initializeCore 的服务组合还没有独立集成测试 |
| F018 | RecordIndex 完整性 | 大数据性能 | 正确性和重启已有，仍缺大量记录压力 |
| F044 | 冲突/失败/恢复重试 | UI、组合、真机 | 需要可控地注入真实写盘冲突/失败，不能用假“成功流程”冒充 |
| F045 | 编辑已有记录与回填 | UI、异常 | 真实 Obsidian Runtime 已覆盖回填→修改→写回→重启；仍缺真正从 UI 打开编辑器和可控失败路径 |
| F056 | Timer 全流程 | UI | Runtime 真机完整，但浮窗/按钮的真实用户操作仍未覆盖 |
| F120 | DataStore 一致性 | 大数据性能 | 正确性、重启、异常已有 |
| F121 | Vault 扫描 | 大数据性能 | create/modify/delete/rescan/restart 已有 |
| F123 | 重建索引 | 大数据性能 | 真机重建与重启已有 |

这些缺口被保留，是为了让“完整”这个词仍然可信。

---

## 真实 E2E 的测试数据原则

v3 使用 `test/vaults/simple` 作为测试 Vault，但每条 P0 E2E 都把自己的数据放在 `E2E/` 目录和 `E2E` Goal 下。

每次测试前会：

1. 删除 `E2E/` 测试文件；
2. 删除 `E2E` Goal 树；
3. 清理测试 Timer；
4. 重新扫描 DataStore；
5. 再建立本次测试需要的 fixture。

目的：避免上一条测试污染下一条测试。

---

## Obsidian 版本

默认：

```text
latest/latest
```

由 `wdio-obsidian-service` 解析真实 Obsidian 版本。也可以通过环境变量 `OBSIDIAN_VERSIONS` 交给同一配置解析，用于后续做版本兼容矩阵。

---

## v3 仍然不是“所有功能全部完成”

测试总账共有 93 个功能条目。v3 重点解决 P0，不代表 P1/P2 已经完整。

当前 P1 的明显大缺口仍包括：

- Goal 指标管理；
- AI Chat；
- AI 自然语言完整流程；
- 9 种展示视图的真实 UI；
- Markdown 导出；
- Layout 编辑器；
- BlockManager / FieldsEditor；
- 大 Vault 性能；
- 不同 Obsidian 版本兼容。

因此下一版最合理的方向将是：

> **性能基线 + 故障注入 + P1 用户功能 E2E**。

---

## 本包的验证边界

生成 v3 时，本环境尝试安装项目依赖，但安装过程超时，留下的 `node_modules` 不完整，TypeScript 编译器入口也不可用。

所以本版已完成并验证的是：

- 功能总账 JSON 可解析；
- 93 个功能条目和证据路径可以做结构审计；
- 测试体系报告程序实际运行；
- E2E 配置、脚本和测试代码已经写入项目；
- 最终包会移除这个不完整的 `node_modules`。

本环境**没有声称**：Jest / WDIO / 真实 Obsidian E2E 已全部执行通过。

拿到完整依赖环境后，应先运行：

```bash
npm ci
npm run verify:p0:e2e
```

再根据真实执行结果修正任何运行时 selector、版本兼容或时序问题。
