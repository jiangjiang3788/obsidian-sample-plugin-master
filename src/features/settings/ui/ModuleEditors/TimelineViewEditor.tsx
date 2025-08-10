// src/features/settings/ui/ModuleEditors/TimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Stack, Typography, TextField } from '@mui/material';
import { ViewEditorProps } from './registry';
import { KeyValueEditor } from '@shared/components/form/KeyValueEditor';
import { ListEditor } from '@shared/components/form/ListEditor';

export function TimelineViewEditor({ value, onChange }: ViewEditorProps) {
  
  const handleCategoryMapChange = (newMap: Record<string, string>) => {
    onChange({ categoryMap: newMap });
  };
  
  const handleColorPaletteChange = (newPalette: string[]) => {
    onChange({ colorPalette: newPalette });
  };

  const handleProgressOrderChange = (newOrder: string[]) => {
    onChange({ progressOrder: newOrder });
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
      {/* 分类映射 */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {/* 修正点：将含有特殊字符的文本放入大括号和引号中 */}
          {'分类映射 (文件名/路径 -> 分类名)'}
        </Typography>
        <KeyValueEditor
          value={value.categoryMap || {}}
          onChange={handleCategoryMapChange}
          keyLabel="文件名/路径包含"
          valueLabel="映射为分类"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          用于将不同的原始文件名（或路径的一部分）聚合为统一的分类，例如 "2-1健康" 和 "00-健康打卡" 都映射为 "健康"。
        </Typography>
      </Box>

      {/* 颜色顺序 */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          分类颜色
        </Typography>
        <ListEditor
          value={value.colorPalette || []}
          onChange={handleColorPaletteChange}
          placeholder="#60a5fa"
          type="color"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          为分类提供一个颜色列表，会按顺序循环使用。
        </Typography>
      </Box>

      {/* 进度条显示顺序 */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          进度条显示顺序
        </Typography>
        <ListEditor
          value={value.progressOrder || []}
          onChange={handleProgressOrderChange}
          placeholder="分类名"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          定义分类在进度条和图例中显示的顺序。这里应填写映射后的分类名。
        </Typography>
      </Box>
    </Box>
  );
}