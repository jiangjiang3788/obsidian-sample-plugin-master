/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F071/persistence
 * @covers F071/restart
 * @covers F071/error
 * @covers F112/integration
 * @covers F112/persistence
 * @covers F112/restart
 * @covers F112/error
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_AI_SETTINGS } from '@/core/types/public';
import { toPersistedThinkSettings } from '@/core/settings/currentSettingsSchema';
import { SettingsRepository, type ISettingsPersistence } from '@/core/services/SettingsRepository';
import { SettingsUseCase } from '@/app/usecases/settings.usecase';

function harness(saveFailure = false) {
  let persisted: unknown = { groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true, goalSettings: { goals: [], goalTemplates: [] } };
  const persistence: ISettingsPersistence = {
    loadData: jest.fn(async () => JSON.parse(JSON.stringify(persisted))),
    saveData: jest.fn(async (settings: ThinkSettings) => {
      if (saveFailure) throw new Error('模拟 AI 设置保存失败');
      persisted = toPersistedThinkSettings(settings);
    }),
  };
  return { persistence, repository: new SettingsRepository(persistence) };
}

async function createUseCase(repository: SettingsRepository) {
  const state: any = { isInitialized: true, settings: await repository.load() };
  state.updateAiSettings = async (aiSettings: any) => { state.settings = await repository.update((draft) => { draft.aiSettings = aiSettings; }); };
  return new SettingsUseCase({ getState: () => state } as any);
}

describe('AI 设置保存与重启恢复', () => {
  it('API、模型、Prompt、Scope 与高级参数作为一个设置快照保存并在新 Repository 中恢复', async () => {
    const h = harness();
    const useCase = await createUseCase(h.repository);
    const settings = {
      ...DEFAULT_AI_SETTINGS,
      enabled: true,
      apiEndpoint: 'https://example.test/v1',
      apiKey: 'secret-for-test',
      persistApiKey: true,
      model: 'test-model',
      customPrompt: '只返回结构化结果',
      enabledRecordTypeIds: ['core.task', 'core.thought'],
      requestTimeoutMs: 43210,
    };
    await useCase.updateAiSettings(settings);

    const restarted = new SettingsRepository(h.persistence);
    const restored = await restarted.load();
    expect(restored.aiSettings).toMatchObject({
      enabled: true,
      apiEndpoint: 'https://example.test/v1',
      apiKey: 'secret-for-test',
      persistApiKey: true,
      model: 'test-model',
      customPrompt: '只返回结构化结果',
      enabledRecordTypeIds: ['core.task', 'core.thought'],
      requestTimeoutMs: 43210,
    });
  });

  it('AI 设置写盘失败时由 use case 向上抛出明确错误', async () => {
    const h = harness(true);
    const useCase = await createUseCase(h.repository);
    await expect(useCase.updateAiSettings({ ...DEFAULT_AI_SETTINGS, enabled: true })).rejects.toThrow('模拟 AI 设置保存失败');
  });
});
