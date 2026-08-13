/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';

import type { ThemeDefinition } from '@core/types/public';

import { QuickInputEditorFields } from './components/Fields';
import { GoalSelector, type GoalSelectorOption } from './components/GoalSelector';
import { RecordTypeSwitcher } from './components/RecordTypeSwitcher';
import { SelectablePill } from './components/SelectablePill';

export interface QuickInputEditorViewProps {
  getResourcePath: (path: string) => string;

  blocks: any[];
  allowBlockSwitch: boolean;
  currentBlockId: string;
  onBlockChange: (blockId: string) => void;

  themes: ThemeDefinition[];
  selectedThemeId: string | null;
  onSelectTheme: (themeId: string | null, path: string | null) => void;
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
  currentThemePath?: string | null;
  currentGoalPath?: string | null;
  templateSourceType?: 'core-block' | 'goal-template' | null;
  fieldSourceSummary?: Record<string, number>;
  currentPeriodLabel?: string | null;
}

function ContextRow({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div className="think-quick-input-context-row">
      <div className="think-quick-input-context-row__label">{label}</div>
      <div className="think-quick-input-context-row__control">{children}</div>
    </div>
  );
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

  return (
    <div className={`think-quick-input-editor${dense ? ' is-dense' : ''}`}>
      <div className="think-quick-input-context-grid">
          {allowBlockSwitch && blocks.length > 1 && (
            <ContextRow label="记录类型">
              <RecordTypeSwitcher
                blocks={blocks}
                currentBlockId={currentBlockId}
                onBlockChange={onBlockChange}
              />
            </ContextRow>
          )}

          <ContextRow label="目标">
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
          </ContextRow>

          {templateVariants.length > 0 && (
            <ContextRow label="记录预设">
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
            </ContextRow>
          )}
      </div>

      {showDivider && <div className="think-quick-input-context-divider" aria-hidden="true" />}

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
