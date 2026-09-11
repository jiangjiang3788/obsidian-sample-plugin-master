# ThinkOS 白板 — 实施基线 v1

> 当前版本：**1.1.9 Archive / Restore 原 world 位置。**
> 当前产品定义：**白板是 ThinkOS 一级工作区，不是普通 View。**
> 它不注册进 ThinkOS Dashboard View registry，不插入 Layout，不受 Dashboard Toolbar / DateRange / globalFilters 控制。
> 白板仍然是 canonical Record 的 Projection：只引用 `recordId`，不复制 Record 内容，不修改 Markdown Record 真源。

## 1. 产品边界

### 1.1 一级入口

```text
ThinkOS
├─ Dashboard / 普通布局
├─ Settings / 其他能力
└─ 白板
```

技术宿主可以使用 Obsidian `WorkspaceLeaf / ItemView`，但这只是平台容器；产品和 ThinkOS 架构上都不能把白板重新解释成 TableView / TimelineView 一类普通 View。

### 1.2 最终页面结构

```text
┌──────────────────────────────────────────────────────────────┐
│ ThinkOS · 白板       定位 / 缩放 / Pan / Workbench / 多选 │
├─────────────────────┬────────────────────────────────────────┤
│ 左：Record Source    │ 右：Whiteboard                         │
│                     │                                        │
│ 搜索记录             │ 已加入的卡片                           │
│ Record Type 筛选     │ XY 自由摆放                            │
│ Goal 筛选            │ A → B 显式方向                         │
│ 时间筛选             │                                        │
│                     │ 不受左侧筛选影响                       │
│ 搜索结果             │                                        │
└─────────────────────┴────────────────────────────────────────┘
```

## 2. 三种查找语义必须分开

### 2.1 搜索记录

作用域：全部 canonical Records。

回答：**“我以前写过什么？”**

搜索自由文本，例如“睡眠”“刷手机”“肩膀”“编程”。

### 2.2 筛选记录

作用域：左侧候选 Record Source。

回答：**“我只想在什么范围里找？”**

规划支持：
- Record Type；
- Goal；
- 时间 / dateRole；
- 后续真实需求证明后再加其他筛选。

搜索与筛选必须继续复用 `RecordQuery`，不得创建第二套查询/时间语义。

明确不做“已加入 / 未加入”筛选。是否已在白板上由右侧空间本身表达。

### 2.3 定位卡片

作用域：当前白板已经存在的 WhiteboardItems。

回答：**“我已经放进来的那张卡在哪里？”**

规划行为：
- Ctrl+F / 顶部“定位卡片”；
- 命中卡高亮；
- 非命中卡淡化；
- 上一个 / 下一个通过 ephemeral camera 把目标 world 点带到视野中心；
- 不隐藏、不重排、不写盘、不改变 XY/Edge。

## 3. 核心交互

### 3.1 左 → 右

最终主交互：从左侧 Record Source 直接拖入右侧指定位置。

```text
Record candidate
  → drag
  → drop on board
  → addRecord(boardId, recordId, {x,y})
```

“加入”和“放在哪里”合成一次动作。

### 3.2 右 → 左

将卡拖回左栏 = **移出当前白板**。

只删除 WhiteboardItem projection，并同步删除与它相连的 incident edges；绝不删除原 Record / Markdown。

### 3.3 白板内直接操纵

已验证并保留：
- XY 拖动；
- pointermove 只 preview；
- pointerup 单次 commit；
- zIndex；
- A → B 显式方向；
- 删除 edge；
- 拖卡时 edge 实时跟随；
- canonical Record 点击打开；
- dangling Record 不自动清理；
- 空白处 Pointer Pan 与普通 wheel/trackpad Pan；
- world x/y 允许为负，Pan/Zoom 只改 ephemeral camera/zoom。

## 4. 数据真源

### 4.1 Canonical Record

唯一业务真源仍是 Markdown Record + RecordRepository / DataStore。

白板禁止保存：
- title/content 快照；
- Goal/date/type 副本；
- AI summary；
- embedding；
- 自动 cluster/thread。

### 4.2 Whiteboard durable state

新真源：

```text
Think/whiteboards.json
```

当前模型：

```ts
WhiteboardStoreData {
  version: 1;
  boards: Record<string, WhiteboardBoard>;
}

WhiteboardBoard {
  title: string;
  items: WhiteboardItem[];
  edges: WhiteboardEdge[];
  groups?: WhiteboardGroup[]; // 1.1.7 起可选，兼容 1.1.6 文件
  modified: number;
}

WhiteboardItem {
  id: string;
  recordId: string;
  x: number;
  y: number;
  zIndex?: number;
  groupId?: string; // Workbench membership
}

WhiteboardGroup {
  id: string;
  title: string;
  x: number;
  y: number;
  collapsed: boolean;
}

WhiteboardEdge {
  id: string;
  fromItemId: string;
  toItemId: string;
}
```

1.1.5 坐标合同：

```text
world = WhiteboardItem.x/y 所在的持久化逻辑平面，可为负数
camera = 当前 viewport 左上角对应的 world 坐标，仅内存
screenLocal = (world - camera) * zoom
world = camera + screenLocal / zoom
```

`WhiteboardItem.x/y` 仍是唯一持久化空间坐标；`camera/zoom` 不进入 `whiteboards.json`。Pan 与 Zoom 的连续更新不得调用 WhiteboardStore mutation。

1.1.7 Workbench 合同：`WhiteboardGroup.x/y` 也是 durable world 坐标；`WhiteboardItem.groupId` 只保存 Projection membership。工作台 frame 的宽高由最小尺寸 + 成员卡位置动态推导，不额外持久化尺寸。整组移动必须在一个 Store mutation 中同时平移 group anchor 与所有成员 item.x/y；折叠只切换 `collapsed` 并隐藏成员渲染，不改变成员坐标、Edge 数据或 canonical Record。Schema 拒绝重复 group ID 与悬空 groupId；旧 1.1.6 文件没有 `groups/groupId` 仍可原样恢复，无迁移写盘。

### 4.3 Identity

白板 ID 与 `ViewInstance.id` 完全解绑。

1.1.0 先使用默认白板：

```text
whiteboard-default
```

当前产品只保留单一默认白板 `whiteboard-default`；用户已明确不做多白板产品能力。`boards` 容器结构保留为存储实现细节，不新增多白板 UI/生命周期。

同一 Record 在同一个白板默认只允许一个 projection；重复加入应复用/定位已有 item，而不是静默制造重复卡。

## 5. 历史 Association 数据策略

用户已明确确认历史 Association 数据均为测试数据，无迁移价值。

因此 1.1.0：
- 不迁移 `Think/association-spaces.json`；
- 新 `whiteboards.json` 成功初始化后清理旧 association 测试 JSON；
- 从 `data.json` 当前 Settings shape 中清理旧 `AssociationView`；
- 同步清理 Layout 的旧 `viewInstanceIds` / `viewPlacements` 引用；
- 不触碰任何 Markdown Record；
- 普通已注册 View 必须保留。

## 6. 生命周期与数据安全

白板继承 1.0.77 真机故障后建立的数据安全合同：

1. 启动恢复在 Obsidian workspace/layout ready 后开始；
2. Vault cache miss 必须用 adapter 核实，不能把“暂时不可见”当成“文件不存在”；
3. 初始化完成前 Store 不允许 mutation；
4. schema-invalid / read failure 进入 error 并 fail-closed；
5. mutation 使用 draft → schema validate → write success → publish memory；
6. write failure 不允许 UI 假成功；
7. dispose 后 IO 显式失败，不能 silent no-op。

## 7. 普通 View 与白板的架构隔离

最终不允许白板出现在：
- `core/config/views/types.ts` 的普通 View union；
- `core/config/views/registry.ts`；
- `features/views/registry.ts`；
- Settings View editor registry；
- Dashboard `viewPropsFactory`；
- Layout `viewInstanceIds/viewPlacements`。

白板只通过独立 Feature + Obsidian workspace 注册：

```text
Whiteboard Feature
  → registerView(think-os-whiteboard)
  → Ribbon: ThinkOS 白板
  → Command: 打开 ThinkOS 白板
```

## 8. 版本路线

### 1.1.0 — 独立白板工作区（✅ 已实施/真机通过）

唯一目标：**把 Association 从普通 View/Layout 中彻底迁出，建立 ThinkOS 一级“白板”，旧测试壳清理，核心卡片/拖动/连线继续工作。**

做：
- standalone Workspace Leaf；
- Ribbon + Command 一级入口；
- 左右永久分栏；
- 左栏基础关键词 Record Source；
- 右栏现有卡片/XY/Edge；
- `WhiteboardStore` + `Think/whiteboards.json`；
- 退出普通 View registry/editor/Layout；
- 清理旧 AssociationView 测试壳与测试 JSON；
- restart recovery。

不做：Goal/Type/时间完整筛选、左拖右、右拖左、定位卡片、多白板、框选、AI、zoom/pan。

### 1.1.1 — Record Source Retrieval（✅ 已实施/用户通过）

唯一目标：**降低“我记得以前写过，但找不到”的成本。**

左侧加入：
- keyword；
- Record Type；
- Goal；
- date/dateRole/time range。

全部通过现有 `RecordQuery`。右侧白板永远不被左侧筛选隐藏或重排。

### 1.1.2 — 左右直接拖（✅ 已实施/用户真机通过）

唯一目标：**让“找到 → 加入 → 放到哪里”成为一次动作。**

- 左 Record → 右 Board 指定位置；
- 右 Board → 左栏 = 移出白板；
- 原 Record 永远不删除；
- pointer gesture 与内部 card drag 保持清晰状态机。

### 1.1.3 — 白板内定位 + 工作区收纳（✅ 已实施）

唯一目标：**卡多以后快速找到已经放进来的卡，同时让白板工作区可以收纳界面，不破坏空间记忆。**

- 白板右上角“查找白板卡片”；
- Ctrl/⌘+F 聚焦白板查找；
- 命中卡高亮，非命中卡淡化；
- 上一项/下一项循环并 bring into view；
- 查找不隐藏、不重排、不写盘、不改变 XY/Edge；
- 左侧“筛选范围”独立折叠；
- 整个 Record Source 可收起/展开；
- 收起只改变 workspace chrome，不卸载或丢失左侧当前查询状态。

### 1.1.4 — 白板缩放（✅ 代码完成 / 待用户真机验收）

唯一目标：**在不引入完整无限画布引擎的前提下，让大白板可以缩放浏览。**

- 50%～200% 有界缩放；
- `Ctrl/⌘ + wheel` 与 `- / 100% / +`；
- 缩放围绕当前视口/指针，减少跳屏；
- WhiteboardItem 的 x/y 继续是未缩放逻辑坐标；
- 左拖右与卡片内部拖动统一做 screen↔board 坐标换算；
- Edge 与 Card 同处逻辑 Canvas，一起缩放；
- zoom 完全 ephemeral，不写 `whiteboards.json`；
- 已在右侧白板的 Record 从左侧候选结果直接排除；
- 左侧搜索作为主入口，筛选保持次级可折叠区域；右上角白板内查找继续独立存在；
- 不做多白板，不引入 minimap / infinite-canvas engine / spatial index。

### 1.1.5 — 假无限白板 / Pan / World-Camera-Screen（✅ 已实施）

唯一目标：**在不引入第三方无限画布引擎、也不制造超大假 Canvas 的前提下，让白板在视觉和交互上真正呈现“假无限”：四向 Pan、负 world、宽范围连续 Zoom 都可明确感知。**

- 新增可测试的 `world / camera / screen` 纯坐标合同；
- `camera` 表示 viewport 左上角对应的 world 点，可正可负，仅内存；
- Pointer 拖空白处与普通 wheel/trackpad 支持 Pan；
- 新增 camera-aware 自适应世界网格，Pan/Zoom 时网格随 world 原点移动并自动调整密度，不再出现“数学上动了但视觉像没动”的静态空底；
- 1.1.5 将 1.1.4 的 50%～200% 旧缩放扩成 **0.5%～12800% 实用近无限范围**：按钮按倍率缩放，Ctrl/⌘+wheel 连续指数缩放；
- Zoom 与 Pan 组合时保持指针/视口锚点下的 world 点稳定；
- WhiteboardItem x/y 继续是 durable world 坐标，允许负数；
- 卡片拖动继续使用生产 PointerEvent 路径，`screen delta / zoom` 得到 world delta；
- 左侧 Record drop 使用 `screen → world` 统一换算，不再把 x/y 夹到 0；
- Edge/Card 同处 camera-transformed world layer；
- 白板内定位只移动 camera，不改变卡片 x/y；
- 连续 Pan/Zoom 不写 `whiteboards.json`；重启 camera 回默认 0/0，负 x/y 仍恢复。

### 1.1.6 — 左侧 Record 多选 / 全选结果 / 批量拖入（✅ 已实施）

唯一目标：**降低从候选区一次挑多条 Record 进入白板的操作成本，同时保持 canonical Record / RecordQuery / world 坐标合同不变。**

- 左侧每条候选加入复选选择；
- 提供“全选结果 / 取消全选 / 清空 / 已选 N”状态；
- “全选结果”针对当前查询的完整 `matchedItems`，不受前 80 条渲染 cap 限制；
- 拖任意已选 Record 时携带整组选中结果；拖未选 Record 时仍保持 1.1.2 单条拖语义；
- 批量 drop 复用 1.1.5 `screen → world` 换算，并从落点向右下网格展开，避免卡片完全重叠；
- `WhiteboardStore.addRecords()` 在单个 mutation / 单次持久化中完成整批新增，并对输入和既有 Projection 去重；
- 已加入白板的 Record 仍立即从左侧候选与选择集合中移除；
- 删除旧“匹配 N 条，显示前 80 条；继续缩小搜索或筛选范围”提示；
- 右上角新增“回到画布中心”：按当前卡片整体包围盒中心移动 ephemeral camera；空白板回 world 原点；不改 zoom、不写卡片 x/y。

明确不做：右侧 Canvas 框选/多选、Workbench 分组、Archive、culling、AI。

### 1.1.7 — Workbench 分组（✅ 代码完成 / 待用户真机验收）

唯一目标：**在不引入 1.1.8 Canvas 多选的前提下，把空间上相关的卡片放进可命名、可折叠、可整体移动的 durable Workbench。**

- 右上角“新建工作台”，在当前 viewport world 中心创建；默认名称自动选择首个未占用的“工作台 N”；
- 工作台自身 `x/y/title/collapsed` 持久化；卡片用可选 `groupId` 表示 membership；
- 工作台最小 720×480 world units，并按成员卡向右下自动扩展；frame 尺寸不持久化；
- 展开工作台支持拖现有卡片进入；卡片拖到另一工作台可切换 membership；显式“移出工作台”只解除分组、不移出白板；
- 1.1.6 左侧单条/批量 Record drop 落在展开工作台时，新增 Projection 直接带同一 `groupId`；
- 标题栏提供可见拖动手柄；拖标题栏/手柄按 `screen delta / zoom` 预览，pointerup 单次 Store commit；
- 整组移动在一个 Store mutation 中平移工作台 anchor 与全部成员 durable x/y，Edge 因复用 item 坐标自然跟随；
- 可重命名、折叠/展开、解散；解散只清成员 `groupId`，不删卡片、不删 Record、不改位置；
- 折叠隐藏成员卡及 incident Edge，但成员仍属于当前白板，继续从左侧 Record Source 排除；
- Find 命中折叠工作台成员时只把 ephemeral camera 对准工作台，不自动展开、不写盘；
- “回到画布中心”把空工作台 frame 也纳入内容包围盒；
- Store schema version 仍为 1；旧 1.1.6 `whiteboards.json` 无 groups/groupId 可直接恢复；新增 schema 检查拒绝重复 group ID / 悬空 groupId。

明确不做：Canvas 框选/右侧多选/多卡选择状态（1.1.8）、Archive（1.1.9）、culling（1.1.10）、AI。

### 1.1.8 — Canvas 框选 / 多选 / 整组移动（✅ R2 代码完成 / 待用户真机验收）

唯一目标：**在不破坏 1.1.5 Pan、不持久化 selection 的前提下，让右侧多选成为能真正完成分组、移出和连线的白板操作集合。**

- 普通拖空白继续 Pan；`Ctrl/⌘ + 拖动空白` 才框选，Shift 单独拖空白不再框选；
- `Ctrl/⌘/Shift + 点击卡片` 逐条切换 selection；`Ctrl/⌘ + Shift + 空白拖动` 可追加框选；
- marquee 按 screen → world 合同命中当前可见卡片，支持负 camera / 任意 zoom；
- selection / marquee / drag preview 全部 ephemeral，不进入 `whiteboards.json`；
- 拖任一已选卡时，所有已选卡按同一 world delta 预览；Edge 与 Workbench frame 跟随 preview；
- 多选真实命中展开 Workbench 后，pointerup 通过 `WhiteboardStore.moveItems(boardId, moves, targetGroupId)` 一次保存 XY 并把整批成员加入目标 group；未命中 Workbench 时保留原 membership；
- 多选拖到左侧 Record Source，或在已选卡点击“移出”，通过 `WhiteboardStore.removeItems()` 一次移出全部 selection，并同步清理 incident edges；canonical Record / Markdown 不删除；
- 卡片上/右/下/左四边提供直接 drag-to-connect handle；拖动时显示 ephemeral Edge preview，松开到另一张卡即创建 A→B edge；移除旧“连线 / 连到这里 / 取消连线”按钮；
- Edge 数据合同仍保持 `fromItemId / toItemId`，不新增复杂 edge type；
- Store data schema/version 仍为 1；不提前引入 Archive、culling、AI 或第三方 infinite-canvas engine。

明确不做：Archive/Restore（1.1.9）、viewport culling（1.1.10）、AI。

### 1.1.9 — Archive / Restore 原位置（✅ 代码完成 / 待用户真机验收）

唯一目标：**让卡片可以从当前工作画布暂时收起，但其白板空间记忆、Record 真源和可恢复关系不丢失。**

- 新增 durable `archivedItems`；归档把 Whiteboard Projection 从 active `items` 移入归档区，不删除 canonical Record / Markdown；
- 归档条目保留原 `id / recordId / world x/y / zIndex / groupId`，并记录 `archivedAt`；
- 归档 Record 继续从左侧 Record Source 排除，避免把“归档”误解为“移出白板”；只能从右上角归档箱恢复；
- 多选状态下点击任意已选卡“归档”，整批 selection 通过一次 `archiveItems()` mutation 归档；未选卡仍按单卡语义；
- incident edges 进入 durable `archivedEdges` 暂存；恢复某卡时，只恢复两端都已 active 的 edge，避免悬空连线；
- Restore 使用同一个 Projection ID，并严格恢复原 world 坐标、zIndex 与仍有效的 Workbench membership，不自动重排；
- Workbench 解散时同步清理 archived item 的旧 groupId，保持 schema fail-closed；
- 旧 `whiteboards.json version: 1` 没有 `archivedItems/archivedEdges` 时仍可直接恢复，不需要强制迁移；
- camera / zoom 继续 ephemeral；Restore 后只把视口定位到恢复卡，不改变 durable XY；
- 右上角“回到画布中心”现在原子执行 **内容居中 + zoom 恢复 100%**，不写 `whiteboards.json`。

明确不做：viewport culling（1.1.10）、永久删除归档 Record、AI 自动整理/推荐。

### 1.1.10 — Viewport culling（仅性能真实需要时）

只有真机出现明显大白板渲染性能问题才实施 viewport culling / spatial 优化，不提前复杂化。

### Later — 主动选择卡片后 AI Chat

只有用户主动选择卡片并点击“和 AI 聊”时构造 context。禁止后台主动推荐、聚类、连线、因果判断。

## 9. 暂不做

- AI 自动推荐/聚类；
- Cluster/Thread 强对象；
- embedding/vector DB；
- complex edge types；
- tldraw / React Flow / Excalidraw；
- 完整 third-party infinite-canvas engine / minimap；
- virtualization/spatial index；
- 自动修改/清理 canonical Record。

## 10. 当前核心产品验收（1.1.9）

- 白板仍是 ThinkOS 一级 Workspace；1.1.0–1.1.8 R2 的 Pan / Zoom / Workbench / selection / drag-to-connect 合同继续兼容。
- 单卡“归档”后 Projection 从 Canvas 消失，但 canonical Record 不删除、也不重新出现在左侧 Record Source。
- 多选状态点任意已选卡“归档”时，一次归档完整 selection；归档本身只做一次 Store mutation。
- 归档箱显示归档卡与原 world 位置；恢复后 `id / recordId / x / y / zIndex / groupId` 保持原值。
- incident edges 归档期间不渲染；只有两端都恢复 active 后才恢复 durable edge，不产生悬空 edge。
- 重启后 archived projection / archived edge 仍在；恢复后仍回到归档前 world 坐标。
- “回到画布中心”无论当前 zoom 是多少，都同时把内容居中并把视图比例恢复为 100%；不改任何 item XY。
- `whiteboards.json version: 1` 保持，旧 1.1.8 文件无需迁移。
- Language / Evidence / Surface / Architecture / Records / Task Session / Energy / UI Runtime 可执行审计通过。
- Quality / Stability / Product / result-governance 只保留 1.1.8 R2 基线原有红项，无新增。
- Jest / 完整 Typecheck / Build / Obsidian E2E 因当前 SOURCE 未携带 `node_modules`，已实际尝试并明确记录为未执行成功，不伪装为通过。
- 下一步：**Hold 1.1.10，先真机验收 1.1.9；只有真实性能问题才进入 culling。**

## Result 1.1.5

实施状态：代码完成 / 待用户真机验收。

- 建立 `screenLocal = (world - camera) * zoom` 与反算合同，新增 `WhiteboardCameraModel`；
- 用 ephemeral camera 替换有限 scroll canvas；支持空白 Pointer Pan、普通 wheel/trackpad Pan 与负 camera；
- Zoom 与 camera 合并为统一 viewport controller，锚点 world 点在缩放前后保持稳定；
- 真机反馈后补齐“无限感”：移除 1.1.4 遗留的 50%～200% 体验限制，改为 0.5%～12800% 宽范围倍率/连续缩放；
- 新增 camera-aware 自适应世界网格与操作提示，Pan/Zoom 时背景明确随 world 移动；
- WhiteboardStore/schema 未改，x/y 原本即允许 finite 负数；Source drop 去掉非负 clamp，负 world 坐标可持久化；
- 生产卡片 PointerEvent 拖动逻辑未重写，只保留既有 `screen delta / zoom` world delta；
- Find 改为移动 camera 居中目标，不再依赖 DOM `scrollIntoView`，不修改 item x/y；
- Edge/Card 同处 world transform，负坐标和 Pan/Zoom 下保持同一几何坐标系；
- 新增 F098 unit/ui/integration/persistence/e2e/regression 证据，并补 world grid / 极小极大 zoom / 连续 wheel zoom 回归；
- 下一步：1.1.6 Hold，先真机验收 1.1.5 修正版的四向 Pan、0.5%～12800% 宽范围 Zoom、负坐标、拖卡/拖入、Edge、定位与重启。


## Result 1.1.6

实施状态：代码完成 / 待用户真机验收。

- 新增 `WhiteboardRecordSelectionModel`：全选、裁剪、toggle、批量拖集合解析；
- 新增 `WhiteboardBatchPlacementModel`：批量 world 网格落点 + 当前画布内容中心；
- 新增 `WhiteboardRecordTransferController`：单条/批量加入 busy 状态、drop world 换算与 Store mutation 接线；
- `WhiteboardStore` 新增 `addRecords()`，整批去重并只持久化一次；
- `WhiteboardRecordSourcePanel` 加逐条复选、全选结果/取消全选/清空/已选数；删除旧匹配数量提示；
- `WhiteboardBoardTools` 加“回到画布中心”；
- 新增独立 `whiteboard-selection.css`，避免把既有 whiteboard.css 推过架构预算；
- 新增 F099 测试与真机 E2E 路径；
- 1.1.7+ 继续 Hold。

## Result 1.1.7

实施状态：代码完成 / 待用户真机验收。

- 新增 durable `WhiteboardGroup` 与 `WhiteboardItem.groupId`；保持 whiteboards.json `version: 1` 和 1.1.6 无 groups 文件向后兼容；
- 新增 `WhiteboardWorkbenchModel`：frame、drop target、viewport-center 创建位置、screen/zoom 整组拖动与成员平移纯模型；
- 新增 `WhiteboardWorkbenchController` + `WhiteboardWorkbenchGroup`：创建、拖入成员、重命名、折叠、整组移动、显式移出、解散、Find 折叠目标；
- `WhiteboardStore` 新增 group CRUD / move；整组移动在单 mutation 中平移 group + 成员 XY；解散只清 groupId；
- 左侧 1.1.6 单条/批量 drop 落在展开 Workbench 时直接分组，不改变 RecordQuery/canonical Record；
- 折叠时成员卡与 incident Edge 不渲染，但成员仍是 board item；“回到画布中心”纳入 Workbench frame；
- 新增独立 `whiteboard-workbench.css`，保持既有 whiteboard.css / TSX 文件预算；
- 新增 F134 unit/ui/integration/persistence/restart/e2e/regression 证据；
- 1.1.8+ 继续 Hold。



## Result 1.1.8

实施状态：**R2 代码完成 / 待用户真机验收。**

- Ctrl/⌘ + 空白拖动框选；Shift 单独恢复为普通 Pan 路径；
- 多选可以一次拖入 Workbench，也可以一次移出白板；
- Store 新增 batch remove，并给 moveItems 增加可选 targetGroupId；
- 卡片四边直接 drag-to-connect，移除旧两步连线按钮；
- 1.1.9+ 继续 Hold。


## Result 1.1.9

实施状态：**代码完成 / 待用户真机验收。**

- 新增 optional durable `archivedItems / archivedEdges`，Store data version 仍为 1；
- 新增 `WhiteboardArchiveMutations`，把归档/恢复状态变换从 Store owner 中拆出，保持架构文件预算；
- `archiveItems()` 支持 selection 批量归档并一次持久化，`restoreArchivedItem()` 恢复同 Projection ID 与原 world 坐标；
- 归档期间 Record 不回 Source，incident edges 暂存并按端点 active 状态安全恢复；
- 新增右上角归档箱与卡片“归档”入口；Restore 后 camera 定位恢复卡，不改变其位置；
- “回到画布中心”改为 camera 居中 + zoom 100% 的单次 viewport state 更新；
- 新增 F136 unit/ui/integration/persistence/restart/e2e/regression 证据；
- 1.1.10 继续 Hold，仅真实大白板性能问题才实施。
