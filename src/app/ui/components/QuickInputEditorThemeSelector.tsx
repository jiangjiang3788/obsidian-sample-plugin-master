/** @jsxImportSource preact */
import { h } from 'preact';

import { Box, FormControl, Typography } from '@mui/material';

import type { ThemeDefinition } from '@core/public';
import { ThemeTreeSelect } from '@shared/public';

export interface QuickInputEditorThemeSelectorProps {
  themes: ThemeDefinition[];
  selectedThemeId: string | null;
  onSelect: (themeId: string | null, path: string | null) => void;
  dense?: boolean;
}

/**
 * QuickInputEditorThemeSelector（纯渲染）
 * - 复用统一 ThemeTreeSelect（单选）
 * - 不读 store、不做副作用
 */
export function QuickInputEditorThemeSelector({ themes, selectedThemeId, onSelect, dense = false }: QuickInputEditorThemeSelectorProps) {
  if (!themes || themes.length === 0) return null;

  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        主题分类
      </Typography>

      <Box sx={{ width: '100%' }}>
        <ThemeTreeSelect
          themes={themes}
          selectedThemeId={selectedThemeId}
          onSelect={onSelect}
          multiSelect={false}
          searchable={true}
          allowClear={true}
          placeholder="选择主题"
          size="small"
          // QuickInput 里空间有限，限制下拉高度
          maxDropdownHeight={dense ? 220 : 300}
          sx={{ width: '100%' }}
        />
      </Box>
    </FormControl>
  );
}
