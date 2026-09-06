# Think OS documentation

Active product/design truth:

- `ARCHITECTURE.md` - current module boundaries and dependency direction.
- `RECORD_MODEL.md` - canonical Record, Template and Field semantics.
- `TESTING_RELEASE.md` - local verification, CI and release checks.
- `CSS_DESIGN_SPEC.md` - current UI/CSS design contract.
- `UI_REDESIGN_PLAN.md` - full UI redesign phases and current progress.
- `DEVELOPMENT_GUARDRAILS.md` - rules that prevent architecture from expanding again.
- `DOCUMENT_GOVERNANCE.md` - documentation retention policy.

Implementation history lives under `docs/reports/`. No phase report should be placed loose in the project root.

## Product acceptance contracts

Quick input renders single-select options as product labels while persisting canonical values. Template-backed Record creation requires an enabled direct GoalTemplate for the selected `recordTypeId + goalPath`; ancestor Goals are navigation only, and the runtime never guesses another target or RecordType.

Quick Input conflict recovery actions include opening the original record, rescanning affected paths, retrying the save, and dismissing the recovery panel; recovery never silently overwrites an external change.

Release verification is intentionally reproducible: run `npm run verify:ci` for the full checks and `npm run build:release` for the release bundle/package boundary.

## Test system v1

Think OS now includes a feature-level testing ledger in `test/system/feature-test-map.json` and a Chinese testing guide under `docs/testing/`.

```bash
npm run test:system          # report feature-level gaps
npm run test:system:strict   # fail while P0 required dimensions are missing
npm run test:coverage        # whole-src coverage configuration
npm run verify:release       # release verification path
```

## Test system v2

v2 begins converting the feature ledger into real P0 data-safety tests. See `docs/testing/TEST_SYSTEM_V2.md`.

```bash
npm run test:system          # feature-level gap report
npm run test:p0:data-safety  # critical Record/Goal/Task/Energy/DataStore safety tests
npm run verify:p0            # ledger + critical P0 tests
npm run verify:release       # full release path including Obsidian E2E
```


## Test system v3-v4

v3 adds real Obsidian UI/runtime E2E. v4 closes the P0 test-dimension ledger with fault injection and scale baselines, then starts P1 AI Chat/export coverage. See `docs/testing/TEST_SYSTEM_V4.md`.

```bash
npm run test:performance  # RecordIndex/DataStore scale regression baselines
npm run verify:p0:v4     # strict P0 ledger + data safety + v4 Jest + performance + Obsidian E2E
npm run verify:p1:v4     # first P1 tranche (AI Chat + export-related Jest/E2E)
```

## Test system v5（中文输出与严格证据审计）

v5 先对 v1-v4 做质量复核，再继续扩展 P1。测试终端输出统一中文；测试证据必须满足“路径存在 + 类型目录正确 + `@covers` 显式声明”，并增加独立语法审计。当前功能地图为 P0 40/40、P1 42/50。详见 `reports/testing/TODAY_TEST_AUDIT.zh-CN.md` 与 `reports/testing/V5_VALIDATION.zh-CN.md`。

```bash
npm --silent run 测试:体系      # 中文输出 / 证据 / 产品功能面审计
npm --silent run 测试:语法      # 测试源码与测试脚本语法审计
npm --silent run 测试:P1:v5    # v5 P1 单元与组合专项
npm --silent run 测试:真机:P1   # P1 真实 Obsidian 流程
npm --silent run 验证:P1:v5    # v5 P1 完整验证入口
```

> `npm --silent run` 是推荐入口，避免 npm 自身打印多余命令头；第三方英文技术细节会保存到 `reports/testing/*技术日志.txt`，不会直接刷到测试终端。

## Test system v9（可重复故障实验室）

v9 在 v8 的结果治理基础上增加固定坏数据样本和动态故障注入，专门验证数据损坏、重复 ID、并发修改、写盘/回滚失败、缓存陈旧、AI 限流/坏响应/超时以及 512KiB 超大 Record。详见 `docs/testing/TEST_SYSTEM_V9.md`。

```bash
npm --silent run 测试:故障实验室:审计  # 样本、场景、@fault 证据追踪
npm --silent run 测试:故障实验室       # 核心故障 + 超大输入
npm --silent run 测试:故障实验室:报告  # 中文故障矩阵报告
npm --silent run 验证:CI:v9            # v9 日常 CI 门禁
npm --silent run 验证:发布:v9          # 完整发布验证
```

> 故障场景“已登记/有证据”仍不等于“本次已经跑绿”。v9 发布质量报告会把未执行的故障实验明确标为“待补齐运行证据”。
