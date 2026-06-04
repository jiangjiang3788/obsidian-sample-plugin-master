import type { AiSettings } from '@core/public';

export interface AiSettingsReadiness {
  ready: boolean;
  missingFields: string[];
  message: string;
}

export function getAiSettingsReadiness(settings: AiSettings): AiSettingsReadiness {
  const missingFields: string[] = [];
  if (!settings.apiEndpoint?.trim()) missingFields.push('API 端点');
  if (!settings.apiKey?.trim()) missingFields.push('API 密钥');
  if (!settings.model?.trim()) missingFields.push('模型名称');

  if (missingFields.length === 0) {
    return {
      ready: true,
      missingFields,
      message: 'AI 配置已具备最小可用条件，可以测试连接。',
    };
  }

  return {
    ready: false,
    missingFields,
    message: `AI 还不能使用：请先填写 ${missingFields.join('、')}。`,
  };
}

export function getApiKeyPersistenceMessage(settings: AiSettings): string {
  if (settings.persistApiKey) {
    return 'API 密钥会随插件设置明文保存；如果开启 Obsidian Sync 或第三方同步，也可能被同步。';
  }
  return 'API 密钥只保留在当前设置页内存中；保存设置时不会写入插件数据。关闭或重载 Obsidian 后需要重新输入。';
}
