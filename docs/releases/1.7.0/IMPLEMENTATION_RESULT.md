# ThinkOS 1.7.0 Record Continuation — 实施结果

> 基线：1.6.0 代码快照  
> 本次落地：P0 + P1 + P2  
> 明确未落地：P3 RecordRelation 持久化、P4 Relation Read UI、P6 Whiteboard Projection

## 1. 本次真正完成的闭环

当用户通过 QuickInput（包括 Timeline 打开的 QuickInput）创建一条 **已完成 Task**，或在 QuickInput 的任务生命周期操作里把已有 Task 标记为完成时：

1. Task 先按原流程正常持久化并 refresh。
2. `RecordInputUseCase` 从 `DataStore` 读取 refresh 后的 canonical Record。
3. 纯 Policy 检查：
   - Record 是 `task`；
   - 状态是 `done`；
   - 有 `goalPath`；
   - 同一 Goal 存在启用的 `core.habit` GoalTemplate。
4. 条件满足时返回 `RecordSubmitResult.followUp.suggestedCreate`。
5. QuickInput 不自动生成 Habit，而进入 Continue 状态，展示「记录{叶子目标}打卡 / 完成」。
6. 用户点「记录…打卡」后，当前 QuickInput 关闭，再打开一个新的 Habit QuickInput：
   - RecordType 固定为 `core.habit`；
   - Goal 预填来源 Task 的 Goal；
   - 日期预填 Task 的完成日期；
   - 评分/内容继续由用户真实填写。
7. 用户点「完成」或取消新的 Habit QuickInput，不产生任何占位 Relation。

## 2. 边界如何落在代码里

| 边界 | Owner | 本次实现 |
|---|---|---|
| “该不该建议打卡” | Core / RecordInput Policy | `resolveTaskCompletionCheckinFollowUp()` |
| 保存后把建议挂到结果上 | Application / UseCase | `RecordInputUseCase.attachTaskCompletionCheckinFollowUp()` |
| “怎么打开下一条记录” | App action + ModalPort | `openSuggestedRecordCreateFollowUp()` + `QuickInputOpenOptions` |
| 成功后的继续界面 | QuickInput Feature | `QuickInputContinuationPanel` + `useQuickInputContinuation` |
| Relation 业务事实 | **未进入本版** | 只携带 `__recordContinuation` 上下文，不持久化 Relation |
| Whiteboard | **未进入本版** | 零改动 |

## 3. 关键代码改动

### Core Contract / Policy

- `src/core/types/recordInput.ts`
  - 新增 `RecordContinuationContext`、`SuggestedRecordCreateFollowUp`。
  - `RecordSubmitResult.followUp` 在既有 `startTimerForRecordId` 旁新增 `suggestedCreate`，两者可以共存。
- `src/core/recordInput/followUp/taskCompletionCheckin.ts`
  - 新增纯 Policy。
  - 不 import UI，不打开 Modal，不写 Relation。
  - 不硬编码“睡眠”“运动”等 Goal 名称。
- `src/core/recordInput/public.ts`
  - 从 RecordInput public facade 暴露 Policy。

### Application wiring

- `src/app/usecases/recordInput.usecase.ts`
  - `submitCreateRecord()`：create workflow 成功后 attach FollowUp。
  - `submitCompleteRecord()`：complete mutation 成功并 refresh 后 attach FollowUp。
  - FollowUp 判断只看 refresh 后 canonical Record + Settings。
- `src/app/actions/recordCreate/followUpCreateAction.ts`
  - 新增共享 UI/application bridge，只负责消费合同并打开下一次 QuickInput。
  - 不重新判断 Goal/Habit 业务规则。
- `src/app/actions/recordCreate/index.ts`
- `src/app/actions/recordUiActions.ts`
- `src/app/public.ts`
  - 补齐 public export 链。

### Modal boundary

- `src/core/ports/ModalPort.ts`
  - `openQuickInput` 新增可选 `QuickInputOpenOptions`：`context`、`allowRecordTypeSwitch`、`source`。
- `src/platform/obsidian/ObsidianModalPort.ts`
  - Obsidian adapter 把这些参数传给现有 `QuickInputModal`。

### QuickInput UI

- `src/features/quickinput/modal/useQuickInputSubmit.ts`
  - create 成功且有 actionable FollowUp 时不立即关闭 Modal。
  - Continue panel 已出现时抑制重复成功 Toast；错误/警告仍照常显示。
- `src/features/quickinput/modal/useQuickInputContinuation.ts`
  - 管理 post-submit continuation state。
  - 用户继续时先关闭来源 Modal，再打开新的 Habit QuickInput，避免 Modal 叠层。
- `src/features/quickinput/modal/QuickInputContinuationPanel.tsx`
  - 纯展示「已记录 / 基于 Goal / 建议继续记录 / 两个动作」。
- `src/features/quickinput/modal/QuickInputModalContent.tsx`
  - create flow 与已有 Task 生命周期 complete flow 都可展示同一个 Continue panel。
- `src/styles/features/quick-input-continuation.css` + `src/styles/main.css`
  - 新增独立 QuickInput continuation 样式源文件，并接入主样式入口，避免继续膨胀已有 471 行的 `quick-input-editor.css`。
- `styles.css`
  - 同步当前构建产物样式，便于现有源码快照直接对比；正式 build 时由 Vite 从 `src/styles/main.css` 重新生成。

## 4. 当前数据合同

```ts
RecordSubmitResult.followUp = {
  startTimerForRecordId?: string;
  suggestedCreate?: {
    kind: 'create_record';
    reason: 'task_completion_checkin';
    label: string;
    recordTypeId: 'core.habit';
    context: {
      goalPath: string;
      date?: string;
      __recordContinuation: {
        sourceRecordId: string;
        reason: 'task_completion_checkin';
        relationType: 'checkin';
        expectedGoalPath: string;
      };
    };
    allowRecordTypeSwitch: false;
  };
}
```

`__recordContinuation` 目前只作为未来 P3 的可靠上下文传递，不是普通 Record 字段，也不代表 Relation 已经存在。

## 5. 第一版故意没有做什么

1. **没有 RecordRelation 存储。** Habit 成功保存后，目前还不会写 `Task --checkin--> Habit`。
2. **没有改 Whiteboard。** 白板仍只拥有空间状态和 `WhiteboardEdge`。
3. **没有做万能自动化规则。** 当前只有一个明确 Policy：done Task → same-Goal Habit suggestion。
4. **没有自动创建 Habit。** 评分等真实信息必须由用户输入。
5. **没有在普通列表的一键完成后强制弹第二个 Modal。** UseCase 已能返回统一 FollowUp 合同，但非 QuickInput Surface 的非侵入式 presenter 放在 P2.5 单独设计，避免把“完成任务”变成强制打断。

## 6. 为什么本版停在这里

这不是技术上做不了更多，而是为了让版本边界保持可验证、可回滚：

- P1/P2 验证的是 **“连续记录是否真的降低记录摩擦”**；
- P3 验证的是 **“关系是否值得成为长期业务事实”**；
- Whiteboard 验证的是 **“如何投影既有事实”**。

把三件事塞进同一版，一旦体验不对，很难判断问题出在 FollowUp、Relation 语义，还是图形展示。

因此 1.7.0 的安全上限定为：**把 Continuation 做成一条真正可走通的竖切，不进入 Relation persistence。**

## 7. 下一阶段入口

P3 开始时直接消费本版已经传递的：

- `sourceRecordId`
- 新建 Habit 的 `affectedRecordId`
- `relationType = checkin`
- `expectedGoalPath`

P3 再解决：幂等、端点校验、删除策略、partial success、Relation query。不要反向把这些职责塞回 QuickInput。
