/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';
import type { Layout } from '@core/types/public';
import {
  ThinkButton,
  ThinkCheckbox,
  ThinkInput,
  ThinkSegmentedControl,
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

function SettingsRow({ label, children, top = false }: { label: string; children: ComponentChildren; top?: boolean }) {
  return (
    <div className={`think-settings-row think-layout-editor__control-row${top ? ' think-settings-row--top' : ''}`}>
      <span className={`think-settings-row__label${top ? ' think-settings-row__label--top' : ''}`}>{label}</span>
      <div className="think-settings-row__body">{children}</div>
    </div>
  );
}

function SettingsSegmentedRow({
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
    <SettingsRow label={label}>
      <ThinkSegmentedControl
        label={label}
        value={selectedValue}
        options={options}
        onChange={onChange}
        size="sm"
        className="think-layout-editor__segmented"
      />
    </SettingsRow>
  );
}

export function LayoutGeneralSettings({ layout, onUpdate }: { layout: Layout; onUpdate: LayoutUpdate }) {
  return (
    <div className="think-layout-editor__general">
      <SettingsRow label="布局名称">
        <ThinkInput
          aria-label="布局名称"
          value={layout.name || ''}
          onInput={(event) => onUpdate({ name: (event.currentTarget as HTMLInputElement).value })}
        />
      </SettingsRow>

      <SettingsRow label="工具栏">
        <ThinkCheckbox
          checked={!layout.hideToolbar}
          onChange={(event) => onUpdate({ hideToolbar: !(event.currentTarget as HTMLInputElement).checked })}
          label="显示工具栏 / 导航器"
          compact
        />
      </SettingsRow>

      <SettingsRow label="初始日期">
        <div className="think-layout-editor__inline-controls">
          <ThinkInput
            aria-label="初始日期"
            type="date"
            disabled={!!layout.initialDateFollowsNow}
            value={layout.initialDate || ''}
            onInput={(event) => onUpdate({ initialDate: (event.currentTarget as HTMLInputElement).value })}
            className="think-settings-field--date"
          />
          <ThinkCheckbox
            checked={!!layout.initialDateFollowsNow}
            onChange={(event) => onUpdate({ initialDateFollowsNow: (event.currentTarget as HTMLInputElement).checked })}
            label="跟随今日"
            compact
          />
        </div>
      </SettingsRow>

      <SettingsSegmentedRow
        label="初始视图"
        options={PERIOD_OPTIONS}
        selectedValue={layout.initialView || '月'}
        onChange={(value) => onUpdate({ initialView: value })}
      />

      <SettingsSegmentedRow
        label="排列方式"
        options={DISPLAY_MODE_OPTIONS}
        selectedValue={layout.displayMode || 'list'}
        onChange={(value) => onUpdate({ displayMode: value as Layout['displayMode'] })}
      />

      {layout.displayMode === 'grid' && (
        <SettingsRow label="网格列数">
          <ThinkInput
            aria-label="网格列数"
            type="number"
            value={layout.gridConfig?.columns || 2}
            onInput={(event) => onUpdate({ gridConfig: { columns: parseInt((event.currentTarget as HTMLInputElement).value, 10) || 2 } })}
            className="think-settings-field--xs"
          />
        </SettingsRow>
      )}
    </div>
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

  const updateFreeform = (patch: Record<string, unknown>) => onUpdate({
    freeformConfig: { ...(layout.freeformConfig || {}), ...patch },
  });

  return (
    <div className="think-layout-editor__freeform">
      <SettingsSegmentedRow
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

      <SettingsRow label="吸附网格">
        <ThinkCheckbox
          checked={layout.freeformConfig?.snapToGrid ?? true}
          onChange={(event) => updateFreeform({ snapToGrid: (event.currentTarget as HTMLInputElement).checked })}
          label="启用"
          compact
        />
      </SettingsRow>

      <SettingsRow label="网格大小">
        <ThinkInput
          aria-label="网格大小"
          type="number"
          value={layout.freeformConfig?.gridSize || 16}
          onInput={(event) => updateFreeform({ gridSize: Math.max(4, parseInt((event.currentTarget as HTMLInputElement).value, 10) || 16) })}
          className="think-settings-field--sm"
        />
      </SettingsRow>

      <SettingsRow label="最小宽度">
        <ThinkInput
          aria-label="最小宽度"
          type="number"
          value={layout.freeformConfig?.minItemWidth || 280}
          onInput={(event) => updateFreeform({ minItemWidth: Math.max(160, parseInt((event.currentTarget as HTMLInputElement).value, 10) || 280) })}
          className="think-settings-field--sm"
        />
      </SettingsRow>

      <SettingsRow label="最小高度">
        <ThinkInput
          aria-label="最小高度"
          type="number"
          value={layout.freeformConfig?.minItemHeight || 180}
          onInput={(event) => updateFreeform({ minItemHeight: Math.max(120, parseInt((event.currentTarget as HTMLInputElement).value, 10) || 180) })}
          className="think-settings-field--sm"
        />
      </SettingsRow>

      <SettingsRow label="画布最小宽度">
        <ThinkInput
          aria-label="画布最小宽度"
          type="number"
          value={layout.freeformConfig?.minCanvasWidth || 720}
          onInput={(event) => updateFreeform({ minCanvasWidth: Math.max(320, parseInt((event.currentTarget as HTMLInputElement).value, 10) || 720) })}
          className="think-settings-field--md"
        />
      </SettingsRow>

      <SettingsRow label="布局位置">
        <ThinkButton
          size="sm"
          variant="secondary"
          onClick={() => {
            if (confirm('确认重置当前布局的自由布局位置吗？')) onResetFreeformLayout();
          }}
        >
          按模板重排
        </ThinkButton>
      </SettingsRow>
    </div>
  );
}
