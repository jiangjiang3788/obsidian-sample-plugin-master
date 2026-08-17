/** @jsxImportSource preact */
import { ThinkSegmentedControl } from '@shared/ui/public';
import type { GoalTemplateEditMode } from './GoalTemplateEditorModel';

export function GoalTemplateModeSwitch({ mode, blockName, onChange }: {
  mode: GoalTemplateEditMode;
  blockName: string;
  onChange: (mode: GoalTemplateEditMode) => void;
}) {
  return (
    <div className="think-settings-row think-goal-template-mode-row">
      <div className="think-settings-row__label">预设模式</div>
      <div className="think-settings-row__body">
        <ThinkSegmentedControl
          label={`${blockName} 预设模式`}
          value={mode}
          options={[
            { value: 'inherit', label: '默认' },
            { value: 'override', label: '自定义' },
            { value: 'disabled', label: '隐藏' },
          ]}
          onChange={(next) => onChange(next as GoalTemplateEditMode)}
        />
      </div>
    </div>
  );
}
