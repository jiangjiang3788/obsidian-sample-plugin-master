// src/features/dashboard/settings/ModuleEditors/TimelineViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Box, Stack, Typography, TextField, Button, IconButton } from '@mui/material';
import { ViewEditorProps } from './registry';
import { ListEditor } from '@shared/components/form/ListEditor';
import AddIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/RemoveCircleOutline';

/**
 * @fileoverview TimelineView 的设置编辑器。
 * 新增: 导出该视图的默认配置，作为单一真源。
 */

// [REFACTOR] 导出默认配置
export const DEFAULT_CONFIG = {
    view: 'TimelineView' as const,
    title: '时间轴',
    collapsed: false,
    filters: [],
    sort: [],
    viewConfig: {
      defaultHourHeight: 50,
      WEEKLY_AGGREGATION_THRESHOLD_DAYS: 35,
      MAX_HOURS_PER_DAY: 24,
      UNTRACKED_LABEL: "未记录",
      // 新版本中，这个映射改由 categories 字段提供，但保留一个示例
      categoryMap: {},
      categories: { // 提供一个更结构化的默认值
          "工作": { color: "#60a5fa", files: ["工作", "Work"] },
          "学习": { color: "#34d399", files: ["学习", "Study"] },
          "生活": { color: "#fbbf24", files: ["生活", "Life"] },
      },
      colorPalette: ["#34d399", "#fbbf24", "#a78bfa", "#60a5fa", "#f87171", "#a1a1aa"],
      progressOrder: ["工作", "学习", "生活"],
    }
};


// 定义新的 CategoryConfig 类型
interface CategoryConfig {
  color: string;
  files: string[];
}
type CategoriesMap = Record<string, CategoryConfig>;

export function TimelineViewEditor({ value, onChange }: ViewEditorProps) {
  // `value` 包含了整个 viewConfig，我们需要从中提取 categories
  const viewConfig = value.viewConfig || {};
  const categories: CategoriesMap = viewConfig.categories || {};

  const handleConfigChange = (patch: Record<string, any>) => {
    onChange({ viewConfig: { ...viewConfig, ...patch } });
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
          ...categories[name],
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
          ...categories[name],
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
        [newName]: { color: '#60a5fa', files: [] }, // 默认颜色和空文件列表
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
      {/* 分类配置 */}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          时间轴分类设置
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mb: 1, display: 'block' }}>
          在这里定义你的时间轴分类，并指定每个分类对应的颜色和文件/路径前缀。
        </Typography>

        <Stack spacing={1}>
          {Object.entries(categories).map(([name, catConfig]) => (
            <Box key={name} sx={{ border: '1px solid #eee', p: 1, borderRadius: '4px' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <TextField
                  label="分类名"
                  defaultValue={name} // Use defaultValue to avoid controlled/uncontrolled warning on key change
                  onBlur={e => handleCategoryNameChange(name, (e.target as HTMLInputElement).value.trim())}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="颜色"
                  type="color"
                  value={catConfig.color}
                  onChange={e => handleCategoryColorChange(name, (e.target as HTMLInputElement).value)}
                  sx={{ width: 80, '& .MuiInputBase-input': { padding: '4px 8px', height: '24px', cursor: 'pointer' } }}
                />
                <IconButton onClick={() => removeCategory(name)} size="small" color="error" title="删除此分类">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                文件名/路径包含 (用于匹配任务到此分类)
              </Typography>
              <ListEditor
                value={catConfig.files || []}
                onChange={newFiles => handleCategoryFilesChange(name, newFiles)}
                placeholder="例如：2-1健康 或 00-健康打卡"
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
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          进度条显示顺序
        </Typography>
        <ListEditor
          value={viewConfig.progressOrder || []}
          onChange={handleProgressOrderChange}
          placeholder="分类名 (填写上方定义的分类名)"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          定义分类在进度条和图例中显示的顺序。这里应填写上方定义的分类名。
        </Typography>
      </Box>

      {/* 小时高度设置 (可选，如果需要UI控制) */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          时间轴小时高度
        </Typography>
        <TextField
          label="像素值 (越高越精细)"
          type="number"
          value={viewConfig.defaultHourHeight || 50}
          onChange={e => handleConfigChange({ defaultHourHeight: Number((e.target as HTMLInputElement).value) })}
          inputProps={{ min: 20, max: 200 }}
          fullWidth
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          调整每小时在时间轴上占据的垂直空间大小。
        </Typography>
      </Box>
    </Box>
  );
}