# ThinkOS 记录连续动作与 Record Relation 设计 / 实施计划

> 基线：ThinkOS 1.6.0 代码；实施目标：ThinkOS 1.7.0  
> 本次交付范围：**P0 边界冻结 + P1 FollowUp Contract/Policy + P2 QuickInput Continue UI。RecordRelation（P3）暂不落存储。**  
> 核心结论：**第一版先做 Record FollowUp（连续动作），第二步再落 RecordRelation（业务关系），白板最后只做关系投影。**

## 0. 一页结论

### 产品判断

当前表面问题是“要不要在白板里做关联”，真正的问题是：**Record 保存以后，如何自然地进入下一条有关联的记录，并且让关系独立于任何视图长期存在。**

因此拆成三层：

1. **Continuation / FollowUp**：A 保存完成后，系统建议下一步记录 B。
2. **RecordRelation**：A、B 都真实存在后，保存它们之间的业务关系。
3. **Projection**：Timeline / List / Whiteboard 读取关系并展示，不拥有关系。

### 第一条闭环

`完成 Task（睡眠/运动） → 检查同 Goal 是否存在启用 Habit 模板 → 提示“记录打卡” → 打开 Habit QuickInput（Goal/日期预填） → 用户填写评分 → 保存 Habit → 建立 Task --checkin--> Habit`

### 第一版明确不做

- 不把 WhiteboardEdge 当业务 Relation。
- 不让用户先配置“睡眠 Task → 睡眠 Habit”的映射。
- 不自动创建 Habit；用户必须填写真实评分/内容。
- 不做“任意 RecordType 自动关联任意 RecordType”的规则编辑器。
- 不做 AI 猜测关系。
- 不做复杂图谱、关系筛选器或白板自动布局。

---

## 1. XY Problem：我们到底在解决什么

| 层次 | 问题 | 判断 |
|---|---|---|
| Y（表面） | 白板要不要做连线关联？ | 暂时不是核心 |
| X（真实） | 一条记录完成后，如何低摩擦地产生下一条相关记录？ | 第一优先级 |
| X（长期） | 两条记录的关系如何脱离 UI / 白板长期存在？ | 第二优先级 |
| X（回看） | Timeline / Review / Whiteboard 如何读取并解释这些关系？ | 第三优先级 |

产品目标不是“做一个图谱”，而是**让记录形成连续的事实链**：行动 → 打卡/感受 → 思考 → 总结。

---

## 2. 架构边界（必须守住）

| 层 | 拥有什么 | 绝对不拥有什么 |
|---|---|---|
| Record / Domain | 事实、稳定 Record ID、Relation 语义 | Modal、Toast、白板坐标 |
| RecordInput / Application | 保存编排、完成后 FollowUp 决策、Relation 建立编排 | 具体按钮布局、白板 itemId |
| GoalTemplate | “这个 Goal 能否创建这种 RecordType” | “两个已存在 Record 是否有关联” |
| QuickInput UI | 展示建议、预填、让用户补齐真实数据 | 猜测评分、自动伪造 Habit |
| Timeline / List | 触发完成、展示关系入口 | 成为关系真源 |
| Whiteboard | Record 的空间 Projection、手工视觉线、系统关系投影 | 业务 Relation 真源 |

### 三条硬规则

1. **删除整个白板，RecordRelation 仍然存在。**
2. **同 Goal 是 FollowUp 的自动建议条件，不是通用 Relation 的永久约束。**
3. **只有两个真实 Record 都保存成功后，才允许建立 Relation。**

---

## 3. 现有代码里已经具备的基础

- `RecordSubmitResult.followUp.startTimerForRecordId` 已经证明“保存结果携带后续动作”这条边界可行。
- `CreateRecordWorkflow` 只给新建的 open Task 返回启动计时 FollowUp；历史 completed Task 不会误启动 Timer。
- `TaskRuntimeUseCase` 已经是 Task 生命周期统一应用边界，UI 不应自己重建 Task/Timer 上下文。
- `getCreateEligibleGoalPaths(settings, recordTypeId)` 已经能回答“同 Goal 是否有启用的 Habit 模板”。
- QuickInput 的 `context` 已经能给 Goal 和 date 字段做 seed；这正适合 FollowUp 预填。
- `TaskSessionMutation.linkEnergySnapshot()` 已经存在“稳定 Record ID 建立业务关联”的先例。
- WhiteboardStore 明确只保存 canonical Record ID 与白板空间状态；`WhiteboardEdge` 连接的是 `itemId`，所以不能直接升级成业务 Relation。

---

## 4. V1 用户流程

### 4.1 从 QuickInput / Timeline 补录“已完成任务”

1. 用户创建 `Task`，Goal=`照顾好自己/睡眠`，状态=`done`。
2. Task 正常保存，先不改变原有持久化流程。
3. Application 层在保存后读取刚创建的 Task。
4. FollowUp Policy 判断：
   - recordType = task
   - status = done
   - goalPath 非空
   - 同 goalPath 存在启用 `core.habit` GoalTemplate
5. 返回 `suggestedCreate(core.habit)`。
6. QuickInput 不立即关闭，进入轻量 Success / Continue 状态：
   - `✅ 已记录「睡觉」`
   - `💚 记录睡眠打卡`
   - `[记录睡眠打卡] [完成]`
7. 点击“记录睡眠打卡”：打开新的 Habit QuickInput，RecordType 固定，Goal/日期预填。
8. 用户填写评分，保存 Habit。
9. Relation 阶段启用后：成功建立 `Task --checkin--> Habit`。

### 4.2 用户取消 FollowUp

- Task 已经成功保存。
- 不创建 Habit。
- 不创建空 Relation / pending Relation。
- 不把“取消后续记录”视作错误。

### 4.3 Habit 保存失败

- Task 保留。
- Habit 不存在，因此 Relation 不存在。
- 用户留在 Habit QuickInput 修正错误。

### 4.4 Habit 保存成功但 Relation 保存失败（Relation 阶段）

- Task 和 Habit 都保留，不回滚真实事实。
- 返回 `partial_success`：`打卡已记录，但关联未建立`。
- Relation 创建必须幂等，允许以后重试。

---

## 5. FollowUp 合同设计

建议继续复用现有 `RecordSubmitResult.followUp`，不要另建 EventBus。

```ts
export interface SuggestedRecordCreateFollowUp {
  kind: 'create_record';
  reason: 'task_completion_checkin';
  label: string; // 例如：记录睡眠打卡
  recordTypeId: 'core.habit';
  context: Record<string, unknown>;
  allowRecordTypeSwitch: false;
}

export interface RecordSubmitResult {
  // existing fields...
  followUp?: {
    startTimerForRecordId?: string;
    suggestedCreate?: SuggestedRecordCreateFollowUp;
  };
}
```

FollowUp 的 `context` 建议包含：

```ts
{
  goalPath: '照顾好自己/睡眠',
  date: '2026-09-14',
  __recordContinuation: {
    sourceRecordId: 'task_xxx',
    reason: 'task_completion_checkin',
    relationType: 'checkin',
    expectedGoalPath: '照顾好自己/睡眠'
  }
}
```

`__recordContinuation` 是系统上下文，不是用户字段，不写入普通 Record 字段。

### 日期规则

自动建议 Habit 的日期按以下优先级派生：

`Task.completedAt 的本地日期 > Task.date > 当前日期`

Timeline 的 completed execution 已经会把实际结束时间写入完成事实，所以能自然得到正确日期。

---

## 6. FollowUp Policy：规则应该放在哪里

新增纯函数，例如：

`src/core/recordInput/followUp/taskCompletionCheckin.ts`

职责只有一个：**输入已保存 Record + Settings，输出是否有 SuggestedRecordCreateFollowUp。**

它不打开 Modal，不写 Relation，不发 Notice。

伪代码：

```ts
resolveTaskCompletionCheckinFollowUp({ record, settings }) {
  if (record.recordType !== 'task') return null;
  if (record.status !== 'done') return null;
  if (!record.goalPath) return null;

  const eligible = getCreateEligibleGoalPaths(settings, 'core.habit');
  if (!eligible.includes(record.goalPath)) return null;

  return buildHabitSuggestion(record);
}
```

### Application 编排位置

`RecordInputUseCase` 在两个入口统一附加 FollowUp：

1. `submitCreateRecord()`：覆盖 QuickInput / Timeline 新建 completed Task。
2. `submitCompleteRecord()`：覆盖已存在 Task 被真正完成。

两条路径都必须在**持久化 + refresh 成功以后**读取 canonical Record 再做 FollowUp 判断；不要用提交前 draft 猜。

`CreateRecordWorkflow.buildCreateRecordFollowUp()` 继续只负责现有“open Task → startTimer”逻辑；新的 checkin FollowUp 在 UseCase 层 merge，避免 Workflow 读取 App Store Settings。

---

## 7. QuickInput UI 设计

### 当前表单不要加“关联”配置

当前 QuickInput 已经承担：记录类型、Goal、状态、内容、重复、时长等。V1 不新增“关联到…”字段。

### 保存后的 Continue 状态

```text
✅ 已记录「睡觉」
基于：照顾好自己 / 睡眠

💚 记录睡眠打卡

[记录睡眠打卡]          [完成]
```

### 打开 Habit QuickInput 后

- RecordType：固定 `打卡`，不再展示为需要重新决策的类型切换。
- Goal：预选来源 Task 的 goalPath。
- date：预填来源 Task 的完成日期。
- 评分/内容：必须由用户真实输入。
- 用户仍可取消；取消不会留下关系垃圾。

### UI 实现边界

不要把“睡眠/运动判断”写进组件。组件只消费 `result.followUp.suggestedCreate`。

---

## 8. RecordRelation 第二阶段设计

### 推荐模型

Relation 是业务事实，最终建议成为一个内部 canonical Record，而不是新的 `relations.json` 业务真源。

```ts
RecordRelation {
  id: string;
  recordType: 'record-relation';
  fromRecordId: string;
  toRecordId: string;
  relationType: 'checkin' | 'summarized_by';
  createdAt: string;
  source: 'workflow' | 'manual';
}
```

### 语义约束

- 唯一键：`fromRecordId + toRecordId + relationType`，重复创建视为 no-op。
- from / to 必须都是稳定 Record ID；禁止保存 Whiteboard itemId、文件行号等易变引用。
- `checkin`：Task → Habit。
- `summarized_by`：Thought → Review。
- Relation 不复制 Goal；Goal 是端点 Record 自己的事实。
- 自动 `checkin` 建立时再次校验：来源仍是 done Task、目标仍是 Habit、expectedGoalPath 仍匹配；不匹配则 Habit 正常保存但不自动连线。
- 删除任一端点时只级联删除 Relation Edge，不级联删除另一条业务 Record。

### 为什么不是 WhiteboardEdge

WhiteboardEdge 当前连接 `fromItemId / toItemId`，属于某个 board 的空间状态。业务 Relation 必须在没有白板时仍成立，因此两个模型保持分离。

---

## 9. Thought → Review 的设计（后续，不照搬 Task → Habit）

Task → Habit 是“保存 A 后马上建议 B”。

Thought → Review 更适合“创建 Review 时反向聚合候选来源”：

1. 用户创建周总结 / 月总结。
2. 系统按 Review 的周期 + Goal 查询 Thought。
3. 显示候选 Thought 多选列表。
4. 用户选择真正进入本次总结的 Thought。
5. Review 保存后批量创建 `Thought --summarized_by--> Review`。

这样不会在每写一条 Thought 后都烦用户“要不要总结”。

---

## 10. Whiteboard 最后怎么接

未来白板同时存在两类 Edge：

1. `WhiteboardEdge`：用户手动画的空间/思考线，只属于 board。
2. `Derived Relation Edge`：从 RecordRelation 查询得到，不写入 WhiteboardStore。

当 A、B 两个 Record 都在当前白板时，如果存在 RecordRelation，UI 可以绘制系统关系线。删除白板卡片只删除 Projection，不删除 Relation。

可选的后续动作：用户手动画线后提供“仅保留白板连线 / 保存为记录关系”，但这不是 V1。

---

## 11. 完整实施计划

| 阶段 | 目标 | 主要改动 | 验收标准 | 是否进入首版 |
|---|---|---|---|---|
| P0 冻结边界 | 写清 Continuation ≠ Relation ≠ Whiteboard | 设计文档、测试清单 | 团队代码评审能用边界判断放置逻辑 | 是 |
| P1 FollowUp Contract | 完成 Task 后能返回 Habit 建议 | 扩展 RecordSubmitResult；纯 Policy；UseCase merge | create-done 与 complete-existing 都返回同一建议 | 是 |
| P2 QuickInput Continue UI | 用户一键进入 Habit 录入 | Success/Continue panel；预填 goal/date；固定类型 | 不自动打卡；取消无副作用 | 是 |
| P2.5 其他入口复用 | Timeline/普通视图可消费同一结果 | Shared follow-up presenter / view action bridge | UI 不重复业务判断 | 首版后半 |
| P3 RecordRelation Foundation | Habit 保存后形成稳定关系 | 内部 relation record、repository/service、幂等创建 | Task/Habit 删除、重试、重复创建行为明确 | 第二步 |
| P4 Relation Read UI | 能看见“关联 1”及来源/去向 | relation query + detail entry | 不依赖白板也能查看 | 第二步 |
| P5 Thought → Review | 验证第二种关系形态 | Review candidate aggregation + batch relation | 一对多来源可正确追溯 | 后续 |
| P6 Whiteboard Projection | 把已有关系画出来 | derived edge layer | 白板删卡不损坏 Relation | 后续 |

---

## 12. P1/P2 精确代码改动表

| 文件 / 新模块 | 改动 | 边界说明 |
|---|---|---|
| `src/core/types/recordInput.ts` | 新增 `SuggestedRecordCreateFollowUp`；扩展 `RecordSubmitResult.followUp` | 只定义跨层合同 |
| `src/core/recordInput/followUp/taskCompletionCheckin.ts`（新） | 纯 Policy；检查 done Task、Goal、Habit 可创建性、构建 context | 不 import UI / app store |
| `src/core/recordInput/public.ts` | export FollowUp 类型/Policy | 维持 public API |
| `src/app/usecases/recordInput.usecase.ts` | 在 create / complete 成功 refresh 后读取 canonical Record，merge suggestedCreate | Application orchestration owner |
| `src/app/usecases/recordInput/workflows/CreateRecordWorkflow.ts` | 保留 open Task timer FollowUp；仅适配新类型 | 不把 Goal Settings 塞进 workflow |
| `src/features/quickinput/modal/useQuickInputSubmit.ts` | 成功后若有 actionable FollowUp，不立即 close；通知 Content | 不判断睡眠/运动 |
| `src/features/quickinput/modal/QuickInputModalContent.tsx` | 管理 post-submit continuation state | UI state only |
| `src/features/quickinput/modal/QuickInputContinuationPanel.tsx`（新） | 渲染“记录打卡 / 完成” | 纯展示与用户动作 |
| `src/core/ports/ModalPort.ts` / Obsidian adapter | 让 `openQuickInput` 支持 context + allowRecordTypeSwitch | 平台负责开 Modal，不把 Obsidian 传进 core |
| `test/unit/taskCompletionCheckinFollowUp.test.ts`（新） | Policy 单测 | 先锁业务规则 |
| `test/unit/recordInput...` | create/complete integration | 锁两个入口一致性 |
| QuickInput UI tests | success panel / cancel / seed | 锁交互，不靠人工回归 |

---

## 13. 测试矩阵

| Case | 期望 |
|---|---|
| done Task + 同 Goal 启用 Habit 模板 | 返回“记录打卡” FollowUp |
| open Task + Habit 模板 | 仍只保留现有 startTimer；不建议打卡 |
| done Task + 无 Goal | 无打卡建议 |
| done Task + 同 Goal 无 Habit 模板 | 无打卡建议 |
| Habit GoalTemplate disabled | 无打卡建议 |
| Timeline completed execution | Habit date = Task 完成/结束日期 |
| 已存在 Task 从 View/QuickInput 完成 | 与新建 done Task 返回相同 FollowUp 合同 |
| 周期 Task 完成 | FollowUp 指向已完成的当前实例，不指向新生成下一实例 |
| 用户点“完成”关闭 Continue | 不创建 Habit / Relation |
| 用户打开 Habit 后取消 | 不创建 Habit / Relation |
| 用户修改 Habit Goal | Habit 可保存；自动 Relation 不建立 |
| Relation 重复提交（P3） | 幂等，不产生重复 Edge |
| Relation 写入失败（P3） | 两个 Record 保留；partial_success，可重试 |
| 删除 Whiteboard card（P6） | Relation 不变化 |

---

## 14. 发布门槛 / Definition of Done

P1/P2 首版只有在以下条件全部满足后才算完成：

1. QuickInput 创建 completed Task 与完成已有 Task 共用同一 FollowUp Policy。
2. Policy 只读取 canonical Record + Settings，不读取组件状态。
3. 没有任何 Goal 名称硬编码（“睡眠”“运动”都只是数据）。
4. 不存在自动生成 Habit 的路径。
5. FollowUp context 能正确 seed Goal + date。
6. open Task 的 `startTimerForRecordId` 既有行为无回归。
7. Timeline historical completed capture 不会启动 Timer。
8. 关键单元测试、RecordInput 回归、architecture gates 通过。
9. WhiteboardStore / WhiteboardEdge 零改动。

---

## 15. 开发顺序（下一步直接照这个做）

### Commit 1 — Contract + Policy
- 扩展 `RecordSubmitResult.followUp`。
- 新增 `resolveTaskCompletionCheckinFollowUp()`。
- 写 Policy 单测。
- 不改 UI。

### Commit 2 — Application wiring
- `submitCreateRecord()` 成功后 attach FollowUp。
- `submitCompleteRecord()` 成功后 attach FollowUp。
- 合并/保留现有 startTimer FollowUp。
- 写集成测试。

### Commit 3 — QuickInput Continue UI
- 新增 Continue panel。
- actionable FollowUp 时不立刻关闭 modal。
- “完成”关闭；“记录打卡”打开 Habit QuickInput。
- 传 `goalPath/date/__recordContinuation`。

### Commit 4 — Entry-point regression
- Timeline historical create。
- existing Task completion。
- recurring Task。
- timer completion。
- mobile / desktop QuickInput 基本回归。

### Commit 5 — 文档与 Release Gate
- 更新 release plan / implementation result / test report。
- 跑 architecture / task / record-platform / quickinput 相关 gates。

**到 Commit 5 为止，先验证“连续记录”是否真的提升使用体验。不要提前写 Relation 存储。**

当这条闭环稳定后，再进入 P3 RecordRelation；这样 Relation 是被真实用户流程拉出来的基础设施，而不是先造一个 Graph System。
