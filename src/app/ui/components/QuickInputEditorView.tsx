/** @jsxImportSource preact */
import { h } from 'preact';

import type { ThemeTreeNode } from '@core/public';

import { Box, Button, Divider, FormControl, Typography } from '@mui/material';

import { QuickInputEditorFields } from './QuickInputEditorFields';
import { QuickInputEditorThemeSelector } from './QuickInputEditorThemeSelector';

export interface QuickInputEditorViewProps {
  getResourcePath: (path: string) => string;

  // Block selection
  blocks: any[];
  allowBlockSwitch: boolean;
  currentBlockId: string;
  onBlockChange: (blockId: string) => void;

  // Theme selection
  themeTree: ThemeTreeNode[];
  activePath: ThemeTreeNode[];
  onSelectTheme: (themeId: string, parentThemeId: string | null) => void;

  // Fields
  template: any;
  formData: Record<string, any>;
  dense?: boolean;
  showDivider?: boolean;
  onUpdateField: (key: string, value: any, isOptionObject?: boolean) => void;
}

/**
 * QuickInputEditorView（纯渲染）
 * - 不读 store、不做副作用
 * - 只根据 props 输出 UI
 */
export function QuickInputEditorView({
  getResourcePath,
  blocks,
  allowBlockSwitch,
  currentBlockId,
  onBlockChange,
  themeTree,
  activePath,
  onSelectTheme,
  template,
  formData,
  dense = false,
  showDivider = true,
  onUpdateField,
}: QuickInputEditorViewProps) {
  if (!template) {
    return <div>错误：找不到当前 Block 的模板配置。</div>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1.5 : 2 }}>
      {/* Block 类型选择器 */}
      {allowBlockSwitch && blocks.length > 1 && (
        <FormControl fullWidth>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            记录类型
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {blocks.map((block: any) => (
              <Button
                key={block.id}
                variant={currentBlockId === block.id ? 'contained' : 'outlined'}
                size="small"
                onClick={() => onBlockChange(block.id)}
                sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.875rem' }}
              >
                {block.name}
              </Button>
            ))}
          </Box>
        </FormControl>
      )}

      {/* 主题选择 */}
      <QuickInputEditorThemeSelector themeTree={themeTree} activePath={activePath} onSelect={onSelectTheme} dense={dense} />

      {showDivider && <Divider sx={{ my: dense ? 1 : 2 }} />}
      <QuickInputEditorFields getResourcePath={getResourcePath} template={template} formData={formData} dense={dense} onUpdateField={onUpdateField} />
    </Box>
  );
}
