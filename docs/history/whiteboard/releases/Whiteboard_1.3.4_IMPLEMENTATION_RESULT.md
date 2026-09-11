# Whiteboard 1.3.4 Implementation Result

## 范围

本批一次连续完成 4 个强相关小版本，目标不是继续横向堆功能，而是把“收集 → 排布 → 鸟瞰整理 → 归档”做成一条日常工作链路：

- 1.3.1 — Archive Canvas / 独立归档位置；
- 1.3.2 — 低倍率 Card + Workbench 混合选择与整体拖动；
- 1.3.3 — `Goal × Record Type × Time` 语义排布；
- 1.3.4 — Goal / Type / Time 布局标题回选。

版本元数据同步为 `1.3.4`。未实施 1.3.5+，未实施无证据的性能重构。

## 1.3.1 — Archive Canvas

原来的归档侧栏升级为覆盖白板区域的完整空间工作台：

- 可 Pan / Zoom；
- `Ctrl/⌘ + 拖空白` 框选归档卡；
- Ctrl/⌘ 点选、多选、整批拖动；
- 可网格整理；
- 可执行 `目标 × 类型 × 时间` 整理；
- 回到中心 100% / 适配内容；
- Restore 仍恢复到原白板 / 原 Workbench / 原 world 坐标。

为避免“归档里重新摆放”覆盖“恢复原位置”，`WhiteboardArchivedItem` 新增可选 `archiveX / archiveY / archiveZIndex`。原 `x / y / zIndex / groupId` 继续作为 restore origin。旧归档数据没有 archive 坐标时使用稳定网格 fallback，不要求 schema version migration；`whiteboards.json` 继续 `version: 1`。

## 1.3.2 — Semantic Interaction

1.2.8 的 Locator 从“只看 / 点一下找回”升级为低倍率直接操作代理：

- compact / overview 下可 Ctrl/⌘ 点选 Card locator 与 Workbench locator；
- Ctrl/⌘ 框选可同时命中当前 Canvas 的直属 Card + Workbench；
- 拖动任一已选 locator，会一次原子平移整个 mixed selection；
- Workbench 按 subtree 原子节点移动，内部卡 / 子 Workbench 不会同时重复计入 selection；
- 当前 Canvas 只操作直属节点，避免嵌套层级重复选择；
- detail 模式继续保留原卡片选择语义，不把 Workbench 混选强行带回正常编辑态。

Store 新增 `translateNodes`，一次 history / persistence mutation 提交 Card + Workbench 的共同 delta。若 selection 同时包含祖先和后代 Workbench，会剪掉后代重复移动；若 standalone Card 已被选中 Workbench 覆盖，也不会移动两次。

## 1.3.3 — Goal × Record Type × Time

新增固定产品入口：`目标 × 类型 × 时间`。

第一版规则明确固定：

- **一个 Goal 一块**；
- **横向 = Record Type**；
- **纵向 = Time（月）**；
- 同一 Goal / Type / Month cell 内，多卡使用局部网格；
- 无 Goal → `未归属目标`；
- 无时间 → `无时间`；
- Record Type 使用现有 Record schema canonical order；
- Time 优先使用 Record 的 `date/dateMs`，再回退 start / created，避免被文件创建时间误导；月份分桶使用稳定 UTC 月键。

入口：

- 选中多张卡 → 右键 → `目标 × 类型 × 时间`；
- 没有 selection → 右键空白 → `目标 × 类型 × 时间整理当前工作台`；
- Archive Canvas 也可以执行同一个排布。

**默认批量拖入行为没有改**：左侧批量拖进白板仍先用普通网格落地，语义整理是用户主动触发的 Arrange。

**Arrange != Group**：该功能只修改 XY，不自动创建 Workbench / parentGroupId。

底层不是写死单函数：新增通用 `WhiteboardLayoutSpec`，支持 `groupBy / x / y / cellLayout`。第一版 UI 只公开一个固定 `GOAL_TYPE_TIME_LAYOUT_SPEC`，不提供 BI 式横纵轴配置面板；以后真实使用证明有必要时，可以直接给这个接口接配置 UI。

## 1.3.4 — Layout Header Selection

语义布局生成 ephemeral guide：

- Goal 区块标题；
- Record Type 列标题；
- Time 行标题。

点击任一标题会回选该标题对应的卡片集合。这样可以继续：

- 整批拖动；
- 归档；
- 再整理；
- 主动 `用所选创建工作台`。

Guide 只是布局 UI，不进入 durable model。普通卡片拖动、低倍率 mixed selection 拖动、Undo / Redo、切换 Nested Canvas 时会主动清掉不再可信的 guide。

## 数据合同

继续保持 canonical Record 真源；Whiteboard 不复制 Record 正文。

`WhiteboardArchivedItem` 现在是：

```ts
WhiteboardArchivedItem {
  id;
  recordId;
  x; y; zIndex?; groupId?; // restore origin
  archivedAt;
  archiveX?; archiveY?; archiveZIndex?; // Archive Canvas placement
}
```

- `whiteboards.json version` 仍为 1；
- 旧数据兼容；
- camera / zoom / selection / layout guides 继续 ephemeral；
- Archive Canvas 移动不覆盖 restore origin；
- Workbench subtree 在主白板移动时，归档成员的 restore origin 会跟父树一起平移，但 Archive Canvas placement 不变。

## 未做

- 不把批量拖入默认改成语义布局；
- 不开放 group/x/y 自定义布局设置 UI；
- 不自动按 Goal/Type 创建 Workbench；
- 不做 AI 自动聚类 / 关系猜测；
- 不做 1.3.5+；
- 不在没有真实性能证据时做 spatial index / culling / lazy render。
