/**
 * @covers F094/integration
 * @covers F094/persistence
 * @covers F094/regression
 */
import type { App } from 'obsidian';
import { DEFAULT_WHITEBOARD_ID, DEFAULT_WHITEBOARD_STORE_PATH, WhiteboardStore } from '@core/whiteboard/public';
import { VaultFileStorage } from '@core/services/StorageService';
import { ObsidianVaultPort } from '@/platform/obsidian/ObsidianVaultPort';
import { markActive } from '@/app/runtime/lifecycleState';

describe('独立白板真实 Vault 启动恢复链', () => {
  afterEach(() => markActive());

  it('Vault cache 暂时看不到文件时仍从 adapter 恢复原卡片，后续新增不得覆盖 durable state', async () => {
    const durable = {
      version: 1 as const,
      boards: {
        [DEFAULT_WHITEBOARD_ID]: {
          title: '白板',
          items: [
            { id: 'item-old-1', recordId: 'task.old.1', x: 24, y: 24, zIndex: 1 },
            { id: 'item-old-2', recordId: 'task.old.2', x: 296, y: 24, zIndex: 2 },
          ],
          edges: [],
          modified: 1,
        },
      },
    };
    let persistedText = JSON.stringify(durable);
    const adapter = {
      exists: jest.fn(async (path: string) => path === DEFAULT_WHITEBOARD_STORE_PATH),
      read: jest.fn(async () => persistedText),
      write: jest.fn(async (_path: string, content: string) => { persistedText = content; }),
    };
    const app = {
      vault: {
        getMarkdownFiles: () => [],
        getAbstractFileByPath: jest.fn(() => null),
        read: jest.fn(async () => ''),
        modify: jest.fn(async () => undefined),
        create: jest.fn(async (_path: string, content: string) => { persistedText = content; }),
        createFolder: jest.fn(async () => undefined),
        delete: jest.fn(async () => undefined),
        adapter,
      },
    } as unknown as App;

    markActive();
    const storage = new VaultFileStorage(new ObsidianVaultPort(app));
    const store = new WhiteboardStore(storage);
    await store.initialize();
    expect(store.getBoard(DEFAULT_WHITEBOARD_ID)?.items.map((item) => item.recordId)).toEqual(['task.old.1', 'task.old.2']);

    await store.addRecord(DEFAULT_WHITEBOARD_ID, 'task.new.3', { x: 568, y: 24, zIndex: 3 });
    const persisted = JSON.parse(persistedText) as typeof durable;
    expect(persisted.boards[DEFAULT_WHITEBOARD_ID].items.map((item) => item.recordId)).toEqual(['task.old.1', 'task.old.2', 'task.new.3']);
  });
});
