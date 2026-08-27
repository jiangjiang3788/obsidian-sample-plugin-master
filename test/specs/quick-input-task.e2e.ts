/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F014/e2e
 * @covers F027/e2e
 * @covers F042/e2e
 * @covers F031/e2e
 * @covers F035/e2e
 * @covers F036/e2e
 * @covers F040/e2e
 * @covers F041/e2e
 * @covers F041/ui
 * @covers F043/e2e
 * @covers F043/regression
 * @covers F043/restart
 * @covers F043/ui
 * @covers F126/e2e
 */
import { $, browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import {
  E2E_LEVEL1_GOAL,
  E2E_LEVEL2_GOAL,
  E2E_LEAF_GOAL,
  E2E_ROOT_GOAL,
  E2E_TASK_FILE,
  clearE2EState,
  findRecordByContent,
  seedFourLevelTaskGoals,
  waitForThinkReady,
} from './support/thinkE2e';

const TASK_CONTENT = 'E2E 真机任务：四列 Goal + Quick Input';

describe('Think OS 真机 UI：四列 Goal Cascade 与 Quick Input', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await seedFourLevelTaskGoals();
  });

  it('四层 Goal 可逐列钻取，中间 Goal 不继承父模板，叶子直接模板可提交', async () => {
    await browser.executeObsidianCommand('think-os:think-quick-input-unified-core.task');
    const modal = await $('.think-modal--quick-input');
    await modal.waitForExist({ timeout: 10_000 });

    const root = await $(`[data-goal-path="${E2E_ROOT_GOAL}"]`);
    await root.waitForExist({ timeout: 5_000 });
    expect(await root.getAttribute('aria-selected')).not.toBe('true');
    await root.click();

    const level1 = await $(`[data-goal-path="${E2E_LEVEL1_GOAL}"]`);
    await level1.waitForExist({ timeout: 5_000 });
    await level1.click();
    expect(await level1.getAttribute('aria-selected')).toBe('true');

    const level2 = await $(`[data-goal-path="${E2E_LEVEL2_GOAL}"]`);
    await level2.waitForExist({ timeout: 5_000 });
    await level2.click();
    expect(await level2.getAttribute('aria-selected')).not.toBe('true');
    const activePath = await $('.think-quick-input-goal-active-path');
    expect(await activePath.getText()).toContain('二级');

    const leaf = await $(`[data-goal-path="${E2E_LEAF_GOAL}"]`);
    await leaf.waitForExist({ timeout: 5_000 });
    await leaf.click();
    expect(await leaf.getAttribute('aria-selected')).toBe('true');

    const columns = await $$('.think-quick-input-goal-level');
    expect(columns.length).toBeGreaterThanOrEqual(4);

    const contentInput = await $('//div[contains(@class,"think-qif-row")][.//span[contains(@class,"think-qif-label") and contains(normalize-space(),"内容")]]//input');
    await contentInput.waitForDisplayed({ timeout: 5_000 });
    await contentInput.setValue(TASK_CONTENT);

    const submit = await $('[data-submit="true"]');
    await browser.waitUntil(async () => !(await submit.getAttribute('disabled')), {
      timeout: 5_000,
      interval: 100,
      timeoutMsg: '选择当前 Goal 的直接模板后，Quick Input 提交按钮仍处于禁用状态。',
    });
    await submit.click();
    await modal.waitForExist({ reverse: true, timeout: 15_000 });

    const markdown = await obsidianPage.read(E2E_TASK_FILE);
    expect(markdown).toContain(TASK_CONTENT);
    expect(markdown).toContain(`目标:: ${E2E_LEAF_GOAL}`);

    const record: any = await findRecordByContent(TASK_CONTENT);
    expect(record).not.toBeNull();
    expect(record.coreBlock).toBe('task');
    expect(record.goalPath).toBe(E2E_LEAF_GOAL);
    expect(record.status).toBe('open');
  });

  it('Quick Input 创建的 Record 在真实 Obsidian 重启后仍能从 DataStore 恢复', async () => {
    await browser.executeObsidianCommand('think-os:think-quick-input-unified-core.task');
    const modal = await $('.think-modal--quick-input');
    await modal.waitForExist({ timeout: 10_000 });

    for (const path of [E2E_ROOT_GOAL, E2E_LEVEL1_GOAL, E2E_LEVEL2_GOAL, E2E_LEAF_GOAL]) {
      const row = await $(`[data-goal-path="${path}"]`);
      await row.waitForExist({ timeout: 5_000 });
      await row.click();
    }
    const contentInput = await $('//div[contains(@class,"think-qif-row")][.//span[contains(@class,"think-qif-label") and contains(normalize-space(),"内容")]]//input');
    await contentInput.setValue(`${TASK_CONTENT} - restart`);
    const submit = await $('[data-submit="true"]');
    await submit.click();
    await modal.waitForExist({ reverse: true, timeout: 15_000 });

    const before: any = await findRecordByContent(`${TASK_CONTENT} - restart`);
    expect(before).not.toBeNull();

    await browser.reloadObsidian();
    await waitForThinkReady();
    const after: any = await findRecordByContent(`${TASK_CONTENT} - restart`);
    expect(after).not.toBeNull();
    expect(after.id).toBe(before.id);
    expect(after.goalPath).toBe(E2E_LEAF_GOAL);
  });
});
