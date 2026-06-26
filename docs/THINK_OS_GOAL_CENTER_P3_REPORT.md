# Think OS 目标中心 P3：编辑崩溃修复与数据管理继续收敛报告

## 本版定位

本版优先修复用户反馈的运行时错误：

```text
Uncaught TypeError: Cannot read properties of undefined (reading 'blocks')
```

该错误发生在“点开数据编辑”链路，不是普通显示问题。根因是 P0 把创建/保存主链从 `InputSettings` 升级到完整 `ThinkSettings` 后，`prepareEdit → buildEditRecordState` 仍然按旧形态传入 `inputSettings`，但 `resolveRecordDependencies` 已经按完整 settings 读取 `settings.inputSettings.blocks`。因此编辑态会在读取 blocks 时崩溃。

## 修复内容

| 模块 | 修复 | 状态 |
|---|---|---|
| `RecordInputKernel.prepareEdit` | `buildEditRecordState({ settings })` 改为传完整 `ThinkSettings` | 已完成 |
| `editStateResolver` | `BuildEditStateInput.settings` 改为 `ThinkSettings`，内部显式使用 `settings.inputSettings` 处理旧 block/theme 推断 | 已完成 |
| `dependencyResolver` | 对旧调用增加防御性 normalize，避免误传 `InputSettings` 时直接崩溃 | 已完成 |
| 编辑模板解析 | 编辑态继续可以使用 `GoalTemplateResolver`，同时保留旧 override 记录的识别能力 | 已完成 |
| data.json | 增加 `goalCoreP3EditFixVersion = 1` | 已完成 |

## 为什么这个修复重要

P0 的目标是让保存链真正走 `Goal × Block`，这是正确方向。但编辑链有自己的路径：

```text
QuickInputModal 编辑记录
  → recordInput.prepareEditRecord
  → RecordInputKernel.prepareEdit
  → buildEditRecordState
  → resolveBlockForEdit
  → resolveRecordDependencies
```

如果 `buildEditRecordState` 还拿旧 `InputSettings`，就会造成：

```text
创建链：完整 ThinkSettings
编辑链：旧 InputSettings
依赖解析：以为拿到完整 ThinkSettings
结果：settings.inputSettings undefined → blocks 崩溃
```

本版把编辑链和创建链统一到完整 `ThinkSettings`。

## 仍保留的兼容

旧记录中可能有：

```text
模板来源::override
模板ID::ovr_xxx
```

编辑态仍然会优先通过旧 override 找回原 block 和 theme，避免旧记录编辑时误判成其他核心 block。

## 已通过 gate

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
```

## 本地还需验证

当前容器缺少完整 `node_modules`，无法执行完整 typecheck/build。请本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 建议人工验证路径

1. 打开已有任务记录，确认编辑弹窗不再报 `blocks`。
2. 打开旧 `模板来源::override` 的记录，确认能回填内容和字段。
3. 编辑保存后确认仍写回原位置，不跳文件。
4. 新建 task，确认输出仍是合法 `- [ ]` 或 `- [x]` 任务格式。
