/** @jsxImportSource preact */
import { h } from 'preact';

import type { ThemeTreeNode } from '@core/public';

import { Box, FormControl, FormControlLabel, Radio, RadioGroup as MuiRadioGroup, Typography } from '@mui/material';

export interface QuickInputEditorThemeSelectorProps {
  themeTree: ThemeTreeNode[];
  activePath: ThemeTreeNode[];
  onSelect: (themeId: string, parentThemeId: string | null) => void;
  dense?: boolean;
}

/**
 * 主题选择器（纯渲染）
 * - 只依赖 props，不读 store、不做副作用
 * - 通过 activePath 渲染多层级 RadioGroup
 */
const renderThemeLevels = (
  nodes: ThemeTreeNode[],
  activePath: ThemeTreeNode[],
  onSelect: (id: string, parentId: string | null) => void,
  level = 0
) => {
  const parentNode = activePath[level - 1];
  const parentThemeId = parentNode ? parentNode.themeId : null;

  return (
    <div>
      <MuiRadioGroup row value={activePath[level]?.themeId || ''}>
        {nodes.map((node) => (
          <FormControlLabel
            key={node.id}
            value={node.themeId}
            disabled={!node.themeId}
            control={<Radio onClick={() => node.themeId && onSelect(node.themeId, parentThemeId)} size="small" />}
            label={node.name}
          />
        ))}
      </MuiRadioGroup>

      {activePath[level] && activePath[level].children.length > 0 && (
        <div style={{ paddingLeft: '20px' }}>{renderThemeLevels(activePath[level].children, activePath, onSelect, level + 1)}</div>
      )}
    </div>
  );
};

export function QuickInputEditorThemeSelector({ themeTree, activePath, onSelect, dense = false }: QuickInputEditorThemeSelectorProps) {
  if (!themeTree || themeTree.length === 0) return null;

  return (
    <FormControl component="fieldset" sx={{ width: '100%' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        主题分类
      </Typography>
      <Box
        sx={{
          maxHeight: dense ? '100px' : '120px',
          overflowY: 'auto',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: 1,
          p: 1,
        }}
      >
        {renderThemeLevels(themeTree, activePath, onSelect)}
      </Box>
    </FormControl>
  );
}
