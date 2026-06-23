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
  selectedGoalTitle?: string | null;
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
  templateSourceType?: 'core-block' | 'goal-template' | 'legacy-block' | null;
  fieldSourceSummary?: Record<string, number>;
  currentPeriodLabel?: string | null;
}


function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.4,
        borderRadius: 999,
        backgroundColor: 'var(--background-secondary)',
        border: '1px solid var(--background-modifier-border)',
        fontSize: 12,
        lineHeight: 1.2,
        color: 'text.secondary',
      }}
    >
      <strong style={{ fontWeight: 600 }}>{label}</strong>
      <span>{value}</span>
    </Box>
  );
}

function SnapshotSummary({
  currentThemePath,
  currentGoalPath,
  templateSourceType,
  fieldSourceSummary,
  currentPeriodLabel,
}: {
  currentThemePath?: string | null;
  currentGoalPath?: string | null;
  templateSourceType?: 'core-block' | 'goal-template' | 'legacy-block' | null;
  fieldSourceSummary?: Record<string, number>;
  currentPeriodLabel?: string | null;
}) {
  const chips: Array<{ label: string; value: string }> = [];
  if (currentGoalPath) chips.push({ label: '目标', value: currentGoalPath });
  if (currentThemePath) chips.push({ label: '主题', value: currentThemePath });
  if (currentPeriodLabel) chips.push({ label: '周期', value: currentPeriodLabel });
  if (templateSourceType) {
    const sourceLabelMap: Record<string, string> = {
      'core-block': '核心Block',
      'goal-template': '目标记录预设',
      'legacy-block': '自定义Block',
    };
    chips.push({ label: '记录方式', value: sourceLabelMap[templateSourceType] || templateSourceType });
  }
  if (fieldSourceSummary) {
    if (fieldSourceSummary.user > 0) chips.push({ label: '手填', value: String(fieldSourceSummary.user) });
    if (fieldSourceSummary.context > 0) chips.push({ label: '回填', value: String(fieldSourceSummary.context) });
    if (fieldSourceSummary.template_default > 0) chips.push({ label: '预设默认', value: String(fieldSourceSummary.template_default) });
    if (fieldSourceSummary.system_auto > 0) chips.push({ label: '自动', value: String(fieldSourceSummary.system_auto) });
  }
  if (!chips.length) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        p: 1.1,
        borderRadius: 1.2,
        backgroundColor: 'var(--background-primary-alt)',
        border: '1px solid var(--background-modifier-border)',
      }}
    >
      {chips.map((chip) => (
        <MetaChip key={`${chip.label}-${chip.value}`} label={chip.label} value={chip.value} />
      ))}
    </Box>
  );
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
  selectedGoalTitle,
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
  currentThemePath = null,
  currentPeriodLabel = null,
  templateSourceType = null,
  fieldSourceSummary,
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
        {selectedGoalTitle && selectedGoalTitle !== selectedGoalPath && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.7 }}>
            当前目标：{selectedGoalTitle}
          </Typography>
        )}
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
          {templateVariants.length === 1 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.6 }}>
              当前目标和记录类型只有一个预设，已自动选择。
            </Typography>
          )}
        </Box>
      )}

      {showDivider && <Divider sx={{ my: dense ? 0.1 : 0.2, opacity: 0.55 }} />}

      <SnapshotSummary
        currentThemePath={currentThemePath}
        currentGoalPath={selectedGoalPath}
        templateSourceType={templateSourceType}
        fieldSourceSummary={fieldSourceSummary}
        currentPeriodLabel={currentPeriodLabel}
      />

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
