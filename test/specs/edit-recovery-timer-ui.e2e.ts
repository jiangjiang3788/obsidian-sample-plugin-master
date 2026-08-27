/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F044/e2e
 * @covers F045/e2e
 * @covers F045/error
 * @covers F045/ui
 * @covers F056/e2e
 * @covers F056/ui
 */
import { $, browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import {
  E2E_LEAF_GOAL,
  THINK_PLUGIN_ID,
  clearE2EState,
  externalTaskMarkdown,
  getRecordById,
  seedFourLevelTaskGoals,
  waitForRecord,
  waitForThinkReady,
} from './support/thinkE2e';

const TASK_ID = 'task.01KZZE2E000000000000000099';
const FILE = 'E2E/EditRecoveryTask.md';
const ORIGINAL = '真机编辑与故障恢复任务';

async function startTimerAndWaitForRow() {
  await browser.executeObsidian(async ({ app }, pluginId, taskId) => {
    const plugin = (app as any).plugins.plugins[pluginId] as any;
    await plugin.serviceManager.timerService.startOrResume(taskId);
  }, THINK_PLUGIN_ID, TASK_ID);
  const row = await $('.think-timer-row');
  await row.waitForExist({ timeout: 10_000 });
  return row;
}

async function openEditFromTimer() {
  const row = await startTimerAndWaitForRow();
  const edit = await row.$('button[aria-label="编辑任务"]');
  await edit.click();
  const modal = await $('.think-modal--quick-input');
  await modal.waitForExist({ timeout: 10_000 });
  return modal;
}

async function contentInput() {
  const input = await $('//div[contains(@class,"think-qif-row")][.//span[contains(@class,"think-qif-label") and contains(normalize-space(),"内容")]]//input');
  await input.waitForDisplayed({ timeout: 5_000 });
  return input;
}

describe('Think OS v4 真机 UI：编辑 / 冲突恢复 / Timer', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await seedFourLevelTaskGoals();
    await obsidianPage.write(FILE, externalTaskMarkdown(TASK_ID, ORIGINAL, E2E_LEAF_GOAL));
    await waitForRecord(TASK_ID);
  });

  it('从 Timer 真实 UI 打开已有 Task，字段回填后修改并写回，重启仍保持', async () => {
    const modal = await openEditFromTimer();
    const input = await contentInput();
    expect(await input.getValue()).toContain(ORIGINAL);
    await input.setValue('真机 UI 编辑后');

    const submit = await $('[data-submit="true"]');
    await submit.click();
    await modal.waitForExist({ reverse: true, timeout: 15_000 });
    expect(await obsidianPage.read(FILE)).toContain('内容:: 真机 UI 编辑后');

    await browser.reloadObsidian();
    await waitForThinkReady();
    const item: any = await getRecordById(TASK_ID);
    expect(item?.content).toBe('真机 UI 编辑后');
  });

  it('外部文件变化制造真实冲突后显示恢复面板；恢复文件→重新扫描→重试保存可以成功', async () => {
    const modal = await openEditFromTimer();
    const input = await contentInput();
    await input.setValue('冲突恢复后的内容');

    // 模拟同步软件/用户手工编辑：Modal 打开后，原 Record 暂时从文件中消失。
    await obsidianPage.write(FILE, '# 外部程序暂时改写了文件\n');
    const submit = await $('[data-submit="true"]');
    await submit.click();

    const recovery = await $('.think-quick-input-recovery[role="alert"]');
    await recovery.waitForDisplayed({ timeout: 10_000 });
    expect(await recovery.getText()).toContain('冲突');
    expect(await recovery.getText()).toContain(FILE);

    // 外部数据恢复后，用户使用产品提供的“重新扫描→重试保存”。
    await obsidianPage.write(FILE, externalTaskMarkdown(TASK_ID, ORIGINAL, E2E_LEAF_GOAL));
    const rescan = await recovery.$('button*=重新扫描');
    await rescan.click();
    await browser.waitUntil(async () => !(await rescan.getAttribute('disabled')), {
      timeout: 10_000,
      interval: 200,
      timeoutMsg: 'Quick Input 恢复流程的重新扫描未完成。',
    });

    const retry = await recovery.$('button*=重试保存');
    await retry.click();
    await modal.waitForExist({ reverse: true, timeout: 15_000 });
    expect(await obsidianPage.read(FILE)).toContain('内容:: 冲突恢复后的内容');
  });

  it('Timer 悬浮窗真实按钮支持暂停→继续→完成任务，并同步 Task 状态', async () => {
    const row = await startTimerAndWaitForRow();
    const pause = await row.$('button[aria-label="暂停"]');
    await pause.click();

    const resume = await row.$('button[aria-label="继续"]');
    await resume.waitForExist({ timeout: 5_000 });
    await resume.click();

    const pauseAgain = await row.$('button[aria-label="暂停"]');
    await pauseAgain.waitForExist({ timeout: 5_000 });
    const complete = await row.$('button*=完成任务');
    await complete.click();

    await browser.waitUntil(async () => (await getRecordById(TASK_ID) as any)?.status === 'done', {
      timeout: 15_000,
      interval: 250,
      timeoutMsg: '通过计时器界面完成后，任务状态未变为已完成。',
    });
    expect((await getRecordById(TASK_ID) as any)?.status).toBe('done');
  });
});
