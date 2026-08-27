# 功能测试总账

`feature-test-map.json` 是 Think OS 测试体系的唯一机器可读功能覆盖来源；当前 schemaVersion 为 7。

- `sources`：该功能的主要源码入口；
- `risk`：P0 / P1 / P2；
- `required`：这个功能按当前风险必须具备的测试维度；
- `evidence`：当前已有测试证据文件；
- `note`：必要说明。

运行 `npm run test:system` 生成报告。

注意：一个测试文件可以作为证据，但不能因为“文件存在”就假设里面每个场景都完整。P0 的 E2E、重启、迁移和异常用例仍应人工审查场景质量。

## v2

第二版开始补 P0 真实测试，并校准功能地图中“源码真实职责”和“测试要求”的对应关系。

- 变更说明：`test/system/V2_CHANGELOG.zh-CN.md`
- 详细说明：`docs/testing/TEST_SYSTEM_V2.md`
- P0 关键测试：`npm run test:p0:data-safety`
- 当前 P0：40 项，完整 12，部分 28，缺失 0。


## v3

第三版进入真实 Obsidian E2E：把 UI 用户操作和真实 Runtime/Vault 集成分开验证。

- 详细说明：`docs/testing/TEST_SYSTEM_V3.md`
- 变更记录：`test/system/V3_CHANGELOG.zh-CN.md`
- 启动检查：`npm run test:e2e:smoke`
- UI 真机：`npm run test:e2e:ui`
- Runtime 真机：`npm run test:e2e:runtime`
- P0 真机全集：`npm run test:e2e:p0`
- 总账 + 数据安全 + P0 E2E：`npm run verify:p0:e2e`
- 当前 P0：40 项，完整 32，部分 8，缺失 0。


## v4

第四版完成 P0 测试维度收口，并加入故障注入与性能基线。

- 详细说明：`docs/testing/TEST_SYSTEM_V4.md`
- 变更记录：`test/system/V4_CHANGELOG.zh-CN.md`
- 性能基线：`npm run test:performance`
- P0 v4：`npm run verify:p0:v4`
- P1 第一批：`npm run verify:p1:v4`
- 当前 P0：40 项，完整 40，部分 0，缺失 0（指测试地图维度证据完整，不代表当前机器已执行全绿）。

## v5

第五版先重做测试质量审计，再扩展 P1：公共测试输出中文化、严格证据规则、产品功能面审计和正式测试语法审计。

- 详细说明：`docs/testing/TEST_SYSTEM_V5.md`
- P1 v5 专项：`npm --silent run 测试:P1:v5`
- 当前 P1：50 项，完整 42，部分 5，缺失 3。

## v6

第六版收口剩余 P1，并加入本地 AI 真链路、大 Vault 真机和 Obsidian 版本兼容矩阵。

- 详细说明：`docs/testing/TEST_SYSTEM_V6.md`
- 变更记录：`test/system/V6_CHANGELOG.zh-CN.md`
- P0/P1 严格证据门禁：`npm --silent run 测试:体系:P1严格`
- AI 真机：`npm --silent run 测试:真机:AI`
- 大 Vault：`npm --silent run 测试:真机:大仓库`
- 兼容矩阵：`npm --silent run 测试:真机:兼容矩阵`
- v6 联合验证：`npm --silent run 验证:P1:v6`
- 当前 P0：40/40 完整；P1：50/50 完整（均指严格测试维度证据完整，不代表当前生成环境已执行全绿）。

## v7

第七版完成剩余 P2，并把全风险等级接入严格门禁与 CI 自动矩阵。

- 详细说明：`docs/testing/TEST_SYSTEM_V7.md`
- 变更记录：`test/system/V7_CHANGELOG.zh-CN.md`
- P0/P1/P2 严格证据门禁：`npm --silent run 测试:体系:P2严格`
- P2 专项：`npm --silent run 测试:P2:v7`
- P2 真机：`npm --silent run 测试:真机:P2`
- CI 配置审计：`npm --silent run 测试:CI矩阵`
- v7 CI 验证：`npm --silent run 验证:CI:v7`
- 当前 P0：40/40；P1：50/50；P2：3/3（均指严格测试维度证据完整，不代表当前生成环境已执行全绿）。


## v8

v8 不再增加产品功能覆盖条目，重点进入测试结果治理：

- 结构化结果与耗时：Jest / 真 Obsidian；
- 真机失败现场：截图、页面 HTML、失败摘要；
- 不稳定测试审计：Jest 3 轮、P0 真机 2 轮；
- 性能历史与测试耗时趋势；
- 发布质量报告；
- v8 CI 历史缓存与最终质量汇总。

详细说明：`docs/testing/TEST_SYSTEM_V8.md`

常用命令：

```bash
npm --silent run 测试:结果治理
npm --silent run 测试:稳定性
npm --silent run 测试:真机:稳定性:P0
npm --silent run 测试:质量报告
npm --silent run 验证:CI:v8
```
