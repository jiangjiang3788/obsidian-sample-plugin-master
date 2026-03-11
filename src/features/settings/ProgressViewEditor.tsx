/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, Typography, FormControlLabel, Checkbox } from '@mui/material';
import type { ViewEditorProps } from './registry';
import { PROGRESS_VIEW_DEFAULT_CONFIG } from '@core/public';
import { ListEditor } from '@shared/public';

export { PROGRESS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

export function ProgressViewEditor({ value, onChange }: ViewEditorProps) {
  const config = { ...PROGRESS_VIEW_DEFAULT_CONFIG, ...value };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        ProgressView 是独立的积分/成长视图：只读取记录，不改写打卡数据。
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField size="small" type="number" label="基础积分" value={config.basePoints} onChange={(e) => onChange({ basePoints: Number((e.target as HTMLInputElement).value) || 1 })} />
        <TextField size="small" type="number" label="每级积分" value={config.levelStep} onChange={(e) => onChange({ levelStep: Number((e.target as HTMLInputElement).value) || 20 })} />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField size="small" type="number" label="评分加分阈值" value={config.ratingBonusThreshold} onChange={(e) => onChange({ ratingBonusThreshold: Number((e.target as HTMLInputElement).value) || 4 })} />
        <TextField size="small" type="number" label="评分额外积分" value={config.ratingBonusPoints} onChange={(e) => onChange({ ratingBonusPoints: Number((e.target as HTMLInputElement).value) || 0 })} />
      </Stack>
      <div>
        <Typography variant="body2" sx={{ mb: 1 }}>参与积分的基础分类（留空 = 全部）</Typography>
        <ListEditor value={config.includedCategories || []} onChange={(val) => onChange({ includedCategories: val })} placeholder="例如：闪念、任务、打卡" />
      </div>
      <Stack direction="row" spacing={2}>
        <FormControlLabel control={<Checkbox checked={config.showCategoryBreakdown !== false} onChange={(e) => onChange({ showCategoryBreakdown: (e.target as HTMLInputElement).checked })} />} label="显示分类积分" />
        <FormControlLabel control={<Checkbox checked={config.showThemeBreakdown !== false} onChange={(e) => onChange({ showThemeBreakdown: (e.target as HTMLInputElement).checked })} />} label="显示主题积分" />
      </Stack>
      <TextField size="small" type="number" label="榜单数量" value={config.topN} onChange={(e) => onChange({ topN: Number((e.target as HTMLInputElement).value) || 5 })} />
    </Stack>
  );
}
