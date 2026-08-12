import { buildAiConfigSnapshot } from '@/core/ai/AiConfigSnapshot';
import { DEFAULT_AI_SETTINGS, DEFAULT_CORE_BLOCKS } from '@/core/public';
import type { GoalSettings, InputSettings } from '@/core/public';

describe('AI config snapshot domain model', () => {
  const input: InputSettings = {
    blocks: DEFAULT_CORE_BLOCKS as any,
    themes: [{ id: 'theme-sleep', path: '健康/睡眠', icon: '💤' } as any],
  };

  const goalSettings: GoalSettings = {
    goals: [{
      id: 'goal.self',
      title: '#照顾好自己',
      goalPath: '#照顾好自己',
      status: 'active',
      themePath: '健康/睡眠',
      metrics: [],
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    }],
    goalTemplates: [{
      id: 'goal-template.goal.self.core.habit.sleep',
      goalId: 'goal.self',
      coreBlockId: 'core.habit',
      variantId: 'sleep',
      name: '睡眠打卡',
      enabled: true,
      defaultValues: { themePath: '健康/睡眠', goalId: 'goal.self' },
      createdAt: '2026-06-23T00:00:00.000Z',
      updatedAt: '2026-06-23T00:00:00.000Z',
    }],
  };

  it('ignores stale blk_* enabledBlockIds so AI snapshot does not become empty', () => {
    const snapshot = buildAiConfigSnapshot(input, { ...DEFAULT_AI_SETTINGS, enabledBlockIds: ['blk_old_1'] }, goalSettings);
    expect(snapshot.blocks.length).toBeGreaterThan(0);
    expect(snapshot.goalPresets.length).toBeGreaterThan(0);
  });

  it('hides system context fields from block and preset fields', () => {
    const snapshot = buildAiConfigSnapshot(input, { ...DEFAULT_AI_SETTINGS, enabledBlockIds: [] }, goalSettings);
    const allFieldKeys = [...snapshot.blocks.flatMap((block) => block.fields.map((field) => field.key)), ...snapshot.goalPresets.flatMap((preset) => preset.fields.map((field) => field.key))];
    expect(allFieldKeys).not.toContain('目标');
    expect(allFieldKeys).not.toContain('themePath');
    expect(snapshot.goalPresets[0]).toMatchObject({
      goalTemplateId: 'goal-template.goal.self.core.habit.sleep',
      goalPath: '#照顾好自己',
      blockId: 'core.habit',
      themePath: '健康/睡眠',
    });
  });
});


import { getAiSettingsReadiness, getApiKeyPersistenceMessage } from '@/features/settings/tabs/aiSettingsReadiness';
import type { AiSettings } from '@core/public';

const baseSettings: AiSettings = {
  enabled: false,
  provider: 'openai_compat',
  apiEndpoint: '',
  apiKey: '',
  persistApiKey: false,
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  requestTimeoutMs: 30000,
  enabledBlockIds: [],
  allowMultipleResults: false,
  maxResults: 10,
  confirmMode: 'batch',
  preloadConfigOnStartup: false,
  configCacheTTLSeconds: 300,
};

describe('aiSettingsReadiness', () => {
  it('lists missing API configuration fields', () => {
    const result = getAiSettingsReadiness(baseSettings);

    expect(result.ready).toBe(false);
    expect(result.missingFields).toEqual(['API 端点', 'API 密钥', '模型名称']);
    expect(result.message).toContain('AI 还不能使用');
  });

  it('reports ready once endpoint, key, and model are present', () => {
    const result = getAiSettingsReadiness({
      ...baseSettings,
      apiEndpoint: 'https://api.example.com/v1',
      apiKey: 'sk-test',
      model: 'gpt-test',
    });

    expect(result.ready).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it('explains API key persistence risk', () => {
    expect(getApiKeyPersistenceMessage(baseSettings)).toContain('不会写入插件数据');
    expect(getApiKeyPersistenceMessage({ ...baseSettings, persistApiKey: true })).toContain('明文保存');
  });
});
