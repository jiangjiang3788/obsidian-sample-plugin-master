/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton, ThinkCheckbox, ThinkDisclosure, ThinkNotice } from '@shared/ui/public';
import type { AiScopeSectionProps } from './aiSettingsUiTypes';

export function AiScopeSection({ settings, recordTypes, onUpdate: _onUpdate, staleEnabledRecordTypeIds = [], onInitAllRecordTypes, onClearStaleRecordTypeIds, onToggleRecordType }: AiScopeSectionProps) {
  return (
    <ThinkDisclosure title="记录类型参与范围">
      <div className="think-settings-stack think-settings-stack--tight">
        <div className="think-settings-actions think-settings-actions--start">
          <ThinkButton variant="secondary" size="sm" onClick={onInitAllRecordTypes}>全部记录类型</ThinkButton>
          {staleEnabledRecordTypeIds.length > 0 && onClearStaleRecordTypeIds && <ThinkButton variant="secondary" size="sm" onClick={onClearStaleRecordTypeIds}>清理旧记录类型标识</ThinkButton>}
        </div>
        {staleEnabledRecordTypeIds.length > 0 && <ThinkNotice tone="warning">智能助手范围中有 {staleEnabledRecordTypeIds.length} 个已失效记录类型标识。</ThinkNotice>}
        <div className="think-ai-scope-list">
          {recordTypes.map((recordType) => <ThinkCheckbox key={recordType.id} checked={(settings.enabledRecordTypeIds ?? []).length === 0 || (settings.enabledRecordTypeIds ?? []).includes(recordType.id)} onChange={() => onToggleRecordType(recordType.id)} label={recordType.name} compact />)}
        </div>
        {recordTypes.length === 0 && <div className="think-settings-caption">暂无记录类型模板。</div>}
      </div>
    </ThinkDisclosure>
  );
}
