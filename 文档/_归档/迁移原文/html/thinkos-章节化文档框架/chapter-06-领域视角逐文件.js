window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-06',
  title: '六、领域视角（逐文件）',
  tip: '看概念、规则、状态迁移',
  content: `
    <div class="table-wrap"><table><thead><tr><th style="min-width:210px">文件 / 目录</th><th style="min-width:220px">领域角色</th><th style="min-width:260px">定义 / 执行的规则</th><th style="min-width:240px">当前应关注点</th></tr></thead><tbody>
      <tr><td><span class="code">src/core/types/schema.ts</span></td><td>记录配置模型</td><td>定义块、字段、主题、模板这些记录世界的基本结构</td><td>人工智能与表单契约都要服从这里</td></tr>
      <tr><td><span class="code">src/core/types/ai-schema.ts</span></td><td>人工智能记录契约</td><td>定义自然语言解析后返回什么：块、主题、字段值</td><td>能否表达会议、截止、完成意图取决于这里</td></tr>
      <tr><td><span class="code">src/core/utils/parser.ts</span></td><td>记录语义解释器</td><td>把任务、KV块、日期、主题、时间字段解释成系统条目</td><td>系统如何理解 Markdown 的关键</td></tr>
      <tr><td><span class="code">src/core/services/DataStore.ts</span></td><td>条目中枢</td><td>扫描、索引、查询</td><td>是数据处理中枢，不只是缓存</td></tr>
      <tr><td><span class="code">src/core/services/ItemService.ts</span></td><td>任务动作服务</td><td>完成任务、计时写回、字段更新</td><td>真正的状态迁移规则执行位置</td></tr>
    </tbody></table></div>
  `
});
