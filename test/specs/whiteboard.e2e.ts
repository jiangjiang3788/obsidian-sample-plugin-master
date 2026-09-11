/**
 * @covers F094/e2e
 * @covers F094/persistence
 * @covers F095/e2e
 * @covers F095/persistence
 * @covers F097/e2e
 * @covers F097/regression
 * @covers F098/e2e
 * @covers F098/regression
 * @covers F099/e2e
 * @covers F099/persistence
 * @covers F099/regression
 * @covers F134/e2e
 * @covers F134/persistence
 * @covers F134/regression
 * @covers F135/e2e
 * @covers F135/persistence
 * @covers F135/regression
 * @covers F136/e2e
 * @covers F136/persistence
 * @covers F136/regression
 * @covers F137/e2e
 * @covers F137/persistence
 * @covers F137/regression
 * @covers F138/e2e
 * @covers F138/persistence
 * @covers F138/regression
 * @covers F139/e2e
 * @covers F139/persistence
 * @covers F139/regression
 * @covers F140/e2e
 * @covers F140/persistence
 * @covers F140/regression
 * @covers F141/e2e
 * @covers F141/persistence
 * @covers F141/regression
 * @covers F142/e2e
 * @covers F142/regression
 * @covers F144/e2e
 * @covers F144/regression
 * @covers F145/e2e
 * @covers F145/regression
 * @covers F146/e2e
 * @covers F146/persistence
 * @covers F146/restart
 * @covers F146/regression
 * @covers F147/e2e
 * @covers F147/persistence
 * @covers F147/regression
 * @covers F148/e2e
 * @covers F148/persistence
 * @covers F148/regression
 * @covers F149/e2e
 * @covers F149/persistence
 * @covers F149/regression
 * @covers F150/e2e
 * @covers F150/regression
 * @covers F151/e2e
 * @covers F151/persistence
 * @covers F151/regression
 * @covers F152/e2e
 * @covers F152/persistence
 * @covers F152/regression
 */
import { $, browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { externalTaskMarkdown, THINK_COMMAND_PREFIX, THINK_PLUGIN_ID, waitForThinkReady } from './support/thinkE2e';

const RECORD_ID = 'e2e-whiteboard-task';
const CONTENT = 'E2E 白板独立工作区任务';
const DRAG_RECORD_ID = 'e2e-whiteboard-drag-task';
const DRAG_CONTENT = 'E2E 白板左右拖任务';
const BATCH_A_ID = 'e2e-whiteboard-batch-a';
const BATCH_B_ID = 'e2e-whiteboard-batch-b';
const BATCH_CONTENT = 'E2E 白板批量拖';
const ARCHIVE_ID = 'e2e-whiteboard-archive';
const ARCHIVE_CONTENT = 'E2E 白板归档恢复';
const STABILITY_ARCHIVE_ID = 'e2e-whiteboard-nested-archive';
const STABILITY_ARCHIVE_CONTENT = 'E2E 白板深层归档恢复';
const SEMANTIC_LAYOUT_A_ID = 'e2e-whiteboard-semantic-layout-a';
const SEMANTIC_LAYOUT_B_ID = 'e2e-whiteboard-semantic-layout-b';
const SEMANTIC_LAYOUT_CONTENT = 'E2E 白板目标类型时间';
const DAILY_CLOSURE_IDS = ['e2e-whiteboard-daily-a', 'e2e-whiteboard-daily-b', 'e2e-whiteboard-daily-c', 'e2e-whiteboard-daily-d'] as const;
const DAILY_CLOSURE_CONTENT = 'E2E 白板日常闭环';
const DAILY_CLOSURE_GOAL = 'E2E日常闭环';
const DATA_FILE = 'E2E/白板数据.md';

describe('ThinkOS 真机 UI：独立白板工作区', () => {
  before(async () => {
    await waitForThinkReady();
    try { await obsidianPage.delete('E2E'); } catch {}
    await obsidianPage.write(DATA_FILE, `${externalTaskMarkdown(RECORD_ID, CONTENT, 'E2E')}\n${externalTaskMarkdown(DRAG_RECORD_ID, DRAG_CONTENT, 'E2E')}\n${externalTaskMarkdown(BATCH_A_ID, `${BATCH_CONTENT} A`, 'E2E')}\n${externalTaskMarkdown(BATCH_B_ID, `${BATCH_CONTENT} B`, 'E2E')}
${externalTaskMarkdown(ARCHIVE_ID, ARCHIVE_CONTENT, 'E2E')}\n${externalTaskMarkdown(STABILITY_ARCHIVE_ID, STABILITY_ARCHIVE_CONTENT, 'E2E')}\n${externalTaskMarkdown(SEMANTIC_LAYOUT_A_ID, `${SEMANTIC_LAYOUT_CONTENT} A`, 'E2E布局')}\n${externalTaskMarkdown(SEMANTIC_LAYOUT_B_ID, `${SEMANTIC_LAYOUT_CONTENT} B`, 'E2E布局')}\n${DAILY_CLOSURE_IDS.map((id, index) => externalTaskMarkdown(id, `${DAILY_CLOSURE_CONTENT} ${String.fromCharCode(65 + index)}`, DAILY_CLOSURE_GOAL)).join('\n')}`);
    await browser.executeObsidian(async ({ app }, pluginId) => {
      type PluginShape = { serviceManager: { dataStore: { clearCacheAndRescan(mode: string): Promise<void> } } };
      const host = app as unknown as { plugins: { plugins: Record<string, unknown> } };
      const plugin = host.plugins.plugins[pluginId] as PluginShape;
      await plugin.serviceManager.dataStore.clearCacheAndRescan('full');
    }, THINK_PLUGIN_ID);
  });

  it('通过一级命令打开独立 Workspace，不依赖 Layout/ViewInstance', async () => {
    await browser.executeObsidian(({ app }, commandId) => {
      const host = app as unknown as { commands: { executeCommandById(id: string): void } };
      host.commands.executeCommandById(commandId);
    }, `${THINK_COMMAND_PREFIX}think-open-whiteboard`);
    const workspace = await $('.think-whiteboard-workspace');
    await workspace.waitForDisplayed({ timeout: 10_000 });
    expect(await $('.think-whiteboard-source').isExisting()).toBe(true);
    expect(await $('main[aria-label="白板"]').isExisting()).toBe(true);
    expect(await $('.think-os--layout').isExisting()).toBe(false);
  });

  it('左侧找到 Record 加入后真实落盘到 Think/whiteboards.json', async () => {
    const input = await $('input[aria-label="搜索记录"]');
    await input.setValue(CONTENT);
    const add = await $('button*=加入');
    await add.waitForClickable({ timeout: 8_000 });
    await add.click();
    await browser.waitUntil(async () => Boolean(await browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return false;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string }> }> };
      return Object.values(raw.boards ?? {}).some((board) => board.items?.some((item) => item.recordId === recordId));
    }, RECORD_ID)), { timeout: 8_000, interval: 100, timeoutMsg: '白板加入后 whiteboards.json 未出现 recordId。' });
    expect(await $(`[data-whiteboard-item-id]`).isExisting()).toBe(true);
    expect(await $(`[data-whiteboard-source-record-id="${RECORD_ID}"]`).isExisting()).toBe(false);
  });

  it('白板 Zoom/Pan 只改变当前工作区 camera，不改 WhiteboardItem durable XY', async () => {
    const before = await browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; x?: number; y?: number }> }> };
      for (const boardData of Object.values(raw.boards ?? {})) {
        const item = boardData.items?.find((candidate) => candidate.recordId === recordId);
        if (item) return { x: item.x, y: item.y };
      }
      return null;
    }, RECORD_ID);

    const zoomIn = await $('button[aria-label="放大白板"]');
    await zoomIn.waitForClickable({ timeout: 8_000 });
    await zoomIn.click();
    expect(await $('.think-whiteboard-canvas-viewport').getAttribute('data-whiteboard-zoom')).toBe('1.25');

    const after = await browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; x?: number; y?: number }> }> };
      for (const boardData of Object.values(raw.boards ?? {})) {
        const item = boardData.items?.find((candidate) => candidate.recordId === recordId);
        if (item) return { x: item.x, y: item.y };
      }
      return null;
    }, RECORD_ID);
    expect(after).toEqual(before);

    const reset = await $('button[aria-label="重置白板缩放到 100%"]');
    await reset.click();
    const viewport = await $('.think-whiteboard-canvas-viewport');
    expect(await viewport.getAttribute('data-whiteboard-zoom')).toBe('1');

    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaY: 1000, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => Number(await viewport.getAttribute('data-whiteboard-zoom')) < 0.5, { timeout: 4_000, interval: 50 });
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaY: -2000, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => Number(await viewport.getAttribute('data-whiteboard-zoom')) > 2, { timeout: 4_000, interval: 50 });
    await reset.click();
    expect(await viewport.getAttribute('data-whiteboard-zoom')).toBe('1');

    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaX: -180, deltaY: 120, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => (await viewport.getAttribute('data-whiteboard-camera-x')) !== '0', {
      timeout: 4_000,
      interval: 100,
      timeoutMsg: '普通 wheel 未推进白板 camera。',
    });
    expect(Number(await viewport.getAttribute('data-whiteboard-camera-x'))).toBeLessThan(0);
    expect(Number(await viewport.getAttribute('data-whiteboard-camera-y'))).toBeGreaterThan(0);

    const afterPan = await browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; x?: number; y?: number }> }> };
      for (const boardData of Object.values(raw.boards ?? {})) {
        const item = boardData.items?.find((candidate) => candidate.recordId === recordId);
        if (item) return { x: item.x, y: item.y };
      }
      return null;
    }, RECORD_ID);
    expect(afterPan).toEqual(before);
  });

  it('1.2.5 R3 极端 Zoom/Pan 后可在 100% 找回真实内容，也可一键 Fit 当前画布', async () => {
    const viewport = await $('.think-whiteboard-canvas-viewport');
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaY: 2400, ctrlKey: true, bubbles: true, cancelable: true }));
      target?.dispatchEvent(new WheelEvent('wheel', { deltaX: 6000, deltaY: -4000, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => Number(await viewport.getAttribute('data-whiteboard-zoom')) < 0.1, { timeout: 4_000, interval: 50 });
    await (await $('button[aria-label="回到画布中心"]')).click();
    expect(await viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    const recovered = await browser.execute(() => {
      const viewportElement = document.querySelector('.think-whiteboard-canvas-viewport');
      if (!viewportElement) return false;
      const viewportRect = viewportElement.getBoundingClientRect();
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-whiteboard-item-id], [data-whiteboard-group-id], [data-whiteboard-annotation-id]'));
      return nodes.some((node) => {
        const rect = node.getBoundingClientRect();
        return rect.right > viewportRect.left && rect.left < viewportRect.right && rect.bottom > viewportRect.top && rect.top < viewportRect.bottom;
      });
    });
    expect(recovered).toBe(true);
    await (await $('button[aria-label="适配当前画布内容"]')).click();
    const fittedZoom = Number(await viewport.getAttribute('data-whiteboard-zoom'));
    expect(fittedZoom).toBeGreaterThan(0); expect(fittedZoom).toBeLessThanOrEqual(1);
  });

  it('1.2.6-1.2.8 极小缩放进入概览定位层，卡片/工作台不会缩没且点击标记可回到 100%', async () => {
    const viewport = await $('.think-whiteboard-canvas-viewport');
    await (await $('button[aria-label^="重置白板缩放"]')).click();
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaY: 1200, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => (await viewport.getAttribute('data-whiteboard-lod')) === 'overview', { timeout: 4_000, interval: 50, timeoutMsg: '极小缩放没有进入 semantic overview。' });
    expect(await $('[data-whiteboard-overview-item-id]').isExisting()).toBe(true);
    expect(await $('.think-whiteboard-semantic-status').getText()).toContain('概览模式');
    const widthBefore = await (await $('[data-whiteboard-overview-item-id] button')).getSize('width');
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => Number(await viewport.getAttribute('data-whiteboard-zoom')) < 0.03, { timeout: 4_000, interval: 50 });
    const widthAfter = await (await $('[data-whiteboard-overview-item-id] button')).getSize('width');
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(1);
    const marker = await $('[data-whiteboard-overview-item-id] button');
    await marker.waitForClickable({ timeout: 4_000 });
    await marker.click();
    expect(await viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(await viewport.getAttribute('data-whiteboard-lod')).toBe('detail');
    expect(await $('[data-whiteboard-item-id]').isExisting()).toBe(true);
  });

  it('1.1.6 全选当前结果后拖任一选中行，会一次把整组 Record 网格加入白板', async () => {
    const input = await $('input[aria-label="搜索记录"]');
    await input.setValue(BATCH_CONTENT);
    const selectAll = await $('button*=全选结果');
    await selectAll.waitForClickable({ timeout: 8_000 });
    await selectAll.click();
    await browser.waitUntil(async () => (await $('.think-whiteboard-source__selection-count').getText()).includes('已选 2'), {
      timeout: 4_000,
      interval: 100,
      timeoutMsg: '批量选择没有选中完整查询结果。',
    });
    const sourceCard = await $(`[data-whiteboard-source-record-id="${BATCH_A_ID}"]`);
    await sourceCard.waitForDisplayed({ timeout: 8_000 });
    await sourceCard.dragAndDrop(await $('main[aria-label="白板"]'));

    const positions = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, ids) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; x?: number; y?: number }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []);
      const found = ids.map((id) => items.find((item) => item.recordId === id));
      if (found.some((item) => !item || !Number.isFinite(item.x) || !Number.isFinite(item.y))) return null;
      return found.map((item) => ({ x: item?.x as number, y: item?.y as number }));
    }, [BATCH_A_ID, BATCH_B_ID]), {
      timeout: 8_000,
      interval: 100,
      timeoutMsg: '批量拖入后 whiteboards.json 未同时出现两条 Record。',
    });
    expect(positions).toHaveLength(2);
    expect(positions?.[0]).not.toEqual(positions?.[1]);
    expect(await $(`[data-whiteboard-source-record-id="${BATCH_A_ID}"]`).isExisting()).toBe(false);
    expect(await $(`[data-whiteboard-source-record-id="${BATCH_B_ID}"]`).isExisting()).toBe(false);
  });

  it('左侧 Record 小卡片可直接拖到右侧指定位置，右侧卡拖回左栏只移出 Projection', async () => {
    const input = await $('input[aria-label="搜索记录"]');
    await input.setValue(DRAG_CONTENT);
    const sourceCard = await $(`[data-whiteboard-source-record-id="${DRAG_RECORD_ID}"]`);
    await sourceCard.waitForDisplayed({ timeout: 8_000 });
    const viewport = await $('.think-whiteboard-canvas-viewport');
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport');
      target?.dispatchEvent(new WheelEvent('wheel', { deltaX: -1_200, bubbles: true, cancelable: true }));
    });
    await browser.waitUntil(async () => Number(await viewport.getAttribute('data-whiteboard-camera-x')) < -500, {
      timeout: 4_000,
      interval: 100,
      timeoutMsg: 'Source drop 前未进入负 world camera。',
    });
    const board = await $('main[aria-label="白板"]');
    await sourceCard.dragAndDrop(board);

    const dropped = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string; x?: number; y?: number }> }> };
      for (const boardData of Object.values(raw.boards ?? {})) {
        const item = boardData.items?.find((candidate) => candidate.recordId === recordId);
        if (item?.id && Number.isFinite(item.x) && Number.isFinite(item.y)) return { id: item.id, x: item.x as number, y: item.y as number };
      }
      return null;
    }, DRAG_RECORD_ID), { timeout: 8_000, interval: 100, timeoutMsg: '左拖右后 whiteboards.json 未出现指定 recordId/XY。' });

    expect(dropped).toBeTruthy();
    expect(dropped?.x).toBeLessThan(0);
    const whiteboardCard = await $(`[data-whiteboard-item-id="${dropped?.id}"]`);
    await whiteboardCard.waitForDisplayed({ timeout: 8_000 });
    const sourcePanel = await $('aside[aria-label="搜索记录"]');
    await whiteboardCard.dragAndDrop(sourcePanel);

    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return false;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string }> }> };
      return Object.values(raw.boards ?? {}).every((boardData) => !boardData.items?.some((item) => item.recordId === recordId));
    }, DRAG_RECORD_ID), { timeout: 8_000, interval: 100, timeoutMsg: '右拖左后 Projection 未从 whiteboards.json 移除。' });

    const canonicalStillExists = await browser.executeObsidian(({ app }, pluginId, recordId) => {
      type PluginShape = { serviceManager: { dataStore: { getRecordById(id: string): unknown } } };
      const host = app as unknown as { plugins: { plugins: Record<string, unknown> } };
      const plugin = host.plugins.plugins[pluginId] as PluginShape;
      return Boolean(plugin.serviceManager.dataStore.getRecordById(recordId));
    }, THINK_PLUGIN_ID, DRAG_RECORD_ID);
    expect(canonicalStillExists).toBe(true);
  });

  it('1.1.7 新建工作台后可把现有卡拖入、重命名和折叠，groupId/工作台状态真实落盘', async () => {
    const center = await $('button[aria-label="回到画布中心"]');
    await center.click();
    const createWorkbench = await $('button[aria-label="新建工作台"]');
    await createWorkbench.waitForClickable({ timeout: 8_000 });
    await createWorkbench.click();
    const group = await $('[data-whiteboard-group-id]');
    await group.waitForDisplayed({ timeout: 8_000 });
    const groupId = await group.getAttribute('data-whiteboard-group-id');
    const itemId = await browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json');
      if (!file || !('path' in file)) return '';
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string }> }> };
      return Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).find((item) => item.recordId === recordId)?.id ?? '';
    }, RECORD_ID);
    const card = await $(`[data-whiteboard-item-id="${itemId}"]`);
    await card.waitForDisplayed({ timeout: 8_000 });
    await card.dragAndDrop(group);
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, id, expectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; groupId?: string }> }> };
      return Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).some((item) => item.id === id && item.groupId === expectedGroupId);
    }, itemId, groupId), { timeout: 8_000, interval: 100, timeoutMsg: '拖入工作台后 item.groupId 未持久化。' });

    const rename = await group.$('button*=重命名'); await rename.click();
    const nameInput = await group.$('input[aria-label="工作台名称"]'); await nameInput.setValue('E2E 工作台'); await browser.keys('Enter');
    await browser.waitUntil(async () => (await group.getText()).includes('E2E 工作台'), { timeout: 4_000, interval: 100 });
    const collapse = await group.$('button[aria-label="折叠工作台"]'); await collapse.click();
    await browser.waitUntil(async () => !(await $(`[data-whiteboard-item-id="${itemId}"]`).isExisting()), { timeout: 4_000, interval: 100 });
    const persisted = await browser.executeObsidian(async ({ app }, expectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; title?: string; collapsed?: boolean }> }> };
      return Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []).find((candidate) => candidate.id === expectedGroupId) ?? null;
    }, groupId);
    expect(persisted).toMatchObject({ id: groupId, title: 'E2E 工作台', collapsed: true });
    const viewport = await $('.think-whiteboard-canvas-viewport');
    await browser.execute(() => document.querySelector('.think-whiteboard-canvas-viewport')?.dispatchEvent(new WheelEvent('wheel', { deltaY: 1200, ctrlKey: true, bubbles: true, cancelable: true })));
    await browser.waitUntil(async () => (await viewport.getAttribute('data-whiteboard-lod')) === 'overview', { timeout: 4_000, interval: 50 });
    const groupMarker = await $(`[data-whiteboard-overview-group-id="${groupId}"] button`);
    await groupMarker.waitForClickable({ timeout: 4_000 });
    await groupMarker.click();
    expect(await viewport.getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(await viewport.getAttribute('data-whiteboard-lod')).toBe('detail');
    expect(await $(`[data-whiteboard-group-id="${groupId}"]`).isExisting()).toBe(true);
  });

  it('1.2.0 + 1.2.1 进入 Workbench 后可继续创建子工作台，Undo / Redo 原子撤销与恢复 parentGroupId', async () => {
    const parent = await $('[data-whiteboard-group-id]'); await parent.waitForDisplayed({ timeout: 8_000 });
    const parentId = await parent.getAttribute('data-whiteboard-group-id');
    const enter = await parent.$('button[aria-label="全屏进入工作台"]'); await enter.click();
    await $('[data-whiteboard-breadcrumb-group-id]').waitForDisplayed({ timeout: 4_000 });
    const create = await $('button[aria-label="新建工作台"]'); await create.click();
    const childId = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, expectedParentId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
      return Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []).find((group) => group.parentGroupId === expectedParentId)?.id ?? '';
    }, parentId), { timeout: 8_000, interval: 100, timeoutMsg: '子工作台 parentGroupId 未持久化。' });
    expect(childId).toBeTruthy();
    const undo = await $('button[aria-label="撤销白板操作"]'); await undo.click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, id) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string }> }> };
      return Object.values(raw.boards ?? {}).every((boardData) => !(boardData.groups ?? []).some((group) => group.id === id));
    }, childId), { timeout: 8_000, interval: 100, timeoutMsg: 'Undo 未撤销子工作台。' });
    const redo = await $('button[aria-label="重做白板操作"]'); await redo.click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, id, expectedParentId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => (boardData.groups ?? []).some((group) => group.id === id && group.parentGroupId === expectedParentId));
    }, childId, parentId), { timeout: 8_000, interval: 100, timeoutMsg: 'Redo 未恢复子工作台。' });
    const rootCrumb = await $('.think-whiteboard-breadcrumbs__item=白板'); await rootCrumb.click();
  });

  it('1.1.8 Ctrl/⌘ 多选两张卡后拖任一张，整组选中卡以同一 world delta 原子移动', async () => {
    const ids = await browser.executeObsidian(async ({ app }, recordIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return [];
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string; x?: number; y?: number }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []);
      return recordIds.map((recordId) => items.find((item) => item.recordId === recordId)?.id ?? '');
    }, [BATCH_A_ID, BATCH_B_ID]);
    expect(ids.every(Boolean)).toBe(true);
    const before = await browser.executeObsidian(async ({ app }, itemIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return [];
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []);
      return itemIds.map((id) => { const item = items.find((candidate) => candidate.id === id); return { x: item?.x ?? 0, y: item?.y ?? 0 }; });
    }, ids);
    await browser.execute((itemIds) => {
      itemIds.forEach((id, index) => document.querySelector(`[data-whiteboard-item-id="${id}"]`)?.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: index + 20, pointerType: 'mouse', button: 0, ctrlKey: true,
      })));
    }, ids);
    await browser.waitUntil(async () => (await $('.think-whiteboard-board-selection').getText()).includes('已选 2'), { timeout: 4_000, interval: 100 });
    await browser.execute((itemId) => {
      const card = document.querySelector(`[data-whiteboard-item-id="${itemId}"]`) as HTMLElement | null; if (!card) return;
      const rect = card.getBoundingClientRect(); const pointerId = 77; const startX = rect.left + 40; const startY = rect.top + 40;
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: startX, clientY: startY }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', buttons: 1, clientX: startX + 140, clientY: startY + 90 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: startX + 140, clientY: startY + 90 }));
    }, ids[0]);
    const after = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []);
      const found = itemIds.map((id) => items.find((candidate) => candidate.id === id));
      if (found.some((item) => !item)) return null;
      return found.map((item) => ({ x: item?.x ?? 0, y: item?.y ?? 0 }));
    }, ids), { timeout: 8_000, interval: 100, timeoutMsg: '多选整组拖动后 durable XY 未写盘。' });
    const dxA = after![0].x - before[0].x; const dyA = after![0].y - before[0].y;
    const dxB = after![1].x - before[1].x; const dyB = after![1].y - before[1].y;
    expect(Math.abs(dxA)).toBeGreaterThan(1); expect(Math.abs(dyA)).toBeGreaterThan(1);
    expect(Math.abs(dxA - dxB)).toBeLessThan(0.01); expect(Math.abs(dyA - dyB)).toBeLessThan(0.01);
  });


  it('1.1.9 归档后从 Canvas 消失且不回 Record Source；归档箱恢复到原 world 坐标，回中心同时恢复 100%', async () => {
    const input = await $('input[aria-label="搜索记录"]'); await input.setValue(ARCHIVE_CONTENT);
    const add = await $('button*=加入'); await add.waitForClickable({ timeout: 8_000 }); await add.click();
    const before = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string; x?: number; y?: number }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).find((candidate) => candidate.recordId === recordId);
      return item?.id ? { id: item.id, x: item.x ?? 0, y: item.y ?? 0 } : null;
    }, ARCHIVE_ID), { timeout: 8_000, interval: 100, timeoutMsg: '归档 E2E Record 未加入白板。' });
    const card = await $(`[data-whiteboard-item-id="${before!.id}"]`); await card.waitForDisplayed({ timeout: 8_000 });
    const archive = await card.$('button*=归档'); await archive.click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string }>; archivedItems?: Array<{ recordId?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => !boardData.items?.some((item) => item.recordId === recordId) && boardData.archivedItems?.some((item) => item.recordId === recordId));
    }, ARCHIVE_ID), { timeout: 8_000, interval: 100, timeoutMsg: '归档后 Projection 未进入 archivedItems。' });
    expect(await $(`[data-whiteboard-source-record-id="${ARCHIVE_ID}"]`).isExisting()).toBe(false);
    const archiveBox = await $('button[aria-label*="归档箱"]'); await archiveBox.click();
    const archiveCanvas = await $('.think-whiteboard-archive-canvas'); await archiveCanvas.waitForDisplayed({ timeout: 8_000 });
    const archivedBeforeMove = await browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { archivedItems?: Array<{ id?: string; recordId?: string; x?: number; y?: number; archiveX?: number; archiveY?: number }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.archivedItems ?? []).find((candidate) => candidate.recordId === recordId);
      return item ? { id: item.id ?? '', x: item.x ?? 0, y: item.y ?? 0, archiveX: item.archiveX ?? 0, archiveY: item.archiveY ?? 0 } : null;
    }, ARCHIVE_ID);
    expect(archivedBeforeMove?.id).toBe(before!.id);
    await browser.execute((itemId) => {
      const card = document.querySelector(`[data-whiteboard-archived-item-id="${itemId}"]`) as HTMLElement | null; if (!card) return;
      const rect = card.getBoundingClientRect(); const pointerId = 166; const x = rect.left + 60; const y = rect.top + 80;
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: x, clientY: y }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', buttons: 1, clientX: x + 120, clientY: y + 70 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: x + 120, clientY: y + 70 }));
    }, before!.id);
    const archivedAfterMove = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId, oldArchiveX, oldArchiveY) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { archivedItems?: Array<{ recordId?: string; x?: number; y?: number; archiveX?: number; archiveY?: number }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.archivedItems ?? []).find((candidate) => candidate.recordId === recordId);
      if (!item || (item.archiveX === oldArchiveX && item.archiveY === oldArchiveY)) return null;
      return { x: item.x ?? 0, y: item.y ?? 0, archiveX: item.archiveX ?? 0, archiveY: item.archiveY ?? 0 };
    }, ARCHIVE_ID, archivedBeforeMove!.archiveX, archivedBeforeMove!.archiveY), { timeout: 8_000, interval: 100, timeoutMsg: '归档工作台拖动后 archivePosition 未持久化。' });
    expect({ x: archivedAfterMove!.x, y: archivedAfterMove!.y }).toEqual({ x: before!.x, y: before!.y });
    const restore = await $(`[data-whiteboard-archived-item-id="${before!.id}"] button*=恢复`); await restore.waitForClickable({ timeout: 8_000 }); await restore.click();
    const after = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const vault = app.vault as unknown as { read(target: unknown): Promise<string> };
      const raw = JSON.parse(await vault.read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; x?: number; y?: number }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).find((candidate) => candidate.recordId === recordId);
      return item ? { x: item.x ?? 0, y: item.y ?? 0 } : null;
    }, ARCHIVE_ID), { timeout: 8_000, interval: 100, timeoutMsg: '归档恢复后 Projection 未回到 active items。' });
    expect(after).toEqual({ x: before!.x, y: before!.y });
    const zoomIn = await $('button[aria-label="放大白板"]'); await zoomIn.click();
    expect(await $('.think-whiteboard-canvas-viewport').getAttribute('data-whiteboard-zoom')).toBe('1.25');
    await (await $('button[aria-label="回到画布中心"]')).click();
    expect(await $('.think-whiteboard-canvas-viewport').getAttribute('data-whiteboard-zoom')).toBe('1');
  });

  it('1.2.2-1.2.4 右键可建空间标注、整理多选节点，Edge 中点可写 label 并真实落盘', async () => {
    const viewport = await $('.think-whiteboard-canvas-viewport'); await viewport.waitForDisplayed({ timeout: 8_000 });
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport'); const rect = target?.getBoundingClientRect();
      target?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: (rect?.left ?? 0) + 460, clientY: (rect?.top ?? 0) + 320, button: 2 }));
    });
    const addText = await $('button*=添加文字标注'); await addText.waitForClickable({ timeout: 4_000 }); await addText.click();
    const editor = await $('.think-whiteboard-annotation__editor'); await editor.waitForDisplayed({ timeout: 4_000 });
    await editor.setValue('E2E 空间标注'); await browser.execute(() => document.querySelector('.think-whiteboard-annotation__editor')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true })));
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { annotations?: Array<{ text?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => boardData.annotations?.some((entry) => entry.text === 'E2E 空间标注'));
    }), { timeout: 8_000, interval: 100, timeoutMsg: '空间标注未写入 whiteboards.json。' });

    const selectionIds = await browser.execute(() => Array.from(document.querySelectorAll<HTMLElement>('[data-whiteboard-item-id]')).filter((element) => element.offsetParent !== null).slice(0, 2).map((element) => element.dataset.whiteboardItemId ?? ''));
    expect(selectionIds).toHaveLength(2);
    await browser.execute((ids) => ids.forEach((id, index) => document.querySelector(`[data-whiteboard-item-id="${id}"]`)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 120 + index, pointerType: 'mouse', button: 0, ctrlKey: true }))), selectionIds);
    const firstCard = await $(`[data-whiteboard-item-id="${selectionIds[0]}"]`); const rect = await firstCard.getRect();
    await browser.execute(({ id, x, y }) => document.querySelector(`[data-whiteboard-item-id="${id}"]`)?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x + 40, clientY: y + 40, button: 2 })), { id: selectionIds[0], x: rect.x, y: rect.y });
    const align = await $('button*=左对齐'); await align.waitForClickable({ timeout: 4_000 }); await align.click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, ids) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []); const found = ids.map((id) => items.find((item) => item.id === id));
      return found.length === 2 && found.every(Boolean) && Math.abs((found[0]?.x ?? 0) - (found[1]?.x ?? 1)) < 0.01;
    }, selectionIds), { timeout: 8_000, interval: 100, timeoutMsg: '右键左对齐未作为 durable XY 保存。' });

    const labelButton = await $('.think-whiteboard-edge__label'); if (await labelButton.isExisting()) {
      await labelButton.click(); const labelInput = await $('input[aria-label="连线标注"]'); await labelInput.setValue('支持'); await browser.keys('Enter');
      await browser.waitUntil(async () => browser.executeObsidian(async ({ app }) => {
        const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
        const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { edges?: Array<{ label?: string }> }> };
        return Object.values(raw.boards ?? {}).some((boardData) => boardData.edges?.some((edge) => edge.label === '支持'));
      }), { timeout: 8_000, interval: 100, timeoutMsg: 'Edge label 未写入 whiteboards.json。' });
    }
  });

  it('1.2.5 子画布支持 Back / Forward、Fit content，Find 明确显示目标工作台路径', async () => {
    const group = await $('[data-whiteboard-group-id]'); await group.waitForDisplayed({ timeout: 8_000 });
    const groupId = await group.getAttribute('data-whiteboard-group-id');
    await (await group.$('button[aria-label="全屏进入工作台"]')).click();
    const workspace = await $('.think-whiteboard-workspace');
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === groupId, { timeout: 4_000, interval: 100 });
    const fit = await $('button[aria-label="适配当前工作台内容"]'); await fit.waitForClickable({ timeout: 4_000 }); await fit.click();
    const zoom = Number(await $('.think-whiteboard-canvas-viewport').getAttribute('data-whiteboard-zoom'));
    expect(zoom).toBeGreaterThan(0); expect(zoom).toBeLessThanOrEqual(1);
    await (await $('button[aria-label="返回上次画布"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });
    await (await $('button[aria-label="前进到下次画布"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === groupId, { timeout: 4_000, interval: 100 });
    const find = await $('input[aria-label="查找白板卡片"]'); await find.setValue(CONTENT);
    const path = await $('.think-whiteboard-find__path'); await path.waitForDisplayed({ timeout: 4_000 });
    expect(await path.getText()).toContain('白板');
    await find.setValue('');
  });

  it('1.2.5 R2 二级工作台可退出，左侧 Record 可拖入当前子画布；重启后 membership 保留且导航回根白板', async () => {
    const workspace = await $('.think-whiteboard-workspace');
    let parentId = await workspace.getAttribute('data-whiteboard-active-group-id');
    if (!parentId) {
      const parent = await $('[data-whiteboard-group-id]'); await parent.waitForDisplayed({ timeout: 8_000 });
      parentId = await parent.getAttribute('data-whiteboard-group-id');
      await (await parent.$('button[aria-label="全屏进入工作台"]')).click();
    }
    const child = await $('[data-whiteboard-group-id]'); await child.waitForDisplayed({ timeout: 8_000 });
    const childId = await child.getAttribute('data-whiteboard-group-id');
    expect(childId).toBeTruthy(); expect(childId).not.toBe(parentId);
    await (await child.$('button[aria-label="全屏进入工作台"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === childId, { timeout: 4_000, interval: 100, timeoutMsg: '未进入二级工作台。' });
    expect(await $('button[aria-label="返回上一级工作台"]').isClickable()).toBe(true);
    expect(await $('button[aria-label="退出到根白板"]').isClickable()).toBe(true);

    const search = await $('input[aria-label="搜索记录"]'); await search.setValue(DRAG_CONTENT);
    const sourceCard = await $(`[data-whiteboard-source-record-id="${DRAG_RECORD_ID}"]`); await sourceCard.waitForDisplayed({ timeout: 8_000 });
    await sourceCard.dragAndDrop(await $('.think-whiteboard-canvas-viewport'));
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId, expectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; groupId?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => boardData.items?.some((item) => item.recordId === recordId && item.groupId === expectedGroupId));
    }, DRAG_RECORD_ID, childId), { timeout: 8_000, interval: 100, timeoutMsg: '左侧 Record 拖入二级工作台后 groupId 未落盘。' });

    await (await $('button[aria-label="返回上一级工作台"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === parentId, { timeout: 4_000, interval: 100 });
    await (await $(`[data-whiteboard-group-id="${childId}"] button[aria-label="全屏进入工作台"]`)).click();
    await (await $('button[aria-label="退出到根白板"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });

    await (await $(`[data-whiteboard-group-id="${parentId}"] button[aria-label="全屏进入工作台"]`)).click();
    await (await $(`[data-whiteboard-group-id="${childId}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === childId, { timeout: 4_000, interval: 100 });
    await browser.reloadObsidian(); await waitForThinkReady();
    await browser.executeObsidian(({ app }, commandId) => {
      const host = app as unknown as { commands: { executeCommandById(id: string): void } }; host.commands.executeCommandById(commandId);
    }, `${THINK_COMMAND_PREFIX}think-open-whiteboard`);
    const restartedWorkspace = await $('.think-whiteboard-workspace'); await restartedWorkspace.waitForDisplayed({ timeout: 10_000 });
    expect(await restartedWorkspace.getAttribute('data-whiteboard-active-group-id')).toBe('');
    expect(await browser.executeObsidian(async ({ app }, recordId, expectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ recordId?: string; groupId?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => boardData.items?.some((item) => item.recordId === recordId && item.groupId === expectedGroupId));
    }, DRAG_RECORD_ID, childId)).toBe(true);
  });


  it('1.3.0 深层工作台归档恢复会自动回原工作台并恢复 100%，重启后 membership 仍保持', async () => {
    const workspace = await $('.think-whiteboard-workspace');
    if ((await workspace.getAttribute('data-whiteboard-active-group-id')) !== '') {
      const rootButton = await $('button[aria-label="退出到根白板"]'); if (await rootButton.isExisting()) await rootButton.click();
      await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });
    }
    const beforeGroupIds = await browser.executeObsidian(async ({ app }) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return [] as string[];
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string }> }> };
      return Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []).map((group) => group.id ?? '').filter(Boolean);
    });
    await (await $('button[aria-label="新建工作台"]')).click();
    const parentId = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, existing) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
      const groups = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []);
      return groups.find((group) => group.id && !existing.includes(group.id) && !group.parentGroupId)?.id ?? '';
    }, beforeGroupIds), { timeout: 8_000, interval: 100, timeoutMsg: '未创建稳定性父工作台。' });
    await (await $(`[data-whiteboard-group-id="${parentId}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === parentId, { timeout: 4_000, interval: 100 });

    await (await $('button[aria-label="新建工作台"]')).click();
    const childId = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, expectedParentId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
      const groups = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []);
      return groups.find((group) => group.id && group.parentGroupId === expectedParentId)?.id ?? '';
    }, parentId), { timeout: 8_000, interval: 100, timeoutMsg: '未创建稳定性子工作台。' });
    await (await $(`[data-whiteboard-group-id="${childId}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === childId, { timeout: 4_000, interval: 100 });

    const search = await $('input[aria-label="搜索记录"]'); await search.setValue(STABILITY_ARCHIVE_CONTENT);
    const source = await $(`[data-whiteboard-source-record-id="${STABILITY_ARCHIVE_ID}"]`); await source.waitForDisplayed({ timeout: 8_000 });
    const add = await source.$('button*=加入'); await add.waitForClickable({ timeout: 8_000 }); await add.click();
    const nestedItemId = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordId, expectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string; groupId?: string }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).find((candidate) => candidate.recordId === recordId && candidate.groupId === expectedGroupId);
      return item?.id ?? '';
    }, STABILITY_ARCHIVE_ID, childId), { timeout: 8_000, interval: 100, timeoutMsg: '深层工作台记录未加入。' });
    const card = await $(`[data-whiteboard-item-id="${nestedItemId}"]`); await card.waitForDisplayed({ timeout: 8_000 });
    await (await card.$('button*=归档')).click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { archivedItems?: Array<{ id?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => boardData.archivedItems?.some((item) => item.id === itemId));
    }, nestedItemId), { timeout: 8_000, interval: 100, timeoutMsg: '深层工作台卡片未归档。' });

    await (await $('button[aria-label="退出到根白板"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });
    await (await $('button[aria-label*="归档箱"]')).click();
    await (await $(`[data-whiteboard-archived-item-id="${nestedItemId}"] button*=恢复`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === childId, { timeout: 6_000, interval: 100, timeoutMsg: '恢复深层归档卡后未自动进入原工作台。' });
    expect(await $('.think-whiteboard-canvas-viewport').getAttribute('data-whiteboard-zoom')).toBe('1');
    expect(await $('.think-whiteboard-archive-canvas').isExisting()).toBe(false);
    await (await $(`[data-whiteboard-item-id="${nestedItemId}"]`)).waitForDisplayed({ timeout: 8_000 });

    await browser.reloadObsidian(); await waitForThinkReady();
    await browser.executeObsidian(({ app }, commandId) => {
      const host = app as unknown as { commands: { executeCommandById(id: string): void } }; host.commands.executeCommandById(commandId);
    }, `${THINK_COMMAND_PREFIX}think-open-whiteboard`);
    const restarted = await $('.think-whiteboard-workspace'); await restarted.waitForDisplayed({ timeout: 10_000 });
    expect(await restarted.getAttribute('data-whiteboard-active-group-id')).toBe('');
    expect(await browser.executeObsidian(async ({ app }, itemId, expectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; groupId?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => boardData.items?.some((item) => item.id === itemId && item.groupId === expectedGroupId));
    }, nestedItemId, childId)).toBe(true);
  });



  it('1.3.2-1.3.5 低倍率可混选直属 Card + Workbench，语义布局与混合节点整理都可直接执行', async () => {
    const workspace = await $('.think-whiteboard-workspace'); await workspace.waitForDisplayed({ timeout: 8_000 });
    if ((await workspace.getAttribute('data-whiteboard-active-group-id')) !== '') {
      const root = await $('button[aria-label="退出到根白板"]'); if (await root.isExisting()) await root.click();
      await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });
    }
    const search = await $('input[aria-label="搜索记录"]'); await search.setValue(SEMANTIC_LAYOUT_CONTENT);
    for (const recordId of [SEMANTIC_LAYOUT_A_ID, SEMANTIC_LAYOUT_B_ID]) {
      const source = await $(`[data-whiteboard-source-record-id="${recordId}"]`); await source.waitForDisplayed({ timeout: 8_000 });
      const add = await source.$('button*=加入'); await add.waitForClickable({ timeout: 8_000 }); await add.click();
    }
    await search.setValue('');
    const itemIds = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return [] as string[];
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string; groupId?: string }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []);
      const found = recordIds.map((recordId) => items.find((item) => item.recordId === recordId && !item.groupId)?.id ?? '');
      return found.every(Boolean) ? found : [];
    }, [SEMANTIC_LAYOUT_A_ID, SEMANTIC_LAYOUT_B_ID]), { timeout: 8_000, interval: 100, timeoutMsg: '语义布局 E2E Record 未作为 Root 直属卡加入。' });
    expect(itemIds).toHaveLength(2);

    const beforeGroups = await browser.executeObsidian(async ({ app }) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return [] as string[];
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string }> }> };
      return Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []).map((group) => group.id ?? '').filter(Boolean);
    });
    await (await $('button[aria-label="新建工作台"]')).click();
    const groupId = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, existing) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
      const groups = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []);
      return groups.find((group) => group.id && !existing.includes(group.id) && !group.parentGroupId)?.id ?? '';
    }, beforeGroups), { timeout: 8_000, interval: 100, timeoutMsg: '未创建语义混选 Root Workbench。' });

    const viewport = await $('.think-whiteboard-canvas-viewport'); await viewport.waitForDisplayed({ timeout: 8_000 });
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport'); const rect = target?.getBoundingClientRect();
      target?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: (rect?.left ?? 0) + 500, clientY: (rect?.top ?? 0) + 350, button: 2 }));
    });
    const semantic = await $('button*=目标 × 类型 × 时间整理当前工作台'); await semantic.waitForClickable({ timeout: 4_000 }); await semantic.click();
    const goalGuide = await $('button=E2E布局'); await goalGuide.waitForClickable({ timeout: 8_000 }); await goalGuide.click();
    await browser.waitUntil(async () => Number(await workspace.getAttribute('data-whiteboard-selection-count')) >= 2, { timeout: 4_000, interval: 100, timeoutMsg: 'Goal 布局标题未选回对应卡片。' });
    const clear = await $('button[aria-label="清除白板选择"]'); if (await clear.isExisting()) await clear.click();

    await browser.execute(() => document.querySelector('.think-whiteboard-canvas-viewport')?.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, ctrlKey: true, bubbles: true, cancelable: true })));
    await browser.waitUntil(async () => (await viewport.getAttribute('data-whiteboard-lod')) !== 'detail', { timeout: 4_000, interval: 100, timeoutMsg: '未进入低倍率语义视图。' });
    const itemLocator = await $(`[data-whiteboard-overview-item-id="${itemIds[0]}"] button`); await itemLocator.waitForDisplayed({ timeout: 4_000 });
    const groupLocator = await $(`[data-whiteboard-overview-group-id="${groupId}"] button`); await groupLocator.waitForDisplayed({ timeout: 4_000 });
    await browser.execute((itemId, selectedGroupId) => {
      const item = document.querySelector(`[data-whiteboard-overview-item-id="${itemId}"] button`); const group = document.querySelector(`[data-whiteboard-overview-group-id="${selectedGroupId}"] button`);
      item?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 201, pointerType: 'mouse', button: 0, ctrlKey: true, clientX: 200, clientY: 200 }));
      group?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 202, pointerType: 'mouse', button: 0, ctrlKey: true, clientX: 400, clientY: 220 }));
    }, itemIds[0], groupId);
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-selection-count')) === '2', { timeout: 4_000, interval: 100, timeoutMsg: '低倍率 Card + Workbench 未形成混合 selection。' });
    const beforeMove = await browser.executeObsidian(async ({ app }, itemId, selectedGroupId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number }>; groups?: Array<{ id?: string; x?: number; y?: number }> }> };
      const boards = Object.values(raw.boards ?? {}); const item = boards.flatMap((boardData) => boardData.items ?? []).find((entry) => entry.id === itemId); const group = boards.flatMap((boardData) => boardData.groups ?? []).find((entry) => entry.id === selectedGroupId);
      return item && group ? { ix: item.x ?? 0, iy: item.y ?? 0, gx: group.x ?? 0, gy: group.y ?? 0 } : null;
    }, itemIds[0], groupId);
    await browser.execute((selectedGroupId) => {
      const group = document.querySelector(`[data-whiteboard-overview-group-id="${selectedGroupId}"] button`) as HTMLElement | null; if (!group) return;
      const rect = group.getBoundingClientRect(); const pointerId = 203; const x = rect.left + 8; const y = rect.top + 8;
      group.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: x, clientY: y }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', buttons: 1, clientX: x + 90, clientY: y + 45 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: x + 90, clientY: y + 45 }));
    }, groupId);
    const afterMove = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemId, selectedGroupId, before) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number }>; groups?: Array<{ id?: string; x?: number; y?: number }> }> };
      const boards = Object.values(raw.boards ?? {}); const item = boards.flatMap((boardData) => boardData.items ?? []).find((entry) => entry.id === itemId); const group = boards.flatMap((boardData) => boardData.groups ?? []).find((entry) => entry.id === selectedGroupId); if (!item || !group) return null;
      const result = { ix: item.x ?? 0, iy: item.y ?? 0, gx: group.x ?? 0, gy: group.y ?? 0 }; return Math.abs(result.gx - before.gx) > 1 ? result : null;
    }, itemIds[0], groupId, beforeMove!), { timeout: 8_000, interval: 100, timeoutMsg: '低倍率混合 selection 拖动未持久化。' });
    expect(Math.abs((afterMove!.ix - beforeMove!.ix) - (afterMove!.gx - beforeMove!.gx))).toBeLessThan(0.01);
    expect(Math.abs((afterMove!.iy - beforeMove!.iy) - (afterMove!.gy - beforeMove!.gy))).toBeLessThan(0.01);

    await browser.execute((selectedGroupId) => {
      const group = document.querySelector(`[data-whiteboard-overview-group-id="${selectedGroupId}"] button`) as HTMLElement | null; const rect = group?.getBoundingClientRect();
      group?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: (rect?.left ?? 0) + 8, clientY: (rect?.top ?? 0) + 8 }));
    }, groupId);
    const overviewMenu = await $('.think-whiteboard-context-menu'); await overviewMenu.waitForDisplayed({ timeout: 4_000 });
    expect(await overviewMenu.getText()).toContain('1 卡片 · 1 工作台');
    const arrangeGrid = await overviewMenu.$('button=网格整理'); await arrangeGrid.waitForClickable({ timeout: 4_000 }); await arrangeGrid.click();
    const afterArrange = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemId, selectedGroupId, before) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number }>; groups?: Array<{ id?: string; x?: number; y?: number }> }> };
      const boards = Object.values(raw.boards ?? {}); const item = boards.flatMap((boardData) => boardData.items ?? []).find((entry) => entry.id === itemId); const group = boards.flatMap((boardData) => boardData.groups ?? []).find((entry) => entry.id === selectedGroupId); if (!item || !group) return null;
      const result = { ix: item.x ?? 0, iy: item.y ?? 0, gx: group.x ?? 0, gy: group.y ?? 0 }; const changed = Math.abs(result.ix - before.ix) + Math.abs(result.iy - before.iy) + Math.abs(result.gx - before.gx) + Math.abs(result.gy - before.gy) > 1;
      return changed && Math.abs(result.iy - result.gy) < 0.01 ? result : null;
    }, itemIds[0], groupId, afterMove!), { timeout: 8_000, interval: 100, timeoutMsg: '低倍率 Card + Workbench 网格整理未原子持久化。' });
    expect(Math.abs(afterArrange!.iy - afterArrange!.gy)).toBeLessThan(0.01);
    await (await $('button[aria-label^="重置白板缩放"]')).click();
  });


  it('1.3.6 Daily-use Closure：左侧批量拖入 → 普通网格 → 目标×类型×时间 → 低倍率整理 → Nested Workbench → Archive → Restore → Undo', async () => {
    const workspace = await $('.think-whiteboard-workspace'); await workspace.waitForDisplayed({ timeout: 8_000 });
    if ((await workspace.getAttribute('data-whiteboard-active-group-id')) !== '') {
      const root = await $('button[aria-label="退出到根白板"]'); if (await root.isExisting()) await root.click();
      await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });
    }
    const viewport = await $('.think-whiteboard-canvas-viewport'); await viewport.waitForDisplayed({ timeout: 8_000 });
    const reset = await $('button[aria-label^="重置白板缩放"]'); if (await reset.isExisting()) await reset.click();

    // 1) 左侧四条 Record 一次批量拖入；落点必须先是 neutral 2×2 grid，不自动解释 Goal / Type / Time。
    const search = await $('input[aria-label="搜索记录"]'); await search.setValue(DAILY_CLOSURE_CONTENT);
    const selectAll = await $('button*=全选结果'); await selectAll.waitForClickable({ timeout: 8_000 }); await selectAll.click();
    await browser.waitUntil(async () => (await $('.think-whiteboard-source__selection-count').getText()).includes('已选 4'), { timeout: 4_000, interval: 100, timeoutMsg: 'Daily Closure 左侧未选中 4 条 Record。' });
    const source = await $(`[data-whiteboard-source-record-id="${DAILY_CLOSURE_IDS[0]}"]`); await source.waitForDisplayed({ timeout: 8_000 });
    await source.dragAndDrop(await $('main[aria-label="白板"]'));
    const neutral = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, recordIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; recordId?: string; x?: number; y?: number; groupId?: string }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []); const found = recordIds.map((recordId) => items.find((item) => item.recordId === recordId));
      if (found.some((item) => !item?.id || item.groupId || !Number.isFinite(item.x) || !Number.isFinite(item.y))) return null;
      return found.map((item) => ({ id: item!.id!, x: item!.x!, y: item!.y! }));
    }, [...DAILY_CLOSURE_IDS]), { timeout: 8_000, interval: 100, timeoutMsg: 'Daily Closure 批量拖入未形成 root neutral grid。' });
    expect(new Set(neutral!.map((item) => item.x)).size).toBe(2); expect(new Set(neutral!.map((item) => item.y)).size).toBe(2);
    await search.setValue('');

    // 2) 普通网格之后由用户显式执行 Goal × Type × Time；Arrange 只改 XY，不创建 Workbench。
    await browser.execute(() => {
      const target = document.querySelector('.think-whiteboard-canvas-viewport'); const rect = target?.getBoundingClientRect();
      target?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: (rect?.left ?? 0) + 520, clientY: (rect?.top ?? 0) + 340, button: 2 }));
    });
    const semantic = await $('button*=目标 × 类型 × 时间整理当前工作台'); await semantic.waitForClickable({ timeout: 4_000 }); await semantic.click();
    const semanticPositions = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemIds, before) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number; groupId?: string }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []); const found = itemIds.map((id) => items.find((item) => item.id === id));
      if (found.some((item) => !item || item.groupId)) return null;
      const result = found.map((item) => ({ x: item!.x ?? 0, y: item!.y ?? 0 }));
      return result.some((item, index) => Math.abs(item.x - before[index].x) + Math.abs(item.y - before[index].y) > 1) ? result : null;
    }, neutral!.map((item) => item.id), neutral!.map((item) => ({ x: item.x, y: item.y }))), { timeout: 8_000, interval: 100, timeoutMsg: 'Goal × Type × Time 未改变 Daily Closure 排布。' });
    expect(semanticPositions).toHaveLength(4);

    // 3) 点击 Goal guide 回选全部，降到低倍率后直接整理；随后点击 locator 回到真实对象 100%。
    const goalGuide = await $(`button=${DAILY_CLOSURE_GOAL}`); await goalGuide.waitForClickable({ timeout: 8_000 }); await goalGuide.click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-selection-count')) === '4', { timeout: 4_000, interval: 100, timeoutMsg: 'Daily Closure Goal guide 未回选 4 张卡。' });
    await browser.execute(() => document.querySelector('.think-whiteboard-canvas-viewport')?.dispatchEvent(new WheelEvent('wheel', { deltaY: 650, ctrlKey: true, bubbles: true, cancelable: true })));
    await browser.waitUntil(async () => (await viewport.getAttribute('data-whiteboard-lod')) !== 'detail', { timeout: 4_000, interval: 100, timeoutMsg: 'Daily Closure 未进入低倍率语义视图。' });
    const locator = await $(`[data-whiteboard-overview-item-id="${neutral![0].id}"] button`); await locator.waitForDisplayed({ timeout: 4_000 });
    await browser.execute((itemId) => {
      const el = document.querySelector(`[data-whiteboard-overview-item-id="${itemId}"] button`) as HTMLElement | null; const rect = el?.getBoundingClientRect();
      el?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: (rect?.left ?? 0) + 8, clientY: (rect?.top ?? 0) + 8 }));
    }, neutral![0].id);
    const lowMenu = await $('.think-whiteboard-context-menu'); await lowMenu.waitForDisplayed({ timeout: 4_000 });
    const alignLeft = await lowMenu.$('button=左对齐'); await alignLeft.waitForClickable({ timeout: 4_000 }); await alignLeft.click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []); const xs = itemIds.map((id) => items.find((item) => item.id === id)?.x);
      return xs.every((x) => Number.isFinite(x)) && Math.max(...xs as number[]) - Math.min(...xs as number[]) < 0.01;
    }, neutral!.map((item) => item.id)), { timeout: 8_000, interval: 100, timeoutMsg: '低倍率左对齐未持久化。' });
    await locator.click();
    await browser.waitUntil(async () => (await viewport.getAttribute('data-whiteboard-zoom')) === '1', { timeout: 4_000, interval: 100, timeoutMsg: 'locator 点击后未回到 100%。' });
    expect(await workspace.getAttribute('data-whiteboard-selection-count')).toBe('4');

    // 4) 直接把这 4 张卡包成 L1 Workbench，再创建到 L4，证明日常主链能进入 Nested Workbench。
    const focusCard = await $(`[data-whiteboard-item-id="${neutral![0].id}"]`); await focusCard.waitForDisplayed({ timeout: 6_000 });
    await browser.execute((itemId) => {
      const el = document.querySelector(`[data-whiteboard-item-id="${itemId}"]`) as HTMLElement | null; const rect = el?.getBoundingClientRect();
      el?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: (rect?.left ?? 0) + 30, clientY: (rect?.top ?? 0) + 30 }));
    }, neutral![0].id);
    const wrap = await $('button=用所选创建工作台'); await wrap.waitForClickable({ timeout: 4_000 }); await wrap.click();
    const level1Id = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemIds) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; groupId?: string }> }> };
      const items = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []); const groupIds = itemIds.map((id) => items.find((item) => item.id === id)?.groupId ?? '');
      return groupIds[0] && groupIds.every((id) => id === groupIds[0]) ? groupIds[0] : '';
    }, neutral!.map((item) => item.id)), { timeout: 8_000, interval: 100, timeoutMsg: 'Daily Closure 4 张卡未包入同一 Workbench。' });
    await (await $(`[data-whiteboard-group-id="${level1Id}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === level1Id, { timeout: 4_000, interval: 100 });

    const createChild = async (parentId: string): Promise<string> => {
      await (await $('button[aria-label="新建工作台"]')).click();
      return browser.waitUntil(async () => browser.executeObsidian(async ({ app }, parent) => {
        const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return '';
        const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
        const groups = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []); return groups.find((group) => group.id && group.parentGroupId === parent)?.id ?? '';
      }, parentId), { timeout: 8_000, interval: 100, timeoutMsg: `未创建 parent=${parentId} 的子 Workbench。` });
    };
    const level2Id = await createChild(level1Id); await (await $(`[data-whiteboard-group-id="${level2Id}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === level2Id, { timeout: 4_000, interval: 100 });
    const level3Id = await createChild(level2Id); await (await $(`[data-whiteboard-group-id="${level3Id}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === level3Id, { timeout: 4_000, interval: 100 });
    const level4Id = await createChild(level3Id);
    expect(await browser.executeObsidian(async ({ app }, ids) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { groups?: Array<{ id?: string; parentGroupId?: string }> }> };
      const groups = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.groups ?? []); const byId = new Map(groups.map((group) => [group.id, group]));
      return byId.get(ids[1])?.parentGroupId === ids[0] && byId.get(ids[2])?.parentGroupId === ids[1] && byId.get(ids[3])?.parentGroupId === ids[2];
    }, [level1Id, level2Id, level3Id, level4Id])).toBe(true);

    // 5) 回 L1 归档其中一张；Archive Canvas 内移动只改 archivePosition，Restore 必须回原 groupId + world XY。
    await (await $('button[aria-label="退出到根白板"]')).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === '', { timeout: 4_000, interval: 100 });
    await (await $(`[data-whiteboard-group-id="${level1Id}"] button[aria-label="全屏进入工作台"]`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === level1Id, { timeout: 4_000, interval: 100 });
    const targetId = neutral![0].id;
    const origin = await browser.executeObsidian(async ({ app }, itemId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number; zIndex?: number; groupId?: string }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).find((entry) => entry.id === itemId); return item ? { x: item.x ?? 0, y: item.y ?? 0, zIndex: item.zIndex, groupId: item.groupId } : null;
    }, targetId);
    expect(origin?.groupId).toBe(level1Id);
    const targetCard = await $(`[data-whiteboard-item-id="${targetId}"]`); await targetCard.waitForDisplayed({ timeout: 6_000 }); await (await targetCard.$('button*=归档')).click();
    await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { archivedItems?: Array<{ id?: string }> }> };
      return Object.values(raw.boards ?? {}).some((boardData) => boardData.archivedItems?.some((item) => item.id === itemId));
    }, targetId), { timeout: 8_000, interval: 100, timeoutMsg: 'Daily Closure 卡片未进入 archivedItems。' });
    await (await $('button[aria-label*="归档箱"]')).click(); await (await $('.think-whiteboard-archive-canvas')).waitForDisplayed({ timeout: 8_000 });
    const archiveBefore = await browser.executeObsidian(async ({ app }, itemId) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { archivedItems?: Array<{ id?: string; x?: number; y?: number; groupId?: string; archiveX?: number; archiveY?: number }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.archivedItems ?? []).find((entry) => entry.id === itemId); return item ? { x: item.x ?? 0, y: item.y ?? 0, groupId: item.groupId, archiveX: item.archiveX ?? 0, archiveY: item.archiveY ?? 0 } : null;
    }, targetId);
    await browser.execute((itemId) => {
      const card = document.querySelector(`[data-whiteboard-archived-item-id="${itemId}"]`) as HTMLElement | null; if (!card) return; const rect = card.getBoundingClientRect(); const pointerId = 316; const x = rect.left + 55; const y = rect.top + 70;
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: x, clientY: y }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', buttons: 1, clientX: x + 140, clientY: y + 85 }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', button: 0, clientX: x + 140, clientY: y + 85 }));
    }, targetId);
    const archiveArranged = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemId, before) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { archivedItems?: Array<{ id?: string; x?: number; y?: number; groupId?: string; archiveX?: number; archiveY?: number }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.archivedItems ?? []).find((entry) => entry.id === itemId); if (!item || (item.archiveX === before.archiveX && item.archiveY === before.archiveY)) return null;
      return { x: item.x ?? 0, y: item.y ?? 0, groupId: item.groupId, archiveX: item.archiveX ?? 0, archiveY: item.archiveY ?? 0 };
    }, targetId, archiveBefore!), { timeout: 8_000, interval: 100, timeoutMsg: 'Archive Canvas 内移动未改变 archivePosition。' });
    expect({ x: archiveArranged!.x, y: archiveArranged!.y, groupId: archiveArranged!.groupId }).toEqual({ x: origin!.x, y: origin!.y, groupId: level1Id });

    await (await $(`[data-whiteboard-archived-item-id="${targetId}"] button*=恢复到原位置`)).click();
    await browser.waitUntil(async () => (await workspace.getAttribute('data-whiteboard-active-group-id')) === level1Id && (await viewport.getAttribute('data-whiteboard-zoom')) === '1', { timeout: 6_000, interval: 100, timeoutMsg: 'Restore 后未回原 Workbench 100%。' });
    expect(await browser.executeObsidian(async ({ app }, itemId, expected) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return false;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string; x?: number; y?: number; groupId?: string }> }> };
      const item = Object.values(raw.boards ?? {}).flatMap((boardData) => boardData.items ?? []).find((entry) => entry.id === itemId); return Boolean(item && item.x === expected.x && item.y === expected.y && item.groupId === expected.groupId);
    }, targetId, { x: origin!.x, y: origin!.y, groupId: level1Id })).toBe(true);

    // 6) Restore 紧接一次 Undo：必须回到“已归档且 Archive placement 仍是刚才整理后的坐标”的 snapshot。
    const undo = await $('button[aria-label="撤销白板操作"]'); await undo.waitForClickable({ timeout: 4_000 }); await undo.click();
    const undone = await browser.waitUntil(async () => browser.executeObsidian(async ({ app }, itemId, expectedArchive) => {
      const file = app.vault.getAbstractFileByPath('Think/whiteboards.json'); if (!file || !('path' in file)) return null;
      const raw = JSON.parse(await (app.vault as unknown as { read(target: unknown): Promise<string> }).read(file)) as { boards?: Record<string, { items?: Array<{ id?: string }>; archivedItems?: Array<{ id?: string; x?: number; y?: number; groupId?: string; archiveX?: number; archiveY?: number }> }> };
      const boards = Object.values(raw.boards ?? {}); if (boards.some((boardData) => boardData.items?.some((item) => item.id === itemId))) return null;
      const item = boards.flatMap((boardData) => boardData.archivedItems ?? []).find((entry) => entry.id === itemId); if (!item || item.archiveX !== expectedArchive.archiveX || item.archiveY !== expectedArchive.archiveY) return null;
      return { x: item.x ?? 0, y: item.y ?? 0, groupId: item.groupId, archiveX: item.archiveX ?? 0, archiveY: item.archiveY ?? 0 };
    }, targetId, { archiveX: archiveArranged!.archiveX, archiveY: archiveArranged!.archiveY }), { timeout: 8_000, interval: 100, timeoutMsg: 'Restore → Undo 未回到保存 Archive placement 的归档 snapshot。' });
    expect(undone).toEqual({ x: origin!.x, y: origin!.y, groupId: level1Id, archiveX: archiveArranged!.archiveX, archiveY: archiveArranged!.archiveY });
  });

});
