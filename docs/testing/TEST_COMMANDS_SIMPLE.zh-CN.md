# Think OS 测试命令：日常使用版

当前版本将日常测试统一到 npm 生态最常见的英文入口；中文命令继续保留兼容。

## 只记 4 条

### 1. `npm test`

日常默认测试。直接运行单元测试 + 组合测试。

- 这是唯一推荐的日常入口。
- Jest 仍使用项目内置中文 Reporter，因此测试文件、失败用例、期望/实际、汇总结果都以中文展示。
- 如果依赖未安装完整，会先用中文提示运行 `npm install`，不会直接掉进难读的 Jest 模块缺失错误。

适合：每次改完代码先跑。

### 2. `npm run test:full`

本机完整质量检查，包括：

- 功能测试地图严格审计
- 测试源码语法
- 工程质量
- 单元 + 组合测试
- 覆盖率
- 性能基线
- 故障实验室
- 质量报告

适合：准备提交代码、合并代码前。

### 3. `npm run test:smoke`

构建当前源码并启动真实 Obsidian 快速冒烟测试。

适合：修改 UI、Quick Input、Timer、设置、Layout、AI Chat 等真实交互功能后。

### 4. `npm run test:release`

发布前最终检查。在“完整检查”基础上继续运行：

- P0/P1/P2 真 Obsidian 测试
- 大 Vault
- Obsidian 兼容矩阵
- 不稳定测试重复运行
- 严格质量报告
- Release 构建

只有准备真正发布新版本时才需要运行。

## 出问题时才用的细分命令

| 命令 | 用途 |
|---|---|
| `npm run test:unit` | 只检查单元测试 |
| `npm run test:integration` | 只检查组合测试 |
| `npm run test:coverage` | 查看覆盖率 |
| `npm run test:performance` | 检查性能退化 |
| `npm run 测试:故障` | 主动制造坏文件、冲突、AI 失败等异常 |
| `npm run test:system` | 查看功能测试地图 |
| `npm run test:syntax` | 检查测试源码是否能解析 |
| `npm run test:help` | 在终端重新显示本说明的简版 |

## 中文兼容命令

旧命令仍可继续使用：

- `npm run 测试` = `npm test`
- `npm run 测试:完整` = `npm run test:full`
- `npm run 测试:真机` = `npm run test:smoke`
- `npm run 测试:发布` = `npm run test:release`

新代码、文档和人工操作优先使用 `npm test` / `npm run test:*`，避免两套入口继续分叉。

## Windows 说明

单元、组合、覆盖率、性能测试继续直接调用：

```text
node ./node_modules/jest/bin/jest.js ... --runInBand
```

不经过此前 Windows 上出过问题的 `run-jest-zh.mjs -> child_process -> Jest` 日常链路。

中文输出由 `test/configs/jest-reporter.zh-CN.cjs` 提供，因此“直连 Jest”和“中文结果”并不冲突。
