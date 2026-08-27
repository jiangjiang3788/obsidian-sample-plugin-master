# Testing and release

## Fast architecture check

```bash
npm run gate
```

The public gate surface is deliberately small and grouped by governance domain:

```text
gate:product
gate:architecture
gate:records
gate:task-session
gate:energy
gate:ui-runtime
gate:quality
gate:stability
```

Internal checks may be more granular, but historical phase names are not part of the public developer workflow.

## Behavioral verification

```bash
npm run test:unit
npm run test:integration
```

Integration coverage should protect end-to-end boundaries such as:

- Template -> RecordDraft -> Codec -> Parser -> RecordQuery;
- Repository -> Transaction -> rescan -> update/delete/rollback;
- Task + Energy + TaskSession -> RecordIndex integrity.

Prefer behavioral coverage over adding a new static gate for every implementation detail.

## Full local verification

```bash
npm run verify
```

The full path runs type checking, governance gates, unit tests, integration tests and a production build.

## Release

```bash
npm run build:release
npm run release:check
npm run bundle:report
```

Release checks include version synchronization, release-package boundaries and bundle budget/reporting.

CI should run `npm run verify:ci` and `npm run build:release`.

## Test system v1 (中文功能覆盖体系)

测试文件数量和代码 Coverage 不能单独证明产品功能完整。v1 新增机器可读功能测试总账：

```text
test/system/feature-test-map.json
```

运行：

```bash
npm run test:system
```

会生成：

```text
reports/testing/test-system-report.md
reports/testing/test-system-report.json
```

`npm run test:system:strict` 会在任何 P0 功能仍缺必需测试维度时返回失败。当前第一版保留该严格模式作为逐步收敛目标，不直接加入普通 `verify:ci`。

Coverage 使用专用配置 `test/configs/jest.coverage.config.js`，统计整个 `src`，避免未被任何测试 import 的源码文件从报告中消失。

完整中文说明见：

- `docs/testing/TESTING_GUIDE.zh-CN.md`
- `docs/testing/TEST_CASE_STANDARD.zh-CN.md`
- `docs/testing/TEST_SYSTEM_V1.md`

## Test system v9（可重复故障实验室）

发布验证除功能覆盖、单元/组合、性能和真实 Obsidian 流程外，还必须执行可重复异常场景：

```bash
npm --silent run 测试:故障实验室:审计
npm --silent run 测试:故障实验室
npm --silent run 测试:故障实验室:报告
```

故障实验室总账位于 `test/system/fault-lab.json`，固定坏数据位于 `test/fixtures/fault-lab/`。动态文件故障只通过测试边界注入，禁止在 `src/` 中加入“仅供测试触发失败”的业务分支。

v9 CI / 发布入口：

```bash
npm --silent run 验证:CI:v9
npm --silent run 验证:发布:v9
```

发布质量报告必须把“故障实验室核心场景”和“故障实验室超大输入”作为独立运行证据；没有实际执行结果时只能判定为“待补齐运行证据”。
