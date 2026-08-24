/** @jsxImportSource preact */
import { h } from 'preact';

import { QuickInputEditorFields } from './components/Fields';
import { GoalSelector, type GoalSelectorOption } from './components/GoalSelector';
import { RecordTypeSwitcher } from './components/RecordTypeSwitcher';
import { QuickInputFormRow } from './components/FormRow';

export interface QuickInputEditorViewProps {
  getResourcePath: (path: string) => string;

  blocks: any[];
  allowBlockSwitch: boolean;
  currentBlockId: string;
  onBlockChange: (blockId: string) => void;

  goals: GoalSelectorOption[];
  selectedGoalPath: string | null;
  onSelectGoal: (goal: GoalSelectorOption | null) => void;
  onCreateGoal?: (goalPath: string) => Promise<void> | void;

  template: any;
  formData: Record<string, any>;
  fieldValueOptionsByKey?: Record<string, Array<{ value: string; label?: string; icon?: string }>>;
  timeDirection?: 'forward' | 'backward';
  dense?: boolean;
  showDivider?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
  onTimeDirectionChange?: (direction: 'forward' | 'backward') => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
  showTimeDirectionControl?: boolean;
  currentGoalPath?: string | null;
  templateSourceType?: 'record-type' | 'goal-template' | null;
  fieldSourceSummary?: Record<string, number>;
  currentPeriodLabel?: string | null;
}

export function QuickInputEditorView({
  getResourcePath,
  blocks,
  allowBlockSwitch,
  currentBlockId,
  onBlockChange,
  goals,
  selectedGoalPath,
  onSelectGoal,
  onCreateGoal,
  template,
  formData,
  fieldValueOptionsByKey,
  timeDirection = 'forward',
  dense = false,
  showDivider = true,
  onUpdateField,
  onTimeDirectionChange,
  onRequestSubmit,
  isMobileLike = false,
  showTimeDirectionControl = false,
  currentGoalPath = null,
  templateSourceType = null,
}: QuickInputEditorViewProps) {
  if (!template) {
    return (
      <div className={`think-quick-input-editor${dense ? ' is-dense' : ''}`}>
        <div className="think-quick-input-context-grid">
          {allowBlockSwitch && blocks.length > 1 && (
            <QuickInputFormRow label="记录类型">
              <RecordTypeSwitcher
                blocks={blocks}
                currentBlockId={currentBlockId}
                onBlockChange={onBlockChange}
              />
            </QuickInputFormRow>
          )}

          {currentBlockId ? (
            <QuickInputFormRow label="目标">
              <GoalSelector
                goals={goals}
                selectedGoalPath={selectedGoalPath}
                onSelect={onSelectGoal}
                onCreateGoal={onCreateGoal}
                dense={dense}
              />
            </QuickInputFormRow>
          ) : null}
        </div>
        <div className="think-quick-input-context-hint">
          {currentBlockId ? '请选择已配置模板的目标后继续。' : '请选择记录类型后继续。'}
        </div>
      </div>
    );
  }

  const shouldShowRecordTypeFallbackHint = Boolean(currentGoalPath)
    && templateSourceType === 'record-type';
  const isTaskTemplate = String(currentBlockId || template?.recordTypeId || template?.id || '').replace(/^core\./, '') === 'task';

  return (
    <div className={`think-quick-input-editor${dense ? ' is-dense' : ''}`}>
      <div className="think-quick-input-context-grid">
          {allowBlockSwitch && blocks.length > 1 && (
            <QuickInputFormRow label="记录类型">
              <RecordTypeSwitcher
                blocks={blocks}
                currentBlockId={currentBlockId}
                onBlockChange={onBlockChange}
              />
            </QuickInputFormRow>
          )}

          <QuickInputFormRow label="目标">
            <div className="think-quick-input-context-row__stack">
              <GoalSelector
                goals={goals}
                selectedGoalPath={selectedGoalPath}
                onSelect={onSelectGoal}
                onCreateGoal={onCreateGoal}
                dense={dense}
              />
              {shouldShowRecordTypeFallbackHint && (
                <div className="think-quick-input-context-hint">当前记录使用记录类型基础模板。</div>
              )}
            </div>
          </QuickInputFormRow>
      </div>

      {showDivider && !isTaskTemplate && <div className="think-quick-input-context-divider" aria-hidden="true" />}

      <div className="think-quick-input-fields">
        <QuickInputEditorFields
          getResourcePath={getResourcePath}
          template={template}
          formData={formData}
          fieldValueOptionsByKey={fieldValueOptionsByKey}
          dense={dense}
          onUpdateField={onUpdateField}
          timeDirection={timeDirection}
          onTimeDirectionChange={onTimeDirectionChange}
          onRequestSubmit={onRequestSubmit}
          isMobileLike={isMobileLike}
          showTimeDirectionControl={showTimeDirectionControl}
        />
      </div>
    </div>
  );
}
