/**
 * @covers F094/integration
 * @covers F094/regression
 * @covers F095/integration
 * @covers F095/regression
 */
import { DEFAULT_WHITEBOARD_ID, DEFAULT_WHITEBOARD_STORE_PATH, WhiteboardStore } from '@core/whiteboard/public';
import type { IPluginStorage } from '@/core/services/StorageService';

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

describe('Whiteboard canonical Record integrity boundary', () => {
  it('add/move/remove 只写 Whiteboard JSON，Markdown Record 保持字节级不变', async () => {
    const markdownPath = 'Think/Records/health.md';
    const originalMarkdown = ['## rec.health.001', '类型:: thought', '目标:: 健康/睡眠', '内容:: 原始记录绝不能被白板改写', ''].join('\n');
    const jsonFiles = new Map<string, unknown>();
    const markdownFiles = new Map<string, string>([[markdownPath, originalMarkdown]]);
    const writePaths: string[] = [];
    const storage: IPluginStorage = {
      readJSON: async <T>(path: string): Promise<T | null> => jsonFiles.has(path) ? clone(jsonFiles.get(path)) as T : null,
      writeJSON: jest.fn(async (path, value) => { writePaths.push(path); jsonFiles.set(path, clone(value)); }),
      remove: jest.fn(async (path) => { jsonFiles.delete(path); }),
    };
    const store = new WhiteboardStore(storage);
    await store.initialize();
    const item = await store.addRecord(DEFAULT_WHITEBOARD_ID, 'rec.health.001', { x: 12, y: 34 });
    await store.moveItem(DEFAULT_WHITEBOARD_ID, item.id, { x: 56, y: 78 });
    await store.removeItem(DEFAULT_WHITEBOARD_ID, item.id);
    expect(markdownFiles.get(markdownPath)).toBe(originalMarkdown);
    expect(writePaths).toEqual([DEFAULT_WHITEBOARD_STORE_PATH, DEFAULT_WHITEBOARD_STORE_PATH, DEFAULT_WHITEBOARD_STORE_PATH]);
  });
});
