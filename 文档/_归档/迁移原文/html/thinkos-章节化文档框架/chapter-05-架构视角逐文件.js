window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-05',
  title: '五、架构视角（逐文件）',
  tip: '看装配、边界、共享、生命周期',
  content: `
    <div class="table-wrap"><table><thead><tr><th style="min-width:210px">文件 / 目录</th><th style="min-width:220px">架构角色</th><th style="min-width:260px">结构职责</th><th style="min-width:240px">连接 / 影响</th></tr></thead><tbody>
      <tr><td><span class="code">src/main.ts</span></td><td>插件总入口</td><td>加载设置、建立依赖、绑定平台端口、启动运行时、注册命令、处理卸载</td><td>连接 app / core / platform / features</td></tr>
      <tr><td><span class="code">src/app/ServiceManager.ts</span></td><td>生命周期总管</td><td>统一创建 / 注册 / 清理服务，是 dispose 收口核心位置</td><td>影响 unload 安全与副作用清理</td></tr>
      <tr><td><span class="code">src/app/bootstrap/*</span></td><td>装配层</td><td>按职责装配 core、timer、ui、runtime</td><td>决定功能如何被加载</td></tr>
      <tr><td><span class="code">src/platform/*</span></td><td>平台适配层</td><td>把 Obsidian API 包起来，不让核心层直接耦合平台</td><td>影响 core 的平台无关性</td></tr>
      <tr><td><span class="code">src/app/ui/components/QuickInputEditor/*</span></td><td>共享输入界面层</td><td>收口快速记录和人工智能确认</td><td>是最近共享改造的核心区域</td></tr>
    </tbody></table></div>
  `
});
