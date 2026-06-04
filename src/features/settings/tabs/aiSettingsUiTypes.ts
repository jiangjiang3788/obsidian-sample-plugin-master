import type { AiSettings as AiSettingsType, BlockTemplate, ThemeDefinition } from '@core/public';
import type { AiSettingsReadiness } from './aiSettingsReadiness';

export type AiSettingsUpdate = (updates: Partial<AiSettingsType>) => void;
export type AiTestStatus = 'idle' | 'testing' | 'success' | 'error';

export interface AiSettingsSectionProps {
  settings: AiSettingsType;
  onUpdate: AiSettingsUpdate;
}

export interface AiApiConfigSectionProps extends AiSettingsSectionProps {
  readiness: AiSettingsReadiness;
  apiKeyPersistenceMessage: string;
  testStatus: AiTestStatus;
  testMessage: string;
  onTestConnection: () => void;
}

export interface AiPromptRulesSectionProps extends AiSettingsSectionProps {
  onInsertExample: () => void;
}

export interface AiScopeSectionProps extends AiSettingsSectionProps {
  blocks: BlockTemplate[];
  themes: ThemeDefinition[];
  onInitAllBlocks: () => void;
  onToggleBlock: (blockId: string) => void;
}

export interface AiSettingsFooterProps {
  hasChanges: boolean;
  isSaving: boolean;
  saveStatusMessage: string;
  saveStatusSeverity: 'success' | 'error' | 'info';
  onSave: () => void;
}
