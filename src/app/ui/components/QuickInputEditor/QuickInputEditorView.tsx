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
  dense?: boolean;
  showDivider?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
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
  dense = false,
  showDivider = true,
  onUpdateField,
  onRequestSubmit,
  isMobileLike = false,
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

      <Box>
        <QuickInputEditorFields
          getResourcePath={getResourcePath}
          template={template}
          formData={formData}
          dense={dense}
          onUpdateField={onUpdateField}
          onRequestSubmit={onRequestSubmit}
          isMobileLike={isMobileLike}
        />
      </Box>
    </Box>
  );
}
