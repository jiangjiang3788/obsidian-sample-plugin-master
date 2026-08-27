/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F121/e2e
 * @covers F122/e2e
 * @covers F123/e2e
 * @covers F126/e2e
 */
import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import {
  clearE2EState,
  externalTaskMarkdown,
  getRecordById,
  waitForRecord,
  waitForRecordMissing,
  waitForThinkReady,
} from './support/thinkE2e';

const RECORD_ID = 'task.01KZZE2E000000000000000001';
const FILE = 'E2E/External.md';

describe('Think OS 真机：VaultWatcher / DataStore / 重建索引', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
  });

  it('外部创建、修改、删除 Markdown 会实时进入/更新/移出 DataStore', async () => {
    await obsidianPage.write(FILE, externalTaskMarkdown(RECORD_ID, '外部创建'));
    let item: any = await waitForRecord(RECORD_ID, (record) => record.content === '外部创建');
    expect(item.status).toBe('open');

    await obsidianPage.write(FILE, externalTaskMarkdown(RECORD_ID, '外部修改'));
    item = await waitForRecord(RECORD_ID, (record) => record.content === '外部修改');
    expect(item.id).toBe(RECORD_ID);

    await obsidianPage.delete(FILE);
    await waitForRecordMissing(RECORD_ID);
  });

  it('清缓存重建索引后记录仍存在，真实 Obsidian 重启后身份仍一致', async () => {
    await obsidianPage.write(FILE, externalTaskMarkdown(RECORD_ID, '重建索引保留'));
    const before: any = await waitForRecord(RECORD_ID);

    await browser.executeObsidianCommand('think-os:think-rebuild-index');
    const rebuilt: any = await waitForRecord(RECORD_ID, (record) => record.content === '重建索引保留', 20_000);
    expect(rebuilt.id).toBe(before.id);

    await browser.reloadObsidian();
    await waitForThinkReady();
    const after: any = await getRecordById(RECORD_ID);
    expect(after).not.toBeNull();
    expect(after.id).toBe(RECORD_ID);
    expect(after.content).toBe('重建索引保留');
  });
});
