# 统一输入改造 Batch 2 实施报告

## 1. 本批范围

严格按要求执行：

- **只做 record 域**
- **不扩到 settings / theme / layout / view 配置域**
- **不先全量纯化 service 内副作用**
- **不回退 Batch 1 已完成的 QuickInput create/edit 主链**

本批目标：把剩余 record 动作统一收口到 `recordInput.usecase`。

覆盖的旧链：

1. `AiBatchConfirmModal -> InputService.executeTemplate`
2. `TimerService.createNewTaskAndStart -> InputService.executeTemplate`
3. `LayoutRenderer -> ItemService.completeItem`
4. `LayoutRenderer -> ItemService.updateItemTime`
5. `TimerService.stopAndApply -> ItemService.completeItem / updateItemTime`
6. `submitDeleteRecord` 预留实现 -> **真实底层实现**

---

## 2. 本批文件改动清单

### 新增文件

本批 **无新增文件**。

### 修改文件

1. `app/usecases/recordInput.usecase.ts`
2. `app/usecases/index.ts`
3. `app/bootstrap/initializeCore.ts`
4. `app/bootstrap/loadTimerServices.ts`
5. `core/services/InputService.ts`
6. `core/types/recordInput.ts`
7. `core/types/quickInput.ts`
8. `features/settings/LayoutRenderer.tsx`
9. `features/timer/TimerService.ts`
10. `platform/modals/AiBatchConfirmModal.tsx`
11. `platform/modals/QuickInputModal.tsx`

---

## 3. 这批实际落地的动作接口签名

## 3.1 `recordInput.usecase` 对外接口

```ts
prepareCreateRecord(params: PrepareCreateRecordParams): PreparedCreateRecord
prepareEditRecord(params: PrepareEditRecordParams): PreparedEditRecord

submitCreateRecord(params: SubmitCreateRecordParams): Promise<RecordSubmitResult>
submitUpdateRecord(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult>
submitDeleteRecord(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult>
submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult>
submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult>
```

## 3.2 本批贴仓调整后的关键参数签名

### `SubmitCreateRecordParams`

```ts
interface SubmitCreateRecordParams {
  blockId: string;
  themeId?: string | null;
  formData: Record<string, unknown>;
  context?: Record<string, unknown>;
  signal?: AbortSignal;
  source?: 'quickinput' | 'ai_batch' | 'timer' | 'unknown' | 'view_quick_create';
}
```

### `SubmitCompleteRecordParams`

> 为了让 `TimerService.stopAndApply` 不再绕过 usecase，实际落地时增加了 `options`。

```ts
interface SubmitCompleteRecordParams {
  itemId: string;
  options?: {
    duration?: number;
    startTime?: string | null;
    endTime?: string | null;
  };
  signal?: AbortSignal;
  source?: 'timer' | 'layout_renderer' | 'unknown';
}
```

### `SubmitUpdateRecordTimeParams`

> 为了和现有 timeline / edit-task UI 的真实 payload 对齐，实际落地时兼容了 `time/endTime` 与 `start/end` 两套键名。

```ts
interface SubmitUpdateRecordTimeParams {
  itemId: string;
  updates: {
    time?: string | null;
    start?: string | null;
    endTime?: string | null;
    end?: string | null;
    duration?: number | string | null;
    date?: string | null;
  };
  signal?: AbortSignal;
  source?: 'timer' | 'layout_renderer' | 'unknown';
}
```

### `QuickInputSaveData`

> Batch 2 中，保留 `QuickInputModal -> TimerService` 兼容回调形态，但把 payload 改成**record-oriented**，不再要求 TimerService 依赖 template/theme 对象直接落盘。

```ts
interface QuickInputSaveData {
  blockId?: string;
  themeId?: string | null;
  context?: Record<string, any>;
  formData: Record<string, any>;
  source?: 'timer' | 'quickinput' | 'unknown';

  // 兼容保留字段
  template?: BlockTemplate;
  theme?: ThemeDefinition;
  templateId?: string | null;
  templateSourceType?: 'block' | 'override' | null;
}
```

---

## 4. 每个动作的实际落地方式

## 4.1 `submitCreateRecord(...)`

### 已完成的能力

- 统一走 `RecordInputKernel.resolve/normalize/validate`
- 通过 `InputService.previewTemplateExecution(...)` 预计算目标文件与输出文本
- 写入后扫描目标文件
- 返回统一 `RecordSubmitResult`
- 尝试定位新建记录，回填：
  - `affectedPath`
  - `affectedRecordId`
  - `followUp.startTimerForRecordId`（仅当定位到 task 时）

### 本批新增的关键点

为了满足 `Timer create` 不再靠“猜最新 item”，本批新增了：

- `InputService.previewTemplateExecution(...)`
- `RecordInputUseCase.locateCreatedRecord(...)`

定位策略不是“取扫描结果最后一条”，而是：

1. 先取目标文件写入前的旧 items 快照
2. 写入并扫描目标文件
3. 用**签名差异 + 模板/内容/字段评分**定位新建记录
4. 成功时返回 `affectedRecordId`，若是 task 再返回 `followUp.startTimerForRecordId`

---

## 4.2 `submitDeleteRecord(...)`

### 已完成的能力

- 不再是 placeholder
- 真正调用底层删除实现
- 返回统一 `RecordSubmitResult`

### 底层实现

- 在 `InputService` 中新增 `deleteExistingRecord(item, signal?)`
- task：删除单行
- block：删除从起始行到 `<!-- end -->` 的整段
- 删除后沿用现有 service 内部 `scan + notify`

### 当前状态

- **底层动作已接好**
- **本批未把所有删除 UI 接进来**
- 满足你的要求：先把底层动作和结果模型接实，再逐步迁 UI

---

## 4.3 `submitCompleteRecord(...)`

### 已完成的能力

- 不再是 placeholder
- 调用 `ItemService.completeItem(...)`
- 支持两种调用语义：
  - 普通完成（LayoutRenderer 勾选）
  - 带 duration/start/end 的计时完成（Timer finish）
- 返回统一 `RecordSubmitResult`

### 当前调用方

- `LayoutRenderer.handleMarkItemDone`
- `TimerService.stopAndApply`（open task 分支）

---

## 4.4 `submitUpdateRecordTime(...)`

### 已完成的能力

- 不再是 placeholder
- 调用 `ItemService.updateItemTime(...)`
- 兼容 timeline / modal 现有 `time/endTime/duration` payload
- 对 `duration` 做统一数值化校验
- 返回统一 `RecordSubmitResult`

### 当前调用方

- `LayoutRenderer -> onUpdateTaskTime`
- `TimerService.stopAndApply`（非 open task 分支）

---

## 5. Batch 2 调用侧迁移结果

## 5.1 AI batch

### 旧链

`AiBatchConfirmModal -> InputService.executeTemplate`

### 新链

`AiBatchConfirmModal -> useCases.recordInput.submitCreateRecord(...)`

### 实际改动

- 单条保存：改为读取 `RecordSubmitResult`
- 全部保存：循环调用 `submitCreateRecord(...)`
- 在 modal 内新增了一个**批量汇总结果**逻辑：
  - 全成功 -> `success`
  - 全失败 -> `error`
  - 部分成功 -> `partial_success`

### 保留的旧交互

- 左侧逐条切换
- 当前条编辑
- 当前条保存 / 跳过
- 保存全部
- 最终完成统计

---

## 5.2 Timer create

### 旧链

`QuickInputModal(onSave) -> TimerService.createNewTaskAndStart -> InputService.executeTemplate`

### 新链

`QuickInputModal(onSave) -> TimerService.createNewTaskAndStart -> useCases.recordInput.submitCreateRecord(...)`

### 实际改动

- `QuickInputModal` 的 timer 回调 payload 改为 record-oriented：`blockId/themeId/formData/context`
- `TimerService.createNewTaskAndStart` 改为统一调用 `submitCreateRecord(...)`
- `TimerService` 只在 usecase 返回 `followUp.startTimerForRecordId` 时启动计时
- 不再通过“扫描后猜最后一个 item”来开始计时

### 结果

- 满足“Timer 后续 startOrResume(...) 不再靠猜最新 item”
- QuickInput create/edit 主链没有回退

---

## 5.3 LayoutRenderer complete / time_update

### 旧链

- `LayoutRenderer -> ItemService.completeItem`
- `LayoutRenderer -> ItemService.updateItemTime`

### 新链

- `LayoutRenderer -> useCases.recordInput.submitCompleteRecord(...)`
- `LayoutRenderer -> useCases.recordInput.submitUpdateRecordTime(...)`

### 实际改动

- `onUpdateTaskTime` 改成调用 `recordInput.submitUpdateRecordTime(...)`
- `handleMarkItemDone` 改成调用 `recordInput.submitCompleteRecord(...)`
- shared/ui 仍只拿 handler，不知道底层 service

### 现状说明

- `LayoutRenderer` 仍保留 `itemService` prop 透传形态，以减少本批改动面
- 但**record mutation 已不再从 LayoutRenderer 直连 ItemService**

---

## 5.4 Timer finish

### 旧链

`TimerService.stopAndApply -> ItemService.completeItem / updateItemTime`

### 新链

`TimerService.stopAndApply -> useCases.recordInput.submitCompleteRecord / submitUpdateRecordTime`

### 实际改动

- 仍由 TimerService 负责计算：
  - `totalMinutes`
  - `startTime`
  - `endTime`
- 但真正的 record mutation 已统一交给 usecase
- TimerService 只负责：
  - 选择 complete 还是 time_update
  - 读取 `RecordSubmitResult`
  - 通知 UI
  - 清理 timer state

---

## 6. 哪些旧直连已经断开

| 旧直连 | 当前状态 | 新落点 |
|---|---|---|
| `AiBatchConfirmModal -> InputService.executeTemplate` | **已断开** | `useCases.recordInput.submitCreateRecord(...)` |
| `TimerService.createNewTaskAndStart -> InputService.executeTemplate` | **已断开** | `useCases.recordInput.submitCreateRecord(...)` |
| `LayoutRenderer -> ItemService.completeItem` | **已断开** | `useCases.recordInput.submitCompleteRecord(...)` |
| `LayoutRenderer -> ItemService.updateItemTime` | **已断开** | `useCases.recordInput.submitUpdateRecordTime(...)` |
| `TimerService.stopAndApply -> ItemService.completeItem` | **已断开** | `useCases.recordInput.submitCompleteRecord(...)` |
| `TimerService.stopAndApply -> ItemService.updateItemTime` | **已断开** | `useCases.recordInput.submitUpdateRecordTime(...)` |
| `QuickInputModal(create/edit) -> InputService` | **保持 Batch 1 已断开** | `useCases.recordInput.submitCreateRecord/submitUpdateRecord(...)` |

### 核对结果

本批满足：

- **没有新增任何新的 UI -> InputService 直连**
- **没有新增任何新的 UI/feature -> ItemService 直连**
- **QuickInput Batch 1 主链未回退**

---

## 7. 兼容策略

## 7.1 QuickInput timer 兼容口保留

本批没有直接删除 `QuickInputModal.onSave` 兼容口，而是把它改成：

- 仍保留 `QuickInputModal -> TimerService` 这条 UI 协调关系
- 但 payload 不再偏向模板执行，而改成 **record 提交参数**

这样做的好处：

- 不需要在本批把 Timer UI 和 QuickInput UI 一次性重构掉
- 能保持小步迁移
- 又能让真正的写动作收口到 usecase

## 7.2 `QuickInputSaveData` 向后兼容

- 新增 `blockId/themeId/context/source`
- 旧的 `template/theme/templateId/templateSourceType` 先保留为 optional
- 避免其它潜在调用点被立刻打断

## 7.3 service 内副作用不先抽干

严格按约束执行：

- `submitCreateRecord` 仍在 usecase 做 `scan + notify`
- `InputService.updateExistingRecord/deleteExistingRecord` 仍保留内部 `scan + notify`
- `ItemService.completeItem/updateItemTime` 仍保留内部 `scan + notify`

本批只保证：**新增动作链收口到 usecase**，不做全量副作用纯化。

## 7.4 LayoutRenderer 最小改动

- `itemService` prop 还保留
- 但 mutation handler 已切到 `recordInput.usecase`
- 这样既断开旧直连，又避免 Renderer/Module 层级大面积连锁改动

---

## 8. 风险点

## 8.1 新建记录定位是“稳健启发式”，不是强事务 ID

为了让 Timer create 不再猜“最新 item”，本批新增了定位逻辑；
但当前底层并没有“create 返回稳定 recordId”的事务能力，所以现在仍是：

- 旧快照 vs 新扫描差异
- 配合模板/内容/字段评分定位

### 风险

如果出现“**同文件同 header 下创建一条与已有记录几乎完全相同的记录**”，定位可能仍有歧义。

### 现状判断

这已经明显优于“直接猜最后一条”，但还不是最终态。

---

## 8.2 create 的 abort 仍是 best-effort

本批虽然在 `submitCreateRecord(...)` 中保留了 `AbortSignal` 检查，但：

- `InputService.executeTemplate(...)` 仍不接 `signal`
- 所以 create 无法像 edit 一样做到 service 级中断

### 现状

- 提交前 / 提交后仍会检查 abort
- 但写盘动作开始后不能中断

---

## 8.3 副作用仍分散在 usecase / InputService / ItemService

这批是刻意接受的技术债，不是漏改。

### 当前分布

- create：usecase 负责 scan/notify
- update/delete：`InputService` 内负责 scan/notify
- complete/time_update：`ItemService` 内负责 scan/notify

### 含义

- 动作入口已统一
- 但副作用归属还没有完全统一

这符合你给的硬约束：**本批先收动作，不先抽干副作用**。

---

## 8.4 AI batch 保存全部仍是逐条 scan/notify

本批没有引入“批量事务 / 批量延迟刷新”。

### 影响

- 保存全部时会一条条调用 `submitCreateRecord(...)`
- 每条记录仍可能触发自己的 scan/notify

### 这是有意保留

因为你明确要求：本批不要顺手重构 DataStore / VaultWatcher / service side effects。

---

## 8.5 Timer create 仍是“提交后立即关闭 modal”

`QuickInputModal` 的 onSave 兼容口保留，所以 timer quick-create 仍是：

1. modal 提交
2. 立即关闭
3. TimerService 异步调用 usecase
4. 成功或失败后再弹 Notice

### 风险

- 失败时不会把 modal 保持在原地
- 交互上仍是“close-first”

### 这也是本批有意保留

因为本批目标是**动作收口**，不是重做 timer quick-create UX。

---

## 9. Batch 2 验收表

| 验收项 | 结果 | 说明 |
|---|---|---|
| `AiBatchConfirmModal` 不再直调 `InputService` | **通过** | 已切到 `useCases.recordInput.submitCreateRecord(...)` |
| `TimerService.createNewTaskAndStart` 不再直调 `InputService` | **通过** | 已切到 `submitCreateRecord(...)` |
| `LayoutRenderer` 不再直调 `ItemService.completeItem/updateItemTime` | **通过** | 已切到 `submitCompleteRecord(...) / submitUpdateRecordTime(...)` |
| `TimerService.stopAndApply` 不再直调 `ItemService.completeItem/updateItemTime` | **通过** | 已切到统一动作 |
| `submitDeleteRecord` 已接真实底层动作 | **通过** | 已接 `InputService.deleteExistingRecord(...)` |
| `submitCompleteRecord` 已接真实底层动作 | **通过** | 已接 `ItemService.completeItem(...)` |
| `submitUpdateRecordTime` 已接真实底层动作 | **通过** | 已接 `ItemService.updateItemTime(...)` |
| QuickInput Batch 1 主链未回退 | **通过** | create/edit 仍走 `recordInput.usecase` |
| 未顺手扩到 settings / layout / view 配置域 | **通过** | 未迁配置域写链 |
| 未顺手重构整个 DataStore / VaultWatcher | **通过** | 本批未碰 |
| 未一次性抽干 service 内 scan/notify | **通过** | 保持现状，仅动作收口 |

---

## 10. 建议的 Batch 3 前置核对

这不是重开总方案，只是基于当前代码状态的下一步建议：

1. 把 `delete` 的实际 UI 入口逐步接到 `submitDeleteRecord(...)`
2. 评估是否给 create/update/delete/complete/time_update 建立统一副作用归属
3. 评估是否给 create 引入真正稳定的 `createdRecordLocator` / transaction id
4. 修正 `TimerRow` 那类“按钮文案是编辑，实际不一定是 edit mode”的入口语义

---

## 11. 本批一句话结论

**Batch 2 已完成“剩余 record 动作收口”的第一版落地。**

现在 record 域的 create / update / delete / complete / time_update 都已经有统一的 usecase 落点；
AI batch、Timer create、LayoutRenderer、Timer finish 这几条旧直连都已断开；
同时仍遵守了“小步迁移、不扩配置域、不先抽干副作用”的约束。
