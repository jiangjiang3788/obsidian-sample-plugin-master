// src/features/dashboard/settings/ModuleEditors/TimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Stack, Typography, TextField, Button, IconButton } from '@mui/material';
import { ViewEditorProps } from './registry';
import { ListEditor } from '@shared/components/form/ListEditor';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';

// [FIX] 移除外层的封装，DEFAULT_CONFIG 现在直接就是 viewConfig 的内容
// 这将作为 ViewInstance.viewConfig 的默认值
export const DEFAULT_CONFIG = {
    defaultHourHeight: 50,
    WEEKLY_AGGREGATION_THRESHOLD_DAYS: 35,
    MAX_HOURS_PER_DAY: 24,
    UNTRACKED_LABEL: "未记录",
    categories: {
        "工作": { color: "#60a5fa", files: ["工作", "Work"] },
        "学习": { color: "#34d399", files: ["学习", "Study"] },
        "生活": { color: "#fbbf24", files: ["生活", "Life"] },
    },
    colorPalette: ["#34d399", "#fbbf24", "#a78bfa", "#60a5fa", "#f87171", "#a1a1aa"],
    progressOrder: ["工作", "学习", "生活"],
};

// 定义新的 CategoryConfig 类型
interface CategoryConfig {
  color: string;
  files: string[];
}
type CategoriesMap = Record<string, CategoryConfig>;

export function TimelineViewEditor({ value, onChange }: ViewEditorProps) {
  const viewConfig = value || {};
  const categories: CategoriesMap = viewConfig.categories || {};

  const handleConfigChange = (patch: Record<string, any>) => {
    onChange({ ...viewConfig, ...patch });
  };

  const handleCategoryNameChange = (oldName: string, newName: string) => {
    if (oldName === newName || !newName) return;
    const newCategories: CategoriesMap = {};
    for (const [key, catConfig] of Object.entries(categories)) {
      newCategories[key === oldName ? newName : key] = catConfig;
    }
    handleConfigChange({ categories: newCategories });
  };

  const handleCategoryColorChange = (name: string, newColor: string) => {
    handleConfigChange({
      categories: {
        ...categories,
        [name]: {
          ...(categories[name] || { files: [] }), // Ensure object exists
          color: newColor,
        },
      },
    });
  };

  const handleCategoryFilesChange = (name: string, newFiles: string[]) => {
    handleConfigChange({
      categories: {
        ...categories,
        [name]: {
          ...(categories[name] || { color: '#cccccc' }), // Ensure object exists
          files: newFiles,
        },
      },
    });
  };

  const addCategory = () => {
    let newName = `新分类`;
    let i = 1;
    while (categories[newName]) {
      newName = `新分类${i++}`;
    }
    handleConfigChange({
      categories: {
        ...categories,
        [newName]: { color: '#60a5fa', files: [] },
      },
    });
  };

  const removeCategory = (nameToRemove: string) => {
    const { [nameToRemove]: _, ...rest } = categories;
    handleConfigChange({ categories: rest });
  };

  const handleProgressOrderChange = (newOrder: string[]) => {
    handleConfigChange({ progressOrder: newOrder });
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
            在这里定义时间轴分类，并指定每个分类对应的颜色和文件名/路径中包含的**关键词**。
        </Typography>
        {/* 分类配置 */}
        <Box>
            <Stack spacing={1}>
                {Object.entries(categories).map(([name, catConfig]) => (
                    <Box key={name} sx={{ border: '1px solid #eee', p: 1, borderRadius: '4px', bgcolor: 'background.paper' }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <TextField
                                label="分类名"
                                variant="standard"
                                defaultValue={name}
                                onBlur={e => handleCategoryNameChange(name, (e.target as HTMLInputElement).value.trim())}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="颜色"
                                type="color"
                                variant="standard"
                                value={catConfig.color || '#cccccc'}
                                onChange={e => handleCategoryColorChange(name, (e.target as HTMLInputElement).value)}
                                sx={{ width: 80, '& .MuiInputBase-input': { padding: '4px 8px', height: '24px', cursor: 'pointer' } }}
                            />
                            <IconButton onClick={() => removeCategory(name)} size="small" color="error" title="删除此分类">
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                        <ListEditor
                            value={catConfig.files || []}
                            onChange={newFiles => handleCategoryFilesChange(name, newFiles)}
                            placeholder="例如：工作 或 2-1健康"
                        />
                    </Box>
                ))}
                <Stack direction="row" justifyContent="flex-start">
                    <Button startIcon={<AddIcon />} onClick={addCategory} size="small">
                        添加新分类
                    </Button>
                </Stack>
            </Stack>
        </Box>
        {/* 进度条显示顺序 */}
        <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                进度条/图例显示顺序
            </Typography>
            <ListEditor
                value={viewConfig.progressOrder || []}
                onChange={handleProgressOrderChange}
                placeholder="分类名 (填写上方定义的分类名)"
            />
        </Box>
        {/* 小时高度设置 */}
        <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                时间轴小时高度
            </Typography>
            <TextField
                label="像素值 (越高越精细)"
                type="number"
                variant="standard"
                value={viewConfig.defaultHourHeight || 50}
                onChange={e => handleConfigChange({ defaultHourHeight: Number((e.target as HTMLInputElement).value) })}
                inputProps={{ min: 20, max: 200 }}
                fullWidth
            />
        </Box>
    </Box>
  );
}