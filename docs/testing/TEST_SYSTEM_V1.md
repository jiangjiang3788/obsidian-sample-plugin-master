# Think OS 测试体系 v1

## 第一版包含什么

1. `test/system/feature-test-map.json`：93 个产品功能的机器可读测试总账；
2. `scripts/testing/test-system-report.mjs`：自动统计 P0/P1/P2 与各测试维度缺口；
3. `test/unit/testSystemManifest.test.ts`：保证功能编号、测试维度、源码与证据路径不会失真；
4. `test/configs/jest.coverage.config.js`：Coverage 改为统计整个 `src`；
5. `reports/testing/test-system-report.md`：当前版本自动生成的功能测试缺口报告；
6. `TESTING_GUIDE.zh-CN.md`：中文测试概念与体系说明；
7. `TEST_CASE_STANDARD.zh-CN.md`：新增功能与 Bug 修复时的测试编写标准；
8. 新增 `test:system`、`test:system:strict`、`verify:release`、`verify:release:strict` 命令。

## v1 不做什么

第一版**不是**把 93 个功能的缺失测试一次性全部补齐。这样做既不可靠，也会产生大量低价值测试。

v1 的目标是先建立“功能 → 风险 → 必测维度 → 已有证据 → 缺口”的总账和自动报告。后续版本按 P0 优先顺序补真实 E2E、重启、迁移、异常路径与数据完整性测试。

## 第一阶段补测顺序

1. Record 创建/修改/删除；
2. Quick Input 主流程；
3. Goal / GoalTemplate；
4. Task 完成、循环、TaskSession、Timer；
5. DataStore / VaultWatcher / 重建索引；
6. Settings 与重启恢复；
7. Migration / 旧 Vault；
8. 九种 View 主流程；
9. AI Input / AI Chat；
10. 大 Vault 性能与 Obsidian 多版本兼容。
