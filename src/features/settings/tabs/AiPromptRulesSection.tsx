/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton, ThinkDisclosure, ThinkTextarea } from '@shared/ui/public';
import { CUSTOM_PROMPT_EXAMPLES } from '@core/types/public';
import type { AiPromptRulesSectionProps } from './aiSettingsUiTypes';

export function AiPromptRulesSection({ settings, onUpdate, onInsertExample }: AiPromptRulesSectionProps) {
  return (
    <ThinkDisclosure title="个性化规则" open>
      <div className="think-settings-row think-settings-row--top">
        <span className="think-settings-row__label think-settings-row__label--top">自定义提示词</span>
        <div className="think-settings-row__body think-settings-stack think-settings-stack--tight">
          <ThinkTextarea rows={8} placeholder={CUSTOM_PROMPT_EXAMPLES} value={settings.customPrompt ?? ''} onInput={(e) => onUpdate({ customPrompt: (e.currentTarget as HTMLTextAreaElement).value })} />
          <div className="think-settings-actions think-settings-actions--start"><ThinkButton variant="secondary" size="sm" onClick={onInsertExample}>插入示例</ThinkButton></div>
        </div>
      </div>
    </ThinkDisclosure>
  );
}
