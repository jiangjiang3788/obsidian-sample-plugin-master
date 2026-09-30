import { SettingsRepository } from '@/core/services/SettingsRepository';
import { VaultSettingsPersistence } from '@/core/services/SettingsPersistence';
import { VaultFileStorage } from '@/core/services/StorageService';
import { DurableJsonStore, previousJsonPath } from '@/core/storage/DurableJsonStore';
import type { VaultPort } from '@/core/ports/VaultPort';

const seed = { groups: [], viewInstances: [], layouts: [], goalSettings: { goals: [{ path: '测试', status: 'active' }], goalTemplates: [] } };
function vault(raw?: string) {
  const files = new Map<string, string>(raw === undefined ? [] : [['Think/data.json', raw]]);
  const port: VaultPort = {
    readFile: jest.fn(async (path) => files.get(path) ?? null),
    writeFile: jest.fn(async (path, text) => { files.set(path, text); }),
    deleteFile: jest.fn(async (path) => { files.delete(path); }),
    listMarkdownFilePaths: () => [],
  };
  return { files, port };
}
describe('重启安全：真实 SettingsRepository + VaultFileStorage', () => {
  it('真正缺失时仅内存初始化，不自动写空设置', async () => {
    const h = vault(); const repo = new SettingsRepository(new VaultSettingsPersistence(new VaultFileStorage(h.port)));
    await repo.load(); expect(h.port.writeFile).not.toHaveBeenCalled();
  });
  it('损坏JSON不会通过缺失分支覆盖', async () => {
    const h = vault('{"goalSettings":'); const repo = new SettingsRepository(new VaultSettingsPersistence(new VaultFileStorage(h.port)));
    await expect(repo.load()).rejects.toThrow('invalid_json');
    expect(h.files.get('Think/data.json')).toBe('{"goalSettings":'); expect(h.port.writeFile).not.toHaveBeenCalled();
  });
  it('使用真实Immer，20次并发更新无丢失且新实例可恢复', async () => {
    const h = vault(JSON.stringify(seed)); const persistence = new VaultSettingsPersistence(new VaultFileStorage(h.port));
    const repo = new SettingsRepository(persistence); await repo.load();
    await Promise.all(Array.from({ length: 20 }, (_, i) => repo.update((draft) => { draft.recentGoalPaths.push(String(i)); })));
    expect(repo.getSnapshot().recentGoalPaths).toHaveLength(20);
    const restarted = new SettingsRepository(new VaultSettingsPersistence(new VaultFileStorage(h.port)));
    expect((await restarted.load()).recentGoalPaths).toEqual(repo.getSnapshot().recentGoalPaths);
  });
  it('写盘失败不发布未持久化状态，随后更新可重试', async () => {
    let reject = true; const saved: unknown[] = [];
    const repo = new SettingsRepository({ load: async () => seed, save: async (s) => { if (reject) throw new Error('ENOSPC'); saved.push(s); } });
    await repo.load(); const before = repo.getSnapshot(); const listener = jest.fn(); repo.subscribe(listener);
    await expect(repo.update((draft) => { draft.floatingTimerEnabled = false; })).rejects.toThrow('ENOSPC');
    expect(repo.getSnapshot()).toBe(before); expect(listener).not.toHaveBeenCalled(); reject = false;
    await repo.update((draft) => { draft.floatingTimerEnabled = false; }); expect(saved).toHaveLength(1); expect(listener).toHaveBeenCalledTimes(1);
  });
  it('外部同步变更不能被旧内存设置覆盖', async () => {
    const h = vault(JSON.stringify(seed)); const json = new DurableJsonStore(h.port, new Set(['Think/data.json']));
    await json.readJSON('Think/data.json'); const external = JSON.stringify({ ...seed, external: true }); h.files.set('Think/data.json', external);
    await expect(json.writeJSON('Think/data.json', seed)).rejects.toThrow('external_change'); expect(h.files.get('Think/data.json')).toBe(external);
  });
  it('写盘中断保留上一版本，重启拒绝随机恢复', async () => {
    const raw = JSON.stringify(seed); const h = vault(raw); const json = new DurableJsonStore(h.port, new Set(['Think/data.json']));
    const write = h.port.writeFile;
    h.port.writeFile = async (path, text) => { if (path === 'Think/data.json') { h.files.set(path, '{'); throw new Error('interrupted'); } await write(path, text); };
    await expect(json.writeJSON('Think/data.json', { ...seed, floatingTimerEnabled: false })).rejects.toThrow('interrupted');
    expect(h.files.get(previousJsonPath('Think/data.json'))).toBe(raw);
    await expect(new DurableJsonStore(h.port, new Set(['Think/data.json'])).readJSON('Think/data.json')).rejects.toThrow('recovery_required');
  });
});
