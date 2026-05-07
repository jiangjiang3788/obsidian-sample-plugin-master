window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-08',
  title: '八、数据流与流程图',
  tip: '图在当前区域缩放和横移',
  content: `
    <div class="diagram-card">
      <div class="diagram-head"><div><div class="diagram-title">数据流图</div><div class="diagram-desc">用户动作如何变成数据，再如何被展示与检索。</div></div></div>
      <div class="diagram-wrap"><div class="diagram-render" data-diagram="数据流图"></div></div>
      <pre class="mermaid-source" data-name="数据流图">flowchart TD
A[用户输入或操作] --> B{入口类型}
B --> C[快速记录]
B --> D[人工智能记录]
B --> E[计时停止写回]
C --> F[统一编辑器表单数据]
D --> G[人工智能识别结果]
G --> F
E --> H[任务动作与时间字段]
F --> I[模板渲染]
I --> J[写入 Markdown]
H --> J
J --> K[数据存储中枢扫描]
K --> L[索引与条目集合]
L --> M[仪表盘展示]
L --> N[筛选与视图]
L --> O[人工智能对话检索]</pre>
    </div>

    <div class="diagram-card">
      <div class="diagram-head"><div><div class="diagram-title">记录链路图</div><div class="diagram-desc">只看“如何记一条东西”。</div></div></div>
      <div class="diagram-wrap"><div class="diagram-render" data-diagram="记录链路图"></div></div>
      <pre class="mermaid-source" data-name="记录链路图">flowchart TD
A[我想记一条东西] --> B{我怎么开始}
B --> C[点快速记录命令]
B --> D[说一句自然语言]
B --> E[先开始计时再停止]
C --> F[选记录类型]
F --> G[选主题与子主题]
G --> H[填字段]
D --> I[人工智能识别块与主题与字段]
I --> J[确认记录界面]
J --> H
E --> K[计时器累计时长]
K --> L[停止并写回任务]
H --> M[模板渲染成目标文本]
L --> N[直接更新任务文本]
M --> O[写入 Markdown]
N --> O
O --> P[扫描解析回条目]
P --> Q[以后用于展示、筛选、查询、复盘]</pre>
    </div>

    <div class="diagram-card">
      <div class="diagram-head"><div><div class="diagram-title">人工智能流程图</div><div class="diagram-desc">只看自然语言记录这一条链路。</div></div></div>
      <div class="diagram-wrap"><div class="diagram-render" data-diagram="人工智能流程图"></div></div>
      <pre class="mermaid-source" data-name="人工智能流程图">flowchart TD
A[用户输入一句自然语言] --> B[检查人工智能开关与接口配置]
B --> C[读取块模板与主题配置]
C --> D[人工智能自然语言解析器]
D --> E[识别记录所属块]
D --> F[识别主题与子主题]
D --> G[识别字段值]
E --> H[生成记录草案]
F --> H
G --> H
H --> I[确认记录弹窗]
I --> J[统一编辑器]
J --> K[字段修正]
K --> L[模板渲染]
L --> M[写入 Markdown]</pre>
    </div>

    <div class="diagram-card">
      <div class="diagram-head"><div><div class="diagram-title">生命周期图</div><div class="diagram-desc">只看装配、运行、卸载。</div></div></div>
      <div class="diagram-wrap"><div class="diagram-render" data-diagram="生命周期图"></div></div>
      <pre class="mermaid-source" data-name="生命周期图">flowchart TD
A[插件加载] --> B[读取设置]
B --> C[注册核心依赖与平台适配]
C --> D[启动服务管理器]
D --> E[引导运行时]
E --> F[创建能力集合]
F --> G[注册命令]
G --> H[用户开始使用功能]
H --> I[记录、计时、人工智能、设置等模块运行]
I --> J[插件卸载]
J --> K[统一清理服务]
K --> L[清理实例与副作用]
L --> M[避免卸载后继续写盘或继续监听]</pre>
    </div>
  `
});
