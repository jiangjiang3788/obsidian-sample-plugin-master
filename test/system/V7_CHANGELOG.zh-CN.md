# 测试体系 v7 变更记录

## P2

- F075 AI 接口测速：新增单元、组合、真 Obsidian、异常路径。
- F113 精力记录默认目标：校准真实产品入口，新增 UI、组合、落盘、重启、异常和真 Obsidian。
- F131 设备 profile：新增边界/异常回归和真实 Obsidian 窄屏响应测试。

## 门禁

- 新增 `--strict-p2`。
- 新增 `测试:体系:P2严格`。
- 新增 `测试:P2:v7`、`测试:真机:P2`、`验证:P2:v7`。

## CI

- 新增 `.github/workflows/think-os-test-v7.yml`。
- 新增 `测试:CI矩阵`，对工作流本身做静态防回归。
- 新增中文工程质量包装器，避免 v7 CI 公共终端直接暴露第三方英文技术输出。

## 语义校准

- F113 不再追踪未注册的 `EnergySettingsSection`，改为真实用户入口 `RecordTypeManager → EnergyRecordTypeSettings`。
- F131 明确为“设备 profile / 响应式行为”，不冒充 iOS/Android 原生 Obsidian App 实机认证。
