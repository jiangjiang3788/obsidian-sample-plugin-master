/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton, ThinkNotice } from '@shared/ui/public';
import type { AiSettingsFooterProps } from './aiSettingsUiTypes';

export function AiSettingsFooter({ hasChanges, isSaving, saveStatusMessage, saveStatusSeverity, onSave }: AiSettingsFooterProps) {
  return (
    <div className="think-ai-settings-footer">
      {saveStatusMessage && <ThinkNotice tone={saveStatusSeverity === 'error' ? 'danger' : saveStatusSeverity}>{saveStatusMessage}</ThinkNotice>}
      <div className="think-settings-actions">
        {hasChanges && <span className="think-chip">有未保存更改</span>}
        <ThinkButton variant="primary" size="sm" onClick={onSave} disabled={!hasChanges || isSaving}>{isSaving ? '保存中...' : '保存设置'}</ThinkButton>
      </div>
    </div>
  );
}
