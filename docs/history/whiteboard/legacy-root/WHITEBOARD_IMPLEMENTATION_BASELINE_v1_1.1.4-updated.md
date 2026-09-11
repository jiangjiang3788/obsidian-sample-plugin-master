# ThinkOS 白板 — 实施基线 v1

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
│ ThinkOS · 白板                         定位卡片 / 缩放        │
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
- 上一个 / 下一个把卡滚动到视野中；
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
- dangling Record 不自动清理。

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
  modified: number;
}

WhiteboardItem {
  id: string;
  recordId: string;
  x: number;
  y: number;
  zIndex?: number;
}

WhiteboardEdge {
  id: string;
  fromItemId: string;
  toItemId: string;
}
```

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

### 1.1.5 — 整理效率（条件版）

只有真实白板达到约 20–30 张卡且单张移动明显痛苦才做：
- 框选；
- 多选；
- 整组移动；
- Bring to front。

### 1.1.6 — 时间附近候选（条件版）

运动/睡眠等高确定性场景：
- 用户选择 seed Record；
- 系统只展示时间附近候选；
- 用户自己决定是否拖入；
- 不自动关联。

### 1.1.7+ — 主动 AI Handoff（延期）

只有用户主动选择卡并点击“和 AI 聊”时构造 context。

禁止后台主动推荐、聚类、连线、因果判断。

## 9. 暂不做

- AI 自动推荐/聚类；
- Cluster/Thread 强对象；
- embedding/vector DB；
- complex edge types；
- tldraw / React Flow / Excalidraw；
- 无限画布 engine；
- pan/minimap / 无限相机（有界缩放已在 1.1.4，其他相机能力继续延期）；
- virtualization/spatial index；
- 自动修改/清理 canonical Record。

## 10. 新版核心产品验收

1. 白板不再需要创建/插入 Dashboard Layout；
2. 用户从 ThinkOS 一级入口直接打开全屏白板；
3. 左侧用于寻找 Record，右侧空间不受左侧检索影响；
4. 卡片的空间位置能在重启后恢复；
5. 用户重新打开时能恢复“上次为什么这么摆”；
6. 白板帮助继续过去的思考，而不是只成为好看的卡片墙。


## Result 1.1.2

实施状态：完成 / 用户真机通过。

- 左 Record 小卡片 → 右 Board 指定位置；
- 右 Board 卡 → 左 Source = 移出 Projection；
- 搜索结果恢复小卡片，筛选区继续平面列表；
- 不改 Whiteboard schema / Record / Markdown；
- 新增 F095 与 transfer model / E2E 证据；
- Syntax / Language / Evidence / Surface / Architecture / Records 通过；UI Runtime 的非 CSS 结构检查通过，fresh CSS audit 仍被既有 75/72 文件数与总行数预算卡住；
- Jest / 完整 Typecheck / 真机 E2E 由用户有依赖环境补跑；
- 下一步：1.1.3 Hold，先验收左右拖闭环。


## Result 1.1.3

实施状态：代码完成 / 待用户真机验收。

- 右上角新增“查找白板卡片”，只定位当前 WhiteboardItems；
- 匹配卡高亮、非匹配卡淡化，上下项循环并 bring into view；
- Ctrl/⌘+F 聚焦白板查找，Esc 清除；
- Record Source 整栏可收起/展开，收起不卸载左侧查询状态；
- “筛选范围”可独立折叠；
- 新增 `WhiteboardFindModel / WhiteboardFindController / WhiteboardBoardTools`，Workspace 继续保持在治理热点阈值内；
- 查找与折叠全部 ephemeral，不修改 `whiteboards.json` schema，不调用 Store mutation；
- Syntax / Language / Evidence / Surface / Architecture / Records 通过；UI Runtime 的非 CSS 结构检查通过，fresh CSS audit 仍被既有 75/72 文件数与总行数预算卡住；
- Quality / Stability / Product 仍为 1.1.2 完全相同的既有基线红项；
- 下一步：1.1.4 已按用户确认继续实施；白板定位/收纳保留。


## Result 1.1.4

实施状态：代码完成 / 待用户真机验收。

- 用户明确取消多白板路线，1.1.4 改为白板缩放；
- 左侧搜索与筛选视觉分层：搜索仅保留独立主输入，筛选继续作为次级可折叠区域；
- 已加入当前白板的 Record 不再出现在左侧候选结果，右侧成为唯一“已加入”视觉真源；
- 右上角保留白板内查找，并加入 `- / 100% / +` 缩放控制；
- 支持 `Ctrl/⌘ + wheel`，范围固定 50%～200%；
- zoom 为 ephemeral state，不修改 Whiteboard schema、不写 `whiteboards.json`；
- WhiteboardItem/Edge 继续使用未缩放逻辑坐标；卡片拖动与 Source drop 均做 screen↔board 换算；
- 新增 `WhiteboardZoomModel / WhiteboardZoomController` 与 F097 测试证据；
- Syntax / Language / Evidence / Surface / Architecture / Records / UI Runtime 全部通过；
- fresh CSS audit 与 1.1.3 保持完全相同的 75 files / 9864 lines，未新增硬编码颜色/!important；
- Quality / Stability / Product 与 1.1.3 基线失败项完全一致；
- Jest / 完整 Typecheck / 真机 E2E 需用户依赖环境补跑；
- 下一步：1.1.5 Hold，先验收 50%/100%/200% 下拖卡、拖入、连线与重启坐标。
