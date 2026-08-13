/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton, ThinkDisclosure, ThinkInput, ThinkNotice, ThinkRange, ThinkToggle } from '@shared/ui/public';
import type { AiApiConfigSectionProps } from './aiSettingsUiTypes';

export function AiApiConfigSection({ settings, onUpdate, readiness, apiKeyPersistenceMessage, testStatus, testMessage, onTestConnection }: AiApiConfigSectionProps) {
  return (
    <ThinkDisclosure title="API 配置" open>
      <div className="think-settings-stack think-settings-stack--tight">
        <div className="think-settings-row"><span className="think-settings-row__label">API 端点</span><ThinkInput value={settings.apiEndpoint} placeholder="https://api.openai.com/v1" onInput={(e) => onUpdate({ apiEndpoint: (e.currentTarget as HTMLInputElement).value })} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">API 密钥</span><ThinkInput type="password" value={settings.apiKey} onInput={(e) => onUpdate({ apiKey: (e.currentTarget as HTMLInputElement).value })} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">保存密钥</span><div className="think-settings-row__body"><ThinkToggle checked={settings.persistApiKey === true} onChange={(e) => onUpdate({ persistApiKey: (e.currentTarget as HTMLInputElement).checked })} label="持久化到设置" /></div></div>
        {settings.persistApiKey && <ThinkNotice tone="warning">{apiKeyPersistenceMessage}</ThinkNotice>}
        <div className="think-settings-row"><span className="think-settings-row__label">模型</span><ThinkInput value={settings.model} placeholder="gpt-4" onInput={(e) => onUpdate({ model: (e.currentTarget as HTMLInputElement).value })} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">温度 {settings.temperature}</span><ThinkRange value={settings.temperature} onInput={(e) => onUpdate({ temperature: Number((e.currentTarget as HTMLInputElement).value) })} min={0} max={2} step={0.1} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">最大 Token</span><ThinkInput className="think-settings-field--md" type="number" value={settings.maxTokens} onInput={(e) => onUpdate({ maxTokens: parseInt((e.currentTarget as HTMLInputElement).value, 10) || 4096 })} /></div>
        <div className="think-settings-row"><span className="think-settings-row__label">超时毫秒</span><ThinkInput className="think-settings-field--md" type="number" value={settings.requestTimeoutMs} onInput={(e) => onUpdate({ requestTimeoutMs: parseInt((e.currentTarget as HTMLInputElement).value, 10) || 30000 })} /></div>
        <div className="think-settings-row think-settings-row--top"><span className="think-settings-row__label think-settings-row__label--top">连接</span><div className="think-settings-row__body think-settings-stack think-settings-stack--tight"><ThinkButton variant="secondary" size="sm" onClick={onTestConnection} disabled={testStatus === 'testing' || !readiness.ready}>{testStatus === 'testing' ? '测试中...' : '测试连接'}</ThinkButton>{!readiness.ready && <ThinkNotice>{readiness.message}</ThinkNotice>}{testStatus !== 'idle' && <ThinkNotice tone={testStatus === 'success' ? 'success' : testStatus === 'error' ? 'danger' : 'info'}>{testMessage}</ThinkNotice>}</div></div>
      </div>
    </ThinkDisclosure>
  );
}
