import type { AiSettings as AiSettingsType, RecordCaptureTemplate } from '@core/types/public';
import type { AiSettingsReadiness } from './aiSettingsReadiness';

export type AiSettingsUpdate = (updates: Partial<AiSettingsType>) => void;
export type AiTestStatus = 'idle' | 'testing' | 'success' | 'error';
export type AiModelFetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AiSettingsSectionProps {
  settings: AiSettingsType;
  onUpdate: AiSettingsUpdate;
}

export interface AiApiConfigSectionProps extends AiSettingsSectionProps {
  readiness: AiSettingsReadiness;
  apiAccessReadiness: AiSettingsReadiness;
  apiKeyPersistenceMessage: string;
  testStatus: AiTestStatus;
  testMessage: string;
  onTestConnection: () => void;
  availableModels: string[];
  modelFetchStatus: AiModelFetchStatus;
  modelFetchMessage: string;
  onFetchModels: () => void;
}

export interface AiPromptRulesSectionProps extends AiSettingsSectionProps {
  onInsertExample: () => void;
}

export interface AiScopeSectionProps extends AiSettingsSectionProps {
  recordTypes: RecordCaptureTemplate[];
  staleEnabledRecordTypeIds?: string[];
  onInitAllRecordTypes: () => void;
  onClearStaleRecordTypeIds?: () => void;
  onToggleRecordType: (recordTypeId: string) => void;
}

export interface AiSettingsFooterProps {
  hasChanges: boolean;
  isSaving: boolean;
  saveStatusMessage: string;
  saveStatusSeverity: 'success' | 'error' | 'info';
  onSave: () => void;
}
