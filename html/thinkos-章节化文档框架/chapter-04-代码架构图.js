window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-04',
  title: '四、代码架构图',
  tip: '直接在图区域缩放与横移',
  content: `
    <div class="diagram-card">
      <div class="diagram-head"><div><div class="diagram-title">代码架构图</div><div class="diagram-desc">不再使用弹层放大，直接在图区域缩放与移动。</div></div></div>
      <div class="diagram-wrap"><div class="diagram-render" data-diagram="代码架构图"></div></div>
      <pre class="mermaid-source" data-name="代码架构图">flowchart TD
A[src/main.ts 插件入口] --> B[app 应用装配层]
A --> C[platform 平台适配层]
A --> N[core 核心能力层]
A --> R[features 功能模块层]
A --> X[shared 共享层]
B --> D[bootstrap 引导运行时]
B --> E[ServiceManager 生命周期管理]
B --> H[store 状态存储]
B --> I[ui 共享界面]
I --> J[QuickInputEditor 统一编辑器]
C --> K[Vault / UI / Modal / Events 端口实现]
N --> O[services 数据处理与写回]
N --> P[ai 人工智能能力]
N --> Q[types / utils / ports]
R --> S[quickinput]
R --> T[aiinput]
R --> U[aichat]
R --> V[timer]
R --> W[settings]</pre>
    </div>
  `
});
