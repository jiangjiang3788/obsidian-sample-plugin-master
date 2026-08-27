/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F132/e2e
 */
import { browser } from '@wdio/globals';
import { THINK_PLUGIN_ID, clearE2EState, waitForThinkReady } from './support/thinkE2e';

const FILE_COUNT = 300;
const ROOT = 'E2E/大仓库';

describe('Think OS 真机性能：大 Vault 启动、索引与查询', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
  });

  it('真实 Vault 中预置 300 个 Record 文件后，插件重启能在基线时间内完成索引并保持快速查询', async () => {
    await browser.executeObsidian(async ({ app }, fixture) => {
      try { await (app as any).vault.createFolder(fixture.root); } catch {}
      for (let index = 0; index < fixture.count; index += 1) {
        const id = `e2e-scale-${String(index).padStart(4, '0')}`;
        const path = `${fixture.root}/任务-${String(index).padStart(4, '0')}.md`;
        const content = [
          '<!-- start -->',
          `记录ID:: ${id}`,
          '记录类型:: task',
          '状态:: open',
          '目标:: E2E',
          '创建于:: 2026-08-24 08:30',
          `内容:: V6 大仓库任务 ${index}`,
          '<!-- end -->',
          '',
        ].join('\n');
        const existing = (app as any).vault.getAbstractFileByPath(path);
        if (existing) await (app as any).vault.modify(existing, content);
        else await (app as any).vault.create(path, content);
      }
    }, { root: ROOT, count: FILE_COUNT });

    const reloadStarted = Date.now();
    await browser.reloadObsidian();
    await waitForThinkReady(60_000);
    const reloadMs = Date.now() - reloadStarted;

    const stats = await browser.executeObsidian(({ app }, pluginId, fixture) => {
      const plugin = (app as any).plugins.plugins[pluginId] as any;
      const store = plugin.serviceManager.dataStore;
      const started = performance.now();
      const records = store.queryRecords().filter((item: any) => String(item.filePath || item.path || '').startsWith(fixture.root));
      const queryMs = performance.now() - started;
      return { count: records.length, queryMs };
    }, THINK_PLUGIN_ID, { root: ROOT });

    console.log(`【大仓库性能】文件数：${FILE_COUNT}；插件重启到就绪：${reloadMs}ms；查询：${stats.queryMs.toFixed(2)}ms；索引记录：${stats.count}`);
    expect(stats.count).toBe(FILE_COUNT);
    expect(reloadMs).toBeLessThan(45_000);
    expect(stats.queryMs).toBeLessThan(1_000);
  });
});
