/**
 * @covers F094/persistence
 * @covers F094/regression
 */
import type { App } from 'obsidian';
import { ObsidianVaultPort } from '@/platform/obsidian/ObsidianVaultPort';
import { markActive, markDisposed } from '@/app/runtime/lifecycleState';

describe('ObsidianVaultPort 启动阶段读取', () => {
  afterEach(() => markActive());

  it('Vault file tree 暂时 cache miss 时必须回退到底层 adapter 读取真实文件', async () => {
    const adapter = {
      exists: jest.fn(async () => true),
      read: jest.fn(async () => '{"version":1,"boards":{}}'),
      write: jest.fn(async () => undefined),
    };
    const app = {
      vault: {
        getMarkdownFiles: () => [],
        getAbstractFileByPath: jest.fn(() => null),
        read: jest.fn(async () => ''),
        adapter,
      },
    } as unknown as App;

    markActive();
    const port = new ObsidianVaultPort(app);
    await expect(port.readFile('Think/whiteboards.json'))
      .resolves.toBe('{"version":1,"boards":{}}');
    expect(adapter.exists).toHaveBeenCalledWith('Think/whiteboards.json');
    expect(adapter.read).toHaveBeenCalledWith('Think/whiteboards.json');
  });

  it('写入时 cache miss 但 adapter 已有文件，必须覆盖原文件而不是重复 create', async () => {
    let persisted = '旧内容';
    const adapter = {
      exists: jest.fn(async (path: string) => path === 'Think/whiteboards.json'),
      read: jest.fn(async () => persisted),
      write: jest.fn(async (_path: string, content: string) => { persisted = content; }),
    };
    const create = jest.fn(async () => undefined);
    const app = {
      vault: {
        getMarkdownFiles: () => [],
        getAbstractFileByPath: jest.fn(() => null),
        read: jest.fn(async () => ''),
        modify: jest.fn(async () => undefined),
        create,
        createFolder: jest.fn(async () => undefined),
        adapter,
      },
    } as unknown as App;

    markActive();
    const port = new ObsidianVaultPort(app);
    await port.writeFile('Think/whiteboards.json', '新内容');

    expect(persisted).toBe('新内容');
    expect(adapter.write).toHaveBeenCalledWith('Think/whiteboards.json', '新内容');
    expect(create).not.toHaveBeenCalled();
  });

  it('底层 adapter 也确认不存在时才返回 null', async () => {
    const app = {
      vault: {
        getMarkdownFiles: () => [],
        getAbstractFileByPath: jest.fn(() => null),
        read: jest.fn(async () => ''),
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '不应读取'),
          write: jest.fn(async () => undefined),
        },
      },
    } as unknown as App;

    markActive();
    const port = new ObsidianVaultPort(app);
    await expect(port.readFile('Think/missing.json')).resolves.toBeNull();
    expect(app.vault.adapter.read).not.toHaveBeenCalled();
  });

  it('dispose 后 Vault IO 必须显式失败，禁止静默 no-op 冒充成功', async () => {
    const app = {
      vault: {
        getMarkdownFiles: () => [],
        getAbstractFileByPath: jest.fn(() => null),
        read: jest.fn(async () => ''),
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => ''),
          write: jest.fn(async () => undefined),
        },
      },
    } as unknown as App;

    markDisposed();
    const port = new ObsidianVaultPort(app);
    await expect(port.readFile('Think/whiteboards.json')).rejects.toThrow('blocked after dispose');
  });
});
