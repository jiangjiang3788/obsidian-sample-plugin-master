/** @jsxImportSource preact */
import { h } from 'preact';
import type { Layout } from '@core/types/public';
import {
  Button,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup as MuiRadioGroup,
  Stack,
  TextField,
  Typography,
} from '@shared/ui/public';

const PERIOD_OPTIONS = ['年', '季', '月', '周', '天'].map((value) => ({ value, label: value }));
const FREEFORM_TEMPLATE_OPTIONS = [
  { value: 'balanced', label: '均衡排布' },
  { value: 'focus', label: '焦点 + 网格' },
];
const DISPLAY_MODE_OPTIONS = [
  { value: 'list', label: '列表' },
  { value: 'grid', label: '网格' },
  { value: 'freeform', label: '自由布局' },
];

type Option = { value: string; label: string };
type LayoutUpdate = (updates: Partial<Layout>) => void;

function AlignedRadioGroup({
  label,
  options,
  selectedValue,
  onChange,
}: {
  label: string;
  options: Option[];
  selectedValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} className="think-settings-row">
      <Typography className="think-settings-row__label">{label}</Typography>
      <MuiRadioGroup row value={selectedValue} onChange={(event) => onChange((event.target as HTMLInputElement).value)}>
        {options.map((option) => (
          <FormControlLabel key={option.value} value={option.value} control={<Radio size="small" />} label={option.label} />
        ))}
      </MuiRadioGroup>
    </Stack>
  );
}

export function LayoutGeneralSettings({ layout, onUpdate }: { layout: Layout; onUpdate: LayoutUpdate }) {
  return (
    <>
      <TextField
        label="布局名称"
        value={layout.name || ''}
        onChange={(event) => onUpdate({ name: (event.target as HTMLInputElement).value })}
        size="small"
        fullWidth
      />

      <Stack direction="row" alignItems="center" spacing={2} className="think-settings-row">
        <Typography className="think-settings-row__label">工具栏</Typography>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!layout.hideToolbar}
              onChange={(event) => onUpdate({ hideToolbar: !(event.target as HTMLInputElement).checked })}
            />
          }
          label={<Typography noWrap>显示工具栏/导航器</Typography>}
          className="think-settings-control-no-shrink"
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={2} className="think-settings-row">
        <Typography className="think-settings-row__label">初始日期</Typography>
        <TextField
          type="date"
          size="small"
          variant="outlined"
          disabled={!!layout.initialDateFollowsNow}
          value={layout.initialDate || ''}
          onChange={(event) => onUpdate({ initialDate: (event.target as HTMLInputElement).value })}
          className="think-settings-field--date"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={!!layout.initialDateFollowsNow}
              onChange={(event) => onUpdate({ initialDateFollowsNow: (event.target as HTMLInputElement).checked })}
            />
          }
          label={<Typography noWrap>跟随今日</Typography>}
        />
      </Stack>

      <AlignedRadioGroup
        label="初始视图（时间窗）"
        options={PERIOD_OPTIONS}
        selectedValue={layout.initialView || '月'}
        onChange={(value) => onUpdate({ initialView: value })}
      />

      <AlignedRadioGroup
        label="排列方式"
        options={DISPLAY_MODE_OPTIONS}
        selectedValue={layout.displayMode || 'list'}
        onChange={(value) => onUpdate({ displayMode: value as Layout['displayMode'] })}
      />

      {layout.displayMode === 'grid' && (
        <Stack direction="row" alignItems="center" spacing={2} className="think-settings-indent">
          <TextField
            label="列数"
            type="number"
            size="small"
            variant="outlined"
            value={layout.gridConfig?.columns || 2}
            onChange={(event) => onUpdate({ gridConfig: { columns: parseInt((event.target as HTMLInputElement).value, 10) || 2 } })}
            className="think-settings-field--xs"
          />
        </Stack>
      )}
    </>
  );
}

export function LayoutFreeformSettings({
  layout,
  onUpdate,
  onResetFreeformLayout,
}: {
  layout: Layout;
  onUpdate: LayoutUpdate;
  onResetFreeformLayout: () => void;
}) {
  if (layout.displayMode !== 'freeform') return null;

  return (
    <Stack spacing={1}>
      <AlignedRadioGroup
        label="默认模板"
        options={FREEFORM_TEMPLATE_OPTIONS}
        selectedValue={layout.freeformConfig?.defaultTemplate || 'balanced'}
        onChange={(value) => {
          const hasSavedPlacement = Object.keys(layout.viewPlacements || {}).length > 0;
          if (hasSavedPlacement && !confirm('切换模板会重置当前自由布局的位置、尺寸、层级、锁定和折叠状态，是否继续？')) return;
          onUpdate({
            freeformConfig: {
              ...(layout.freeformConfig || {}),
              defaultTemplate: value as 'balanced' | 'focus',
            },
            viewPlacements: {},
          });
        }}
      />
      <Stack spacing={1} className="think-settings-indent">
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={layout.freeformConfig?.snapToGrid ?? true}
                onChange={(event) => onUpdate({
                  freeformConfig: {
                    ...(layout.freeformConfig || {}),
                    snapToGrid: (event.target as HTMLInputElement).checked,
                  },
                })}
              />
            }
            label="拖动时吸附网格"
          />
          <TextField
            label="网格(px)"
            type="number"
            size="small"
            value={layout.freeformConfig?.gridSize || 16}
            onChange={(event) => onUpdate({
              freeformConfig: {
                ...(layout.freeformConfig || {}),
                gridSize: Math.max(4, parseInt((event.target as HTMLInputElement).value, 10) || 16),
              },
            })}
            className="think-settings-field--sm"
          />
          <TextField
            label="最小宽度"
            type="number"
            size="small"
            value={layout.freeformConfig?.minItemWidth || 280}
            onChange={(event) => onUpdate({
              freeformConfig: {
                ...(layout.freeformConfig || {}),
                minItemWidth: Math.max(160, parseInt((event.target as HTMLInputElement).value, 10) || 280),
              },
            })}
            className="think-settings-field--sm"
          />
          <TextField
            label="最小高度"
            type="number"
            size="small"
            value={layout.freeformConfig?.minItemHeight || 180}
            onChange={(event) => onUpdate({
              freeformConfig: {
                ...(layout.freeformConfig || {}),
                minItemHeight: Math.max(120, parseInt((event.target as HTMLInputElement).value, 10) || 180),
              },
            })}
            className="think-settings-field--sm"
          />
          <TextField
            label="画布最小宽度"
            type="number"
            size="small"
            value={layout.freeformConfig?.minCanvasWidth || 720}
            onChange={(event) => onUpdate({
              freeformConfig: {
                ...(layout.freeformConfig || {}),
                minCanvasWidth: Math.max(320, parseInt((event.target as HTMLInputElement).value, 10) || 720),
              },
            })}
            className="think-settings-field--md"
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              if (confirm('确认重置当前布局的自由布局位置吗？')) onResetFreeformLayout();
            }}
          >
            按模板重排
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          “均衡排布”按视图推荐尺寸顺序装箱；“焦点 + 网格”会让第一个视图横跨首行。切换模板或重排会清空已保存的布局状态。
        </Typography>
      </Stack>
    </Stack>
  );
}
