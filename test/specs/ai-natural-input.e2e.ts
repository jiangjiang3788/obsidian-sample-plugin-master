/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F073/e2e
 * @covers F074/e2e
 * @covers F074/persistence
 */
import { $, browser } from '@wdio/globals';
import {
  THINK_PLUGIN_ID,
  clearE2EState,
  findRecordByContent,
  waitForThinkReady,
} from './support/thinkE2e';

const GOAL = 'E2E/AI';
const TASK_FILE = 'E2E/AITasks.md';
const CONTENT = 'V6 AI 真机任务';

async function prepareAiRuntime(): Promise<void> {
  const endpoint = String(process.env.THINK_E2E_AI_ENDPOINT || '').trim();
  if (!endpoint) throw new Error('缺少 THINK_E2E_AI_ENDPOINT，本测试必须由中文真机运行器启动。');

  await browser.executeObsidian(async ({ app }, pluginId, fixture) => {
    const plugin = (app as any).plugins.plugins[pluginId] as any;
    const manager = plugin.serviceManager;
    await manager.useCases.goal.addGoal({ path: 'E2E' });
    await manager.useCases.goal.addGoal({ path: fixture.goal });
    await manager.useCases.goal.upsertGoalTemplateDraft({
      goalPath: fixture.goal,
      recordTypeId: 'core.task',
      enabled: true,
      targetFile: fixture.taskFile,
      requiredFields: ['任务内容'],
    });
    const current = manager.settingsRepository.getSettings().aiSettings || {};
    await manager.useCases.settings.updateAiSettings({
      ...current,
      enabled: true,
      apiEndpoint: fixture.endpoint,
      apiKey: 'think-e2e-local-key',
      persistApiKey: true,
      model: 'think-e2e-local-model',
      temperature: 0.1,
      maxTokens: 1024,
      requestTimeoutMs: 10_000,
      customPrompt: '',
      allowMultipleResults: true,
      maxResults: 3,
    });
  }, THINK_PLUGIN_ID, { goal: GOAL, taskFile: TASK_FILE, endpoint });
}

async function openAiPrompt(text: string): Promise<void> {
  await browser.executeObsidianCommand('think-os:think-ai-natural-input');
  const modal = await $('.think-ai-prompt-modal');
  await modal.waitForExist({ timeout: 10_000 });
  const input = await modal.$('.think-ai-prompt__input');
  await input.setValue(text);
  const parse = await modal.$('//button[normalize-space()="解析"]');
  await parse.click();
}

describe('Think OS 真机 AI：自然语言 → 批量确认 → Vault', () => {
  beforeEach(async () => {
    await waitForThinkReady();
    await clearE2EState();
    await prepareAiRuntime();
  });

  it('真实命令经过本地 AI HTTP、解析器和批量确认 UI 保存任务，Obsidian 重启后仍能恢复', async () => {
    await openAiPrompt('帮我记录 V6 AI 真机任务');

    const confirm = await $('.think-ai-batch-confirm-modal');
    await confirm.waitForExist({ timeout: 15_000 });
    expect(await confirm.getText()).toContain('智能识别结果');
    expect(await confirm.getText()).toContain(CONTENT);

    const save = await confirm.$('[data-ai-batch-action="save-current"]');
    await save.waitForClickable({ timeout: 10_000 });
    await save.click();
    await browser.waitUntil(async () => (await save.getText()).includes('已保存'), {
      timeout: 15_000,
      interval: 200,
      timeoutMsg: 'AI 批量确认没有把当前记录保存成功。',
    });

    const complete = await confirm.$('[data-ai-batch-action="complete"]');
    await complete.click();
    await confirm.waitForExist({ reverse: true, timeout: 10_000 });

    const created = await findRecordByContent(CONTENT);
    expect(created).toMatchObject({ recordType: 'task', goalPath: GOAL, content: CONTENT });
    const createdId = String(created?.id || '');
    expect(createdId).not.toBe('');

    await browser.reloadObsidian();
    await waitForThinkReady();
    const restored = await findRecordByContent(CONTENT);
    expect(restored).toMatchObject({ id: createdId, recordType: 'task', goalPath: GOAL, content: CONTENT });
  });

  it('本地 AI 服务模拟失败时只展示失败提示，不打开批量确认窗口，也不产生记录', async () => {
    await openAiPrompt('触发失败');

    await browser.waitUntil(async () => {
      const notices = await $$('.notice');
      for (const notice of notices) {
        if ((await notice.getText()).includes('智能助手解析失败')) return true;
      }
      return false;
    }, {
      timeout: 15_000,
      interval: 250,
      timeoutMsg: 'AI 请求失败后没有出现中文失败提示。',
    });

    expect(await $('.think-ai-batch-confirm-modal').isExisting()).toBe(false);
    expect(await findRecordByContent(CONTENT)).toBeNull();
  });
});
