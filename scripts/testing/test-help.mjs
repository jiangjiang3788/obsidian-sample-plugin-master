#!/usr/bin/env node
console.log(`
Think OS 测试命令（简化版）

日常只需要记 4 条：

  npm test
    日常测试：单元 + 组合。改完代码先跑这个；结果使用中文 Reporter。

  npm run test:full
    本机完整检查：测试体系、语法、工程质量、Jest、覆盖率、性能、故障实验室、质量报告。
    准备提交代码时跑这个。

  npm run test:smoke
    启动真实 Obsidian 做快速用户流程冒烟。改 UI、Quick Input、Timer、Settings 等功能时跑。

  npm run test:release
    发布前最终检查：完整检查 + 全部真机 + 大仓库 + 兼容矩阵 + 稳定性 + 正式构建。

需要定位问题时再用：

  npm run test:unit         只跑单元测试
  npm run test:integration  只跑组合测试
  npm run test:coverage     看代码覆盖情况
  npm run test:performance  跑性能基线
  npm run test:system       检查功能测试地图
  npm run test:syntax       检查测试源码语法
  npm run test:help         显示本说明

兼容说明：
- npm run 测试 / 测试:完整 / 测试:真机 / 测试:发布 继续可用。
- 新操作优先使用 npm test / npm run test:*，减少两套命令长期分叉。
- 单元/组合/覆盖率/性能直接调用 Jest，不再经过 Windows 上出过问题的 child_process 中文启动器。
- Jest 使用项目里的中文 Reporter，所以测试结果仍以中文显示。
- 真机测试允许使用当前真实设置的沙盒副本；自动化只操作测试 Vault / E2E 命名空间，不直接修改原始 Vault。
`);
