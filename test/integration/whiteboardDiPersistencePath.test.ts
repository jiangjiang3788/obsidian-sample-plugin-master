/**
 * @covers F094/integration
 * @covers F094/persistence
 * @covers F094/regression
 */
import 'reflect-metadata';
import { container } from 'tsyringe';
import { DEFAULT_WHITEBOARD_ID, DEFAULT_WHITEBOARD_STORE_PATH, WhiteboardStore } from '@core/whiteboard/public';
import { STORAGE_TOKEN, type IPluginStorage } from '@/core/services/StorageService';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

describe('WhiteboardStore production DI persistence path', () => {
  it('tsyringe resolve 仍固定写唯一 Think/whiteboards.json，不依赖 ViewInstance primitive', async () => {
    const files = new Map<string, unknown>();
    const storage: IPluginStorage = {
      readJSON: async <T>(path: string): Promise<T | null> => files.has(path) ? clone(files.get(path)) as T : null,
      writeJSON: jest.fn(async (path, value) => { files.set(path, clone(value)); }),
      remove: jest.fn(async (path) => { files.delete(path); }),
    };
    const child = container.createChildContainer();
    child.register(STORAGE_TOKEN, { useValue: storage });
    child.register(WhiteboardStore, { useClass: WhiteboardStore });
    const store = child.resolve(WhiteboardStore);
    await store.initialize();
    await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec-production-di', { x: 10, y: 20 });
    expect(storage.writeJSON).toHaveBeenCalledWith(DEFAULT_WHITEBOARD_STORE_PATH, expect.objectContaining({ version: 1 }));
    const restarted = new WhiteboardStore(storage);
    await restarted.initialize();
    expect(restarted.getBoard(DEFAULT_WHITEBOARD_ID)?.items[0].recordId).toBe('rec-production-di');
  });
});
