import type { AiSettings } from '@core/types/public';

export interface AiSettingsReadiness {
  ready: boolean;
  missingFields: string[];
  message: string;
}

function buildReadiness(missingFields: string[], readyMessage: string, missingPrefix: string): AiSettingsReadiness {
  if (missingFields.length === 0) {
    return {
      ready: true,
      missingFields,
      message: readyMessage,
    };
  }

  return {
    ready: false,
    missingFields,
    message: `${missingPrefix}${missingFields.join('、')}。`,
  };
}

/**
 * API 访问层就绪条件：只要求 endpoint + key。
 * 模型列表拉取和连接测试不应该依赖已经手工填写模型名。
 */
export function getAiApiAccessReadiness(settings: AiSettings): AiSettingsReadiness {
  const missingFields: string[] = [];
  if (!settings.apiEndpoint?.trim()) missingFields.push('接口地址');
  if (!settings.apiKey?.trim()) missingFields.push('接口密钥');

  return buildReadiness(
    missingFields,
    '接口访问配置已完整，可以测试连接或拉取模型。',
    '接口还不能访问：请先填写 ',
  );
}

/**
 * AI 实际调用就绪条件：endpoint + key + model。
 */
export function getAiSettingsReadiness(settings: AiSettings): AiSettingsReadiness {
  const apiReadiness = getAiApiAccessReadiness(settings);
  const missingFields = [...apiReadiness.missingFields];
  if (!settings.model?.trim()) missingFields.push('模型名称');

  return buildReadiness(
    missingFields,
    '智能助手配置已具备最小可用条件。',
    '智能助手还不能使用：请先填写 ',
  );
}

export function getApiKeyPersistenceMessage(settings: AiSettings): string {
  if (settings.persistApiKey) {
    return '接口密钥会随插件设置明文保存；如果开启笔记同步或第三方同步，也可能被同步。';
  }
  return '接口密钥只保留在当前设置页内存中；保存设置时不会写入插件数据。关闭或重载笔记软件后需要重新输入。';
}
