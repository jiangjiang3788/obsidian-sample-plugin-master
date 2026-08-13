/** @jsxImportSource preact */
import { ThinkSegmentedControl } from '@shared/ui/public';
import type { GoalTemplateEditMode } from './GoalTemplateEditorModel';

export function GoalTemplateModeSwitch({ mode, blockName, disabled, onInherit, onOverride }: {
  mode: GoalTemplateEditMode;
  blockName: string;
  disabled?: boolean;
  onInherit: () => void;
  onOverride: () => void;
}) {
  const value = mode === 'disabled' ? 'disabled' : mode;
  return (
    <div className="think-settings-row think-goal-template-mode-row">
      <div className="think-settings-row__label">预设模式</div>
      <div className="think-settings-row__body">
        <ThinkSegmentedControl
          label={`${blockName} 预设模式`}
          value={value}
          options={[
            { value: 'inherit', label: '继承', disabled },
            { value: 'override', label: '覆盖', disabled },
          ]}
          onChange={(next) => {
            if (next === 'inherit') onInherit();
            if (next === 'override') onOverride();
          }}
        />
      </div>
    </div>
  );
}
