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
      <div className="think-settings-row__label">模板状态</div>
      <div className="think-settings-row__body">
        <ThinkSegmentedControl
          label={`${blockName} 模板状态`}
          value={mode}
          options={[
            { value: 'default', label: '未配置' },
            { value: 'override', label: '模板' },
            { value: 'disabled', label: '隐藏' },
          ]}
          onChange={(next) => onChange(next as GoalTemplateEditMode)}
        />
      </div>
    </div>
  );
}
