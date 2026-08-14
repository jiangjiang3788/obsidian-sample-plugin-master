/** @jsxImportSource preact */
import { h } from 'preact';

import { QuickInputEditorFields } from './components/Fields';
import { GoalSelector, type GoalSelectorOption } from './components/GoalSelector';
import { RecordTypeSwitcher } from './components/RecordTypeSwitcher';
import { SelectablePill } from './components/SelectablePill';
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
  templateVariants?: Array<{ value: string; label: string }>;
  selectedTemplateVariantId?: string | null;
  onSelectTemplateVariant?: (variantId: string | null) => void;

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
  templateSourceType?: 'core-block' | 'goal-template' | null;
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
  templateVariants = [],
  selectedTemplateVariantId = null,
  onSelectTemplateVariant,
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
    return <div>错误：找不到当前记录类型的默认配置。</div>;
  }

  const shouldShowCoreBlockFallbackHint = Boolean(currentGoalPath)
    && templateSourceType === 'core-block'
    && templateVariants.length === 0;
  const isTaskTemplate = String(currentBlockId || template?.coreBlockId || template?.id || '').replace(/^core\./, '') === 'task';

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
              {shouldShowCoreBlockFallbackHint && (
                <div className="think-quick-input-context-hint">当前目标没有此记录类型的专属预设，已使用记录类型默认模板。</div>
              )}
            </div>
          </QuickInputFormRow>

          {templateVariants.length > 0 && (
            <QuickInputFormRow label="记录预设">
              <div className="think-quick-input-pill-row think-quick-input-template-variant-switcher">
                {templateVariants.map((variant) => {
                  const isSelected = (selectedTemplateVariantId || 'default') === variant.value;
                  return (
                    <SelectablePill
                      key={variant.value}
                      selected={isSelected}
                      disabled={templateVariants.length <= 1}
                      onClick={() => templateVariants.length > 1 ? onSelectTemplateVariant?.(variant.value) : undefined}
                      title={variant.label}
                    >
                      {variant.label}
                    </SelectablePill>
                  );
                })}
              </div>
            </QuickInputFormRow>
          )}
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
