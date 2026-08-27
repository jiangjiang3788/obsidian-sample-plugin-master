# Think OS 测试体系 v6：P1 收口、真实 AI 链路与兼容矩阵

## 一、v6 的目标

v5 已经完成测试体系质量审计，并把 P1 推进到 42/50。v6 不再扩散测试概念，而是专门处理剩余 8 个 P1 缺口，并继续遵守 v5 的严格证据规则：

1. 证据文件真实存在；
2. 测试目录类型正确；
3. 文件显式声明 `@covers Fxxx/维度`；
4. 文件中真实存在测试用例；
5. “证据完整”和“运行通过”必须分开表述。

v6 完成后，功能地图达到：

- P0：40 / 40 完整；
- P1：50 / 50 完整；
- P2：0 / 3 完整（1 部分、2 缺失）。

这里的“完整”表示功能要求的测试维度都有严格可追踪证据，不表示当前生成环境已经把 Jest / WDIO 全部执行通过。

## 二、v6 收掉的 8 个 P1 缺口

### F061 精力记录管理与动作策略

复用真实精力快速采集 E2E，增加：

- 真 Obsidian UI；
- 真实 Record 落盘；
- 重新读取后的持久化验证。

### F064 精力视图与任务关联展示

新增：

- 真实视图模型组合测试；
- 真 Obsidian EnergyView；
- 真实推荐任务展示；
- 点击推荐任务后启动关联 Timer。

### F073 AI 批量确认与副作用边界

新增：

- 批量确认 actions 组合测试；
- 单条保存和批量保存边界；
- 保存失败时错误状态；
- 真 Obsidian 批量确认 UI 保存。

### F074 AI 自然语言录入完整流程

v5 保留这一项，是因为不能把外部 AI API 的网络波动当成稳定 E2E。v6 改为在真机测试进程中启动**本地 OpenAI 兼容测试服务**：

```text
Obsidian 命令
→ AI 输入 Modal
→ Think OS AiHttpClient
→ 本地 HTTP 测试服务
→ AiNaturalLanguageRecordParser
→ 批量确认 Modal
→ Quick Input 保存
→ Markdown/Vault
→ DataStore
→ Obsidian 重启
→ 记录恢复
```

这样真实覆盖 Think OS 自己的 HTTP、解析、确认和保存边界，又不依赖外部厂商服务。

同时支持本地服务返回 500，验证失败提示和“不产生记录”的异常路径。

## 三、Layout 与模块设置真交互

### F102 布局编辑器

v6 的真机用例不再只检查“页面存在”，而是实际操作：

- 布局内视图键盘拖拽排序；
- 从布局移除视图；
- 在布局编辑器中直接创建新视图；
- 复制布局；
- 确认删除布局；
- 设置仓储实时核对。

单元/组合层继续负责自由布局参数、模板切换确认、位置保存、重启恢复和写盘失败。

### F103 模块设置

真实操作：

```text
布局设置
→ 点击视图芯片
→ 打开真实模块设置浮窗
→ 修改“默认折叠”
→ 保存
→ SettingsRepository 验证
→ 重启 Obsidian
→ 再次验证
```

## 四、真实大 Vault 性能

F132 原来已经有：

- 20,000 条 RecordIndex 内存性能基线；
- 1,500 文件 DataStore 性能基线。

v6 新增真实 Obsidian 慢速套件：

- 在真实 Vault 创建 300 个 Record 文件；
- 重启 Obsidian；
- 等待 Think OS 完整就绪；
- 验证 300 条全部进入索引；
- 记录“重启到就绪”耗时；
- 记录真实 DataStore 查询耗时。

当前基线：

- 300 文件环境，重启到 Think OS 就绪 < 45 秒；
- DataStore 查询 < 1 秒。

这是回归报警线，不是产品性能承诺。以后 CI 机器变化时，应先观察一段历史数据再调整门槛。

## 五、Obsidian 版本兼容矩阵

v6 新增专门的兼容套件：

```bash
npm --silent run 测试:真机:兼容矩阵
```

默认矩阵：

```text
earliest/earliest
latest/latest
```

也就是同时检查插件声明可支持的最早版本边界和最新版本。可通过环境变量覆盖：

```bash
THINK_OBSIDIAN_COMPAT_VERSIONS="earliest/earliest latest/latest" npm --silent run 测试:真机:兼容矩阵
```

每个矩阵版本都要证明：

- Think OS 成功加载；
- 核心服务进入就绪；
- 核心命令成功注册；
- Goal 用例可以真实写入设置仓储。

## 六、所有公开测试输出继续保持中文

v6 新增的 AI、本地服务、大仓库、兼容矩阵、Layout 测试全部遵守 v5 的中文输出要求。

第三方 WDIO / Obsidian / Vite 的英文技术信息继续保存在：

```text
reports/testing/*技术日志.txt
```

终端面向使用者的主要结果保持中文。

## 七、v6 推荐命令

```bash
# 体系、证据、功能面
npm --silent run 测试:体系

# P0 + P1 证据严格门禁
npm --silent run 测试:体系:P1严格

# 测试源码和测试脚本语法
npm --silent run 测试:语法

# v5 + v6 的 P1 Jest 专项
npm --silent run 测试:P1:v6

# AI 真机链路
npm --silent run 测试:真机:AI

# 普通 P1 真机
npm --silent run 测试:真机:P1

# 大 Vault 慢速真机
npm --silent run 测试:真机:大仓库

# Obsidian 最早 + 最新兼容矩阵
npm --silent run 测试:真机:兼容矩阵

# v6 P1 联合验证
npm --silent run 验证:P1:v6
```

## 八、当前环境验证边界

本次生成环境仍没有完整项目依赖，因此严格区分两件事：

### 已实际确认

- 93 个功能编号和证据路径审计；
- P0/P1 严格功能地图；
- 产品功能面审计；
- 中文输出审计；
- TypeScript / TSX / MTS 测试源码语法；
- JavaScript / MJS / CJS 测试脚本语法；
- v6 相对 v5 的业务源码零修改；
- ZIP 结构和完整性。

### 不能在本生成环境宣称

- Jest 全量实际跑绿；
- Coverage 实际达到目标；
- WDIO 真 Obsidian 全量实际跑绿；
- 最早/最新 Obsidian 两个版本实际下载并执行成功；
- 大 Vault 真机性能在你的开发机/CI 上一定满足同样耗时。

这些必须由依赖完整的开发机或 CI 给出最终“运行通过”结论。

## 九、v6 之后

P0、P1 的**测试结构性缺口**已经收口。下一版不应该继续为了数字重复增加 P0/P1 测试，而应该转向：

1. P2：AI 接口测速、精力设置、移动端适配；
2. 把 Obsidian 兼容矩阵接进真实 CI；
3. 对大 Vault 性能建立历史趋势，而不是只看单次阈值；
4. 根据真实 Bug 持续增加回归测试。
