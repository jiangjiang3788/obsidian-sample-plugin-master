window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-01',
  title: '一、总览',
  tip: '结构说明',
  content: `
    <div class="callout">
      现在是你想要的一层文件结构：<span class="code">index.html</span>、<span class="code">shared.css</span>、<span class="code">shared.js</span>、各章节文件。
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>文件</th><th>作用</th></tr></thead>
        <tbody>
          <tr><td><span class="code">index.html</span></td><td>总入口，只负责引入公共样式、公共脚本，以及按顺序引入章节文件。</td></tr>
          <tr><td><span class="code">shared.css</span></td><td>变量、基础布局、通用组件样式。</td></tr>
          <tr><td><span class="code">shared.js</span></td><td>目录导航、章节切换、需求台账编辑、Mermaid 渲染、Ctrl + 滚轮缩放图、Shift + 滚轮横向移动图。</td></tr>
          <tr><td><span class="code">chapter-xx-*.js</span></td><td>每一章自己的内容文件。</td></tr>
        </tbody>
      </table>
    </div>
  `
});
