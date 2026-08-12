/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@shared/ui/public';
import type { ViewEditorProps } from './ViewEditorProps';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from '@core/view/public';

export { PROGRESS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';

/**
 * ProgressView 只做目标经验卡片。时间 / 目标 / Block / 主题筛选由统一控制栏和视图筛选完成。
 */
export function ProgressViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...value, mode: 'goal' };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        ProgressView 只按目标展示成长列表：目标作为一级行，小技能作为二级行。时间和筛选统一走外部视图系统，不在本视图内自建工具栏或周期切换。
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField size="small" type="number" label="显示目标数量" value={config.topN} onChange={(e) => onChange({ mode: 'goal', topN: Number((e.target as HTMLInputElement).value) || 20 })} />
        <TextField size="small" type="number" label="每条记录 XP" value={config.basePoints} onChange={(e) => onChange({ mode: 'goal', basePoints: Number((e.target as HTMLInputElement).value) || 1 })} />
        <TextField size="small" type="number" label="每级 XP" value={config.levelStep} onChange={(e) => onChange({ mode: 'goal', levelStep: Number((e.target as HTMLInputElement).value) || 20 })} />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField size="small" type="number" label="评分加分阈值" value={config.ratingBonusThreshold} onChange={(e) => onChange({ mode: 'goal', ratingBonusThreshold: Number((e.target as HTMLInputElement).value) || 4 })} />
        <TextField size="small" type="number" label="评分额外积分" value={config.ratingBonusPoints} onChange={(e) => onChange({ mode: 'goal', ratingBonusPoints: Number((e.target as HTMLInputElement).value) || 0 })} />
      </Stack>
      <FormControlLabel
        control={<Checkbox checked={config.showCategoryBreakdown !== false} onChange={(e) => onChange({ mode: 'goal', showCategoryBreakdown: (e.target as HTMLInputElement).checked })} />}
        label="展开卡片时显示 Block 统计"
      />
    </Stack>
  );
}
