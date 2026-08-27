# Think OS 测试体系 v7：P2 收口与 CI 自动矩阵

## 一、v7 的目标

v6 已经把 P0、P1 的测试结构性缺口收口。v7 不再重复堆核心测试，而是完成三件事：

1. 补齐剩余 P2：AI 接口测速、精力默认目标设置、设备 profile 响应适配；
2. 把 P0/P1/P2 全部纳入严格证据门禁；
3. 把日常、真机、规模、版本兼容测试接入 GitHub Actions 自动矩阵。

当前严格功能地图：

- P0：40 / 40 完整；
- P1：50 / 50 完整；
- P2：3 / 3 完整。

“完整”仍表示必需测试维度都有严格可追踪证据，不等于当前生成环境已经实际执行全部 Jest / WDIO 并通过。

## 二、F075：AI 接口测速

v7 新增三层验证：

### 规则测试

验证：

- 配置完整才发请求；
- 使用固定的小型测速请求；
- 成功时显示毫秒结果；
- AI 未启用不发请求；
- HTTP 失败显示中文失败信息；
- takeLatest 取消不会误报成接口故障。

### 组合测试

真实组合：

```text
createAiSpeedTestCommand
→ createTakeLatest
→ AiHttpClient
→ 可控 HTTP transport
→ OpenAI 兼容响应
→ 中文测速结果
```

这不是在命令层直接 mock 一个“成功结果”。

### 真 Obsidian

真实执行命令：

```text
think-os:think-ai-speed-test
```

测试运行器会启动本地 OpenAI 兼容 HTTP 服务，因此不依赖外网、API Key 或第三方厂商稳定性。

## 三、F113：精力记录默认目标设置

v7 校准了功能入口。用户实际使用入口是：

```text
控制中心
→ 数据管理
→ 记录类型
→ 精力
→ 默认目标
```

真实产品组件是 `EnergyRecordTypeSettings`。旧地图里的 `EnergySettingsSection` 当前没有注册到用户导航，不再把它当成产品入口进行“虚假覆盖”。

测试验证：

- 只展示未归档 Goal；
- 选择 Goal 调用唯一 SettingsUseCase；
- “自动选择第一个活跃目标”保存为空值语义；
- SettingsUseCase → SettingsRepository → data.json 形态；
- 新 Repository / Obsidian 重载后恢复；
- 写盘失败明确抛错。

## 四、F131：设备 profile 响应适配

v7 把功能名称校准为“窄屏/触控设备 profile 响应适配”。

规则层验证：

- Android；
- iPadOS 桌面 UA + touch points；
- 普通桌面；
- 820 / 821 px 移动式交互边界；
- matchMedia 异常安全回退；
- data 属性和移动/桌面 class 重复应用不会残留旧状态。

真机层在真实 Obsidian Electron 中把窗口缩到 430px，再打开 Quick Input，验证：

- `data-think-viewport="narrow"`；
- 移动式 modal class；
- 移动式 Think OS class；
- 恢复桌面宽度后新 modal 不残留移动 class。

### 重要边界

这证明的是 Think OS 的设备 profile 和响应式交互逻辑，不等价于“iOS/Android 原生 Obsidian App 已做实机认证”。当前 WDIO Obsidian 框架运行的是桌面 Electron。v7 不把桌面窄屏模拟冒充成手机 App 实机认证。

## 五、P2 严格门禁

新增：

```bash
npm --silent run 测试:体系:P2严格
```

严格模式要求 P0、P1、P2 所有功能的必需维度都具备：

1. 证据文件存在；
2. 测试类型目录正确；
3. `@covers Fxxx/维度` 明确声明；
4. 文件内真实存在测试用例。

## 六、v7 中文测试命令

```bash
# P2 新增单元 / 组合专项
npm --silent run 测试:P2:v7

# P2 真 Obsidian
npm --silent run 测试:真机:P2

# P0/P1/P2 严格功能地图
npm --silent run 测试:体系:P2严格

# CI 配置自身审计
npm --silent run 测试:CI矩阵

# P2 联合验证
npm --silent run 验证:P2:v7

# 完整 CI 级验证
npm --silent run 验证:CI:v7

# 发布级验证
npm --silent run 验证:发布:v7
```

## 七、所有公开测试输出继续中文化

v7 的 Jest、E2E、功能地图、CI 矩阵审计继续通过中文运行层。

另外 `验证:CI:v7` 不再直接暴露 TypeScript / Gate / Vite 的英文输出；非测试工程门禁由中文包装器运行，第三方技术细节写入：

```text
reports/testing/*技术日志.txt
```

## 八、CI 自动矩阵

工作流：

```text
.github/workflows/think-os-test-v7.yml
```

分成四档：

### 每次 PR / Push

- P2 严格测试体系；
- CI 配置审计；
- 测试源码语法；
- TypeScript / 架构 / 构建；
- 单元测试；
- 组合测试；
- Coverage；
- 性能基线。

### PR / Push / 手动

- 最新 Obsidian 的 P0 真机核心流程。

### main / master Push 或手动

- P1 真机；
- P2 真机。

### 每周一或手动

- 真 Obsidian 大 Vault；
- 最早版本 + 最新版本 Obsidian 兼容矩阵。

CI 配置本身也有静态审计：

```bash
npm --silent run 测试:CI矩阵
```

防止以后有人误删重要 job 而无人发现。

## 九、v7 的质量边界

本版本实际完成了：

- 功能地图严格证据审计；
- 中文输出审计；
- 产品功能面审计；
- CI 矩阵静态审计；
- TS/TSX/MTS/JS/MJS/CJS 测试源码语法审计；
- v6 → v7 业务源码零修改检查；
- ZIP 完整性检查。

如果当前生成环境没有完整项目依赖，则不能把这些静态审计结果表述成“Jest、WDIO、真实 Obsidian 已全部跑绿”。最终运行结论由开发机或 CI 执行结果给出。
