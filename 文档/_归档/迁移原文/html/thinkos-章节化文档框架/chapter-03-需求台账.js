window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-03',
  title: '三、需求台账',
  tip: '可直接编辑',
  content: `
    <div class="req-toolbar">
      <div class="left">
        <button class="ctl-btn" id="addRowBtn">新增一行需求</button>
        <button class="ctl-btn light" id="saveBtn">保存到浏览器</button>
        <button class="ctl-btn secondary" id="exportBtn">导出当前 HTML</button>
      </div>
      <div class="right small">表格里的格子可以直接点击编辑。</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th style="min-width:180px">我要增加什么</th><th style="min-width:90px">主线</th><th style="min-width:120px">模块</th><th style="min-width:80px">优先级</th><th style="min-width:90px">状态</th><th style="min-width:220px">场景</th><th style="min-width:150px">入口</th><th style="min-width:220px">希望结果</th><th style="min-width:200px">影响链路</th><th style="min-width:90px">操作</th></tr></thead>
        <tbody id="reqBody">
          <tr><td contenteditable="true">过去式自动完成</td><td contenteditable="true">记录</td><td contenteditable="true">人工智能记录</td><td contenteditable="true">高</td><td contenteditable="true">计划中</td><td contenteditable="true">我说“昨天五点到六点学习了”时，希望自动识别成已完成任务</td><td contenteditable="true">人工智能记录</td><td contenteditable="true">自动带上完成状态、日期和时间字段</td><td contenteditable="true">解析、确认界面、模板渲染、写回</td><td><button class="ctl-btn light del-row">删除</button></td></tr>
        </tbody>
      </table>
    </div>
  `
});
