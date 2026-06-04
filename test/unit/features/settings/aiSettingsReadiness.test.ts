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
