# 统一输入改造实施 - 第 1 批落地报告（record 域 / QuickInput create-edit）

## 1. 本批范围

严格按本批约束落地：

- 只做 **record 域**
- 第 1 批只迁 **QuickInput create / edit**
- 不顺手并入 **ViewInstance / Layout 配置域**
- 不先大改 **InputService / ItemService** 内部既有副作用
- 不做大规模重命名；优先 **小步迁移**
- 每批后补一份“旧入口是否已断开直连”的核对表

## 2. 新增文件清单

### 新增
- `app/usecases/recordInput.usecase.ts`
- `core/types/recordInput.ts`
- `core/services/recordInput/RecordInputKernel.ts`
- `core/services/recordInput/dependencyResolver.ts`
- `core/services/recordInput/editStateResolver.ts`
- `core/services/recordInput/normalization.ts`
- `core/services/recordInput/validation.ts`
- `core/services/recordInput/submitResult.ts`

### 既有文件改动
- `platform/modals/QuickInputModal.tsx`
- `app/usecases/index.ts`
- `app/bootstrap/initializeCore.ts`
- `core/types/index.ts`
- `core/types/schema.ts`

## 3. 实际接口签名

这里是**本次实际落地签名**。为了贴合当前代码结构，`prepare*` 落成了**同步接口**，避免给 `QuickInputModal` 引入额外异步装载状态；`submit*` 仍然是异步。

### `app/usecases/recordInput.usecase.ts`

```ts
export class RecordInputUseCase {
  prepareCreateRecord(params: PrepareCreateRecordParams): PreparedCreateRecord
  prepareEditRecord(params: PrepareEditRecordParams): PreparedEditRecord

  submitCreateRecord(params: SubmitCreateRecordParams): Promise<RecordSubmitResult>
  submitUpdateRecord(params: SubmitUpdateRecordParams): Promise<RecordSubmitResult>

  submitDeleteRecord(params: SubmitDeleteRecordParams): Promise<RecordSubmitResult>
  submitCompleteRecord(params: SubmitCompleteRecordParams): Promise<RecordSubmitResult>
  submitUpdateRecordTime(params: SubmitUpdateRecordTimeParams): Promise<RecordSubmitResult>
}
```

### `core/services/recordInput/RecordInputKernel.ts`

```ts
export class RecordInputKernel {
  constructor(settings: InputSettings)

  prepareCreate(params: PrepareCreateRecordParams): PreparedCreateRecord
  prepareEdit(params: PrepareEditRecordParams): PreparedEditRecord

  resolveMissingDependencies(params: {
    blockId?: string | null
    themeId?: string | null
    item?: Item | null
  }): ResolveDependenciesResult

  normalizeRecordInput(params: NormalizeRecordInputParams): NormalizeRecordInputResult
  validateRecordInput(params: ValidateRecordInputParams): RecordValidationResult
}
```

### 规则模块签名

```ts
export function resolveRecordDependencies(input: DependencyResolverInput): ResolveDependenciesResult
export function buildEditRecordState(input: BuildEditStateInput): PreparedEditRecord
export function normalizeRecordInput(input: NormalizeRecordInputParams): NormalizeRecordInputResult
export function validateRecordInput(input: ValidateRecordInputParams): RecordValidationResult
```

## 4. QuickInputModal 改动点

### 已完成

1. **QuickInputModal 不再直接 import / 调用 `InputService`**
   - create/update 都改为走 `useCases.recordInput.*`

2. **QuickInputModal 不再自己维护 edit 推断 helper**
   - 原来散在 modal 内的：
     - `findThemeIdByPath`
     - `scoreTemplateForItem`
     - `resolveBlockForEdit`
     - `buildInitialFormData`
     - `mapFieldValue`
   - 已迁到：
     - `core/services/recordInput/editStateResolver.ts`
     - `core/services/recordInput/dependencyResolver.ts`

3. **QuickInputModal 不再自己决定 create/edit 的主刷新链**
   - create/edit 提交都改成 usecase 统一提交
   - QuickInputModal 只根据 `RecordSubmitResult` 做：
     - loading
     - success notice
     - error notice
     - close modal

4. **保留 `onSave` 兼容分支**
   - 该分支仍服务于 Timer 的“先收表单数据，再由 TimerService 创建并开计时”旧链
   - 本批没有把 Timer 主链并进来

### 仍刻意保留

- `onSave` 分支仍使用 `finalizeQuickInputFormData(...)`
- 这是兼容策略的一部分，不属于本批 create/edit 统一 submit 主链

## 5. 迁移步骤（实际执行顺序）

### Step A
先建空壳与合同：

- `recordInput.usecase.ts`
- `core/types/recordInput.ts`
- `RecordInputKernel.ts`
- `dependencyResolver.ts`
- `editStateResolver.ts`
- `normalization.ts`
- `validation.ts`
- `submitResult.ts`

### Step B
把 QuickInput edit 解析逻辑从 `QuickInputModal` 抽出：

- block 推断
- theme 推断
- item -> formData 回填
- option/path/rating 的编辑态映射

### Step C
把提交前最终收敛抽到 `normalization.ts`：

- 清理 `lastChanged`
- linked time 最终收敛
- option object/path object 统一

### Step D
把 QuickInputModal 的 create/edit 提交改成统一走：

- `useCases.recordInput.submitCreateRecord(...)`
- `useCases.recordInput.submitUpdateRecord(...)`

### Step E
把 usecase 接入 UseCases 聚合与初始化链：

- `app/usecases/index.ts`
- `app/bootstrap/initializeCore.ts`

## 6. 兼容策略

### 6.1 保留 Timer / AI batch / ItemService 旧链
本批没有改：

- `TimerService.createNewTaskAndStart`
- `AiBatchConfirmModal`
- `ItemService.completeItem / updateItemTime`

这样做是为了守住“**先收口 QuickInput create/edit**”的批次边界。

### 6.2 不先抽干 service 内副作用
本批遵守了“不要先大改所有 service 内副作用”的约束：

- `InputService.updateExistingRecord(...)` 内部原有 `scanFileByPath + notifyChange` 保留
- `submitUpdateRecord(...)` 只统一承接结果对象，不顺手重构 service 纯化

### 6.3 create 链把原先 modal 的 refresh 收口到 usecase
因为 `InputService.executeTemplate(...)` 本身没有 refresh 副作用，所以：

- 原先 QuickInputModal create 路径里的 `scanFileByPath + notifyChange`
- 现在移到 `RecordInputUseCase.submitCreateRecord(...)`

这属于“新增链路收口到 usecase”，不是 service 纯化。

### 6.4 `prepare*` 改成同步
这是唯一较明显的“贴仓调整”：

- 设计草案里 `prepare*` 是 Promise
- 实际代码里为了不引入 modal 异步初始态与闪烁，落成同步

我认为这是安全调整，因为当前 `prepare` 逻辑完全依赖内存中的 settings + item，不需要异步 I/O。

### 6.5 类型兼容小补丁
`core/types/schema.ts` 中给 `TemplateField` 增补了：

- `semanticType?: 'path' | 'ratingPair' | string`
- `auxKey?: string`

这是因为现有代码已经广泛在用这两个字段，只是类型没跟上。这个补丁不改变行为，只补齐 record 域类型合同。

## 7. 风险点

### 7.1 create 的 abort 仍然是 best-effort
本批虽然把 `signal` 贯到了 usecase 入参，但：

- `InputService.executeTemplate(...)` 仍不接收 `AbortSignal`

所以 create 的取消仍然是“调用前 / 调用后可检查”，不是 service 级真中断。

### 7.2 update 的 refresh 仍然部分留在 service 内
本批为了小步迁移，保留了：

- `InputService.updateExistingRecord(...)` 内部 scan/notify

因此当前状态是：

- create：refresh 主协调已进 usecase
- update：结果统一进 usecase，但底层 refresh 仍在 service 内

这是有意的迁移中间态。

### 7.3 `onSave` 分支仍然不是 recordInput submit 主链
`QuickInputModal` 的 `onSave` 分支还在走旧的“返回 `QuickInputSaveData` 给外部”模式。

这意味着：

- QuickInput UI 主壳已经接 usecase
- 但 Timer 的“QuickInput -> TimerService”兼容支路仍然存在

### 7.4 delete / complete / time_update 只做了接口预留
本批为了不扩范围：

- `submitDeleteRecord`
- `submitCompleteRecord`
- `submitUpdateRecordTime`

都只返回“reserved for later batch”错误结果，尚未接真实底层动作。

## 8. 验收点

### 架构验收
- [x] `QuickInputModal` 不再直接 import `InputService`
- [x] `QuickInputModal` 不再直接 import `DataStore`
- [x] `QuickInputModal` create/edit 不再自己调 `executeTemplate/updateExistingRecord`
- [x] `QuickInputModal` 不再保留 edit 推断 helper
- [x] `useCases.recordInput` 已接入 UseCases 聚合

### 行为验收（静态）
- [x] create 提交已改走 `submitCreateRecord(...)`
- [x] edit 提交已改走 `submitUpdateRecord(...)`
- [x] edit 初始态已改走 `prepareEditRecord(...)`
- [x] create 初始态已改走 `prepareCreateRecord(...)`
- [x] QuickInput 成功/失败反馈统一改读 `RecordSubmitResult`

## 9. “旧入口是否已断开直连”核对表（第 1 批）

| 旧入口 / 旧直连 | 状态 | 说明 |
| --- | --- | --- |
| `QuickInputModal -> InputService.executeTemplate` | **已断开** | create 改走 `useCases.recordInput.submitCreateRecord` |
| `QuickInputModal -> InputService.updateExistingRecord` | **已断开** | edit 改走 `useCases.recordInput.submitUpdateRecord` |
| `QuickInputModal -> DataStore.scanFileByPath/notifyChange` | **已断开** | create refresh 改由 usecase 承接 |
| `QuickInputModal` 内部 edit 推断 helper | **已断开** | 已迁到 `editStateResolver` / `dependencyResolver` |
| `QuickInputModal onSave -> QuickInputSaveData` | **保留** | Timer 兼容支路，明确不在第 1 批收口范围 |
| `AiBatchConfirmModal -> InputService` | **保留** | 第 2 批再迁 |
| `TimerService.createNewTaskAndStart -> InputService` | **保留** | 第 2 批再迁 |
| `LayoutRenderer -> ItemService.complete/updateTime` | **保留** | 第 3 批再迁 |
| ViewInstance / Layout 配置域写链 | **未触碰** | 按约束保留原状 |

## 10. 我认为这版的“详尽”交付包括什么

对这类实施落地，我认为“详尽”至少要包括：

1. **文件改动清单**：新增了什么、改了什么
2. **实际接口签名**：不是草案，而是代码最终落成的签名
3. **迁移步骤**：按什么顺序做、每一步动了什么
4. **兼容策略**：哪些旧链故意保留，为什么保留
5. **风险点**：哪些问题还没在这一批解决
6. **核对表**：旧入口是否已经真正断开直连
7. **批次边界说明**：明确哪些东西没动，防止误判“顺手扩范围”

## 11. 输出物

- 修改后的完整源码压缩包
- 本实施报告
