/** @jsxImportSource preact */
import { h } from 'preact';
import { Alert, Box, Button, Chip } from '@shared/ui/public';
import type { AiSettingsFooterProps } from './aiSettingsUiTypes';

export function AiSettingsFooter({
  hasChanges,
  isSaving,
  saveStatusMessage,
  saveStatusSeverity,
  onSave,
}: AiSettingsFooterProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
      {saveStatusMessage && (
        <Alert severity={saveStatusSeverity} sx={{ width: '100%' }}>
          {saveStatusMessage}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
        {hasChanges && <Chip label="有未保存的更改" color="warning" size="small" />}
        <Button variant="contained" onClick={onSave} disabled={!hasChanges || isSaving}>
          {isSaving ? '保存中...' : '保存设置'}
        </Button>
      </Box>
    </Box>
  );
}
