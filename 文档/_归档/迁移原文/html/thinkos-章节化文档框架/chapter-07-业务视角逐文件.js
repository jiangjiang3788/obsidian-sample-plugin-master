window.THINKOS_DOC_CHAPTERS.push({
  id: 'chapter-07',
  title: '七、业务视角（逐文件）',
  tip: '看用户入口和闭环',
  content: `
    <div class="table-wrap"><table><thead><tr><th style="min-width:210px">文件 / 目录</th><th style="min-width:220px">业务角色</th><th style="min-width:260px">用户得到的能力</th><th style="min-width:240px">最容易出问题的点</th></tr></thead><tbody>
      <tr><td><span class="code">src/features/quickinput/registerCommands.ts</span></td><td>快速记录入口注册</td><td>用户能直接打开指定块的记录弹窗</td><td>入口多了后的命名与可发现性</td></tr>
      <tr><td><span class="code">src/features/quickinput/QuickInputModal.tsx</span></td><td>快速记录弹窗</td><td>承载“我现在就要记一条”的主要交互</td><td>输入效率、焦点、保存反馈</td></tr>
      <tr><td><span class="code">src/platform/modals/AiBatchConfirmModal.tsx</span></td><td>人工智能确认界面</td><td>用户保存前可检查和修正人工智能结果</td><td>草案质量、字段映射、状态对象化</td></tr>
      <tr><td><span class="code">src/features/timer/FloatingTimerWidget.ts</span></td><td>悬浮计时器界面</td><td>用户持续看到并控制计时状态</td><td>部件生命周期、刷新、清理</td></tr>
      <tr><td><span class="code">src/features/settings/SettingsTab.tsx</span></td><td>系统配置入口</td><td>用户配置块、主题、模板、视图和布局</td><td>配置复杂度、可理解性、预览能力</td></tr>
    </tbody></table></div>
  `
});
