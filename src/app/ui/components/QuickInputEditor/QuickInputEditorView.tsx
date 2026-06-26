/** @jsxImportSource preact */
import { h } from 'preact';

import type { CycleDefinition, ThemeDefinition } from '@core/public';

import { Box, Divider, FormControl, Typography } from '@shared/public';

import { QuickInputEditorFields } from './components/Fields';
import { SelectablePill } from './components/SelectablePill';
import { GoalSelector, type GoalSelectorOption } from './components/GoalSelector';

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
  templateVariants?: Array<{ value: string; label: string; isDefault?: boolean }>;
  selectedTemplateVariantId?: string | null;
  onSelectTemplateVariant?: (variantId: string | null) => void;
  cycles?: CycleDefinition[];
  selectedCycleId?: string | null;
  onSelectCycle?: (cycleId: string | null) => void;

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


function SectionTitle({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 700,
        color: 'text.primary',
        mb: compact ? 0.75 : 0.9,
        lineHeight: 1.3,
      }}
    >
      {title}
    </Typography>
  );
}

export function QuickInputEditorView({
  getResourcePath,
  blocks,
  allowBlockSwitch,
  currentBlockId,
  onBlockChange,
  themes,
  selectedThemeId,
  onSelectTheme,
  goals,
  selectedGoalPath,
  onSelectGoal,
  onCreateGoal,
  templateVariants = [],
  selectedTemplateVariantId = null,
  onSelectTemplateVariant,
  cycles = [],
  selectedCycleId = null,
  onSelectCycle,
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
}: QuickInputEditorViewProps) {
  if (!template) {
    return <div>错误：找不到当前记录类型的默认配置。</div>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1.75 : 2 }}>
      <Box>
        <SectionTitle title="目标" compact />
        <GoalSelector
          goals={goals}
          selectedGoalPath={selectedGoalPath}
          onSelect={onSelectGoal}
          onCreateGoal={onCreateGoal}
          dense={dense}
        />
      </Box>

      {allowBlockSwitch && blocks.length > 1 && (
        <Box>
          <SectionTitle title="记录类型" compact />
          <FormControl fullWidth>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {blocks.map((block: any) => (
                <SelectablePill
                  key={block.id}
                  selected={currentBlockId === block.id}
                  onClick={() => onBlockChange(block.id)}
                  title={block.name}
                >
                  {block.name}
                </SelectablePill>
              ))}
            </div>
          </FormControl>
        </Box>
      )}

      {templateVariants.length > 0 && (
        <Box>
          <SectionTitle title="记录预设" compact />
          <FormControl fullWidth>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {templateVariants.map((variant) => {
                const isSelected = (selectedTemplateVariantId || 'default') === variant.value;
                return (
                  <SelectablePill
                    key={variant.value}
                    selected={isSelected}
                    disabled={templateVariants.length <= 1}
                    onClick={() => templateVariants.length > 1 ? onSelectTemplateVariant?.(variant.value) : undefined}
                    title={variant.isDefault ? `${variant.label}（默认）` : variant.label}
                  >
                    {variant.label}{variant.isDefault ? ' · 默认' : ''}
                  </SelectablePill>
                );
              })}
            </div>
          </FormControl>
        </Box>
      )}

      {showDivider && <Divider sx={{ my: dense ? 0.1 : 0.2, opacity: 0.55 }} />}

      <Box>
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
      </Box>
    </Box>
  );
}
