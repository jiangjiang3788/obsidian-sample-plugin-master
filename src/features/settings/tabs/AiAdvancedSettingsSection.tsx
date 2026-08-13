/** @jsxImportSource preact */
import { h } from 'preact';
import { SimpleSelect, ThinkDisclosure, ThinkInput, ThinkToggle } from '@shared/ui/public';
import type { AiSettingsSectionProps } from './aiSettingsUiTypes';

export function AiAdvancedSettingsSection({ settings, onUpdate }: AiSettingsSectionProps) {
  return (
    <>
      <ThinkDisclosure title="多结果设置">
        <div className="think-settings-stack think-settings-stack--tight">
          <div className="think-settings-row"><span className="think-settings-row__label">多条结果</span><div className="think-settings-row__body"><ThinkToggle checked={settings.allowMultipleResults} onChange={(e) => onUpdate({ allowMultipleResults: (e.currentTarget as HTMLInputElement).checked })} label="允许" /></div></div>
          <div className="think-settings-row"><span className="think-settings-row__label">最大数量</span><ThinkInput className="think-settings-field--sm" type="number" value={settings.maxResults} disabled={!settings.allowMultipleResults} onInput={(e) => onUpdate({ maxResults: parseInt((e.currentTarget as HTMLInputElement).value, 10) || 5 })} /></div>
          <div className="think-settings-row"><span className="think-settings-row__label">确认模式</span><SimpleSelect value={settings.confirmMode} options={[{ value: 'single', label: '单条确认' }, { value: 'batch', label: '批量确认' }]} onChange={(confirmMode) => onUpdate({ confirmMode: confirmMode as 'single' | 'batch' })} /></div>
        </div>
      </ThinkDisclosure>
      <ThinkDisclosure title="性能设置">
        <div className="think-settings-stack think-settings-stack--tight">
          <div className="think-settings-row"><span className="think-settings-row__label">预加载</span><div className="think-settings-row__body"><ThinkToggle checked={settings.preloadConfigOnStartup} onChange={(e) => onUpdate({ preloadConfigOnStartup: (e.currentTarget as HTMLInputElement).checked })} label="启动时加载配置" /></div></div>
          <div className="think-settings-row"><span className="think-settings-row__label">缓存 TTL</span><ThinkInput className="think-settings-field--md" type="number" value={settings.configCacheTTLSeconds} onInput={(e) => onUpdate({ configCacheTTLSeconds: parseInt((e.currentTarget as HTMLInputElement).value, 10) || 300 })} /></div>
        </div>
      </ThinkDisclosure>
    </>
  );
}
