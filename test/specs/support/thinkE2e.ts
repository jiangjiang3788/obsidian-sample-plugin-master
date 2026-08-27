import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

export const THINK_PLUGIN_ID = 'think-os';
export const THINK_COMMAND_PREFIX = `${THINK_PLUGIN_ID}:`;
export const E2E_ROOT_GOAL = 'E2E';
export const E2E_LEVEL1_GOAL = 'E2E/一级';
export const E2E_LEVEL2_GOAL = 'E2E/一级/二级';
export const E2E_LEAF_GOAL = 'E2E/一级/二级/三级';
export const E2E_TASK_FILE = 'E2E/Tasks.md';

export async function waitForThinkReady(timeout = 30_000): Promise<void> {
  await browser.waitUntil(async () => {
    return browser.executeObsidian(({ app }, pluginId) => {
      const plugin = (app as any)?.plugins?.plugins?.[pluginId] as any;
      if (!plugin?.serviceManager) return false;
      try {
        const status = plugin.serviceManager.getLoadingStatus?.();
        return Boolean(status?.coreLoaded && status?.dataLoaded && status?.uiLoaded);
      } catch {
        return false;
      }
    }, THINK_PLUGIN_ID);
  }, {
    timeout,
    interval: 250,
    timeoutMsg: 'Think OS 在真实 Obsidian 中未进入就绪状态。',
  });
}

export async function getRuntimeSnapshot() {
  return browser.executeObsidian(({ app }, pluginId) => {
    const plugin = (app as any)?.plugins?.plugins?.[pluginId] as any;
    const manager = plugin?.serviceManager;
    if (!plugin || !manager) return { loaded: false } as const;
    const settings = manager.settingsRepository?.getSettings?.();
    const records = manager.dataStore?.queryRecords?.() || [];
    const timers = manager.useCases?.timer?.getTimers?.() || [];
    return {
      loaded: true,
      loadingStatus: manager.getLoadingStatus?.(),
      commandIds: Object.keys((app as any)?.commands?.commands || {}).filter((id) => id.startsWith(`${pluginId}:`)),
      goalPaths: (settings?.goalSettings?.goals || []).map((goal: any) => goal.path),
      goalTemplates: (settings?.goalSettings?.goalTemplates || []).map((row: any) => ({
        goalPath: row.goalPath,
        recordTypeId: row.recordTypeId,
        enabled: row.enabled !== false,
        targetFile: row.targetFile || null,
      })),
      recordCount: records.length,
      records: records.map((item: any) => ({
        id: item.id,
        coreBlock: item.coreBlock,
        status: item.status,
        goalPath: item.goalPath,
        content: item.content,
        filePath: item.filePath || item.path || null,
      })),
      timers: timers.map((timer: any) => ({ id: timer.id, taskId: timer.taskId, status: timer.status })),
    };
  }, THINK_PLUGIN_ID);
}

export async function readVaultFileOrNull(filePath: string): Promise<string | null> {
  return browser.executeObsidian(async ({ app }, path) => {
    const file = (app as any)?.vault?.getAbstractFileByPath?.(path);
    if (!file || typeof file !== 'object' || !('path' in file)) return null;
    try {
      return await (app as any).vault.cachedRead(file);
    } catch {
      return null;
    }
  }, filePath);
}

export async function getRecordById(recordId: string) {
  return browser.executeObsidian(({ app }, pluginId, id) => {
    const plugin = (app as any)?.plugins?.plugins?.[pluginId] as any;
    const item = plugin?.serviceManager?.dataStore?.getRecordById?.(id);
    if (!item) return null;
    return {
      id: item.id,
      coreBlock: item.coreBlock,
      status: item.status,
      goalPath: item.goalPath,
      content: item.content,
      filePath: item.filePath || item.path || null,
    };
  }, THINK_PLUGIN_ID, recordId);
}

export async function findRecordByContent(content: string) {
  return browser.executeObsidian(({ app }, pluginId, expectedContent) => {
    const plugin = (app as any)?.plugins?.plugins?.[pluginId] as any;
    const records = plugin?.serviceManager?.dataStore?.queryRecords?.() || [];
    const item = records.find((entry: any) => String(entry.content || '').trim() === expectedContent);
    if (!item) return null;
    return {
      id: item.id,
      coreBlock: item.coreBlock,
      status: item.status,
      goalPath: item.goalPath,
      content: item.content,
      filePath: item.filePath || item.path || null,
    };
  }, THINK_PLUGIN_ID, content);
}

export async function waitForRecord(recordId: string, predicate?: (record: any) => boolean, timeout = 15_000): Promise<any> {
  let latest: any = null;
  await browser.waitUntil(async () => {
    latest = await getRecordById(recordId);
    return Boolean(latest && (!predicate || predicate(latest)));
  }, { timeout, interval: 250, timeoutMsg: `记录 ${recordId} 未达到预期状态。` });
  return latest;
}

export async function waitForRecordMissing(recordId: string, timeout = 15_000): Promise<void> {
  await browser.waitUntil(async () => (await getRecordById(recordId)) === null, {
    timeout,
    interval: 250,
    timeoutMsg: `记录 ${recordId} 未从 DataStore 中移除。`,
  });
}

export async function clearE2EState(): Promise<void> {
  try { await obsidianPage.delete('E2E'); } catch {}
  await browser.executeObsidian(async ({ app }, pluginId, rootGoal) => {
    const plugin = (app as any)?.plugins?.plugins?.[pluginId] as any;
    const manager = plugin?.serviceManager;
    if (!manager) return;
    try { await manager.useCases?.goal?.deleteGoalCascade?.(rootGoal); } catch {}
    const timers = manager.useCases?.timer?.getTimers?.() || [];
    for (const timer of timers) {
      try { await manager.useCases.timer.removeTimer(timer.id); } catch {}
    }
    try { await manager.dataStore?.clearCacheAndRescan?.('full'); } catch {}
  }, THINK_PLUGIN_ID, E2E_ROOT_GOAL);
  await waitForThinkReady();
}

/**
 * Real settings fixture used by UI E2E.
 * Level 1 and leaf own a direct task template; level 2 intentionally has none.
 * This makes level 2 a navigation-only Goal and catches ancestor-template fallback.
 */
export async function seedFourLevelTaskGoals(): Promise<void> {
  await browser.executeObsidian(async ({ app }, pluginId, fixture) => {
    const plugin = (app as any)?.plugins?.plugins?.[pluginId] as any;
    const useCases = plugin?.serviceManager?.useCases;
    if (!useCases?.goal) throw new Error('Think GoalUseCase 不可用');
    try { await useCases.goal.deleteGoalCascade(fixture.root); } catch {}
    for (const path of fixture.goals) await useCases.goal.addGoal({ path });
    await useCases.goal.upsertGoalTemplateDraft({
      goalPath: fixture.level1,
      recordTypeId: 'core.task',
      enabled: true,
      targetFile: 'E2E/ParentTasks.md',
    });
    await useCases.goal.upsertGoalTemplateDraft({
      goalPath: fixture.leaf,
      recordTypeId: 'core.task',
      enabled: true,
      targetFile: fixture.taskFile,
      requiredFields: ['任务内容'],
    });
  }, THINK_PLUGIN_ID, {
    root: E2E_ROOT_GOAL,
    level1: E2E_LEVEL1_GOAL,
    leaf: E2E_LEAF_GOAL,
    taskFile: E2E_TASK_FILE,
    goals: [E2E_ROOT_GOAL, E2E_LEVEL1_GOAL, E2E_LEVEL2_GOAL, E2E_LEAF_GOAL],
  });
}

export function externalTaskMarkdown(recordId: string, content: string, goalPath = E2E_LEAF_GOAL): string {
  return [
    '<!-- start -->',
    `记录ID:: ${recordId}`,
    '记录类型:: task',
    '状态:: open',
    `目标:: ${goalPath}`,
    '创建于:: 2026-08-24 12:00',
    `内容:: ${content}`,
    '<!-- end -->',
    '',
  ].join('\n');
}
