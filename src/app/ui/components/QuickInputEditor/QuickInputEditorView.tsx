/** @jsxImportSource preact */
import { h } from 'preact';

import type { ThemeDefinition } from '@core/public';

import { Box, Divider, FormControl, Typography } from '@mui/material';

import { QuickInputEditorFields } from './components/Fields';
import { SelectablePill } from './components/SelectablePill';
import { QuickInputEditorThemeSelector } from './components/ThemeSelector';

export interface QuickInputEditorViewProps {
  getResourcePath: (path: string) => string;

  blocks: any[];
  allowBlockSwitch: boolean;
  currentBlockId: string;
  onBlockChange: (blockId: string) => void;

  themes: ThemeDefinition[];
  selectedThemeId: string | null;
  onSelectTheme: (themeId: string | null, path: string | null) => void;

  template: any;
  formData: Record<string, any>;
  timeDirection?: 'forward' | 'backward';
  dense?: boolean;
  showDivider?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
  onTimeDirectionChange?: (direction: 'forward' | 'backward') => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
  showTimeDirectionControl?: boolean;
  currentThemePath?: string | null;
  templateSourceType?: 'block' | 'override' | null;
  fieldSourceSummary?: {
    user: number;
    context: number;
    template_default: number;
    system_auto: number;
  };
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
  templateSourceType,
  fieldSourceSummary,
}: {
  currentThemePath?: string | null;
  templateSourceType?: 'block' | 'override' | null;
  fieldSourceSummary?: { user: number; context: number; template_default: number; system_auto: number };
}) {
  const chips: Array<{ label: string; value: string }> = [];
  if (currentThemePath) chips.push({ label: '主题', value: currentThemePath });
  if (templateSourceType) chips.push({ label: '模板来源', value: templateSourceType === 'override' ? '主题覆盖' : 'Block 默认' });
  if (fieldSourceSummary) {
    if (fieldSourceSummary.user > 0) chips.push({ label: '手填', value: String(fieldSourceSummary.user) });
    if (fieldSourceSummary.context > 0) chips.push({ label: '回填', value: String(fieldSourceSummary.context) });
    if (fieldSourceSummary.template_default > 0) chips.push({ label: '模板默认', value: String(fieldSourceSummary.template_default) });
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
  template,
  formData,
  timeDirection = 'forward',
  dense = false,
  showDivider = true,
  onUpdateField,
  onTimeDirectionChange,
  onRequestSubmit,
  isMobileLike = false,
  showTimeDirectionControl = false,
  currentThemePath = null,
  templateSourceType = null,
  fieldSourceSummary,
}: QuickInputEditorViewProps) {
  if (!template) {
    return <div>错误：找不到当前 Block 的模板配置。</div>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1.75 : 2 }}>
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

      <Box>
        <SectionTitle title="主题分类" compact />
        <QuickInputEditorThemeSelector
          themes={themes}
          selectedThemeId={selectedThemeId}
          onSelect={onSelectTheme}
          dense={dense}
        />
      </Box>

      {showDivider && <Divider sx={{ my: dense ? 0.1 : 0.2, opacity: 0.55 }} />}

      <SnapshotSummary
        currentThemePath={currentThemePath}
        templateSourceType={templateSourceType}
        fieldSourceSummary={fieldSourceSummary}
      />

      <Box>
        <QuickInputEditorFields
          getResourcePath={getResourcePath}
          template={template}
          formData={formData}
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
