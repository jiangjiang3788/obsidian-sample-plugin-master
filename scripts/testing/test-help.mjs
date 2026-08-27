#!/usr/bin/env node
console.log(`
Think OS 测试命令（简化版）

日常只需要记 4 条：

  npm run 测试
    日常测试：单元 + 组合。改完代码先跑这个。

  npm run 测试:完整
    本机完整检查：测试体系、语法、工程质量、Jest、覆盖率、性能、故障实验室、质量报告。
    准备提交代码时跑这个。

  npm run 测试:真机
    启动真实 Obsidian 做用户流程测试。改 UI、Quick Input、Timer、Settings 等功能时跑。

  npm run 测试:发布
    发布前最终检查：完整检查 + 全部真机 + 大仓库 + 兼容矩阵 + 稳定性 + 正式构建。

需要定位问题时再用：

  npm run 测试:单元      只跑单元测试
  npm run 测试:组合      只跑组合测试
  npm run 测试:覆盖率    看代码覆盖情况
  npm run 测试:性能      跑性能基线
  npm run 测试:故障      主动制造异常/损坏/冲突
  npm run 测试:体系      检查功能测试地图
  npm run 测试:语法      检查测试源码语法

说明：
- 单元/组合/覆盖率/性能直接调用 Jest，不再经过 Windows 上出过问题的 child_process 中文启动器。
- Jest 仍使用项目里的中文 Reporter，所以测试结果仍以中文显示。
- 旧的 v7/v8/v9 命令保留用于历史文档和 CI 兼容，日常不需要记。
- 真机测试允许使用当前真实设置的沙盒副本；自动化只操作测试 Vault / E2E 命名空间，不直接修改原始 Vault。
`);

console.log('  npm run 测试:真机        快速真实 Obsidian 冒烟');
console.log('  npm run 测试:真机:核心   P0 核心真机流程');
console.log('  npm run 测试:真机:全部   全部真实 Obsidian 测试');
console.log('  npm run 测试:真机:诊断   直接显示 WDIO/Obsidian 原始进度');
